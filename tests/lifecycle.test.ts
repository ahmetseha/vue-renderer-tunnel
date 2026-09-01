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
    expect(warning).toHaveBeenCalledWith(expect.stringContaining('Only one'))

    source.unmount()
    first.unmount()
    second.unmount()
    warning.mockRestore()
  })
})
