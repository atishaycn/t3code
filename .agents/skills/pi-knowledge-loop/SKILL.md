---
name: pi-knowledge-loop
description: Doctor, approve, promote, rehash, and roll back durable knowledge with provenance.
---
# pi-knowledge-loop
Doctor checks: schema, required fields, provenance, secret scan, link/path containment, duplicate topics, and hash integrity. Candidate record `{candidateId, runId, topic, evidence[], classification, confidence, negativeTests[], rejectionRationale, baseHash, candidateHash}`. Approval record `{approvalId, candidateId, reviewer, decision, rationale, at}`. Promotion atomically records `{promotionId, candidateId, oldHash, newHash, verifiedAt}`; rehash records algorithm/input/output; rollback records target hash, authority, reason, and verification.

## Procedure
Collect evidence, classify update/new/skill, run doctor, obtain explicit approval, promote atomically, rehash and verify; rollback on failed verification.

## Fail closed
If doctor, provenance, approval, atomic persistence, hash, or rollback authority is absent, **stop immediately** and do not promote.

## Completion gate
Candidate, approval, promotion/rehash or rollback records and checks are complete.
