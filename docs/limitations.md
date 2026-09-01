# Compatibility and limitations

Generic results below are verified against Vue 3.4.0 and 3.5.42. The real Tres baseline uses Vue 3.5.42, `@tresjs/core` 5.8.3, Three 0.185.1, and Chromium through Playwright on 2026-09-01.

| Feature | Status |
| --- | --- |
| DOM → test custom renderer | Supported; unit tested |
| Test custom renderer → DOM | Supported; unit tested |
| DOM → Tres | Supported; real WebGL E2E tested |
| Tres → DOM | Supported; real DOM interaction E2E tested |
| Multiple `In` | Supported; stable registration identity |
| Explicit `order` | Supported; reactive moves do not remount entries |
| Reactive props/state | Supported; generic host props and actual Tres material/mesh mutation tested |
| `v-if` registration | Supported; repeated cleanup tested |
| Component lifecycle | Supported; mount/unmount counts tested |
| Component and host refs | Supported in tested source-ref patterns; cleared on removal |
| DOM events | Supported at a DOM destination |
| Tres pointer events | Owned by Tres at a Tres destination; core does not intercept them |
| Shared imported state | Supported by normal Vue reactivity |
| Multiple `Out` | One active at a time; waiting outlets are promoted in mount order |
| Destination-local provide | Supported and tested |
| Destination app provide | Supported by normal destination parentage |
| Source-only provide | Not bridged |
| Provider above `TresCanvas` | Tres `enableProvideBridge` handles this when enabled (default) |
| Teleport inside tunnel | Destination-DOM case tested; only valid when destination renderer supports its target |
| Suspense / async component | Destination-DOM case tested |
| KeepAlive | Destination-DOM case tested |
| Transition | Non-CSS destination-DOM case tested; platform transitions are renderer-specific |
| SSR-safe import | Supported and tested |
| Cross-renderer SSR output | Unsupported in v0.1 |
| Nuxt hydration | Not verified; use client-only boundaries for Tres |
| Separate Vue apps | Supported in unit tests; destination app context owns mounted children |
| HMR | Vite/Tres development loads successfully; hot-update behavior is not automated or guaranteed |

## Details

Full SSR is not attempted. `In` registration uses client mount lifecycle, so an SSR pass renders `In` as a comment and has no cross-root registration. This avoids browser globals and hydration side effects but means server output cannot contain tunneled destination content. In Nuxt, keep Tres and tunnel destinations within the same client-only island.

Source-local provide/inject is deliberately not recreated. Doing so would require manufacturing component ancestry or copying internal instance state. Put the provider above the destination, above both source and `TresCanvas` so Tres's bridge can copy it, or use imported reactive state.

Renderer built-ins remain destination-specific. The package does not turn a DOM selector into a valid Three target, add DOM transition classes to a Three object, or make an unsupported renderer implement Teleport.

Concurrent rendering is rejected rather than cloning a logical VNode tree. Supporting duplication would need explicit semantics for component state, template refs, events, lifecycle, and different app contexts. Multiple outlets may stay mounted for failover: only the active one renders, and the oldest waiting outlet is promoted when it unmounts.
