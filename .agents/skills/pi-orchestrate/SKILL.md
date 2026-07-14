---
name: pi-orchestrate
description: Route explicitly user-invoked Pi work to contract, context, execution, review, knowledge, feedback, or recovery.
disable-model-invocation: true
---
# pi-orchestrate
This router is **explicitly user-invoked only** via `/skill:pi-orchestrate`; it never auto-invokes. Identify the dominant concern and route one focused skill. Required execution chain may be contract -> context -> execution -> review, only when each preceding completion gate permits the next.

## Routes
Contract/acceptance -> `pi-contract`; handoff -> `pi-context-packet`; writes -> `pi-single-writer`; DAG/retries -> `pi-workflow-run`; completed change -> `pi-independent-review`; knowledge -> `pi-knowledge-loop`; correction -> `pi-feedback-loop`; interruption -> `pi-runtime-recovery`.

## Fail closed
If invocation is not explicit, or route authority/approval/enforcement is absent, **stop immediately** and report blocked. Never grant authorization or skip a gate.

## Completion gate
Record invocation, selected route, prerequisite gate, and structured output schema; stop if any is missing.
