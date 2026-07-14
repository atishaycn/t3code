---
name: pi-feedback-loop
description: Record traceable feedback signals, test negative cases, and propose governed improvements.
---

# pi-feedback-loop

Feedback record: `{feedbackId, runId, receivedAt, source, category, statement, evidence[], dedupeKey, confidence, negativeTests[], rejectionRationale, disposition}`. Categories are preference, correction, defect, procedure, or noise. Deduplicate by stable key; require provenance and confidence. Test negative cases and route durable candidates to pi-knowledge-loop; never mutate runtime directly.

## Fail closed

If run ID, provenance, dedupe, confidence, negative-test, or approval enforcement is absent, **stop immediately** and reject or quarantine the record.

## Completion gate

Record is schema-valid, classified, traceable, and explicitly proposed or rejected with rationale.
