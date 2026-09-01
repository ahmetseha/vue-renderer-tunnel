/* global console, document */
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost/',
})

Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  Node: dom.window.Node,
  Element: dom.window.Element,
  HTMLElement: dom.window.HTMLElement,
  SVGElement: dom.window.SVGElement,
})

const {
  createApp,
  createRenderer,
  defineComponent,
  h,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
} = await import('vue')
const { createTunnel } = await import('vue-renderer-tunnel')

const insertNode = (child, parent, anchor) => {
  if (child.parent) {
    const oldIndex = child.parent.children.indexOf(child)
    if (oldIndex >= 0) child.parent.children.splice(oldIndex, 1)
  }
  const index = anchor == null ? -1 : parent.children.indexOf(anchor)
  if (index < 0) parent.children.push(child)
  else parent.children.splice(index, 0, child)
  child.parent = parent
}

const renderer = createRenderer({
  patchProp(node, key, _previous, next) {
    if (next == null) delete node.props[key]
    else node.props[key] = next
  },
  insert: insertNode,
  remove(child) {
    if (!child.parent) return
    const index = child.parent.children.indexOf(child)
    if (index >= 0) child.parent.children.splice(index, 1)
    child.parent = null
  },
  createElement: type => element(type),
  createText: text => ({ kind: 'text', text, parent: null }),
  createComment: text => ({ kind: 'comment', text, parent: null }),
  setText(node, text) {
    node.text = text
  },
  setElementText(node, text) {
    node.children = []
    node.text = text
  },
  parentNode: node => node.parent,
  nextSibling(node) {
    if (!node.parent) return null
    const index = node.parent.children.indexOf(node)
    return node.parent.children[index + 1] ?? null
  },
  querySelector: () => null,
  setScopeId(node, id) {
    node.props[id] = ''
  },
  insertStaticContent(content, parent, anchor) {
    const node = { kind: 'text', text: content, parent: null }
    insertNode(node, parent, anchor)
    return [node, node]
  },
})

await verifyDomToCustom()
await verifyCustomToDom()
await verifyLifecycleCleanup()

console.log('[compat] Runtime renderer behavior: PASS')

async function verifyDomToCustom() {
  const Tunnel = createTunnel()
  const color = ref('orange')
  const sourceRoot = document.createElement('div')
  const source = createApp(defineComponent(() => () => [
    h(Tunnel.In, { order: 10 }, {
      default: () => h('custom-material', { color: color.value }),
    }),
    h(Tunnel.In, { order: 0 }, {
      default: () => h('custom-first'),
    }),
  ]))
  source.mount(sourceRoot)

  const destinationRoot = element('root')
  const destination = renderer.createApp(defineComponent(() => () => h(Tunnel.Out)))
  destination.mount(destinationRoot)
  await flush()

  assert.equal(sourceRoot.querySelector('custom-material'), null)
  assert.deepEqual(visibleTypes(destinationRoot), ['custom-first', 'custom-material'])
  assert.equal(findElements(destinationRoot, 'custom-material')[0].props.color, 'orange')

  color.value = 'blue'
  await flush()
  assert.equal(findElements(destinationRoot, 'custom-material')[0].props.color, 'blue')

  source.unmount()
  await flush()
  assert.equal(findElements(destinationRoot, 'custom-material').length, 0)
  destination.unmount()
}

async function verifyCustomToDom() {
  const Tunnel = createTunnel()
  const label = ref('before')
  const sourceRoot = element('root')
  const source = renderer.createApp(defineComponent(() => () => h(Tunnel.In, null, {
    default: () => h('button', { 'data-compat': '' }, label.value),
  })))
  source.mount(sourceRoot)

  const destinationRoot = document.createElement('div')
  const destination = createApp(defineComponent(() => () => h(Tunnel.Out)))
  destination.mount(destinationRoot)
  await flush()

  assert.equal(findElements(sourceRoot, 'button').length, 0)
  assert.equal(destinationRoot.querySelector('[data-compat]')?.textContent, 'before')
  label.value = 'after'
  await flush()
  assert.equal(destinationRoot.querySelector('[data-compat]')?.textContent, 'after')

  source.unmount()
  await flush()
  assert.equal(destinationRoot.querySelector('[data-compat]'), null)
  destination.unmount()
}

async function verifyLifecycleCleanup() {
  const Tunnel = createTunnel()
  const show = ref(true)
  let mounts = 0
  let unmounts = 0
  const Child = defineComponent(() => {
    onMounted(() => mounts += 1)
    onUnmounted(() => unmounts += 1)
    return () => h('custom-child')
  })
  const sourceRoot = document.createElement('div')
  const source = createApp(defineComponent(() => () => show.value
    ? h(Tunnel.In, null, { default: () => h(Child) })
    : null))
  source.mount(sourceRoot)

  const destinationRoot = element('root')
  const destination = renderer.createApp(defineComponent(() => () => h(Tunnel.Out)))
  destination.mount(destinationRoot)
  await flush()
  assert.deepEqual({ mounts, unmounts }, { mounts: 1, unmounts: 0 })

  show.value = false
  await flush()
  assert.deepEqual({ mounts, unmounts }, { mounts: 1, unmounts: 1 })
  assert.equal(findElements(destinationRoot, 'custom-child').length, 0)

  show.value = true
  await flush()
  assert.deepEqual({ mounts, unmounts }, { mounts: 2, unmounts: 1 })
  assert.equal(findElements(destinationRoot, 'custom-child').length, 1)

  source.unmount()
  await flush()
  assert.deepEqual({ mounts, unmounts }, { mounts: 2, unmounts: 2 })
  destination.unmount()
}

function element(type) {
  return {
    kind: 'element',
    type,
    props: {},
    children: [],
    parent: null,
    text: null,
  }
}

function findElements(root, type) {
  const found = []
  const visit = node => {
    if (node.kind !== 'element') return
    if (node.type === type) found.push(node)
    node.children.forEach(visit)
  }
  visit(root)
  return found
}

function visibleTypes(root) {
  return root.children
    .filter(node => node.kind === 'element')
    .map(node => node.type)
}

async function flush() {
  await nextTick()
  await nextTick()
}
