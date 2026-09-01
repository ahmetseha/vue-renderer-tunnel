# Architecture

Each `createTunnel()` call closes over one small registry. Nothing is global.

## Source registration

`In` captures `slots.default` but returns `null`. Vue slots are functions, so capturing one does not create its VNodes and the source renderer never sees the slot's host elements. On mount, `In` registers this record:

```ts
interface TunnelEntry {
  id: symbol
  sequence: number
  order: number
  render: () => VNodeChild
}
```

On unmount it deletes that exact record. The registry cannot retain the slot after deletion. A local revision ref invalidates `Out` after add, remove, or order changes; VNodes and slot results are never made reactive or stored.

## Destination rendering

`Out` reads the revision, sorts entries by `(order, sequence)`, invokes each slot, and wraps the result in a Fragment keyed by the entry symbol. Invocation happens inside the destination render effect. The destination renderer therefore creates, patches, moves, and removes the returned VNodes.

The stable Fragment means changing one `In`'s `order` moves that subtree rather than remounting unrelated entries. Equal order values retain original registration order. Removing and recreating an `In` gives it a new sequence, as expected for a new registration.

Reactive source values work because their reads occur when the lazy slot is called by `Out`. Vue tracks those reads for the active destination render effect. No refresh API or polling is required.

## Lifecycle and ownership

An `In` is registered only after it mounts and is removed before it unmounts. Destination components mount when their entry first appears at `Out`, update through normal Vue diffing, and unmount when the entry or `Out` disappears.

The component tree is determined where VNodes are patched: tunneled children are descendants of `Out`. Consequently:

- component injects resolve through destination ancestors and the destination app context;
- a provider wrapping only source `In` is not an ancestor at the mounted location and is not bridged;
- imported refs/reactive stores remain ordinary shared JavaScript state;
- refs carried by source-created VNodes are still assigned by Vue and are covered by regression tests, but two destinations would contend for the same logical ref.

For that last reason a tunnel permits one active `Out`. A concurrent second `Out` warns and renders nothing. It should be remounted after the first is removed if it is intended to become the destination.

## Why this is not Teleport

Teleport asks the current renderer to place children at another target supported by that renderer. A DOM renderer understands DOM selectors; a Three renderer understands Three host objects. The tunnel instead delays creation and hands the slot to a component already mounted by the destination renderer. Teleport may still be used *inside* tunneled content when the destination renderer supports it.

## TresJS independence

The core imports only Vue. It does not know about canvases, Three objects, Tres context, node operations, or pointer events. `TresCanvas` supplies the destination custom-renderer root; the tunnel only supplies content at `Out`. Tres's default provide bridge remains responsible for copying providers above the canvas into that root.
