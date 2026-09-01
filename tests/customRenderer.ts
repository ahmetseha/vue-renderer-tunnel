import { createRenderer } from 'vue'
import type { Component, Renderer, RendererOptions } from 'vue'

export type TestNode = TestElement | TestText

export interface TestElement {
  kind: 'element'
  type: string
  props: Record<string, unknown>
  children: TestNode[]
  parent: TestElement | null
  text: string | null
}

export interface TestText {
  kind: 'text' | 'comment'
  text: string
  parent: TestElement | null
}

export function element(type = 'root'): TestElement {
  return {
    kind: 'element',
    type,
    props: {},
    children: [],
    parent: null,
    text: null,
  }
}

const options: RendererOptions<TestNode, TestElement> = {
  patchProp(node, key, _previous, next) {
    if (next == null) delete node.props[key]
    else node.props[key] = next
  },
  insert(child, parent, anchor) {
    if (child.parent) {
      const previousIndex = child.parent.children.indexOf(child)
      if (previousIndex >= 0) child.parent.children.splice(previousIndex, 1)
    }
    const index = anchor == null ? -1 : parent.children.indexOf(anchor)
    if (index < 0) parent.children.push(child)
    else parent.children.splice(index, 0, child)
    child.parent = parent
  },
  remove(child) {
    if (!child.parent) return
    const index = child.parent.children.indexOf(child)
    if (index >= 0) child.parent.children.splice(index, 1)
    child.parent = null
  },
  createElement(type) {
    return element(type)
  },
  createText(text) {
    return { kind: 'text', text, parent: null }
  },
  createComment(text) {
    return { kind: 'comment', text, parent: null }
  },
  setText(node, text) {
    node.text = text
  },
  setElementText(node, text) {
    node.children = []
    node.text = text
  },
  parentNode(node) {
    return node.parent
  },
  nextSibling(node) {
    if (!node.parent) return null
    const index = node.parent.children.indexOf(node)
    return node.parent.children[index + 1] ?? null
  },
  querySelector() {
    return null
  },
  setScopeId(node, id) {
    node.props[id] = ''
  },
  insertStaticContent(content, parent, anchor) {
    const node: TestText = { kind: 'text', text: content, parent: null }
    options.insert(node, parent, anchor)
    return [node, node]
  },
}

export const testRenderer: Renderer<TestElement> = createRenderer(options)

export function mountCustom(component: Component): {
  root: TestElement
  unmount: () => void
} {
  const root = element()
  const app = testRenderer.createApp(component)
  app.mount(root)
  return { root, unmount: () => app.unmount() }
}

export function findElements(root: TestElement, type: string): TestElement[] {
  const found: TestElement[] = []
  const visit = (node: TestNode): void => {
    if (node.kind !== 'element') return
    if (node.type === type) found.push(node)
    node.children.forEach(visit)
  }
  visit(root)
  return found
}

export function visibleTypes(root: TestElement): string[] {
  return root.children
    .filter((node): node is TestElement => node.kind === 'element')
    .map(node => node.type)
}
