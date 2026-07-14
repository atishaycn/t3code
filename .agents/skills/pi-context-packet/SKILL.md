---
name: pi-context-packet
description: Produce a bounded reproducible handoff with provenance, scope, and machine-readable outputs.
---

# pi-context-packet

Use `template.json`. Include owner, contract, repo/worktree scope, baseline ref/hash, allowed tools, inputs/outputs, reviewer, assumptions, blocked decisions, dependencies, output schema, timeouts, reporting route, and hashes. Facts require provenance; stale or missing evidence is explicit.

## Fail closed

A packet is not authorization. If session identity, path policy, approval, or other enforcement is absent, **stop immediately**; do not proceed or infer authority from transcript context.

## Completion gate

Recipient can act without guessing, all facts and hashes are recorded, and blocked decisions are surfaced. Route valid work contract -> context -> execution -> review.
