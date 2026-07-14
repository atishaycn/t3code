import type { CSSProperties, PointerEvent } from "react";
import type { AgentRecord } from "../../cloud/types";

interface AgentCloudProps {
  agent: AgentRecord;
  root?: boolean;
  parentLabel?: string;
  selected: boolean;
  position: { x: number; y: number };
  onSelect: () => void;
  onDragStart: (event: PointerEvent<HTMLButtonElement>, threadId: string) => void;
}

const activeStates = new Set(["planning", "running", "verifying"]);

export function AgentCloud({
  agent,
  root = false,
  parentLabel,
  selected,
  position,
  onSelect,
  onDragStart,
}: AgentCloudProps) {
  const active = activeStates.has(agent.status);
  const style: CSSProperties = {
    left: `${position.x}%`,
    top: `${position.y}%`,
  };

  return (
    <button
      type="button"
      className={`cloud-node ${root ? "cloud-node--root" : ""} ${active ? "is-active" : ""} ${selected ? "is-selected" : ""}`}
      style={style}
      onClick={onSelect}
      onPointerDown={(event) => onDragStart(event, agent.threadId)}
      aria-label={`${agent.name}, ${agent.role}, ${agent.status}`}
      title="Drag to arrange this agent"
    >
      <span className="cloud-halo" aria-hidden="true" />
      <span className="cloud-body">
        <span className="cloud-kicker">
          {root ? "Primary orchestrator" : `${agent.role}${parentLabel ? ` · ${parentLabel}` : ""}`}
        </span>
        <span className="cloud-name">{agent.name}</span>
        <span className="cloud-status">
          <span className={`status-dot status-dot--${agent.status}`} aria-hidden="true" />
          {agent.status}
        </span>
        <span className="cloud-activity">{agent.activity || "Ready"}</span>
      </span>
    </button>
  );
}
