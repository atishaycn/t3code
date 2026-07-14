import { MagnifyingGlass, Plus } from "@phosphor-icons/react";
import { type CSSProperties, useMemo, useState } from "react";
import type { CodexProjectSummary } from "../../cloud/types";

interface ProjectCloudSpaceProps {
  projects: CodexProjectSummary[];
  activePath: string;
  disabled: boolean;
  loading: boolean;
  error: string | null;
  onSelect: (threadId: string) => void;
  onRetry: () => void;
  onNew: () => void;
}

function latestRoot(project: CodexProjectSummary) {
  return project.threads.find((thread) => !thread.parentThreadId);
}

function updatedLabel(value: string | undefined) {
  if (!value) return "No activity yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently active";
  return new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(
    Math.round((date.getTime() - Date.now()) / 86_400_000),
    "day",
  );
}

export function ProjectCloudSpace({
  projects,
  activePath,
  disabled,
  loading,
  error,
  onSelect,
  onRetry,
  onNew,
}: ProjectCloudSpaceProps) {
  const [query, setQuery] = useState("");
  const visibleProjects = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return normalized
      ? projects.filter((project) =>
          `${project.name} ${project.path}`.toLowerCase().includes(normalized),
        )
      : projects;
  }, [projects, query]);

  return (
    <section className="project-home" aria-labelledby="project-space-title">
      <div className="project-home__intro">
        <span className="eyebrow">Your work</span>
        <h1 id="project-space-title">What should move today?</h1>
        <p>Choose a project, describe the outcome, and let its orchestrator build the team.</p>
      </div>

      <div className="project-home__controls">
        <label className="project-search">
          <MagnifyingGlass size={17} aria-hidden="true" />
          <span className="sr-only">Search projects</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find a project"
          />
        </label>
        <button type="button" className="new-project-button" onClick={onNew}>
          <Plus size={16} weight="bold" /> New project
        </button>
      </div>

      {loading && !projects.length && (
        <div
          className="project-cloud-grid project-cloud-grid--loading"
          aria-label="Loading projects"
        >
          {Array.from({ length: 6 }, (_, index) => (
            <span key={index} />
          ))}
        </div>
      )}
      {!loading && error && !projects.length && (
        <div className="project-space__empty">
          <strong>Projects unavailable</strong>
          <span>{error}</span>
          <button type="button" onClick={onRetry}>
            Retry
          </button>
        </div>
      )}
      {!loading && !error && !projects.length && (
        <div className="project-space__empty">
          <strong>No projects yet</strong>
          <span>Start one with a folder and its first task.</span>
          <button type="button" onClick={onNew}>
            New project
          </button>
        </div>
      )}
      {!loading && projects.length > 0 && visibleProjects.length === 0 && (
        <div className="project-space__empty">
          <strong>No matching projects</strong>
          <span>Try a folder name or clear the search.</span>
        </div>
      )}

      {visibleProjects.length > 0 && (
        <div className="project-cloud-grid" aria-label={`${visibleProjects.length} projects`}>
          {visibleProjects.map((project, index) => {
            const thread = latestRoot(project);
            const active = project.path === activePath;
            const running = thread?.status === "active";
            return (
              <button
                type="button"
                className={`project-cloud ${active ? "is-current" : ""} ${running ? "is-running" : ""}`}
                style={
                  {
                    "--project-index": index,
                    "--project-offset": `${(index % 3) * 8}px`,
                  } as CSSProperties
                }
                key={project.path}
                disabled={disabled || !thread}
                onClick={() => thread && onSelect(thread.id)}
                aria-label={`${project.name}, ${thread ? `${project.threads.length} tasks` : "no primary task"}${active ? ", current project" : ""}`}
              >
                <span className="project-cloud__body">
                  <span className="project-cloud__signal">
                    <span className={`status-dot status-dot--${running ? "running" : "idle"}`} />
                    {running ? "Working" : "Ready"}
                  </span>
                  <strong>{project.name}</strong>
                  <span className="project-cloud__meta">
                    {thread
                      ? `${project.threads.length} ${project.threads.length === 1 ? "task" : "tasks"} · ${updatedLabel(thread.updatedAt)}`
                      : "No task yet"}
                  </span>
                  <span className="project-cloud__prompt">Open project</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
