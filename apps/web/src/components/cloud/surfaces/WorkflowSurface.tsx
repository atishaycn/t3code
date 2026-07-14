"use client";
/* Workflow payloads are adapter-normalized but intentionally extensible across runtime versions. */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useCallback, useEffect, useState } from "react";

type Workflow = {
  name: string;
  description?: string;
  items?: number;
  sourceScope?: string;
  sourceHash?: string;
};
type Run = {
  id: string;
  name?: string;
  workflowName?: string;
  status?: string;
  workflowHash?: string;
  items?: Record<string, any>;
  gates?: any[];
  artifacts?: any[];
  evidence?: any[];
  findings?: any[];
};

const daemonUrl = process.env.NEXT_PUBLIC_AGENT_DAEMON_URL || "http://127.0.0.1:4545";

export function WorkflowSurface() {
  const [tab, setTab] = useState<"catalog" | "run">("catalog");
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [selected, setSelected] = useState<Run | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [catalog, history] = await Promise.all([
        fetch(`${daemonUrl}/api/workflows`),
        fetch(`${daemonUrl}/api/workflows/runs`),
      ]);
      if (!catalog.ok || !history.ok) throw new Error("Workflow data could not be loaded.");
      const catalogJson = (await catalog.json()) as { data?: Workflow[] };
      const historyJson = (await history.json()) as { data?: Run[] };
      setWorkflows(Array.isArray(catalogJson.data) ? catalogJson.data : []);
      setRuns(Array.isArray(historyJson.data) ? historyJson.data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);
  const refreshSelected = useCallback(async () => {
    if (!selected) return;
    const response = await fetch(
      `${daemonUrl}/api/workflows/runs/${encodeURIComponent(selected.id)}`,
    );
    if (response.ok) setSelected((await response.json()) as Run);
  }, [selected]);
  useEffect(() => {
    if (
      tab !== "run" ||
      !selected ||
      ["completed", "failed", "cancelled"].includes(selected.status || "")
    )
      return;
    const timer = window.setInterval(() => void refreshSelected(), 1500);
    return () => window.clearInterval(timer);
  }, [tab, selected, refreshSelected]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    void load();
  }, [load]);
  async function action(path: string, body?: unknown) {
    setBusy(path);
    setError(null);
    try {
      const response = await fetch(`${daemonUrl}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body || {}),
      });
      if (!response.ok) {
        const failure = (await response.json()) as { error?: string };
        throw new Error(failure.error || "Workflow action failed.");
      }
      const value = (await response.json()) as { id?: string };
      if (value.id) {
        const detail = await fetch(
          `${daemonUrl}/api/workflows/runs/${encodeURIComponent(value.id)}`,
        );
        if (detail.ok) setSelected(await detail.json());
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }
  async function start(name: string) {
    await action("/api/workflows/runs", { name, args: {} });
    await load();
    setTab("run");
  }
  function selectRun(run: Run) {
    setSelected(run);
    setTab("run");
  }
  const run = selected;

  return (
    <section className="surface-card workflow-surface" aria-labelledby="workflow-title">
      <div className="surface-heading">
        <div>
          <span className="eyebrow">Normalized workflow runtime</span>
          <h1 id="workflow-title">Workflows</h1>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading}>
          Refresh
        </button>
      </div>
      <div className="inspector-tabs" role="tablist" aria-label="Workflow views">
        <button
          role="tab"
          aria-selected={tab === "catalog"}
          className={tab === "catalog" ? "is-active" : ""}
          onClick={() => setTab("catalog")}
        >
          Catalog
        </button>
        <button
          role="tab"
          aria-selected={tab === "run"}
          className={tab === "run" ? "is-active" : ""}
          onClick={() => setTab("run")}
        >
          Run detail & review
        </button>
      </div>
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <p className="empty-state">Loading workflows…</p>
      ) : tab === "catalog" ? (
        <div className="workflow-grid">
          {workflows.length === 0 ? (
            <p className="empty-state">No workflows are available.</p>
          ) : (
            workflows.map((workflow) => (
              <article className="surface-card" key={workflow.name}>
                <span className="eyebrow">{workflow.sourceScope || "built-in"}</span>
                <h2>{workflow.name}</h2>
                <p>{workflow.description || "No description provided."}</p>
                <small>
                  {workflow.items || 0} tasks · source hash {workflow.sourceHash || "not reported"}
                </small>
                <button
                  type="button"
                  onClick={() => void start(workflow.name)}
                  disabled={busy !== null}
                >
                  Start workflow
                </button>
              </article>
            ))
          )}
        </div>
      ) : (
        <div className="workflow-detail">
          {!run ? (
            <>
              <h2>Run history</h2>
              {runs.length === 0 ? (
                <p className="empty-state">No runs yet. Start a workflow from Catalog.</p>
              ) : (
                <ul aria-label="Workflow run history">
                  {runs.map((historyRun) => (
                    <li key={historyRun.id}>
                      <button type="button" onClick={() => selectRun(historyRun)}>
                        {historyRun.workflowName || historyRun.id} ·{" "}
                        {historyRun.status || "unknown"}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <>
              <div className="surface-heading">
                <div>
                  <span className="eyebrow">{run.workflowName || run.name}</span>
                  <h2>{run.id}</h2>
                  <p>
                    Status: <strong>{run.status || "unknown"}</strong> · hash{" "}
                    {run.workflowHash || "not reported"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    void action(`/api/workflows/runs/${encodeURIComponent(run.id)}/cancel`)
                  }
                  disabled={busy !== null}
                >
                  Cancel
                </button>
              </div>
              <h3>Timeline</h3>
              <ol className="workflow-timeline">
                {Object.entries(run.items || {}).map(([id, item]) => (
                  <li key={id}>
                    <strong>{item.title || id}</strong>
                    <span>{item.status || "pending"}</span>
                    <small>
                      role: {item.contract?.role || "not reported"} · permissions:{" "}
                      {item.contract?.permissionProfile || "not reported"}
                    </small>
                    {item.contract?.dependencies?.length ? (
                      <small>
                        Dependencies:{" "}
                        {item.contract.dependencies.map((d: any) => d.itemId).join(", ")}
                      </small>
                    ) : null}
                    <button
                      type="button"
                      onClick={() =>
                        void action(`/api/workflows/runs/${encodeURIComponent(run.id)}/retry`, {
                          itemId: id,
                        })
                      }
                      disabled={busy !== null}
                    >
                      Retry
                    </button>
                  </li>
                ))}
              </ol>
              <h3>Review & gates</h3>
              <div className="workflow-evidence">
                <p>
                  Artifacts: {run.artifacts?.length || 0} · Evidence: {run.evidence?.length || 0} ·
                  Findings: {run.findings?.length || 0}
                </p>
                {(run.gates || []).map((gate: any) => (
                  <div key={gate.id}>
                    <strong>{gate.title || gate.id}</strong>
                    <span>{gate.state}</span>
                    <button
                      type="button"
                      onClick={() =>
                        void action(`/api/workflows/runs/${encodeURIComponent(run.id)}/gate`, {
                          gateId: gate.id,
                          resolution: { decision: "approved" },
                        })
                      }
                      disabled={busy !== null}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void action(`/api/workflows/runs/${encodeURIComponent(run.id)}/gate`, {
                          gateId: gate.id,
                          resolution: { decision: "rejected" },
                        })
                      }
                      disabled={busy !== null}
                    >
                      Reject
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
