# Pi Provider Fork Merge Guide

This document explains exactly what the current `feat/add-pi-provider` branch changes, how to merge it into this fork's `main`, and how to keep it working cleanly when pulling future updates from the upstream source repository.

## Goal

This fork adds a new provider, **Pi**, on top of upstream T3 Code.

The implementation is intentionally layered so upstream changes can continue to land while the fork keeps its provider-specific code isolated and easy to reapply, review, and resolve during rebases or merges.

## Branch summary

Current branch:

- `feat/add-pi-provider`

Current delta from upstream/main at the time this guide was written:

- 1 branch-specific commit: `9b9f3ede` — `Add Pi provider support`

Scope of change:

- Adds a full Pi provider implementation on the server
- Registers Pi in provider registries and server startup wiring
- Extends shared contracts for provider/model/settings support
- Adds web UI support for choosing and configuring Pi
- Adds/updates tests for registry, settings, and model selection behavior

Approximate size of change:

- 30 files changed
- 3320 insertions
- 53 deletions

## Files changed on this branch

### Server

New files:

- `apps/server/src/provider/Layers/PiAdapter.ts`
- `apps/server/src/provider/Layers/PiProvider.ts`
- `apps/server/src/provider/Services/PiAdapter.ts`
- `apps/server/src/provider/Services/PiProvider.ts`
- `apps/server/src/provider/pi/PiRpc.ts`
- `apps/server/src/provider/piTurnCompletion.ts`

Updated files:

- `apps/server/src/git/Services/TextGeneration.ts`
- `apps/server/src/provider/Layers/ProviderAdapterRegistry.test.ts`
- `apps/server/src/provider/Layers/ProviderAdapterRegistry.ts`
- `apps/server/src/provider/Layers/ProviderRegistry.ts`
- `apps/server/src/provider/Layers/ProviderSessionDirectory.test.ts`
- `apps/server/src/provider/Layers/ProviderSessionDirectory.ts`
- `apps/server/src/provider/providerStatusCache.ts`
- `apps/server/src/server.ts`
- `apps/server/src/serverSettings.ts`

### Web

Updated files:

- `apps/web/src/components/KeybindingsToast.browser.tsx`
- `apps/web/src/components/chat/ChatComposer.tsx`
- `apps/web/src/components/chat/ProviderModelPicker.tsx`
- `apps/web/src/components/chat/TraitsPicker.tsx`
- `apps/web/src/components/chat/composerProviderRegistry.tsx`
- `apps/web/src/components/settings/SettingsPanels.tsx`
- `apps/web/src/composerDraftStore.ts`
- `apps/web/src/modelSelection.ts`
- `apps/web/src/session-logic.ts`
- `apps/web/src/store.ts`

New test:

- `apps/web/src/modelSelection.test.ts`

### Contracts

Updated files:

- `packages/contracts/src/model.ts`
- `packages/contracts/src/orchestration.ts`
- `packages/contracts/src/settings.ts`
- `packages/contracts/src/server.test.ts`

## Functional change map

### 1. New Pi provider runtime

The branch introduces a provider implementation for Pi with the same broad integration shape used by the existing providers:

- provider layer definitions
- provider adapter/service wiring
- RPC client implementation
- turn-completion handling

Primary files:

- `apps/server/src/provider/Layers/PiAdapter.ts`
- `apps/server/src/provider/Layers/PiProvider.ts`
- `apps/server/src/provider/pi/PiRpc.ts`
- `apps/server/src/provider/piTurnCompletion.ts`

### 2. Provider registration and availability

The branch updates server-side registries so Pi is recognized as a first-class provider by the application.

Primary files:

- `apps/server/src/provider/Layers/ProviderAdapterRegistry.ts`
- `apps/server/src/provider/Layers/ProviderRegistry.ts`
- `apps/server/src/provider/providerStatusCache.ts`
- `apps/server/src/server.ts`
- `apps/server/src/serverSettings.ts`

### 3. Shared schema and settings support

The branch extends shared contracts so Pi exists in the common provider/model/settings schema layer consumed by both server and web.

Primary files:

- `packages/contracts/src/model.ts`
- `packages/contracts/src/orchestration.ts`
- `packages/contracts/src/settings.ts`

### 4. Web UI integration

The branch updates the web app so users can:

- see Pi as a provider option
- select Pi-compatible models
- interact with provider-aware composer logic
- configure Pi-related settings in the settings UI

Primary files:

- `apps/web/src/components/chat/composerProviderRegistry.tsx`
- `apps/web/src/components/chat/ProviderModelPicker.tsx`
- `apps/web/src/components/settings/SettingsPanels.tsx`
- `apps/web/src/modelSelection.ts`
- `apps/web/src/store.ts`

### 5. Test coverage updates

The branch adds or updates tests where provider-aware behavior changed.

Primary files:

- `apps/server/src/provider/Layers/ProviderAdapterRegistry.test.ts`
- `apps/server/src/provider/Layers/ProviderSessionDirectory.test.ts`
- `apps/web/src/modelSelection.test.ts`
- `packages/contracts/src/server.test.ts`

## Recommended merge strategy into this fork's `main`

Because `main` is a fork and the source repository will continue to move, the safest long-term approach is:

1. keep the Pi work isolated in its own commits
2. merge or rebase upstream changes frequently
3. resolve conflicts by preserving upstream structure first, then reapplying the Pi-specific registrations and UI hooks

### Preferred approach: rebase the feature branch onto updated `main`

Use this when you want a clean history.

```bash
git checkout main
git fetch origin upstream
git merge --ff-only upstream/main

git checkout feat/add-pi-provider
git rebase main
```

After the rebase is green:

```bash
git checkout main
git merge --ff-only feat/add-pi-provider
```

### Alternative approach: merge `main` into the feature branch

Use this if conflict resolution is easier with explicit merge commits.

```bash
git checkout main
git fetch origin upstream
git merge --ff-only upstream/main

git checkout feat/add-pi-provider
git merge main
```

Then verify and merge back:

```bash
git checkout main
git merge feat/add-pi-provider
```

## Conflict-resolution priorities when upstream changes land

When future upstream updates touch the same areas, resolve conflicts in this order.

### Priority 1: contracts stay authoritative

If upstream changes provider/model/settings schemas, keep upstream naming, shapes, and validation patterns wherever possible, then reinsert Pi as an additional supported provider.

Files to inspect first:

- `packages/contracts/src/model.ts`
- `packages/contracts/src/settings.ts`
- `packages/contracts/src/orchestration.ts`

### Priority 2: provider registries must remain complete

If upstream adds new provider lifecycle hooks, status semantics, or registration requirements, apply those changes first and then ensure Pi is registered in the same pattern.

Files to inspect first:

- `apps/server/src/provider/Layers/ProviderAdapterRegistry.ts`
- `apps/server/src/provider/Layers/ProviderRegistry.ts`
- `apps/server/src/server.ts`
- `apps/server/src/serverSettings.ts`
- `apps/server/src/provider/providerStatusCache.ts`

### Priority 3: web provider selection logic must stay centralized

If upstream changes provider pickers, model-selection rules, or composer state handling, preserve any new shared logic and then re-add Pi through the same abstractions instead of introducing Pi-only special cases.

Files to inspect first:

- `apps/web/src/components/chat/composerProviderRegistry.tsx`
- `apps/web/src/components/chat/ProviderModelPicker.tsx`
- `apps/web/src/modelSelection.ts`
- `apps/web/src/store.ts`
- `apps/web/src/components/settings/SettingsPanels.tsx`

### Priority 4: Pi runtime internals should adapt to upstream interfaces, not the reverse

If upstream changes provider interfaces or event lifecycles, update Pi adapter/provider implementations to match upstream abstractions. Avoid forking common interfaces just to keep old Pi code unchanged.

Files to inspect first:

- `apps/server/src/provider/Layers/PiAdapter.ts`
- `apps/server/src/provider/Layers/PiProvider.ts`
- `apps/server/src/provider/Services/PiAdapter.ts`
- `apps/server/src/provider/Services/PiProvider.ts`
- `apps/server/src/provider/pi/PiRpc.ts`
- `apps/server/src/provider/piTurnCompletion.ts`

## Safe merge checklist

Run this checklist any time upstream is pulled into the fork or this branch is merged into `main`.

### 1. Refresh branches

```bash
git fetch origin upstream
```

### 2. Update fork `main`

```bash
git checkout main
git merge --ff-only upstream/main
```

### 3. Reapply or rebase Pi branch

```bash
git checkout feat/add-pi-provider
git rebase main
```

If conflicts occur, resolve them using the priorities above.

### 4. Verify changed surfaces manually

Server:

- provider registration
- provider status reporting
- session startup/wiring
- turn completion behavior

Web:

- provider picker
- model picker
- settings panel
- composer draft persistence

Contracts:

- provider enum/union coverage
- settings schema compatibility
- orchestration event compatibility

### 5. Run required validation

Per repository policy, all of the following must pass before considering the merge complete:

```bash
bun fmt
bun lint
bun typecheck
bun run test
```

## Recommended long-term maintenance strategy

To keep future upstream pulls seamless, preserve these rules.

### Keep Pi-specific logic isolated

Whenever possible:

- put Pi transport/RPC behavior in `apps/server/src/provider/pi/*`
- keep provider-layer wiring in `apps/server/src/provider/Layers/*`
- avoid spreading Pi-specific conditionals across unrelated shared modules

### Prefer extension points over branches in common logic

When upstream refactors shared provider logic, adapt Pi to the new extension point instead of adding one-off `if (provider === "pi")` logic in many places.

### Minimize schema drift

If upstream renames shared concepts, update Pi to use the new upstream names quickly. Small schema drift becomes expensive during later rebases.

### Keep tests provider-aware

Any time upstream changes provider selection, provider settings, or session handling, extend existing tests to include Pi rather than relying only on manual validation.

## Suggested future follow-up

To make future upstream syncing even easier, consider splitting the current branch into a small stack of focused commits:

1. contracts and settings
2. server provider registration
3. Pi runtime implementation
4. web UI integration
5. tests

That makes rebases easier because conflicts are resolved in smaller, logically isolated chunks.

## One-line operating rule

When upstream changes overlap with this fork, **take upstream structure first, then reapply Pi as a clean extension of that structure**.
