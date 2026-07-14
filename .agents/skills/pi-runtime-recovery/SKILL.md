---
name: pi-runtime-recovery
description: Fence interrupted or unsafe runs using snapshots, quarantine, disposition, and verified resume authority.
---
# pi-runtime-recovery
Snapshot schema `{snapshotId, runId, capturedAt, durableTransition, nodes, leases, approvals, processes, hashes}`. Assign disposition `resume|retry|cancel|quarantine|terminal`; quarantine ambiguous or conflicting state. Resume authority must verify snapshot freshness, identity, leases, approvals, dependencies, and hashes, then record a new transition; never resume by inference.

## Fail closed
If snapshot integrity, fencing, persistence, identity, or resume authority is absent, **stop immediately**, quarantine, and require explicit recovery decision.

## Completion gate
No duplicate writer or unsafe downstream action exists; disposition and evidence are recorded and fresh gates authorize any resume.
