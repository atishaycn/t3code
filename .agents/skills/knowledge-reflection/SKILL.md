---
name: knowledge-reflection
description: Collect and classify evidence from completed runs, routing durable proposals for governed promotion.
---

# Knowledge reflection

Only collect completed-run evidence, corrections, and verified procedures; exclude secrets, transient logs, and one-off facts. Classify signal as preference, defect, procedure, or noise and record provenance, confidence, negative tests, and rejection rationale. Emit a candidate only; route promotion to `pi-knowledge-loop`.

## Fail closed

If run identity, evidence provenance, or classification authority is absent, **stop immediately** and emit no candidate. Reflection never promotes or changes runtime behavior.

## Completion gate

Evidence collection/classification and candidate schema are complete, with run ID and hashes; explicit approval and promotion remain exclusively in pi-knowledge-loop.
