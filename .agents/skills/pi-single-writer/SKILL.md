---
name: pi-single-writer
description: Safely serialize edits with an operational single-writer lease and auditable handoff.
---
# pi-single-writer
Lease record: `{leaseId, runId, writer, writeSet, authority, acquiredAt, expiresAt, renewals, status}`. Admission atomically checks authority, identity, scope, and no active overlap; conflict rejects. Renew before expiry and verify authority, owner, token, and unchanged scope; release records outcome and is idempotent. A missing, expired, unverifiable, or conflicting lease means **stop immediately** (fail closed), with no edits.

## Procedure
Declare contract and write set, acquire lease, verify before every write, serialize edits, validate, then release and report changed files/tests/risks. Observers are read-only.

## Completion gate
Exactly one verified lease owner covers every changed path, and release/evidence is recorded. Guidance never substitutes for lease authority.
