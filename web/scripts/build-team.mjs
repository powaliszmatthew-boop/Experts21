#!/usr/bin/env node
// Reads the expert team from this repo at build time and writes two files:
//   netlify/shared/team.generated.ts    - full prompts, skills, knowledge, docs (server only)
//   src/generated/roster.generated.json - public roster for the sidebar (no prompts)
//
// Sources (relative to the repo root):
//   .claude/agents/<agent>.md        frontmatter + system prompt
//   .claude/skills/<skill>/SKILL.md  skills preloaded through the agent's `skills` field
//   knowledge/<agent>/**             each agent's private knowledge folder
//   docs/README.md, docs/0*.md       shared research
//   docs/agent-brains.md             group column for the sidebar

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(here, "..");
const repoRoot = path.resolve(webDir, "..");

const AGENTS_DIR = path.join(repoRoot, ".claude/agents");
const SKILLS_DIR = path.join(repoRoot, ".claude/skills");
const KNOWLEDGE_DIR = path.join(repoRoot, "knowledge");
const DOCS_DIR = path.join(repoRoot, "docs");

const TEXT_EXTENSIONS = new Set([".md", ".markdown", ".txt", ".csv", ".tsv", ".json", ".yaml", ".yml"]);
const MAX_KNOWLEDGE_FILE_BYTES = 200_000;

const rel = (p) => path.relative(repoRoot, p).split(path.sep).join("/");

function fail(msg) {
  console.error(`build-team: ${msg}`);
  process.exit(1);
}

// Minimal frontmatter parser for the fields this repo uses:
// `key: value`, `key: "quoted value"`, and `key:` followed by `  - item` lines.
function parseFrontmatter(text, file) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) fail(`${rel(file)} has no frontmatter`);
  const data = {};
  let listKey = null;
  for (const line of m[1].split(/\r?\n/)) {
    if (!line.trim()) continue;
    const item = line.match(/^\s+-\s+(.*)$/);
    if (item && listKey) {
      data[listKey].push(unquote(item[1].trim()));
      continue;
    }
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!kv) continue;
    const [, key, value] = kv;
    if (value === "") {
      data[key] = [];
      listKey = key;
    } else {
      data[key] = unquote(value.trim());
      listKey = null;
    }
  }
  return { data, body: m[2].trim() };
}

function unquote(v) {
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1).replace(/\\"/g, '"');
  }
  return v;
}

function section(body, heading) {
  const re = new RegExp(`^## ${heading}\\s*$([\\s\\S]*?)(?=^## |\\Z)`, "m");
  const m = body.match(re);
  return m ? m[1].trim() : "";
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (entry.isFile()) out.push(p);
  }
  return out;
}

// Group per agent from the table in docs/agent-brains.md.
function readGroups() {
  const file = path.join(DOCS_DIR, "agent-brains.md");
  const groups = {};
  if (!fs.existsSync(file)) return groups;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\|\s*([^|`]+?)\s*\|\s*`([a-z0-9-]+)`\s*\|\s*\*\*/);
    if (m) groups[m[2]] = m[1];
  }
  return groups;
}

function readSkill(name) {
  const file = path.join(SKILLS_DIR, name, "SKILL.md");
  if (!fs.existsSync(file)) fail(`skill "${name}" not found at ${rel(file)}`);
  const { data, body } = parseFrontmatter(fs.readFileSync(file, "utf8"), file);
  return { name, description: data.description ?? "", path: rel(file), content: body };
}

function readKnowledge(agent) {
  const dir = path.join(KNOWLEDGE_DIR, agent);
  const files = [];
  const skipped = [];
  for (const file of walk(dir)) {
    const ext = path.extname(file).toLowerCase();
    const size = fs.statSync(file).size;
    if (!TEXT_EXTENSIONS.has(ext)) {
      skipped.push({ path: rel(file), reason: `file type ${ext || "(none)"} can't be read by the web app` });
    } else if (size > MAX_KNOWLEDGE_FILE_BYTES) {
      skipped.push({ path: rel(file), reason: `larger than ${MAX_KNOWLEDGE_FILE_BYTES / 1000} KB` });
    } else {
      files.push({ path: rel(file), content: fs.readFileSync(file, "utf8") });
    }
  }
  return { folder: rel(dir) + "/", files, skipped };
}

function readDocs() {
  const names = fs
    .readdirSync(DOCS_DIR)
    .filter((n) => n === "README.md" || /^\d\d-.*\.md$/.test(n))
    .sort((a, b) => (a === "README.md" ? -1 : b === "README.md" ? 1 : a.localeCompare(b)));
  return names.map((n) => ({ path: `docs/${n}`, content: fs.readFileSync(path.join(DOCS_DIR, n), "utf8") }));
}

function main() {
  if (!fs.existsSync(AGENTS_DIR)) fail(`agents folder not found at ${AGENTS_DIR}`);
  const groups = readGroups();
  const agentFiles = fs.readdirSync(AGENTS_DIR).filter((n) => n.endsWith(".md")).sort();
  const agents = [];
  const warnings = [];

  for (const fileName of agentFiles) {
    const file = path.join(AGENTS_DIR, fileName);
    const { data, body } = parseFrontmatter(fs.readFileSync(file, "utf8"), file);
    const id = data.name;
    if (!id) fail(`${rel(file)} has no name`);

    const persona = section(body, "Persona");
    const personName = persona.match(/You are \*\*([^*]+)\*\*/)?.[1] ?? id;
    const voice = persona.match(/\*\*Voice:\*\*\s*(.+)/)?.[1]?.trim() ?? "";
    const workingStyle = persona.match(/\*\*Working style:\*\*\s*(.+)/)?.[1]?.trim() ?? "";
    const title =
      persona.match(/the team's ([^.\n]+)\./)?.[1]?.trim() ??
      body.match(/You are the \*\*([^*]+)\*\*/)?.[1] ??
      id;

    const skillNames = Array.isArray(data.skills) ? data.skills : [];
    const skills = skillNames.map(readSkill);
    const knowledge = readKnowledge(id);
    for (const s of knowledge.skipped) warnings.push(`${s.path}: skipped (${s.reason})`);

    agents.push({
      id,
      name: personName,
      title,
      group: groups[id] ?? "Other",
      model: data.model ?? "inherit",
      color: data.color ?? "gray",
      description: data.description ?? "",
      voice,
      workingStyle,
      sourcePath: rel(file),
      prompt: body,
      skills,
      knowledge,
    });
  }

  if (!agents.some((a) => a.id === "expert-orchestrator")) fail("expert-orchestrator agent is missing");

  // The orchestrator uses team-routing and cross-expert-synthesis; make sure both are loaded
  // even if its `skills` list changes.
  const extraSkills = {};
  for (const name of ["team-routing", "cross-expert-synthesis", "source-verification"]) {
    extraSkills[name] = readSkill(name);
  }

  const docs = readDocs();
  const generatedAt = new Date().toISOString();

  const team = { generatedAt, docs, agents, extraSkills };
  const roster = {
    generatedAt,
    agents: agents.map(({ id, name, title, group, model, color, description, voice, workingStyle, knowledge, skills }) => ({
      id,
      name,
      title,
      group,
      model,
      color,
      description,
      voice,
      workingStyle,
      skills: skills.map((s) => s.name),
      knowledgeFiles: knowledge.files.map((f) => f.path),
    })),
  };

  const serverOut = path.join(webDir, "netlify/shared/team.generated.ts");
  const clientOut = path.join(webDir, "src/generated/roster.generated.json");
  fs.mkdirSync(path.dirname(serverOut), { recursive: true });
  fs.mkdirSync(path.dirname(clientOut), { recursive: true });
  fs.writeFileSync(serverOut, `// Generated by scripts/build-team.mjs. Do not edit.\nconst team: unknown = ${JSON.stringify(team)};\nexport default team;\n`);
  fs.writeFileSync(clientOut, JSON.stringify(roster, null, 2));

  const knowledgeCount = agents.reduce((n, a) => n + a.knowledge.files.length, 0);
  console.log(
    `build-team: ${agents.length} agents, ${new Set(agents.flatMap((a) => a.skills.map((s) => s.name))).size} skills, ` +
      `${knowledgeCount} knowledge files, ${docs.length} docs -> ${path.relative(webDir, serverOut)}, ${path.relative(webDir, clientOut)}`,
  );
  for (const w of warnings) console.warn(`build-team: warning: ${w}`);
}

main();
