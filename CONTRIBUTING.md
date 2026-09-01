# Contributing

Install Node 20.19 or newer and pnpm 10, then run:

```bash
pnpm install
pnpm check
```

Changes to renderer semantics need regression coverage in the plain-object custom renderer. Tres-specific claims also need a browser test against the public `@tresjs/core` API. Keep the runtime Vue-only and avoid private Vue or renderer internals.

Please keep commits focused and update the architecture or limitations documents when behavior changes.
