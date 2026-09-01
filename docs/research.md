# Research notes

Research date: 2026-09-01.

## Versions and sources

- Vue stable: **3.5.42**. The package supports `vue >=3.4 <4`; development and all tests use 3.5.42. Relevant public APIs: [custom renderer](https://vuejs.org/api/custom-renderer), [render functions](https://vuejs.org/guide/extras/render-function), and [built-in components](https://vuejs.org/api/built-in-components).
- `@tresjs/core`: **5.8.3**, the current npm release when researched, with peers `vue >=3.4` and `three >=0.133`. The playground uses Three **0.185.1**. Sources inspected: [repository](https://github.com/Tresjs/tres), [TresCanvas docs](https://docs.tresjs.org/api/components/tres-canvas), published `dist/tres.js`/declarations, and current [`Context.vue`](https://github.com/Tresjs/tres/blob/main/packages/core/src/components/Context.vue).
- Prior art: [`pmndrs/tunnel-rat`](https://github.com/pmndrs/tunnel-rat), its [52-line source](https://github.com/pmndrs/tunnel-rat/blob/main/src/index.tsx), README, license, and issue list.

## TresJS findings

`TresCanvas` is a DOM component which creates a Three scene and a second Vue renderer with `createRenderer(nodeOps(...))`. Its internal component invokes the canvas slot in that custom-renderer render effect. The published package publicly exports `TresCanvas`, `TresCanvasContext`, `useTres`, `useTresContext`, and `useTresContextProvider`. The playground imports only `TresCanvas` from the public root and the public template compiler options subpath.

`enableProvideBridge` defaults to `true`. Before mounting the Tres custom-renderer root, `Context.vue` walks the DOM-side ancestors above the canvas, copies their `provides`, and calls `provide()` for each value in the internal Tres root. It bridges provide/inject context; it does not register arbitrary content elsewhere or create an `In`/`Out` route. The tunnel neither replaces nor modifies this bridge.

The current TresPortal documentation describes a thin wrapper over Vue Teleport which reparents already-declarative Tres children into an `Object3D` or `Scene`. It changes a target within the **same Tres renderer** and does not render the target scene itself or replace the injected Tres scene. This is different from moving an unevaluated slot from the DOM renderer into Tres, or from Tres back into DOM. One release-state discrepancy was found: the version-labelled 5.8.3 docs describe `TresPortal`, but the installed 5.8.3 npm package does not export a `TresPortal` symbol and issue #789 remains open. This package does not depend on that discrepancy: even the documented/current-main portal solves same-renderer scene-graph reparenting, not renderer crossing.

Issue state checked on 2026-09-01:

| Issue | State | Current relevance |
| --- | --- | --- |
| [#312 Vue Tunnel rat](https://github.com/Tresjs/tres/issues/312) | Open, project “In Progress” | Direct renderer-tunnel request; not delivered by provide bridging or a scene portal. |
| [#464 Enable usage of Teleport](https://github.com/Tresjs/tres/issues/464) | Open | DOM targets cannot be located by Tres's renderer. A destination-rendered tunnel avoids asking the source renderer to process DOM nodes. |
| [#789 Portal](https://github.com/Tresjs/tres/issues/789) | Open | Partly superseded by documented/current-main `TresPortal`, but that portal is same-renderer Object3D reparenting. |
| [#842 Decouple scene from canvas](https://github.com/Tresjs/tres/issues/842) | Open | Separate multi-scene/multi-canvas concern; out of scope. |
| [#581 Window pointer events](https://github.com/Tresjs/tres/issues/581) | Open, project “In Progress” | Input routing for overlaid canvases; unrelated to renderer ownership. |

Searches for tunnel, renderer, Teleport, portal, multiple canvas/view, scissor, context/provide bridge, and Vue renderer did not identify a newer Tres facility equivalent to bidirectional `In`/`Out` renderer routing.

## Vue findings

Vue exposes `createRenderer`, `Fragment`, lifecycle APIs, slots, VNodes, and shallow reactivity publicly. A slot is a lazy render function. Registering the function without invoking it lets `In` return `null`; invoking it inside `Out` makes the destination renderer perform the actual patch. No Vue internal instance fields are needed.

Experiments in this repository establish:

- component parentage is the mounted tree at `Out`; destination providers are visible and source-only providers are not;
- source-created component and host refs are assigned and cleared across the boundary;
- reactive reads made while `Out` invokes the slot invalidate the destination render effect;
- keyed Fragments give each registration stable identity while its order changes;
- destination-DOM Teleport, Suspense/async components, KeepAlive, and a non-CSS Transition work because the destination renderer owns those VNodes;
- renderer-specific built-ins are not portable promises. A Teleport target and Transition behavior must be supported by the destination renderer;
- importing and creating a tunnel uses no browser globals. Full cross-renderer SSR/hydration is a different problem because mount hooks register entries only on the client.

Returning `null` from a component is documented Vue render-function behavior. The implementation does not call `withCtx`, inspect `appContext`, clone VNodes, or read `ComponentInternalInstance` fields.

## Prior art and alternatives

Tunnel Rat proves the React/R3F use case. It stores React children in a Zustand list, increments a global-to-that-tunnel version on mounts to repair ordering, and removes entries by child object equality. Its issue history includes dependency/version friction around Zustand. The Vue implementation here is independent: it has no Zustand/Pinia dependency, registers lazy Vue slots, assigns stable symbols and monotonic sequence numbers, and wraps each result in a keyed Fragment.

Searches of npm and GitHub for “vue tunnel rat”, “vue renderer tunnel”, “vue custom renderer tunnel”, “Vue renderer portal”, “Vue cross renderer”, and “Tres tunnel” found DOM portal libraries (for example PortalVue) and custom renderers, but no maintained generic package offering this cross-renderer source/destination behavior. PortalVue and Vue Teleport are tied to a destination understood by the active renderer.

## Package names

Direct npm registry checks returned `E404 Not Found` for both:

- `vue-renderer-tunnel`
- `vue-render-tunnel`

`vue-renderer-tunnel` is more precise and was selected. Registry availability is not a reservation and must be rechecked immediately before publishing.

## Risks and conclusion

The main compatibility risk is Vue's cross-root slot/VNode behavior even though only public APIs are used. Regression tests therefore exercise DOM → object renderer, object renderer → DOM, current Tres in Chromium, refs, component lifecycle, provide/inject, ordering, and built-ins. A single tunnel intentionally rejects concurrent `Out` instances because duplicated VNodes create ambiguous refs and lifecycle.

**Go.** Modern Tres solves custom-renderer mounting, context bridging, and same-renderer scene reparenting, but it does not provide a generic bidirectional renderer tunnel. The remaining gap is coherent, useful outside Three.js, and implementable without private APIs.
