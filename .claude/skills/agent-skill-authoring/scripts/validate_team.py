#!/usr/bin/env python3
"""Validate the expert team: .claude/agents/*.md and .claude/skills/*/SKILL.md.

Run from the project root:  python3 .claude/skills/agent-skill-authoring/scripts/validate_team.py
Exits 1 if any ERROR is found. WARN lines are advisory.
"""
import os, re, sys

ROOT = os.getcwd()
AG = os.path.join(ROOT, ".claude", "agents")
SK = os.path.join(ROOT, ".claude", "skills")
NAME_RE = re.compile(r"^[a-z0-9][a-z0-9-]{0,255}$")
AGENT_FIELDS = {"name","description","tools","disallowedTools","model","permissionMode","maxTurns","autoCompactWindow",
                "skills","mcpServers","hooks","memory","background","omitClaudeMd","effort","isolation","color",
                "initialPrompt","experimental"}
SKILL_FIELDS = {"name","description","when_to_use","argument-hint","arguments","disable-model-invocation","user-invocable",
                "allowed-tools","disallowed-tools","model","effort","context","agent","background","hooks","paths","shell",
                "metadata","license","compatibility"}
errors, warns = [], []

def parse(path):
    text = open(path, encoding="utf-8").read()
    if not text.startswith("---\n"):
        return None, text
    end = text.find("\n---", 4)
    if end < 0:
        return None, text
    raw, body = text[4:end], text[end + 4:]
    try:
        import yaml
        data = yaml.safe_load(raw) or {}
    except ImportError:  # minimal fallback parser
        data, key = {}, None
        for line in raw.splitlines():
            if line.startswith("  - ") and key:
                data.setdefault(key, []).append(line[4:].strip()); continue
            m = re.match(r"^([A-Za-z_-]+):\s*(.*)$", line)
            if m:
                key, val = m.group(1), m.group(2)
                data[key] = val.strip('"') if val else []
    except Exception as e:  # yaml error
        errors.append(f"{path}: YAML does not parse ({e})"); return {}, body
    return data, body

# skills
skills = {}
for d in sorted(os.listdir(SK)) if os.path.isdir(SK) else []:
    p = os.path.join(SK, d, "SKILL.md")
    if not os.path.isfile(p):
        if os.path.isdir(os.path.join(SK, d)): errors.append(f"skill folder {d}: missing SKILL.md")
        continue
    data, body = parse(p)
    if data is None:
        errors.append(f"{p}: frontmatter must start on line 1"); continue
    for k in data:
        if k not in SKILL_FIELDS: warns.append(f"{p}: unknown field '{k}' (ignored by Claude Code)")
    name = data.get("name", d)
    if name != d: warns.append(f"{p}: name '{name}' differs from folder '{d}'")
    if not NAME_RE.match(d): errors.append(f"skill folder '{d}': use lowercase letters, digits, hyphens")
    desc = str(data.get("description", "")).strip()
    if not desc: errors.append(f"{p}: missing description")
    if len(desc) + len(str(data.get("when_to_use", ""))) > 1536: warns.append(f"{p}: description+when_to_use over 1,536 chars (truncated)")
    if "<" in desc or ">" in desc: warns.append(f"{p}: angle brackets in description display as &lt; &gt;")
    lines = (open(p, encoding="utf-8").read().count("\n"))
    if lines > 500: warns.append(f"{p}: {lines} lines (keep SKILL.md under 500)")
    if data.get("context") == "fork" and data.get("agent") and not os.path.isfile(os.path.join(AG, f"{data['agent']}.md")):
        builtin = {"Explore", "Plan", "general-purpose"}
        if data["agent"] not in builtin: warns.append(f"{p}: agent '{data['agent']}' has no file in .claude/agents (check its name field)")
    skills[d] = data

# agents
agents, used = {}, set()
total_desc = 0
for root, _, files in os.walk(AG):
    for fn in sorted(files):
        if not fn.endswith(".md"): continue
        p = os.path.join(root, fn)
        data, body = parse(p)
        if not data or "name" not in data:
            warns.append(f"{p}: no name in frontmatter, so it is treated as documentation"); continue
        name = str(data["name"])
        for k in data:
            if k not in AGENT_FIELDS: warns.append(f"{p}: unknown field '{k}' (ignored by Claude Code)")
        if not NAME_RE.match(name) or ":" in name: errors.append(f"{p}: invalid name '{name}'")
        if name in agents: errors.append(f"{p}: duplicate agent name '{name}' (also {agents[name]})")
        agents[name] = p
        desc = str(data.get("description", "")).strip()
        if not desc: errors.append(f"{p}: missing description (Claude Code skips the file)")
        total_desc += len(desc)
        if not body.strip(): warns.append(f"{p}: empty system prompt")
        sk = data.get("skills") or []
        if isinstance(sk, str): sk = [s.strip() for s in sk.split(",") if s.strip()]
        if len(sk) > 32: warns.append(f"{p}: {len(sk)} skills; only the first 32 are preloaded")
        for s in sk:
            used.add(s)
            if s not in skills: errors.append(f"{p}: preloads missing skill '{s}'")
            elif str(skills[s].get("disable-model-invocation", "")).lower() in ("true", "yes", "on", "1"):
                errors.append(f"{p}: preloads '{s}', which sets disable-model-invocation (can't be preloaded)")
        tools = str(data.get("tools", ""))
        if "Agent" in tools and name != "expert-orchestrator":
            warns.append(f"{p}: has the Agent tool; by convention only expert-orchestrator spawns subagents")

for s, d in skills.items():
    manual = str(d.get("disable-model-invocation", "")).lower() in ("true", "yes", "on", "1")
    if s not in used and not manual: warns.append(f"skill '{s}' is not preloaded by any agent")

n = len(agents)
if not 10 <= n <= 50: errors.append(f"team has {n} agents; keep it between 10 and 50")
if total_desc > 40000: warns.append(f"agent descriptions total {total_desc} chars; keep them brief (15k-token warning)")

# sync checks (advisory)
def read(p):
    try: return open(os.path.join(ROOT, p), encoding="utf-8").read()
    except OSError: warns.append(f"{p} not found"); return ""
roster, routing, claude_md = read("docs/expert-roster.md"), read(".claude/skills/team-routing/SKILL.md"), read("CLAUDE.md")
for a in agents:
    if f"`{a}`" not in roster: warns.append(f"agent '{a}' missing from docs/expert-roster.md")
    if a not in claude_md: warns.append(f"agent '{a}' missing from CLAUDE.md")
    if a not in ("expert-orchestrator", "team-builder") and f"`{a}`" not in routing:
        warns.append(f"agent '{a}' missing from team-routing map")
for s in skills:
    if f"`{s}`" not in roster: warns.append(f"skill '{s}' missing from docs/expert-roster.md")

for w in warns: print("WARN ", w)
for e in errors: print("ERROR", e)
print(f"\n{n} agents, {len(skills)} skills, {len(errors)} errors, {len(warns)} warnings")
sys.exit(1 if errors else 0)
