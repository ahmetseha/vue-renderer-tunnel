# vue-renderer-tunnel

Route lazy Vue content from one Vue renderer root to another. It is designed for renderer boundaries and tested with Vue DOM, a plain-object custom renderer, and TresJS.

```ts
import { createTunnel } from 'vue-renderer-tunnel'

export const ThreeTunnel = createTunnel()
export const HtmlTunnel = createTunnel()
```

`In` registers a slot and renders nothing locally. `Out` is the only place that evaluates and renders it.

## Why

Vue Teleport moves content to a target understood by the **current** renderer. It cannot make Tres's Three renderer create DOM nodes, or make the DOM renderer create Three objects.

TresJS `TresPortal` reparents Tres children to another `Object3D`/scene inside the Tres renderer. `enableProvideBridge` copies Vue provides across `TresCanvas`'s renderer root. Neither routes arbitrary lazy content between renderer roots; this package complements both.

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

Only one `Out` may be active per tunnel. A second concurrent destination warns and renders nothing because duplicating one logical tree would make refs and lifecycle ambiguous.

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

The v0.1 verification baseline is Vue 3.5.42, TresJS 5.8.3, Three 0.185.1, Vite 8.2.2, and Chromium. The published peer range is Vue `>=3.4 <4` because the implementation uses APIs available since Vue 3.4; the exact baseline is the strongest tested guarantee.

## Development

```bash
pnpm install
pnpm dev
```

Open `http://127.0.0.1:4173`. Run the full pipeline with:

```bash
pnpm check
```

Individual commands include `pnpm lint`, `pnpm typecheck`, `pnpm test:unit`, `pnpm build`, `pnpm pack:check`, and `pnpm test:e2e`.

## Roadmap

Future work may investigate an explicit public-API context bridge and a separate Tres multi-view/scissor package. Neither belongs in the focused renderer tunnel v0.1.

## License

MIT © vue-renderer-tunnel contributors.
