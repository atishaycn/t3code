# Cloud control plane

The product combines the agentsUI cloud workbench with t3code's backend runtime.

## Authority boundaries

- **t3code backend is authoritative** for provider processes, provider instances, sessions, threads, turns, messages, approvals, command receipts, replay, authentication, and source-control operations.
- **Cloud control-plane domain is authoritative** for workflow definitions and runs, parent/child agent bindings, task contracts, writer leases, completion gates, evidence, findings, skill pins, and governed knowledge candidates.
- **The agentsUI cloud interface is the primary UI** for projects, orchestrators, subagents, live workflows, reviews, and knowledge. Canonical t3 thread views remain available for transcript detail.
- **Pi is a server-side provider/runtime.** Browser modules never import the Pi SDK or access Pi session files.

The cloud domain references canonical t3 project, thread, and turn IDs. It must not copy transcript or provider-session state into a second authority.

## Skills and knowledge

Project skills live under `.agents/skills`. Discovery treats `SKILL.md` as inert text, computes a content hash, validates dependencies, and pins the exact hash used by a workflow attempt. Pi's implicit skill and extension loading remains disabled.

Learnings become candidates. A doctor validates schema, provenance, path containment, secrets, and hash integrity. Promotion requires explicit user approval, an active single-writer lease, atomic write and rehash, and rollback on failed verification.

## Runtime invariants

- Mutations pass through authenticated typed RPC and durable command IDs.
- Event projections are sequence-aware and reconnect through replay without duplicating output.
- A workflow may run multiple read-only workers but at most one workspace writer in an overlapping write set.
- Provider-session identity is opaque to the UI.
- Accepted commands are not treated as completed work; terminal events and evidence close gates.
- Recovery reconciles persisted state before resuming interrupted work.

## Provenance

The initial cloud UI and governed orchestration source is `agentsUI` commit `8cc48e6`. The t3code integration baseline is `pingdotgg/t3code` commit `c1ec1915`.
