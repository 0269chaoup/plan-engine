/**
 * plan.ts — Core plan document operations
 */

import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { glob } from "glob";
import {
  renderPlan,
  renderPlansIndex,
  formatChangelogEntry,
  type PlanFrontmatter,
  type ChangelogEntry,
} from "./template.js";

// ── Constants ──────────────────────────────────────────────────────────────

const PLANS_DIR = "50-Knowledge/Permanent/Plans";

// ── Interfaces ─────────────────────────────────────────────────────────────

export interface PlanFile {
  relPath: string;
  title: string;
  status: string;
  domain: string;
  version: number;
  created: string;
  updated: string;
  content: string;
  frontmatter: PlanFrontmatter;
}

export interface PlanSummary {
  title: string;
  status: string;
  domain: string;
  version: number;
  updated: string;
  relPath: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 80);
}

function relativeToVault(vaultRoot: string, absPath: string): string {
  return path.relative(vaultRoot, absPath).replace(/\\/g, "/");
}

// ── Plan File Operations ───────────────────────────────────────────────────

/** Find a plan file by title (fuzzy match) */
export function findPlan(vaultRoot: string, title: string): PlanFile | null {
  const plansDir = path.join(vaultRoot, PLANS_DIR);
  if (!fs.existsSync(plansDir)) return null;

  const sanitized = sanitizeFilename(title);

  // Try exact match
  const exactPath = path.join(plansDir, `${sanitized}.md`);
  if (fs.existsSync(exactPath)) {
    return readPlan(vaultRoot, relativeToVault(vaultRoot, exactPath));
  }

  // Fuzzy search
  const files = fs.readdirSync(plansDir).filter(f => f.endsWith(".md") && f !== "INDEX.md");
  const titleWords = title.toLowerCase().split(/\s+/);

  for (const file of files) {
    const name = file.replace(/\.md$/, "").toLowerCase();
    if (titleWords.every(w => name.includes(w))) {
      return readPlan(vaultRoot, path.join(PLANS_DIR, file));
    }
  }

  return null;
}

/** Read a plan file */
export function readPlan(vaultRoot: string, relPath: string): PlanFile | null {
  const absPath = path.join(vaultRoot, relPath);
  if (!fs.existsSync(absPath)) return null;

  const raw = fs.readFileSync(absPath, "utf-8");
  let parsed: matter.GrayMatterFile<string>;

  try {
    parsed = matter(raw);
  } catch {
    return null;
  }

  const title = parsed.data.title ?? path.basename(relPath, ".md");

  return {
    relPath,
    title: String(title),
    status: parsed.data.status ?? "draft",
    domain: parsed.data.domain ?? "",
    version: parsed.data.version ?? 1,
    created: parsed.data.created ?? "",
    updated: parsed.data.updated ?? "",
    content: parsed.content,
    frontmatter: parsed.data as PlanFrontmatter,
  };
}

/** List all plan files */
export async function listPlans(
  vaultRoot: string,
  options?: { status?: string; domain?: string }
): Promise<PlanSummary[]> {
  const plansDir = path.join(vaultRoot, PLANS_DIR);
  if (!fs.existsSync(plansDir)) return [];

  const files = await glob("*.md", { cwd: plansDir });
  const results: PlanSummary[] = [];

  for (const file of files) {
    if (file === "INDEX.md") continue;

    const relPath = path.join(PLANS_DIR, file);
    const plan = readPlan(vaultRoot, relPath);
    if (!plan) continue;

    if (options?.status && plan.status !== options.status) continue;
    if (options?.domain && plan.domain !== options.domain) continue;

    results.push({
      title: plan.title,
      status: plan.status,
      domain: plan.domain,
      version: plan.version,
      updated: plan.updated,
      relPath,
    });
  }

  return results.sort((a, b) => b.updated.localeCompare(a.updated));
}

/** Create a new plan document */
export function createPlan(
  vaultRoot: string,
  title: string,
  options?: {
    domain?: string;
    background?: string;
    goals?: string;
    design?: string;
    steps?: string[];
  }
): { relPath: string; created: boolean } {
  const plansDir = path.join(vaultRoot, PLANS_DIR);
  if (!fs.existsSync(plansDir)) {
    fs.mkdirSync(plansDir, { recursive: true });
  }

  const sanitized = sanitizeFilename(title);
  const filePath = path.join(plansDir, `${sanitized}.md`);

  if (fs.existsSync(filePath)) {
    return { relPath: relativeToVault(vaultRoot, filePath), created: false };
  }

  const domain = options?.domain ?? title.split("-")[0] ?? "general";
  const content = renderPlan(title, domain, options);

  fs.writeFileSync(filePath, content, "utf-8");
  return { relPath: relativeToVault(vaultRoot, filePath), created: true };
}

/** Update plan content (append to a section) */
export function updatePlanSection(
  vaultRoot: string,
  title: string,
  section: string,
  content: string
): { relPath: string; updated: boolean } {
  const plan = findPlan(vaultRoot, title);
  if (!plan) {
    return { relPath: "", updated: false };
  }

  const absPath = path.join(vaultRoot, plan.relPath);
  const raw = fs.readFileSync(absPath, "utf-8");
  const lines = raw.split("\n");

  // Find the section
  const sectionHeader = `## ${section}`;
  let sectionIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === sectionHeader) {
      sectionIdx = i;
      break;
    }
  }

  if (sectionIdx === -1) {
    // Section not found, append it
    lines.push("", sectionHeader, "", content);
  } else {
    // Find end of section
    let endIdx = sectionIdx + 1;
    while (endIdx < lines.length && lines[endIdx].trim() === "") {
      endIdx++;
    }
    while (endIdx < lines.length) {
      if (lines[endIdx].trim().startsWith("## ") && endIdx > sectionIdx) break;
      endIdx++;
    }
    // Replace section content
    lines.splice(sectionIdx + 1, endIdx - sectionIdx - 1, "", content);
  }

  // Update frontmatter
  const updatedContent = lines.join("\n");
  const parsed = matter(updatedContent);
  parsed.data.updated = today();
  parsed.data.version = (parsed.data.version ?? 1) + 1;

  const newRaw = matter.stringify(parsed.content, parsed.data);
  fs.writeFileSync(absPath, newRaw, "utf-8");

  return { relPath: plan.relPath, updated: true };
}

/** Add a changelog entry to a plan */
export function addChangelog(
  vaultRoot: string,
  title: string,
  change: string
): { relPath: string; updated: boolean } {
  const plan = findPlan(vaultRoot, title);
  if (!plan) {
    return { relPath: "", updated: false };
  }

  const absPath = path.join(vaultRoot, plan.relPath);
  const raw = fs.readFileSync(absPath, "utf-8");
  const lines = raw.split("\n");

  // Find the changelog table
  let tableEndIdx = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].trim().startsWith("|") && !lines[i].trim().startsWith("|---")) {
      tableEndIdx = i;
      break;
    }
  }

  // Add new entry
  const entry: ChangelogEntry = {
    date: today(),
    version: plan.version + 1,
    change,
  };

  if (tableEndIdx === -1) {
    // No table found, add one
    lines.push("", "## 变更记录", "", "| 日期 | 版本 | 变更 |", "|------|------|------|");
    tableEndIdx = lines.length;
  }

  lines.splice(tableEndIdx + 1, 0, formatChangelogEntry(entry));

  // Update frontmatter
  const updatedContent = lines.join("\n");
  const parsed = matter(updatedContent);
  parsed.data.updated = today();
  parsed.data.version = (parsed.data.version ?? 1) + 1;

  const newRaw = matter.stringify(parsed.content, parsed.data);
  fs.writeFileSync(absPath, newRaw, "utf-8");

  return { relPath: plan.relPath, updated: true };
}

/** Update plan status */
export function updatePlanStatus(
  vaultRoot: string,
  title: string,
  status: string
): { relPath: string; updated: boolean } {
  const plan = findPlan(vaultRoot, title);
  if (!plan) {
    return { relPath: "", updated: false };
  }

  const absPath = path.join(vaultRoot, plan.relPath);
  const raw = fs.readFileSync(absPath, "utf-8");
  const parsed = matter(raw);

  parsed.data.status = status;
  parsed.data.updated = today();

  const newRaw = matter.stringify(parsed.content, parsed.data);
  fs.writeFileSync(absPath, newRaw, "utf-8");

  return { relPath: plan.relPath, updated: true };
}

/** Search plans by keyword */
export async function searchPlans(
  vaultRoot: string,
  query: string
): Promise<PlanSummary[]> {
  const allPlans = await listPlans(vaultRoot);
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 1);

  return allPlans.filter(plan => {
    const searchable = `${plan.title} ${plan.domain}`.toLowerCase();
    return queryWords.some(w => searchable.includes(w));
  });
}

/** Regenerate INDEX.md */
export async function regenerateIndex(vaultRoot: string): Promise<string> {
  const plans = await listPlans(vaultRoot);
  const indexContent = renderPlansIndex(plans);

  const plansDir = path.join(vaultRoot, PLANS_DIR);
  if (!fs.existsSync(plansDir)) {
    fs.mkdirSync(plansDir, { recursive: true });
  }

  const indexPath = path.join(plansDir, "INDEX.md");
  fs.writeFileSync(indexPath, indexContent, "utf-8");

  return relativeToVault(vaultRoot, indexPath);
}
