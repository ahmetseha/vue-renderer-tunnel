import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import { createTunnel } from '../src'
import { mountCustom } from './customRenderer'
import type { TestElement } from './customRenderer'

describe('refs', () => {
  it('sets component and host refs created at the source', async () => {
    const Tunnel = createTunnel()
    const componentRef = ref<ComponentPublicInstance | null>(null)
    const hostRef = ref<TestElement | null>(null)
    const Child = defineComponent({
      name: 'RefChild',
      setup: () => () => h('custom-ref-host', { ref: hostRef }),
    })
    const source = mount(defineComponent(() => () => h(Tunnel.In, null, {
      default: () => h(Child, { ref: componentRef }),
    })))
    const destination = mountCustom(defineComponent(() => () => h(Tunnel.Out)))

    await nextTick()
    expect(componentRef.value).not.toBeNull()
    expect(hostRef.value?.type).toBe('custom-ref-host')

    source.unmount()
    await nextTick()
    expect(componentRef.value).toBeNull()
    expect(hostRef.value).toBeNull()
    destination.unmount()
  })

  it('keeps a compiled source template ref attached to the tunneled component', async () => {
    const Tunnel = createTunnel()
    const componentRef = ref<ComponentPublicInstance | null>(null)
    const Child = defineComponent({
      name: 'TemplateRefChild',
      setup: () => () => h('custom-template-ref'),
    })
    const Source = defineComponent({
      components: { Child, TunnelIn: Tunnel.In },
      setup: () => ({ componentRef }),
      template: '<TunnelIn><Child ref="componentRef" /></TunnelIn>',
    })
    const source = mount(Source)
    const destination = mountCustom(defineComponent(() => () => h(Tunnel.Out)))

    await nextTick()
    expect(componentRef.value).not.toBeNull()
    source.unmount()
    await nextTick()
    expect(componentRef.value).toBeNull()
    destination.unmount()
  })
})
