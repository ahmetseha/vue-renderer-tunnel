import { createTunnel } from 'vue-renderer-tunnel'

const tunnel = createTunnel()

if (!tunnel.In || !tunnel.Out) {
  throw new Error('Built package exports are not usable')
}
