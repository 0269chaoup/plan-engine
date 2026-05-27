/**
 * template.ts — Plan document templates
 */

export interface PlanFrontmatter {
  type: "Plan";
  status: "draft" | "active" | "completed" | "archived";
  created: string;
  updated: string;
  version: number;
  domain: string;
}

export interface ChangelogEntry {
  date: string;
  version: number;
  change: string;
}

/** Default frontmatter for a new plan */
export function defaultFrontmatter(title: string, domain: string): PlanFrontmatter {
  const today = new Date().toISOString().slice(0, 10);
  return {
    type: "Plan",
    status: "draft",
    created: today,
    updated: today,
    version: 1,
    domain,
  };
}

/** Render plan document from template */
export function renderPlan(
  title: string,
  domain: string,
  options?: {
    background?: string;
    goals?: string;
    design?: string;
    steps?: string[];
  }
): string {
  const fm = defaultFrontmatter(title, domain);
  const today = fm.created;

  const lines = [
    "---",
    `type: ${fm.type}`,
    `status: ${fm.status}`,
    `created: ${fm.created}`,
    `updated: ${fm.updated}`,
    `version: ${fm.version}`,
    `domain: ${fm.domain}`,
    "---",
    "",
    `# ${title}`,
    "",
    "## 背景",
    "",
    options?.background ?? "（待补充：为什么需要这个方案？解决什么问题？）",
    "",
    "## 目标",
    "",
    options?.goals ?? "（待补充：要达成什么效果？）",
    "",
    "## 方案设计",
    "",
    options?.design ?? "（待补充：具体的设计方案）",
    "",
    "## 实施状态",
    "",
  ];

  if (options?.steps && options.steps.length > 0) {
    for (const step of options.steps) {
      lines.push(`- [ ] ${step}`);
    }
  } else {
    lines.push("- [ ] （待补充）");
  }

  lines.push(
    "",
    "## 变更记录",
    "",
    "| 日期 | 版本 | 变更 |",
    "|------|------|------|",
    `| ${today} | v1 | 初稿 |`,
    ""
  );

  return lines.join("\n");
}

/** Render INDEX.md for the Plans directory */
export function renderPlansIndex(plans: { title: string; status: string; domain: string; updated: string }[]): string {
  const today = new Date().toISOString().slice(0, 10);

  const lines = [
    "---",
    `title: "方案文档索引"`,
    `type: TechNote`,
    `status: 🍂 Completed`,
    `created: ${today}`,
    `updated: ${today}`,
    "---",
    "",
    "# 方案文档索引",
    "",
    `> 📊 **${plans.length}** 个方案文档`,
    "",
  ];

  // Group by status
  const byStatus = new Map<string, typeof plans>();
  for (const p of plans) {
    const arr = byStatus.get(p.status) ?? [];
    arr.push(p);
    byStatus.set(p.status, arr);
  }

  const statusOrder = ["active", "draft", "completed", "archived"];
  const statusIcons: Record<string, string> = {
    active: "🌿",
    draft: "📝",
    completed: "✅",
    archived: "🗃️",
  };

  for (const status of statusOrder) {
    const items = byStatus.get(status);
    if (!items || items.length === 0) continue;

    const icon = statusIcons[status] ?? "📄";
    lines.push(`## ${icon} ${status} (${items.length})`);
    lines.push("");

    for (const item of items.sort((a, b) => b.updated.localeCompare(a.updated))) {
      lines.push(`- [[${item.title}]] — ${item.domain}（${item.updated}）`);
    }

    lines.push("");
  }

  return lines.join("\n");
}

/** Format a changelog entry as a table row */
export function formatChangelogEntry(entry: ChangelogEntry): string {
  return `| ${entry.date} | v${entry.version} | ${entry.change} |`;
}
