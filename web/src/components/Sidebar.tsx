import { useMemo, useState } from "react";
import { Avatar, ModelBadge } from "./Avatar";
import { AGENTS, GROUP_ORDER, modelLabel, ORCHESTRATOR_ID, TEAM_ID, agentById } from "../types";

interface Props {
  active: string;
  busy: Record<string, boolean>;
  onSelect: (id: string) => void;
  onClose: () => void;
}

export function Sidebar({ active, busy, onSelect, onClose }: Props) {
  const [query, setQuery] = useState("");
  const orchestrator = agentById(ORCHESTRATOR_ID);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const match = (a: (typeof AGENTS)[number]) =>
      !q || [a.name, a.title, a.id, a.voice, a.description, a.group].some((s) => s.toLowerCase().includes(q));
    const byGroup = new Map<string, typeof AGENTS>();
    for (const a of AGENTS.filter(match)) {
      byGroup.set(a.group, [...(byGroup.get(a.group) ?? []), a]);
    }
    const order = [...GROUP_ORDER, ...[...byGroup.keys()].filter((g) => !GROUP_ORDER.includes(g))];
    return order.filter((g) => byGroup.has(g)).map((g) => ({ group: g, agents: byGroup.get(g)! }));
  }, [query]);

  return (
    <aside className="sidebar" aria-label="Experts">
      <div className="sidebar-head">
        <div>
          <div className="brand">☕ Experts21</div>
          <div className="brand-sub">Miami specialty coffee advisory team</div>
        </div>
        <button className="icon-btn close-sidebar" onClick={onClose} aria-label="Close menu">
          ✕
        </button>
      </div>

      <button className={`team-btn ${active === TEAM_ID ? "active" : ""}`} onClick={() => onSelect(TEAM_ID)}>
        <span className="team-icon" aria-hidden="true">
          ✦
        </span>
        <span className="team-text">
          <strong>Ask the whole team</strong>
          <span>
            {orchestrator ? `${orchestrator.name} routes your question to the right experts` : "Routed by the orchestrator"}
          </span>
        </span>
        {busy[TEAM_ID] && <span className="dot" aria-label="working" />}
      </button>

      <input
        className="search"
        type="search"
        placeholder={`Search ${AGENTS.length} agents`}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search agents"
      />

      <nav className="agent-list">
        {groups.map(({ group, agents }) => (
          <section key={group}>
            <h3>{group}</h3>
            <ul>
              {agents.map((a) => {
                const target = a.id === ORCHESTRATOR_ID ? TEAM_ID : a.id;
                return (
                  <li key={a.id}>
                    <button
                      className={`agent-item ${active === target ? "active" : ""}`}
                      onClick={() => onSelect(target)}
                      title={a.description}
                    >
                      <Avatar name={a.name} color={a.color} />
                      <span className="agent-text">
                        <span className="agent-line">
                          <strong>{a.name}</strong>
                          <ModelBadge label={modelLabel(a.model)} />
                          {busy[target] && <span className="dot" aria-label="working" />}
                        </span>
                        <span className="agent-title">{a.title}</span>
                        <span className="agent-voice">{a.voice}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
        {groups.length === 0 && <p className="empty-search">No agents match “{query}”.</p>}
      </nav>
    </aside>
  );
}
