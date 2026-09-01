import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { createTunnel } from '../src'
import { mountCustom, visibleTypes } from './customRenderer'

describe('multiple entries and ordering', () => {
  it('uses registration order when order values are equal', async () => {
    const Tunnel = createTunnel()
    const source = mount(defineComponent(() => () => [
      h(Tunnel.In, null, { default: () => h('first') }),
      h(Tunnel.In, null, { default: () => h('second') }),
    ]))
    const destination = mountCustom(defineComponent(() => () => h(Tunnel.Out)))

    await nextTick()
    expect(visibleTypes(destination.root)).toEqual(['first', 'second'])
    source.unmount()
    destination.unmount()
  })

  it('sorts by order and reactively moves stable entries', async () => {
    const Tunnel = createTunnel()
    const order = ref(10)
    const source = mount(defineComponent(() => () => [
      h(Tunnel.In, { order: order.value }, { default: () => h('movable') }),
      h(Tunnel.In, { order: 5 }, { default: () => h('fixed') }),
    ]))
    const destination = mountCustom(defineComponent(() => () => h(Tunnel.Out)))

    await nextTick()
    const original = destination.root.children.find(
      node => node.kind === 'element' && node.type === 'movable',
    )
    expect(visibleTypes(destination.root)).toEqual(['fixed', 'movable'])

    order.value = 0
    await nextTick()
    expect(visibleTypes(destination.root)).toEqual(['movable', 'fixed'])
    expect(destination.root.children.find(
      node => node.kind === 'element' && node.type === 'movable',
    )).toBe(original)

    source.unmount()
    destination.unmount()
  })
})
