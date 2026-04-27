# T3 Code Operating Brief

## Purpose

- T3 Code is a very early GUI for coding agents, with web and desktop shells.
- In this fork, Pi is first-class and project-specific, not incidental. Future work should treat Pi support, Pi runtime defaults, and Pi extension inheritance as core product behavior.
- Success criteria for changes: preserve predictable session/runtime behavior under reconnects, restarts, partial streams, and load; prefer performance and reliability over convenience.
- Default posture: execute end-to-end when the request is clear. Keep diffs small unless a broader refactor is the simpler long-term fix.

## Startup Routine

- Read [AGENTS.md](/Users/suns/Developer/t3code/AGENTS.md) first.
- Check branch and worktree state before editing.
- Read only the minimum files needed to understand the touched area, then implement.
- Keep this file current when architecture, commands, or boundaries change materially.

## Monorepo Shape

- `apps/server`: Node/Effect backend, CLI entrypoint, HTTP/WebSocket server, provider orchestration, auth, persistence, git, terminals, observability.
- `apps/web`: React 19 + Vite frontend for threads, composer, terminal, diffs, routing, and WebSocket client state.
- `apps/desktop`: Electron shell around the web app and server.
- `apps/marketing`: separate marketing site; keep product-app changes out of it unless the task explicitly requires both.
- `packages/contracts`: shared schemas/contracts only. No app-specific runtime logic.
- `packages/shared`: shared runtime utilities with explicit subpath exports. Do not introduce barrel-style exports.
- `packages/client-runtime`: small client runtime helpers shared by the web app.
- `scripts`: repo-level dev, release, docs, and packaging helpers.
- `.pi/extensions/autoresearch-soul.ts`: project-local Pi extension that injects the repo's autoresearch/execution-first operating stance into Pi.
- `.pi/settings.json`: current project-local Pi settings file; empty right now, but still part of the supported Pi setup surface.
- `docs/pi-provider-fork-merge-guide.md`: maintenance guide for carrying the Pi provider fork against upstream T3 Code.

## Core Architecture

- Server entrypoint is [apps/server/src/bin.ts](/Users/suns/Developer/t3code/apps/server/src/bin.ts), which runs the Effect CLI from [apps/server/src/cli.ts](/Users/suns/Developer/t3code/apps/server/src/cli.ts).
- Runtime composition lives in [apps/server/src/server.ts](/Users/suns/Developer/t3code/apps/server/src/server.ts). This is the main place where HTTP routes, WebSocket RPC, providers, orchestration, persistence, auth, git, terminals, workspace services, and observability are wired together.
- Codex app-server integration is centered on [apps/server/src/codexAppServerManager.ts](/Users/suns/Developer/t3code/apps/server/src/codexAppServerManager.ts) plus provider/orchestration layers under `apps/server/src/provider` and `apps/server/src/orchestration`.
- Pi provider runtime is centered on `apps/server/src/provider/Layers/PiProvider.ts`, `apps/server/src/provider/Layers/PiAdapter.ts`, `apps/server/src/provider/Services/PiAdapter.ts`, `apps/server/src/provider/pi/PiRpc.ts`, and `apps/server/src/provider/piTurnCompletion.ts`.
- Pi settings are server-authoritative through [apps/server/src/serverSettings.ts](/Users/suns/Developer/t3code/apps/server/src/serverSettings.ts) and [packages/contracts/src/settings.ts](/Users/suns/Developer/t3code/packages/contracts/src/settings.ts). Current defaults matter: Pi is enabled by default, `fullAutonomy` defaults to `true`, `inheritExtensions` defaults to `true`, and text-generation model selection defaults to provider `pi`.
- Web app boot starts at [apps/web/src/main.tsx](/Users/suns/Developer/t3code/apps/web/src/main.tsx) and [apps/web/src/router.ts](/Users/suns/Developer/t3code/apps/web/src/router.ts). Routes, RPC state, and orchestration projections live under `apps/web/src/routes`, `apps/web/src/rpc`, and adjacent state modules.
- Pi model/provider selection is exposed in the web app through files such as [apps/web/src/modelSelection.ts](/Users/suns/Developer/t3code/apps/web/src/modelSelection.ts), `apps/web/src/session-logic.ts`, and provider-aware composer/settings components.
- Observability is local-trace-first. See [docs/observability.md](/Users/suns/Developer/t3code/docs/observability.md). Normal logs are mostly stdout; persisted truth is the NDJSON trace file plus targeted diagnostic artifacts.

## Pi Setup And Operating Model

- This repo ships a project-local Pi extension at [`.pi/extensions/autoresearch-soul.ts`](/Users/suns/Developer/t3code/.pi/extensions/autoresearch-soul.ts) instead of depending on a packaged `autoresearch` install.
- The extension appends explicit autoresearch principles to Pi's system prompt and registers `/autoresearch-principles` for inspecting the active guidance.
- The intended Pi setup from [README.md](/Users/suns/Developer/t3code/README.md) is:
  - run `pi` from this repo, or
  - launch Pi through the embedded Pi provider with extension inheritance enabled, or
  - run Pi RPC with this repo as the working directory
- Pi extension inheritance is a product invariant for this fork. If Pi no longer discovers project-local extensions, treat that as a regression.
- Pi launcher/RPC behavior is intentionally isolated under `apps/server/src/provider/pi/*` and Pi-specific provider layers. Prefer adapting Pi to shared upstream/provider interfaces rather than scattering `if (provider === "pi")` logic across unrelated modules.
- The fork maintenance playbook is [docs/pi-provider-fork-merge-guide.md](/Users/suns/Developer/t3code/docs/pi-provider-fork-merge-guide.md). When upstream changes overlap, preserve upstream structure first, then reapply Pi as a clean extension of that structure.
- Any change touching provider registries, settings schemas, model selection, or session lifecycle should be checked for Pi fallout even if the task is not explicitly "about Pi".

## Boundaries And Invariants

- Preserve Pi provider behavior and project-local Pi setup. If provider/session flow changes, inspect the server provider layers, orchestration layers, client event handling, and Pi settings/schema together.
- Keep `packages/contracts` schema-only.
- Keep shared runtime helpers in `packages/shared` reusable and exported via explicit subpaths only.
- Prefer extracting duplicated logic instead of adding one-off logic in server or web feature code.
- Treat session lifecycle, reconnect behavior, checkpointing, persistence, and WebSocket/orchestration event flow as high-risk surfaces. Verify these changes narrowly and explicitly.
- Do not silently change Pi defaults such as `inheritExtensions`, `fullAutonomy`, launcher resolution, or provider/model registration without updating docs/tests and explaining why.
- Preserve the project-local autoresearch stance unless the task explicitly asks to change Pi behavior.
- Do not lightly change release/version scripts, desktop packaging flow, or observability persistence paths without reading the related docs/scripts first.
- README/doc local Markdown links are checked by `bun run docs:lint`; keep relative links valid when editing docs.

## Run And Verify

- Install: `bun install .`
- Full web dev loop: `bun dev`
- Server-only dev: `bun dev:server`
- Web-only dev: `bun dev:web`
- Desktop dev: `bun dev:desktop`
- Production-style server start: `bun start`
- Desktop start: `bun start:desktop`
- Marketing preview: `bun start:marketing`

- Required before considering a task complete:
  - `bun fmt`
  - `bun lint`
  - `bun typecheck`
  - When a feature is complete and tested, commit it and then run `bun run push:dmg`.
- Use `bun run test` when tests are needed. Never run `bun test`.
- Useful additional checks:
  - `bun run docs:lint` for Markdown link integrity
  - `bun run check` for format-check + lint + typecheck + docs lint
  - `bun run test:desktop-smoke` for desktop smoke coverage when desktop behavior changes

## Working Defaults For Codex

- Start from the real code, not the docs alone. The repo is moving quickly and some summaries can drift.
- Prefer narrow verification for the touched subsystem before running broad checks.
- Favor correctness, resilience, and maintainability over localized hacks.
- If a task touches both server and web, trace the contract/event boundary through `packages/contracts` before editing either side.
- If a task touches providers, settings, startup, or model selection, include Pi-specific files in the inspection set by default.
- If a task touches dev ports, startup, or local runtime behavior, inspect [scripts/dev-runner.ts](/Users/suns/Developer/t3code/scripts/dev-runner.ts) and `turbo.json`.
- If a task involves upstream sync or merge conflict cleanup, read [docs/pi-provider-fork-merge-guide.md](/Users/suns/Developer/t3code/docs/pi-provider-fork-merge-guide.md) before editing shared provider code.
- Update this brief after meaningful architectural or workflow changes so future sessions inherit accurate context.

## Current Notes

- `program.md` did not previously exist; this file is the new repo operating brief.
- Current top-level verification requirement from repo instructions is stricter than the package defaults: always finish with `bun fmt`, `bun lint`, and `bun typecheck`.
- Current source of truth for server wiring is `apps/server/src/server.ts`, not older references to `wsServer.ts`.
- Pi setup is integral to this fork: project-local Pi extension, inherited extension discovery, Pi provider defaults, and the upstream-fork merge strategy should all be treated as active context, not optional documentation.
