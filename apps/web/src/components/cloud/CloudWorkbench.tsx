import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Boxes, BrainCircuit, GitPullRequest, Network, Settings2 } from "lucide-react";
import { useMemo, useState } from "react";

import { AgentCloud } from "./AgentCloud";
import { ProjectCloudSpace } from "./ProjectCloudSpace";
import { WorkflowSurface } from "./surfaces/WorkflowSurface";
import type { AgentRecord, AgentStatus, CodexProjectSummary } from "../../cloud/types";
import "../../cloud/cloud.css";
import { SidebarInset } from "../ui/sidebar";
import { useProjects, useThreadShells } from "../../state/entities";

const surfaceNav = [
  ["workspace", "Workspace", Network],
  ["workflow", "Workflows", Boxes],
  ["inbox", "Inbox", GitPullRequest],
  ["memory", "Memory", BrainCircuit],
  ["control", "Control", Settings2],
] as const;

type Surface = (typeof surfaceNav)[number][0];

function agentStatus(thread: ReturnType<typeof useThreadShells>[number]): AgentStatus {
  if (thread.hasPendingApprovals || thread.hasPendingUserInput) return "waiting";
  if (thread.latestTurn?.state === "running") return "running";
  if (thread.latestTurn?.state === "error") return "failed";
  if (thread.latestTurn?.state === "interrupted") return "interrupted";
  if (thread.latestTurn?.state === "completed") return "completed";
  return "idle";
}

export function CloudWorkbench() {
  const navigate = useNavigate();
  const projects = useProjects();
  const threads = useThreadShells();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [surface, setSurface] = useState<Surface>("workspace");

  const projectSummaries = useMemo<CodexProjectSummary[]>(
    () =>
      projects.map((project) => ({
        path: project.workspaceRoot,
        name: project.title,
        threads: threads
          .filter((thread) => thread.projectId === project.id)
          .map((thread, index) => ({
            id: thread.id,
            projectPath: project.workspaceRoot,
            name: thread.title,
            preview: thread.hasPendingApprovals
              ? "Approval required"
              : thread.latestTurn?.state === "running"
                ? "Agent is working"
                : "Ready",
            status: thread.latestTurn?.state === "running" ? "active" : "idle",
            modelProvider: thread.modelSelection.instanceId,
            updatedAt: thread.updatedAt,
            parentThreadId:
              index === 0
                ? null
                : (threads.find((item) => item.projectId === project.id)?.id ?? null),
          })),
      })),
    [projects, threads],
  );

  const selectedProject =
    selectedProjectId === null
      ? null
      : (projects.find((project) => project.id === selectedProjectId) ?? null);
  const projectThreads = selectedProject
    ? threads.filter((thread) => thread.projectId === selectedProject.id)
    : [];
  const rootThread = projectThreads[0] ?? null;
  const agents = useMemo<AgentRecord[]>(
    () =>
      projectThreads.map((thread, index) => ({
        threadId: thread.id,
        parentThreadId: index === 0 ? null : (rootThread?.id ?? null),
        name: thread.title,
        role: index === 0 ? "orchestrator" : "worker",
        status: agentStatus(thread),
        model: thread.modelSelection.model,
        currentTurnId: thread.latestTurn?.turnId ?? null,
        runId: null,
        lastMessage: "",
        activity: thread.hasPendingApprovals
          ? "Approval required"
          : thread.hasPendingUserInput
            ? "Waiting for input"
            : thread.latestTurn?.state === "running"
              ? "Working through the current turn"
              : thread.latestTurn?.state === "error"
                ? "The last turn failed"
                : "Ready",
        updatedAt: thread.updatedAt,
      })),
    [projectThreads, rootThread?.id],
  );
  const rootAgent = agents[0] ?? null;
  const workers = agents.slice(1);
  const selectedAgent = agents.find((agent) => agent.threadId === selectedThreadId) ?? rootAgent;
  const activeCount = agents.filter((agent) =>
    ["planning", "running", "verifying"].includes(agent.status),
  ).length;

  const openProjectThread = (threadId: string) => {
    const thread = threads.find((candidate) => candidate.id === threadId);
    if (!thread) return;
    setSelectedProjectId(thread.projectId);
    setSelectedThreadId(thread.id);
  };

  if (!selectedProject) {
    return (
      <SidebarInset className="cloud-control-plane min-h-dvh overflow-auto">
        <main className="workbench-shell home-shell">
          <header className="topbar home-topbar">
            <div className="brand-lockup">
              <span className="brand-mark">
                <Network size={18} />
              </span>
              <span>Agent Cloud</span>
            </div>
            <p>Projects, orchestrators, and subagents.</p>
            <span className="connection-pill">t3 backend</span>
          </header>
          <ProjectCloudSpace
            projects={projectSummaries}
            activePath=""
            disabled={false}
            loading={false}
            error={null}
            onSelect={openProjectThread}
            onRetry={() => undefined}
            onNew={() => void navigate({ to: "/" })}
          />
        </main>
      </SidebarInset>
    );
  }

  const renderSurface = () => {
    if (surface === "workflow") return <WorkflowSurface />;
    if (surface === "inbox") {
      const waiting = agents.filter((agent) => agent.status === "waiting");
      return (
        <section className="surface-card">
          <span className="eyebrow">Human gates</span>
          <h1>Inbox</h1>
          <p>
            {waiting.length
              ? `${waiting.length} agent${waiting.length === 1 ? "" : "s"} need attention.`
              : "No approvals or questions are waiting."}
          </p>
          {waiting.map((agent) => (
            <button
              className="surface-list-row"
              key={agent.threadId}
              onClick={() => setSelectedThreadId(agent.threadId)}
            >
              <strong>{agent.name}</strong>
              <span>{agent.activity}</span>
            </button>
          ))}
        </section>
      );
    }
    if (surface === "memory")
      return (
        <section className="surface-card">
          <span className="eyebrow">Governed context</span>
          <h1>Memory and skills</h1>
          <p>
            Project skills are discovered from <code>.agents/skills</code>, content-addressed, and
            pinned to workflow attempts. Learnings remain candidates until explicit approval.
          </p>
        </section>
      );
    if (surface === "control")
      return (
        <section className="surface-card">
          <span className="eyebrow">Runtime authority</span>
          <h1>Pi orchestration control</h1>
          <p>
            t3code owns provider sessions and replay. Pi executes governed agent roles while the
            workflow runtime enforces dependencies, gates, and a single workspace writer.
          </p>
        </section>
      );
    return null;
  };

  if (surface !== "workspace") {
    return (
      <SidebarInset className="cloud-control-plane min-h-dvh overflow-auto">
        <main className="workbench-shell surface-shell">
          <header className="topbar surface-topbar">
            <button
              type="button"
              className="workspace-back"
              onClick={() => setSelectedProjectId(null)}
            >
              <ArrowLeft size={16} /> Projects
            </button>
            <div className="brand-lockup">
              <span className="brand-mark">
                <Network size={18} />
              </span>
              <span>Agent Cloud</span>
            </div>
            <span className="connection-pill">{selectedProject.title}</span>
          </header>
          <nav className="surface-nav" aria-label="Project navigation">
            {surfaceNav.map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                className={surface === id ? "is-active" : ""}
                onClick={() => setSurface(id)}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </nav>
          <section className="surface-stage">{renderSurface()}</section>
        </main>
      </SidebarInset>
    );
  }

  return (
    <SidebarInset className="cloud-control-plane min-h-dvh overflow-auto">
      <main className="workbench-shell">
        <header className="topbar">
          <button
            type="button"
            className="workspace-back"
            onClick={() => setSelectedProjectId(null)}
          >
            <ArrowLeft size={16} /> Projects
          </button>
          <div className="project-identity">
            <span className="eyebrow">Project</span>
            <strong>{selectedProject.title}</strong>
            <span className="project-path">{selectedProject.workspaceRoot}</span>
          </div>
          <div className="runtime-strip">
            <span className="connection-pill is-connected">t3 backend + Pi</span>
          </div>
        </header>
        <nav className="surface-nav" aria-label="Project navigation">
          {surfaceNav.map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              className={surface === id ? "is-active" : ""}
              onClick={() => setSurface(id)}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </nav>
        <section className="workspace-grid">
          <div className="stage-column">
            <div className="stage-heading">
              <div>
                <span className="eyebrow">Subagent workflow</span>
                <h1>{selectedProject.title}</h1>
                <p>One orchestrator coordinates bounded workers through durable gates.</p>
              </div>
              <div className="stage-metrics">
                <span>
                  <strong>{activeCount}</strong> active
                </span>
                <span>
                  <strong>{workers.length}</strong> workers
                </span>
                <span>
                  <strong>{agents.filter((agent) => agent.status === "waiting").length}</strong>{" "}
                  gates
                </span>
              </div>
            </div>
            <div className="graph-canvas" aria-label="Agent workflow graph">
              <svg
                className="connection-map"
                viewBox="0 0 1000 620"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                {workers.map((_, index) => {
                  const y = workers.length > 1 ? 18 + index * (64 / (workers.length - 1)) : 50;
                  return (
                    <path
                      key={index}
                      className="connection is-flowing"
                      d={`M 220 310 C 390 310, 450 ${y * 6.2}, 620 ${y * 6.2}`}
                    />
                  );
                })}
              </svg>
              {rootAgent && (
                <AgentCloud
                  agent={rootAgent}
                  root
                  selected={selectedAgent?.threadId === rootAgent.threadId}
                  position={{ x: 18, y: 50 }}
                  onSelect={() => setSelectedThreadId(rootAgent.threadId)}
                  onDragStart={() => undefined}
                />
              )}
              {workers.map((agent, index) => (
                <AgentCloud
                  key={agent.threadId}
                  agent={agent}
                  parentLabel="orchestrator"
                  selected={selectedAgent?.threadId === agent.threadId}
                  position={{
                    x: 62,
                    y: workers.length > 1 ? 18 + index * (64 / (workers.length - 1)) : 50,
                  }}
                  onSelect={() => setSelectedThreadId(agent.threadId)}
                  onDragStart={() => undefined}
                />
              ))}
              {!rootAgent && (
                <div className="graph-empty">
                  <strong>No agent threads yet</strong>
                  <span>Start a task from the t3 sidebar to create the project orchestrator.</span>
                </div>
              )}
            </div>
          </div>
          <aside className="inspector">
            <div className="inspector-tabs">
              <button className="is-active">Agent</button>
              <button onClick={() => setSurface("workflow")}>Run</button>
            </div>
            <div className="inspector-content">
              {selectedAgent ? (
                <>
                  <div className="inspector-title">
                    <span className={`status-dot status-dot--${selectedAgent.status}`} />
                    <div>
                      <span className="eyebrow">{selectedAgent.role}</span>
                      <h2>{selectedAgent.name}</h2>
                    </div>
                  </div>
                  <p>{selectedAgent.activity}</p>
                  <dl className="fact-list">
                    <div>
                      <dt>Status</dt>
                      <dd>{selectedAgent.status}</dd>
                    </div>
                    <div>
                      <dt>Model</dt>
                      <dd>{selectedAgent.model ?? "Default"}</dd>
                    </div>
                  </dl>
                  <button
                    className="primary-action"
                    onClick={() =>
                      void navigate({
                        to: "/$environmentId/$threadId",
                        params: {
                          environmentId:
                            projectThreads.find((thread) => thread.id === selectedAgent.threadId)
                              ?.environmentId ?? projectThreads[0]!.environmentId,
                          threadId: selectedAgent.threadId,
                        },
                      })
                    }
                  >
                    Open thread
                  </button>
                </>
              ) : (
                <p>Select an agent to inspect its work.</p>
              )}
            </div>
          </aside>
        </section>
      </main>
    </SidebarInset>
  );
}
