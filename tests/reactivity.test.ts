import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { createTunnel } from '../src'
import { findElements, mountCustom } from './customRenderer'

describe('reactivity and cleanup', () => {
  it('updates destination props from source reactive state', async () => {
    const Tunnel = createTunnel()
    const color = ref('orange')
    const source = mount(defineComponent(() => () => h(Tunnel.In, null, {
      default: () => h('custom-material', { color: color.value }),
    })))
    const destination = mountCustom(defineComponent(() => () => h(Tunnel.Out)))

    await nextTick()
    expect(findElements(destination.root, 'custom-material')[0]?.props.color).toBe('orange')
    color.value = 'blue'
    await nextTick()
    expect(findElements(destination.root, 'custom-material')[0]?.props.color).toBe('blue')

    source.unmount()
    destination.unmount()
  })

  it('adds and removes conditional registrations without ghosts', async () => {
    const Tunnel = createTunnel()
    const show = ref(true)
    const source = mount(defineComponent(() => () => show.value
      ? h(Tunnel.In, null, { default: () => h('custom-mesh') })
      : null))
    const destination = mountCustom(defineComponent(() => () => h(Tunnel.Out)))

    await nextTick()
    expect(findElements(destination.root, 'custom-mesh')).toHaveLength(1)
    for (let index = 0; index < 4; index += 1) {
      show.value = false
      await nextTick()
      expect(findElements(destination.root, 'custom-mesh')).toHaveLength(0)
      show.value = true
      await nextTick()
      expect(findElements(destination.root, 'custom-mesh')).toHaveLength(1)
    }

    source.unmount()
    await nextTick()
    expect(findElements(destination.root, 'custom-mesh')).toHaveLength(0)
    destination.unmount()
  })
})
