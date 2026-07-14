---
name: pi-contract
description: Define bounded work, authority, evidence, and acceptance gates before execution.
---
# pi-contract
A contract records owner, repository and worktree scope, baseline (ref and hash), allowed tools, inputs, outputs, reviewer, assumptions, blocked decisions, dependencies, output schema, timeouts, reporting route, hashes, and gates. Use `template.json`; every field is populated or explicitly null.

## Procedure
Capture objective and in/out scope; resolve ambiguity into assumptions and stop on blocked decisions. Bind each output to an observable check and reviewer. Required chain is contract -> context -> execution -> review.

## Fail closed
A contract is not authorization. If policy, approval, lease, or required enforcement is absent, **stop immediately** and report blocked; never infer authority from the contract.

## Completion gate
All fields and gates have evidence, hashes identify inputs/outputs, and unresolved decisions remain blocked.
