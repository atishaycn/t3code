import { CheckCircle2, CircleDashed, LockKeyhole, Network } from "lucide-react";

interface WorkflowSurfaceProps {
  projectName: string;
  threadCount: number;
}

/**
 * Workflow status rendered from t3-owned state only.
 *
 * Mutation controls intentionally remain unavailable until the authenticated
 * cloud RPC and durable workflow store are installed. The browser must never
 * fall back to a localhost daemon or invent workflow state from chat threads.
 */
export function WorkflowSurface({ projectName, threadCount }: WorkflowSurfaceProps) {
  return (
    <section className="surface-card workflow-surface" aria-labelledby="workflow-title">
      <span className="eyebrow">Governed orchestration</span>
      <h1 id="workflow-title">Workflows</h1>
      <p>
        {projectName} is connected to the t3 backend. {threadCount} canonical provider
        {threadCount === 1 ? " thread is" : " threads are"} available for governed binding.
      </p>

      <div className="workflow-definition-list">
        <article className="workflow-definition-card">
          <span className="workflow-definition-card__icon">
            <Network size={20} />
          </span>
          <div>
            <strong>Contract → context → execution → review</strong>
            <p>Dependency gates and evidence remain explicit throughout the run.</p>
          </div>
          <CheckCircle2 size={18} aria-label="Definition installed" />
        </article>
        <article className="workflow-definition-card">
          <span className="workflow-definition-card__icon">
            <LockKeyhole size={20} />
          </span>
          <div>
            <strong>Single workspace writer</strong>
            <p>Read-only workers may run concurrently; overlapping writes require one lease.</p>
          </div>
          <CheckCircle2 size={18} aria-label="Policy installed" />
        </article>
      </div>

      <div className="workflow-gate-card" role="status">
        <CircleDashed size={20} />
        <div>
          <strong>No workflow run is active</strong>
          <p>
            Launch controls will activate only after the authenticated cloud RPC, durable run store,
            and Pi provider are ready. No browser-local daemon is used.
          </p>
        </div>
      </div>
    </section>
  );
}
