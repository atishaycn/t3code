import { useMemo, useState } from "react";

export type KnowledgeGraphKind = "knowledge" | "skill" | "agent" | "eval";

export interface KnowledgeGraphNode {
  id: string;
  label: string;
  kind: KnowledgeGraphKind;
  description?: string;
}

export interface KnowledgeGraphEdge {
  id?: string;
  source: string;
  target: string;
  label?: string;
}

export interface KnowledgeGraphProps {
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
  selectedId?: string;
  onSelect?: (node: KnowledgeGraphNode | null) => void;
  className?: string;
}

const kinds: KnowledgeGraphKind[] = ["knowledge", "skill", "agent", "eval"];
const colors: Record<KnowledgeGraphKind, string> = {
  knowledge: "#8fbcbb",
  skill: "#d8a657",
  agent: "#b48ead",
  eval: "#88c0d0",
};

function layout(nodes: KnowledgeGraphNode[]) {
  const cx = 50;
  const cy = 50;
  const radius = Math.min(38, 12 + nodes.length * 2.2);
  return new Map(
    nodes.map((node, index) => {
      const angle = (index / Math.max(nodes.length, 1)) * Math.PI * 2 - Math.PI / 2;
      return [node.id, { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius }];
    }),
  );
}

export function KnowledgeGraph({
  nodes = [],
  edges = [],
  selectedId,
  onSelect,
  className = "",
}: KnowledgeGraphProps) {
  const [activeKinds, setActiveKinds] = useState<Set<KnowledgeGraphKind>>(() => new Set(kinds));
  const [internalSelected, setInternalSelected] = useState<string | undefined>(selectedId);
  const visibleNodes = useMemo(
    () => nodes.filter((node) => activeKinds.has(node.kind)),
    [activeKinds, nodes],
  );
  const visibleIds = useMemo(() => new Set(visibleNodes.map((node) => node.id)), [visibleNodes]);
  const positions = useMemo(() => layout(visibleNodes), [visibleNodes]);
  const selected = selectedId ?? internalSelected;
  const selectedNode = nodes.find((node) => node.id === selected);
  const brokenEdges = edges.filter(
    (edge) =>
      !nodes.some((node) => node.id === edge.source) ||
      !nodes.some((node) => node.id === edge.target),
  );
  const select = (node: KnowledgeGraphNode | null) => {
    setInternalSelected(node?.id);
    onSelect?.(node);
  };

  return (
    <section className={`knowledge-graph ${className}`} aria-label="Knowledge relationship graph">
      <div className="knowledge-graph__toolbar">
        <span className="knowledge-graph__eyebrow">Knowledge map</span>
        <div className="knowledge-graph__filters" aria-label="Filter graph by type">
          {kinds.map((kind) => {
            const checked = activeKinds.has(kind);
            return (
              <label
                className={`knowledge-graph__filter knowledge-graph__filter--${kind}`}
                key={kind}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() =>
                    setActiveKinds((current) => {
                      const next = new Set(current);
                      if (checked) next.delete(kind);
                      else next.add(kind);
                      return next;
                    })
                  }
                />
                <span>{kind}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="knowledge-graph__body">
        <div className="knowledge-graph__canvas">
          <svg
            className="knowledge-graph__svg"
            viewBox="0 0 100 100"
            role="img"
            aria-label={`${visibleNodes.length} visible nodes and ${edges.length} relationships`}
          >
            <defs>
              <marker
                id="knowledge-graph-arrow"
                markerWidth="6"
                markerHeight="6"
                refX="5"
                refY="3"
                orient="auto"
              >
                <path d="M0,0 L6,3 L0,6 z" fill="currentColor" />
              </marker>
            </defs>
            <g className="knowledge-graph__edges" aria-hidden="true">
              {edges
                .filter((edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target))
                .map((edge, index) => {
                  const source = positions.get(edge.source)!;
                  const target = positions.get(edge.target)!;
                  return (
                    <line
                      key={edge.id ?? `${edge.source}-${edge.target}-${index}`}
                      className="knowledge-graph__edge"
                      x1={source.x}
                      y1={source.y}
                      x2={target.x}
                      y2={target.y}
                      markerEnd="url(#knowledge-graph-arrow)"
                    />
                  );
                })}
            </g>
            <g className="knowledge-graph__nodes">
              {visibleNodes.map((node) => {
                const point = positions.get(node.id)!;
                const isSelected = node.id === selected;
                return (
                  <g
                    className={`knowledge-graph__node knowledge-graph__node--${node.kind} ${isSelected ? "is-selected" : ""}`}
                    key={node.id}
                    transform={`translate(${point.x} ${point.y})`}
                  >
                    <circle
                      className="knowledge-graph__node-hit-area"
                      r="8"
                      onClick={() => select(node)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          select(node);
                        }
                      }}
                      aria-label={`Select ${node.label}`}
                    />
                    <circle
                      className="knowledge-graph__node-dot"
                      r="3.2"
                      fill={colors[node.kind]}
                    />
                    <text className="knowledge-graph__node-label" y="6.5" textAnchor="middle">
                      {node.label}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
          <div className="knowledge-graph__legend" aria-label="Graph legend">
            {kinds.map((kind) => (
              <span key={kind}>
                <i style={{ backgroundColor: colors[kind] }} />
                {kind}
              </span>
            ))}
          </div>
        </div>

        <aside className="knowledge-graph__details" aria-live="polite">
          {selectedNode ? (
            <>
              <span className="knowledge-graph__eyebrow">Selected {selectedNode.kind}</span>
              <h3>{selectedNode.label}</h3>
              {selectedNode.description && <p>{selectedNode.description}</p>}
              <div className="knowledge-graph__link-summary">
                <span>Inbound</span>
                <strong>{edges.filter((edge) => edge.target === selectedNode.id).length}</strong>
                <span>Outbound</span>
                <strong>{edges.filter((edge) => edge.source === selectedNode.id).length}</strong>
              </div>
            </>
          ) : (
            <p className="knowledge-graph__empty">Select a node to inspect its relationships.</p>
          )}
          {brokenEdges.length > 0 && (
            <div className="knowledge-graph__broken">
              <strong>Broken edges ({brokenEdges.length})</strong>
              {brokenEdges.slice(0, 4).map((edge, index) => (
                <span key={edge.id ?? index}>
                  {edge.source} → {edge.target}
                </span>
              ))}
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
