import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import { createTunnel } from '../src'
import { findElements, mountCustom } from './customRenderer'

describe('basic tunnel behavior', () => {
  it('renders In as nothing in its source renderer', () => {
    const Tunnel = createTunnel()
    const wrapper = mount(defineComponent(() => () => h(Tunnel.In, null, {
      default: () => h('should-not-exist'),
    })))

    expect(wrapper.html()).toBe('')
    wrapper.unmount()
  })

  it('routes DOM source content to a custom renderer only', async () => {
    const Tunnel = createTunnel()
    const source = mount(defineComponent(() => () => h(Tunnel.In, null, {
      default: () => h('custom-box', { answer: 42 }),
    })))
    const destination = mountCustom(defineComponent(() => () => h(Tunnel.Out)))

    await nextTick()
    expect(source.find('custom-box').exists()).toBe(false)
    expect(findElements(destination.root, 'custom-box')).toHaveLength(1)
    expect(findElements(destination.root, 'custom-box')[0]?.props.answer).toBe(42)

    source.unmount()
    destination.unmount()
  })

  it('routes custom renderer source content to DOM only', async () => {
    const Tunnel = createTunnel()
    const source = mountCustom(defineComponent(() => () => h(Tunnel.In, null, {
      default: () => h('button', { 'data-testid': 'from-custom' }, 'Hello'),
    })))
    const destination = mount(defineComponent(() => () => h(Tunnel.Out)))

    await nextTick()
    expect(findElements(source.root, 'button')).toHaveLength(0)
    expect(destination.get('[data-testid="from-custom"]').text()).toBe('Hello')

    source.unmount()
    destination.unmount()
  })

  it('isolates separate tunnel registries', async () => {
    const A = createTunnel()
    const B = createTunnel()
    const source = mount(defineComponent(() => () => h(A.In, null, {
      default: () => h('only-a'),
    })))
    const destination = mountCustom(defineComponent(() => () => h(B.Out)))

    await nextTick()
    expect(findElements(destination.root, 'only-a')).toHaveLength(0)

    source.unmount()
    destination.unmount()
  })
})
