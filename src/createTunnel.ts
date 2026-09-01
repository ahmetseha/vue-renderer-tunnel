import {
  Fragment,
  createVNode,
  defineComponent,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue'
import type { PropType, Ref, Slots, VNodeChild } from 'vue'
import type { Tunnel, TunnelInComponent, TunnelOutComponent } from './types'

interface TunnelEntry {
  readonly id: symbol
  readonly sequence: number
  order: number
  readonly render: () => VNodeChild
}

interface TunnelOutRegistration {
  readonly id: symbol
  sequence: number
  readonly active: Ref<boolean>
}

const EMPTY_SLOTS: VNodeChild = []

/**
 * Creates an isolated source/destination pair for routing slot content between
 * Vue renderer roots.
 */
export function createTunnel(): Tunnel {
  const entries = new Map<symbol, TunnelEntry>()
  const outlets = new Map<symbol, TunnelOutRegistration>()
  const revision = ref(0)
  let nextSequence = 0
  let nextOutSequence = 0

  const invalidate = (): void => {
    revision.value += 1
  }

  const In = defineComponent({
    name: 'RendererTunnelIn',
    props: {
      order: {
        type: Number as PropType<number>,
        default: 0,
      },
    },
    setup(props, { slots }) {
      const id = Symbol('tunnel-entry')
      const entry: TunnelEntry = {
        id,
        sequence: nextSequence++,
        order: props.order ?? 0,
        render: () => renderSlotLazily(slots),
      }

      onMounted(() => {
        entries.set(id, entry)
        invalidate()
      })

      watch(
        () => props.order,
        nextOrder => {
          const order = nextOrder ?? 0
          if (entry.order !== order) {
            entry.order = order
            if (entries.has(id)) invalidate()
          }
        },
      )

      onBeforeUnmount(() => {
        if (entries.delete(id)) invalidate()
      })

      // Returning null is essential: the source renderer never evaluates the slot.
      return () => null
    },
  }) as TunnelInComponent

  const Out = defineComponent({
    name: 'RendererTunnelOut',
    setup() {
      const id = Symbol('tunnel-out')
      const registration: TunnelOutRegistration = {
        id,
        sequence: Number.POSITIVE_INFINITY,
        active: ref(false),
      }

      onMounted(() => {
        registration.sequence = nextOutSequence++
        outlets.set(id, registration)
        if (!findActiveOut()) {
          registration.active.value = true
        }
        else {
          console.warn(
            '[vue-renderer-tunnel] Only one <Tunnel.Out> may be mounted per tunnel. '
            + 'This Out will remain inactive until the active Out unmounts.',
          )
        }
      })

      onBeforeUnmount(() => {
        const wasActive = registration.active.value
        outlets.delete(id)
        if (wasActive) {
          registration.active.value = false
          promoteOldestOut(outlets)
        }
      })

      return () => {
        if (!registration.active.value) return null
        void revision.value

        return Array.from(entries.values())
          .sort(compareEntries)
          .map(entry => createVNode(Fragment, { key: entry.id }, entry.render()))
      }
    },
  }) as TunnelOutComponent

  return { In, Out }

  function findActiveOut(): TunnelOutRegistration | undefined {
    return Array.from(outlets.values()).find(outlet => outlet.active.value)
  }
}

function renderSlotLazily(slots: Slots): VNodeChild {
  return slots.default?.() ?? EMPTY_SLOTS
}

function compareEntries(left: TunnelEntry, right: TunnelEntry): number {
  return left.order - right.order || left.sequence - right.sequence
}

function promoteOldestOut(outlets: Map<symbol, TunnelOutRegistration>): void {
  const oldest = Array.from(outlets.values())
    .sort((left, right) => left.sequence - right.sequence)[0]
  if (oldest) oldest.active.value = true
}
