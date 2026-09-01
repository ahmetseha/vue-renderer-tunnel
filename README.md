# vue-renderer-tunnel

[![CI](https://github.com/ahmetseha/vue-renderer-tunnel/actions/workflows/ci.yml/badge.svg)](https://github.com/ahmetseha/vue-renderer-tunnel/actions/workflows/ci.yml)

Route lazy Vue content from one Vue renderer root to another. It is designed for renderer boundaries and tested with Vue DOM, a plain-object custom renderer, and TresJS.

```ts
import { createTunnel } from 'vue-renderer-tunnel'

export const ThreeTunnel = createTunnel()
export const HtmlTunnel = createTunnel()
```

`In` registers a slot and renders nothing locally. `Out` is the only place that evaluates and renders it.

## Why

Vue Teleport moves content to a target understood by the **current** renderer. It cannot make Tres's Three renderer create DOM nodes, or make the DOM renderer create Three objects.

TresJS `TresPortal` and vue-renderer-tunnel solve different problems. `TresPortal` reparents declarative children to another `Object3D` or scene within the Tres renderer. This package routes lazy declarative content across distinct Vue renderer roots, such as Vue DOM and Tres. Tres's `enableProvideBridge` separately copies Vue provides across `TresCanvas`'s renderer root.

## Install

```bash
pnpm add vue-renderer-tunnel
```

Vue is the only peer dependency (`>=3.4 <4`). TresJS and Three are not runtime dependencies.

## DOM → Tres

Configure Tres's documented template compiler options, then declare `In` outside the canvas and mount `Out` inside it:

```vue
<script setup lang="ts">
import { TresCanvas } from '@tresjs/core'
import { Vector3 } from 'three'
import { ref } from 'vue'
import { ThreeTunnel } from './tunnels'

const color = ref('orange')
const cameraPosition = new Vector3(3, 3, 3)
</script>

<template>
  <input v-model="color">

  <ThreeTunnel.In>
    <TresMesh>
      <TresBoxGeometry />
      <TresMeshStandardMaterial :color="color" />
    </TresMesh>
  </ThreeTunnel.In>

  <TresCanvas>
    <TresPerspectiveCamera :position="cameraPosition" />
    <ThreeTunnel.Out />
  </TresCanvas>
</template>
```

Destructuring aliases is equally valid when preferred:

```ts
const { In: ThreeIn, Out: ThreeOut } = createTunnel()
```

## Tres → DOM

A Vue component mounted inside Tres may register DOM without asking the Tres renderer to create it:

```vue
<!-- OverlaySource.vue, mounted below TresCanvas -->
<script setup lang="ts">
import { HtmlTunnel } from './tunnels'
</script>

<template>
  <HtmlTunnel.In>
    <button class="overlay" @click="$emit('click')">
      DOM owned by the DOM renderer
    </button>
  </HtmlTunnel.In>
</template>
```

```vue
<TresCanvas>
  <OverlaySource @click="count++" />
</TresCanvas>

<HtmlTunnel.Out />
```

The repository playground at `playground/src/App.vue` demonstrates both directions together: a DOM control reactively changes and conditionally removes a real tunneled mesh, while a tunneled DOM button changes shared state that rotates the scene object.

## Multiple sources and ordering

Every mounted `In` is a stable entry. Entries render by ascending `order`, then registration order:

```vue
<ThreeTunnel.In :order="20"><LateObject /></ThreeTunnel.In>
<ThreeTunnel.In :order="10"><EarlyObject /></ThreeTunnel.In>
```

`order` is reactive. Moving an entry preserves its keyed subtree and does not remount unrelated entries. Removing `In` automatically removes and unmounts its destination content.

Only one `Out` may be active per tunnel. Additional destinations warn and wait because duplicating one logical tree would make refs and lifecycle ambiguous. If the active `Out` unmounts, the oldest waiting `Out` becomes active automatically.

## Reactivity, lifecycle, refs, and context

Slot functions are evaluated in `Out`'s render effect, so source refs and stores update normally without `refresh()`. Components mount, update, and unmount under the destination renderer. Component and host refs work in tested source-ref patterns and clear when their entry disappears.

Mounted component ancestry comes from `Out`. Destination providers are visible; a provider wrapping only `In` is not. With Tres, providers above `TresCanvas` are copied by Tres's default `enableProvideBridge`. For source-only context, use shared reactive state or move the provider to a common/destination ancestor.

## Limitations

- Import is SSR-safe, but cross-renderer SSR and hydration are not supported in v0.1. Use a client-only boundary for Nuxt/Tres.
- Teleport, Suspense, KeepAlive, Transition, and async components are handled by the destination renderer. Tested DOM-destination cases are listed in [the matrix](./docs/limitations.md); unsupported renderer targets do not become portable.
- HMR development loads with current Vite/Tres, but hot-update behavior is not in the automated compatibility contract.
- Do not use a tunnel registry as long-lived application state. `In` lifecycle owns registration.

See [architecture](./docs/architecture.md), [research](./docs/research.md), and [detailed limitations](./docs/limitations.md).

## Compatibility

The generic renderer core and built package are tested against exact Vue versions **3.4.0** and **3.5.42**, including both renderer directions, reactivity, ordering, and lifecycle cleanup. The current real TresJS integration baseline is Vue 3.5.42 + `@tresjs/core` 5.8.3 + Three 0.185.1 in Chromium. The tested peer range remains Vue `>=3.4 <4`.

## Development

```bash
pnpm install
pnpm dev
```

Open `http://127.0.0.1:4173`. Run the full pipeline with:

```bash
pnpm check
```

Individual commands include `pnpm lint`, `pnpm typecheck`, `pnpm test:unit`, `pnpm test:compat`, `pnpm build`, `pnpm pack:check`, and `pnpm test:e2e`. Compatibility fixtures are created in the operating system's temporary directory and do not modify the workspace package or lockfile.

## Roadmap

Future work may investigate an explicit public-API context bridge and a separate Tres multi-view/scissor package. Neither belongs in the focused renderer tunnel v0.1.

## License

MIT © vue-renderer-tunnel contributors.
