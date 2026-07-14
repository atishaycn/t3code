---
name: pi-workflow-run
description: Execute dependency-gated workflows with bounded retries, idempotency, cancellation, and recovery.
---
# pi-workflow-run
Each node records owner, dependencies, inputs, outputs, timeout, and idempotency key. Persist transitions `ready -> running -> passed|failed|cancelled|blocked`; downstream requires passed gates. Retry only classified retryable failures, with explicit count and bounded exponential backoff; never retry non-idempotent work without a fresh key/approval. Cancellation transitions running to cancelled and prevents new work; recovery reconciles durable state and resumes only verified ready nodes.

## Fail closed
If transition authority, durable state, approval, lease, timeout, or idempotency enforcement is absent, **stop immediately**, quarantine the run, and do not execute or resume.

## Completion gate
Retry count/backoff, cancellation, recovery transition, evidence, and terminal disposition are recorded; no downstream node bypasses a failed gate.
