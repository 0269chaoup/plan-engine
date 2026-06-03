/**
 * template.ts — 方案文档模板渲染模块
 *
 * 提供方案文档的模板渲染功能，包括：
 *   - 方案文档的完整 Markdown 模板（含 YAML frontmatter）
 *   - 方案索引页（INDEX.md）的渲染
 *   - 变更记录表格行的格式化
 *
 * 所有模板均使用中文，遵循 Obsidian Markdown 规范。
 */

/**
 * 方案文档 frontmatter 元数据接口
 * 定义了存储在 Markdown 文件顶部 YAML 块中的元数据字段
 */
export interface PlanFrontmatter {
  /** 文档类型，固定为 "Plan" */
  type: "Plan";
  /** 方案状态：draft（草稿）、active（进行中）、completed（已完成）、archived（归档） */
  status: "draft" | "active" | "completed" | "archived";
  /** 创建日期（YYYY-MM-DD 格式） */
  created: string;
  /** 最后更新日期（YYYY-MM-DD 格式） */
  updated: string;
  /** 版本号（正整数，每次更新递增） */
  version: number;
  /** 所属领域/分类标识 */
  domain: string;
}

/**
 * 变更记录条目接口
 * 对应变更记录表格中的一行数据
 */
export interface ChangelogEntry {
  /** 变更日期（YYYY-MM-DD 格式） */
  date: string;
  /** 变更对应的版本号 */
  version: number;
  /** 变更描述 */
  change: string;
}

/**
 * 生成新方案文档的默认 frontmatter
 *
 * 创建时自动设置：
 * - type 固定为 "Plan"
 * - status 默认为 "draft"（草稿）
 * - created 和 updated 设为当天日期
 * - version 初始化为 1
 *
 * @param title 方案标题
 * @param domain 所属领域/分类
 * @returns 初始化后的 frontmatter 对象
 */
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

/**
 * 使用模板渲染完整的方案文档
 *
 * 生成的文档结构：
 *   --- (YAML frontmatter 开始)
 *   type/status/created/updated/version/domain
 *   --- (YAML frontmatter 结束)
 *   # 标题
 *   ## 背景
 *   ## 目标
 *   ## 方案设计
 *   ## 实施状态（含 checkbox 列表）
 *   ## 变更记录（含表格）
 *
 * @param title 方案标题
 * @param domain 所属领域
 * @param options 可选的内容配置
 * @param options.background 背景章节内容（默认显示占位提示）
 * @param options.goals 目标章节内容（默认显示占位提示）
 * @param options.design 方案设计章节内容（默认显示占位提示）
 * @param options.steps 实施步骤列表（默认显示一个占位步骤）
 * @returns 完整的 Markdown 文档字符串
 */
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

  // 构建文档内容的行数组
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

  // 渲染实施步骤列表（带 checkbox）
  if (options?.steps && options.steps.length > 0) {
    for (const step of options.steps) {
      lines.push(`- [ ] ${step}`);
    }
  } else {
    lines.push("- [ ] （待补充）");
  }

  // 渲染变更记录表格（含表头和初始记录）
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

/**
 * 渲染方案文档索引页（INDEX.md）
 *
 * 生成的索引页按状态分组展示所有方案，使用 Obsidian Wiki 链接语法。
 * 分组顺序：active（进行中）→ draft（草稿）→ completed（已完成）→ archived（归档）
 *
 * @param plans 方案摘要列表
 * @returns 完整的 INDEX.md Markdown 内容
 */
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

  // 按状态分组
  const byStatus = new Map<string, typeof plans>();
  for (const p of plans) {
    const arr = byStatus.get(p.status) ?? [];
    arr.push(p);
    byStatus.set(p.status, arr);
  }

  /** 状态展示顺序（优先级从高到低） */
  const statusOrder = ["active", "draft", "completed", "archived"];

  /** 状态对应的图标映射 */
  const statusIcons: Record<string, string> = {
    active: "🌿",
    draft: "📝",
    completed: "✅",
    archived: "🗃️",
  };

  // 按状态顺序渲染分组
  for (const status of statusOrder) {
    const items = byStatus.get(status);
    if (!items || items.length === 0) continue;

    const icon = statusIcons[status] ?? "📄";
    lines.push(`## ${icon} ${status} (${items.length})`);
    lines.push("");

    // 组内按更新日期降序排序，使用 Obsidian Wiki 链接
    for (const item of items.sort((a, b) => b.updated.localeCompare(a.updated))) {
      lines.push(`- [[${item.title}]] — ${item.domain}（${item.updated}）`);
    }

    lines.push("");
  }

  return lines.join("\n");
}

/**
 * 将变更记录条目格式化为 Markdown 表格行
 *
 * @param entry 变更记录条目对象
 * @returns 格式化的表格行字符串，如 "| 2024-01-01 | v2 | 新增功能 |"
 */
export function formatChangelogEntry(entry: ChangelogEntry): string {
  return `| ${entry.date} | v${entry.version} | ${entry.change} |`;
}
