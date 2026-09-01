import { flushPromises, mount } from '@vue/test-utils'
import {
  KeepAlive,
  Suspense,
  Teleport,
  Transition,
  defineAsyncComponent,
  defineComponent,
  h,
  nextTick,
  onActivated,
  onDeactivated,
  onMounted,
  ref,
} from 'vue'
import { createTunnel } from '../src'
import { mountCustom } from './customRenderer'

describe('destination renderer built-ins', () => {
  it('uses the destination DOM renderer for Teleport', async () => {
    const target = document.createElement('div')
    document.body.append(target)
    const Tunnel = createTunnel()
    const source = mountCustom(defineComponent(() => () => h(Tunnel.In, null, {
      default: () => h(Teleport, { to: target }, h('p', 'teleported')),
    })))
    const destination = mount(defineComponent(() => () => h(Tunnel.Out)))

    await nextTick()
    expect(target.textContent).toBe('teleported')
    expect(destination.text()).toBe('')

    source.unmount()
    destination.unmount()
    target.remove()
  })

  it('resolves async components inside destination Suspense', async () => {
    const Tunnel = createTunnel()
    const AsyncChild = defineAsyncComponent(async () => defineComponent(
      () => () => h('strong', 'resolved'),
    ))
    const source = mountCustom(defineComponent(() => () => h(Tunnel.In, null, {
      default: () => h(Suspense, null, {
        default: () => h(AsyncChild),
        fallback: () => h('span', 'pending'),
      }),
    })))
    const destination = mount(defineComponent(() => () => h(Tunnel.Out)))

    await flushPromises()
    expect(destination.text()).toBe('resolved')
    source.unmount()
    destination.unmount()
  })

  it('preserves KeepAlive state when source reactivity switches content', async () => {
    const Tunnel = createTunnel()
    const show = ref(true)
    let mounts = 0
    let activations = 0
    let deactivations = 0
    const Child = defineComponent(() => {
      onMounted(() => mounts += 1)
      onActivated(() => activations += 1)
      onDeactivated(() => deactivations += 1)
      return () => h('div', 'kept')
    })
    const source = mountCustom(defineComponent(() => () => h(Tunnel.In, null, {
      default: () => h(KeepAlive, null, () => show.value ? h(Child) : null),
    })))
    const destination = mount(defineComponent(() => () => h(Tunnel.Out)))

    await nextTick()
    show.value = false
    await nextTick()
    show.value = true
    await nextTick()
    expect({ mounts, activations, deactivations }).toEqual({
      mounts: 1,
      activations: 2,
      deactivations: 1,
    })
    source.unmount()
    destination.unmount()
  })

  it('runs a destination DOM Transition without CSS coupling in the core', async () => {
    const Tunnel = createTunnel()
    const show = ref(true)
    const source = mountCustom(defineComponent(() => () => h(Tunnel.In, null, {
      default: () => h(Transition, { css: false }, () => show.value
        ? h('div', { 'data-transitioned': '' })
        : null),
    })))
    const destination = mount(defineComponent(() => () => h(Tunnel.Out)))

    await nextTick()
    expect(destination.find('[data-transitioned]').exists()).toBe(true)
    show.value = false
    await nextTick()
    expect(destination.find('[data-transitioned]').exists()).toBe(false)
    source.unmount()
    destination.unmount()
  })
})
