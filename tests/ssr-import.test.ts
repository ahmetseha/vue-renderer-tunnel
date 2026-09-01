import { renderToString } from '@vue/server-renderer'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'

describe('SSR safety', () => {
  it('imports without browser globals and renders source as empty', async () => {
    const { createTunnel } = await import('../src/index')
    const Tunnel = createTunnel()
    const html = await renderToString(h(Tunnel.In, null, {
      default: () => h('div', 'not local'),
    }))
    expect(html).toBe('<!---->')
  })

  it('does not retain an Out claim during SSR', async () => {
    const { createTunnel } = await import('../src/index')
    const Tunnel = createTunnel()
    expect(await renderToString(h(Tunnel.Out))).toBe('<!---->')

    const source = mount(defineComponent(() => () => h(Tunnel.In, null, {
      default: () => h('span', 'client'),
    })))
    const destination = mount(defineComponent(() => () => h(Tunnel.Out)))
    await nextTick()
    expect(destination.text()).toBe('client')
    source.unmount()
    destination.unmount()
  })
})
