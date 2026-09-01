import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { createTunnel } from '../src'
import { mountCustom } from './customRenderer'

describe('events', () => {
  it('keeps DOM handlers reactive for custom-to-DOM content', async () => {
    const Tunnel = createTunnel()
    const count = ref(0)
    const source = mountCustom(defineComponent(() => () => h(Tunnel.In, null, {
      default: () => h('button', { onClick: () => count.value += 1 }, String(count.value)),
    })))
    const destination = mount(defineComponent(() => () => h(Tunnel.Out)))

    await nextTick()
    await destination.get('button').trigger('click')
    expect(count.value).toBe(1)
    expect(destination.get('button').text()).toBe('1')
    source.unmount()
    destination.unmount()
  })
})
