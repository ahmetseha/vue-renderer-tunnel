import { mount } from '@vue/test-utils'
import {
  defineComponent,
  h,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
} from 'vue'
import { createTunnel } from '../src'
import { mountCustom } from './customRenderer'

describe('destination lifecycle', () => {
  it('mounts and unmounts tunneled components exactly once', async () => {
    const Tunnel = createTunnel()
    const show = ref(true)
    const unrelated = ref(0)
    let mounts = 0
    let unmounts = 0
    const Child = defineComponent({
      setup() {
        onMounted(() => mounts += 1)
        onUnmounted(() => unmounts += 1)
        return () => h('custom-child')
      },
    })
    const source = mount(defineComponent(() => () => h('div', [
      h('span', unrelated.value),
      show.value ? h(Tunnel.In, null, { default: () => h(Child) }) : null,
    ])))
    const destination = mountCustom(defineComponent(() => () => h(Tunnel.Out)))

    await nextTick()
    expect({ mounts, unmounts }).toEqual({ mounts: 1, unmounts: 0 })
    unrelated.value += 1
    await nextTick()
    expect({ mounts, unmounts }).toEqual({ mounts: 1, unmounts: 0 })

    show.value = false
    await nextTick()
    expect({ mounts, unmounts }).toEqual({ mounts: 1, unmounts: 1 })
    show.value = true
    await nextTick()
    expect({ mounts, unmounts }).toEqual({ mounts: 2, unmounts: 1 })

    destination.unmount()
    expect({ mounts, unmounts }).toEqual({ mounts: 2, unmounts: 2 })
    source.unmount()
  })

  it('warns and renders nothing for a second active Out', async () => {
    const Tunnel = createTunnel()
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const source = mount(defineComponent(() => () => h(Tunnel.In, null, {
      default: () => h('shared'),
    })))
    const first = mount(defineComponent(() => () => h(Tunnel.Out)))
    const second = mount(defineComponent(() => () => h(Tunnel.Out)))

    await nextTick()
    expect(first.find('shared').exists()).toBe(true)
    expect(second.find('shared').exists()).toBe(false)
    expect(warning).toHaveBeenCalledTimes(1)
    expect(warning).toHaveBeenCalledWith(expect.stringContaining('Only one'))

    source.unmount()
    first.unmount()
    second.unmount()
    warning.mockRestore()
  })

  it('promotes the oldest waiting Out when the active Out unmounts', async () => {
    const Tunnel = createTunnel()
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const source = mount(defineComponent(() => () => h(Tunnel.In, null, {
      default: () => h('shared'),
    })))
    const first = mount(defineComponent(() => () => h(Tunnel.Out)))
    const second = mount(defineComponent(() => () => h(Tunnel.Out)))

    await nextTick()
    first.unmount()
    await nextTick()
    expect(second.findAll('shared')).toHaveLength(1)

    source.unmount()
    second.unmount()
    warning.mockRestore()
  })

  it('keeps the active Out unchanged when an inactive Out unmounts', async () => {
    const Tunnel = createTunnel()
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const source = mount(defineComponent(() => () => h(Tunnel.In, null, {
      default: () => h('shared'),
    })))
    const first = mount(defineComponent(() => () => h(Tunnel.Out)))
    const second = mount(defineComponent(() => () => h(Tunnel.Out)))

    await nextTick()
    second.unmount()
    await nextTick()
    expect(first.findAll('shared')).toHaveLength(1)

    source.unmount()
    first.unmount()
    warning.mockRestore()
  })

  it('replaces active destinations without duplicate mounted children', async () => {
    const Tunnel = createTunnel()
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    let activeChildren = 0
    let mounts = 0
    let unmounts = 0
    const Child = defineComponent(() => {
      onMounted(() => {
        activeChildren += 1
        mounts += 1
      })
      onUnmounted(() => {
        activeChildren -= 1
        unmounts += 1
      })
      return () => h('shared-child')
    })
    const source = mount(defineComponent(() => () => h(Tunnel.In, null, {
      default: () => h(Child),
    })))
    const first = mount(defineComponent(() => () => h(Tunnel.Out)))
    const second = mount(defineComponent(() => () => h(Tunnel.Out)))
    const third = mount(defineComponent(() => () => h(Tunnel.Out)))

    await nextTick()
    expect({ activeChildren, mounts, unmounts }).toEqual({
      activeChildren: 1,
      mounts: 1,
      unmounts: 0,
    })
    first.unmount()
    await nextTick()
    expect({ activeChildren, mounts, unmounts }).toEqual({
      activeChildren: 1,
      mounts: 2,
      unmounts: 1,
    })
    expect(second.findAll('shared-child')).toHaveLength(1)
    expect(third.find('shared-child').exists()).toBe(false)

    second.unmount()
    await nextTick()
    expect({ activeChildren, mounts, unmounts }).toEqual({
      activeChildren: 1,
      mounts: 3,
      unmounts: 2,
    })
    expect(third.findAll('shared-child')).toHaveLength(1)

    third.unmount()
    await nextTick()
    expect({ activeChildren, mounts, unmounts }).toEqual({
      activeChildren: 0,
      mounts: 3,
      unmounts: 3,
    })
    source.unmount()
    warning.mockRestore()
  })
})
