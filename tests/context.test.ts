import { mount } from '@vue/test-utils'
import { defineComponent, h, inject, nextTick, provide } from 'vue'
import { createTunnel } from '../src'

describe('provide and inject parentage', () => {
  it('uses the destination component ancestry', async () => {
    const Tunnel = createTunnel()
    const Consumer = defineComponent(() => {
      const value = inject('location', 'missing')
      return () => h('span', value)
    })
    const Source = defineComponent(() => {
      provide('location', 'source')
      return () => h(Tunnel.In, null, { default: () => h(Consumer) })
    })
    const Destination = defineComponent(() => {
      provide('location', 'destination')
      return () => h(Tunnel.Out)
    })
    const source = mount(Source)
    const destination = mount(Destination)

    await nextTick()
    expect(destination.text()).toBe('destination')
    source.unmount()
    destination.unmount()
  })
})
