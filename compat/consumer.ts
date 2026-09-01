import { createTunnel } from 'vue-renderer-tunnel'
import type { Tunnel, TunnelInProps } from 'vue-renderer-tunnel'

const tunnel: Tunnel = createTunnel()
const props: TunnelInProps = { order: 10 }

void tunnel.In
void tunnel.Out
void props
