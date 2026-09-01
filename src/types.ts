import type { DefineComponent } from 'vue'

export interface TunnelInProps {
  /** Lower values render first. Equal values keep registration order. */
  order?: number
}

export type TunnelInComponent = DefineComponent<TunnelInProps>

export type TunnelOutComponent = DefineComponent<Record<string, never>>

export interface Tunnel {
  readonly In: TunnelInComponent
  readonly Out: TunnelOutComponent
}
