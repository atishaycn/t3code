---
name: pi-independent-review
description: Independently assess implementation scope, correctness, security boundaries, and reproducible evidence.
---

# pi-independent-review

Review contract, baseline, diff boundary, and tests without editing. Capture commands exactly (argv, cwd, exit code, stdout/stderr hash). Artifact schema: `{reviewId, runId, baseline, changedFiles, diffBoundary, commands[], findings[], disposition}`. Finding schema: `{id, severity:blocker|high|medium|low|nit, file, line, evidence, recommendation}`. Classify blockers before nits; verify links and fail-closed behavior.

## Fail closed

Review cannot authorize access or override policy. If diff, baseline, reviewer independence, or enforcement evidence is unavailable, **stop immediately** and report blocked.

## Completion gate

Artifact is structured, diff boundary and command capture are complete, and disposition is pass, fix-required, or blocked.
