/**
 * plan.ts — 方案文档核心操作模块
 *
 * 提供方案文档的完整 CRUD 操作，包括：
 *   - 查找（精确匹配 + 模糊搜索）
 *   - 读取与解析（带 frontmatter 元数据）
 *   - 创建新方案文档
 *   - 更新章节内容
 *   - 添加变更记录
 *   - 更新状态
 *   - 全文搜索
 *   - 重新生成 INDEX.md 索引
 *
 * 所有方案文档存储在 Obsidian vault 的 "50-Knowledge/Permanent/Plans" 目录下，
 * 使用 Markdown 格式，带有 YAML frontmatter 元数据。
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

// ── 常量 ──────────────────────────────────────────────────────────────

/** 方案文档在 Obsidian vault 中的存储目录（相对于 vault 根目录） */
const PLANS_DIR = "50-Knowledge/Permanent/Plans";

// ── 接口定义 ──────────────────────────────────────────────────────────

/**
 * 完整的方案文件信息接口
 * 包含文件路径、元数据和正文内容
 */
export interface PlanFile {
  /** 相对于 vault 根目录的文件路径 */
  relPath: string;
  /** 方案标题 */
  title: string;
  /** 方案状态（draft/active/completed/archived） */
  status: string;
  /** 所属领域/分类 */
  domain: string;
  /** 版本号 */
  version: number;
  /** 创建日期（YYYY-MM-DD 格式） */
  created: string;
  /** 最后更新日期（YYYY-MM-DD 格式） */
  updated: string;
  /** 方案正文内容（去除 frontmatter 后的 Markdown） */
  content: string;
  /** 原始 frontmatter 元数据对象 */
  frontmatter: PlanFrontmatter;
}

/**
 * 方案摘要信息接口
 * 用于列表展示，不包含完整正文内容，减少内存开销
 */
export interface PlanSummary {
  /** 方案标题 */
  title: string;
  /** 方案状态 */
  status: string;
  /** 所属领域 */
  domain: string;
  /** 版本号 */
  version: number;
  /** 最后更新日期 */
  updated: string;
  /** 相对路径 */
  relPath: string;
}

// ── 工具函数 ──────────────────────────────────────────────────────────

/**
 * 获取当前日期的 ISO 格式字符串（仅日期部分）
 * @returns "YYYY-MM-DD" 格式的日期字符串
 */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * 将标题文本清理为合法的文件名
 *
 * 处理规则：
 * 1. 将非法文件名字符（< > : " / \ | ? *）替换为连字符
 * 2. 将空白字符替换为连字符
 * 3. 合并连续的连字符
 * 4. 去除首尾的连字符
 * 5. 截断至最长 80 个字符
 *
 * @param name 原始标题文本
 * @returns 清理后的合法文件名
 */
function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 80);
}

/**
 * 将绝对路径转换为相对于 vault 根目录的路径
 * 同时统一使用正斜杠（/）作为路径分隔符
 *
 * @param vaultRoot vault 根目录的绝对路径
 * @param absPath 文件的绝对路径
 * @returns 相对于 vault 根目录的路径（使用正斜杠）
 */
function relativeToVault(vaultRoot: string, absPath: string): string {
  return path.relative(vaultRoot, absPath).replace(/\\/g, "/");
}

// ── 方案文件操作 ──────────────────────────────────────────────────────

/**
 * 通过标题查找方案文件（支持模糊匹配）
 *
 * 查找策略：
 * 1. 先尝试精确匹配（将标题清理为文件名后查找）
 * 2. 如果精确匹配失败，对目录中所有 .md 文件进行模糊搜索
 *    （将标题拆分为关键词，检查文件名是否包含所有关键词）
 *
 * @param vaultRoot vault 根目录路径
 * @param title 方案标题（支持模糊匹配）
 * @returns 匹配到的方案文件信息，未找到返回 null
 */
export function findPlan(vaultRoot: string, title: string): PlanFile | null {
  const plansDir = path.join(vaultRoot, PLANS_DIR);
  if (!fs.existsSync(plansDir)) return null;

  const sanitized = sanitizeFilename(title);

  // 策略1：精确匹配
  const exactPath = path.join(plansDir, `${sanitized}.md`);
  if (fs.existsSync(exactPath)) {
    return readPlan(vaultRoot, relativeToVault(vaultRoot, exactPath));
  }

  // 策略2：模糊搜索 — 遍历目录中所有 .md 文件（排除 INDEX.md）
  const files = fs.readdirSync(plansDir).filter(f => f.endsWith(".md") && f !== "INDEX.md");
  const titleWords = title.toLowerCase().split(/\s+/);

  for (const file of files) {
    const name = file.replace(/\.md$/, "").toLowerCase();
    // 如果文件名包含标题中的所有关键词，则视为匹配
    if (titleWords.every(w => name.includes(w))) {
      return readPlan(vaultRoot, path.join(PLANS_DIR, file));
    }
  }

  return null;
}

/**
 * 读取并解析方案文件
 *
 * 使用 gray-matter 库解析 Markdown 文件中的 YAML frontmatter，
 * 提取元数据和正文内容，组装为 PlanFile 对象。
 *
 * @param vaultRoot vault 根目录路径
 * @param relPath 方案文件相对于 vault 根目录的路径
 * @returns 解析后的方案文件信息，文件不存在或解析失败返回 null
 */
export function readPlan(vaultRoot: string, relPath: string): PlanFile | null {
  const absPath = path.join(vaultRoot, relPath);
  if (!fs.existsSync(absPath)) return null;

  const raw = fs.readFileSync(absPath, "utf-8");
  let parsed: matter.GrayMatterFile<string>;

  try {
    parsed = matter(raw);
  } catch {
    // frontmatter 解析失败（格式错误），返回 null
    return null;
  }

  // 标题优先从 frontmatter 读取，其次使用文件名
  const title = parsed.data.title ?? path.basename(relPath, ".md");

  return {
    relPath,
    title: String(title),
    status: parsed.data.status ?? "draft",       // 默认状态为草稿
    domain: parsed.data.domain ?? "",             // 默认领域为空
    version: parsed.data.version ?? 1,            // 默认版本号为 1
    created: parsed.data.created ?? "",           // 默认创建日期为空
    updated: parsed.data.updated ?? "",           // 默认更新日期为空
    content: parsed.content,                       // 去除 frontmatter 后的正文
    frontmatter: parsed.data as PlanFrontmatter,  // 原始 frontmatter 对象
  };
}

/**
 * 列出所有方案文件
 *
 * 扫描方案目录中的所有 .md 文件（排除 INDEX.md），
 * 读取并解析后按更新日期降序排序返回。
 * 支持按状态和领域进行过滤。
 *
 * @param vaultRoot vault 根目录路径
 * @param options 可选过滤条件
 * @param options.status 按状态过滤（draft/active/completed/archived）
 * @param options.domain 按领域过滤
 * @returns 方案摘要列表，按更新日期降序排列
 */
export async function listPlans(
  vaultRoot: string,
  options?: { status?: string; domain?: string }
): Promise<PlanSummary[]> {
  const plansDir = path.join(vaultRoot, PLANS_DIR);
  if (!fs.existsSync(plansDir)) return [];

  const files = await glob("*.md", { cwd: plansDir });
  const results: PlanSummary[] = [];

  for (const file of files) {
    // 跳过索引文件
    if (file === "INDEX.md") continue;

    const relPath = path.join(PLANS_DIR, file);
    const plan = readPlan(vaultRoot, relPath);
    if (!plan) continue;

    // 应用过滤条件
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

  // 按更新日期降序排序（最新的在前）
  return results.sort((a, b) => b.updated.localeCompare(a.updated));
}

/**
 * 创建新的方案文档
 *
 * 创建流程：
 * 1. 确保方案目录存在（不存在则递归创建）
 * 2. 清理标题为合法文件名
 * 3. 检查文件是否已存在（避免覆盖）
 * 4. 使用模板渲染完整文档内容
 * 5. 写入文件
 *
 * @param vaultRoot vault 根目录路径
 * @param title 方案标题
 * @param options 可选内容配置
 * @param options.domain 领域/分类（默认从标题首段推断）
 * @param options.background 背景章节内容
 * @param options.goals 目标章节内容
 * @param options.design 方案设计章节内容
 * @param options.steps 实施步骤列表
 * @returns 包含相对路径和是否为新创建的结果对象
 */
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
  // 确保目录存在
  if (!fs.existsSync(plansDir)) {
    fs.mkdirSync(plansDir, { recursive: true });
  }

  const sanitized = sanitizeFilename(title);
  const filePath = path.join(plansDir, `${sanitized}.md`);

  // 如果文件已存在，返回已有路径且标记为未创建
  if (fs.existsSync(filePath)) {
    return { relPath: relativeToVault(vaultRoot, filePath), created: false };
  }

  // 领域默认从标题的第一个连字符段推断
  const domain = options?.domain ?? title.split("-")[0] ?? "general";
  const content = renderPlan(title, domain, options);

  fs.writeFileSync(filePath, content, "utf-8");
  return { relPath: relativeToVault(vaultRoot, filePath), created: true };
}

/**
 * 更新方案文档的指定章节内容
 *
 * 更新逻辑：
 * 1. 通过模糊匹配找到方案文件
 * 2. 定位目标章节（## 标题格式）
 * 3. 如果找到章节，替换其内容；如果未找到，在文档末尾追加新章节
 * 4. 更新 frontmatter 中的日期和版本号
 *
 * @param vaultRoot vault 根目录路径
 * @param title 方案标题（支持模糊匹配）
 * @param section 章节名称（如 "方案设计"）
 * @param content 新的章节内容
 * @returns 包含相对路径和是否更新成功的结果对象
 */
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

  // 查找目标章节的起始位置
  const sectionHeader = `## ${section}`;
  let sectionIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === sectionHeader) {
      sectionIdx = i;
      break;
    }
  }

  if (sectionIdx === -1) {
    // 章节不存在，在文档末尾追加新章节
    lines.push("", sectionHeader, "", content);
  } else {
    // 章节存在，定位章节结束位置（下一个 ## 标题之前）
    let endIdx = sectionIdx + 1;
    // 跳过章节标题后的空行
    while (endIdx < lines.length && lines[endIdx].trim() === "") {
      endIdx++;
    }
    // 查找下一个同级标题
    while (endIdx < lines.length) {
      if (lines[endIdx].trim().startsWith("## ") && endIdx > sectionIdx) break;
      endIdx++;
    }
    // 替换章节内容（保留标题行，替换其后的内容）
    lines.splice(sectionIdx + 1, endIdx - sectionIdx - 1, "", content);
  }

  // 更新 frontmatter 中的日期和版本号
  const updatedContent = lines.join("\n");
  const parsed = matter(updatedContent);
  parsed.data.updated = today();
  parsed.data.version = (parsed.data.version ?? 1) + 1;

  const newRaw = matter.stringify(parsed.content, parsed.data);
  fs.writeFileSync(absPath, newRaw, "utf-8");

  return { relPath: plan.relPath, updated: true };
}

/**
 * 向方案文档添加变更记录
 *
 * 变更记录以 Markdown 表格形式存储在文档的"变更记录"章节中。
 * 如果章节或表格不存在，会自动创建。
 *
 * @param vaultRoot vault 根目录路径
 * @param title 方案标题（支持模糊匹配）
 * @param change 变更描述文本
 * @returns 包含相对路径和是否更新成功的结果对象
 */
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

  // 从文档末尾向前查找变更记录表格的最后一行
  let tableEndIdx = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].trim().startsWith("|") && !lines[i].trim().startsWith("|---")) {
      tableEndIdx = i;
      break;
    }
  }

  // 构建变更记录条目
  const entry: ChangelogEntry = {
    date: today(),
    version: plan.version + 1,
    change,
  };

  if (tableEndIdx === -1) {
    // 未找到变更记录表格，创建完整的变更记录章节
    lines.push("", "## 变更记录", "", "| 日期 | 版本 | 变更 |", "|------|------|------|");
    tableEndIdx = lines.length;
  }

  // 在表格最后一行之后插入新条目
  lines.splice(tableEndIdx + 1, 0, formatChangelogEntry(entry));

  // 更新 frontmatter 中的日期和版本号
  const updatedContent = lines.join("\n");
  const parsed = matter(updatedContent);
  parsed.data.updated = today();
  parsed.data.version = (parsed.data.version ?? 1) + 1;

  const newRaw = matter.stringify(parsed.content, parsed.data);
  fs.writeFileSync(absPath, newRaw, "utf-8");

  return { relPath: plan.relPath, updated: true };
}

/**
 * 更新方案文档的状态
 *
 * 修改 frontmatter 中的 status 字段和 updated 日期。
 * 支持的状态值：draft（草稿）、active（进行中）、completed（已完成）、archived（归档）
 *
 * @param vaultRoot vault 根目录路径
 * @param title 方案标题（支持模糊匹配）
 * @param status 新状态值
 * @returns 包含相对路径和是否更新成功的结果对象
 */
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

  // 更新状态和日期
  parsed.data.status = status;
  parsed.data.updated = today();

  const newRaw = matter.stringify(parsed.content, parsed.data);
  fs.writeFileSync(absPath, newRaw, "utf-8");

  return { relPath: plan.relPath, updated: true };
}

/**
 * 按关键词搜索方案文档
 *
 * 搜索逻辑：
 * 1. 获取所有方案列表
 * 2. 将查询词拆分为多个关键词（过滤掉单字符词）
 * 3. 在标题和领域名中匹配，任一关键词命中即返回
 *
 * @param vaultRoot vault 根目录路径
 * @param query 搜索查询字符串
 * @returns 匹配的方案摘要列表
 */
export async function searchPlans(
  vaultRoot: string,
  query: string
): Promise<PlanSummary[]> {
  const allPlans = await listPlans(vaultRoot);
  const queryLower = query.toLowerCase();
  // 拆分查询词，过滤掉长度 <=1 的词以减少噪音
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 1);

  return allPlans.filter(plan => {
    // 在标题和领域名中搜索
    const searchable = `${plan.title} ${plan.domain}`.toLowerCase();
    return queryWords.some(w => searchable.includes(w));
  });
}

/**
 * 重新生成方案文档索引文件（INDEX.md）
 *
 * 遍历所有方案文档，生成按状态分组的索引页面。
 * 索引文件使用 Obsidian 的 Wiki 链接语法（[[标题]]）。
 *
 * @param vaultRoot vault 根目录路径
 * @returns 生成的 INDEX.md 相对路径
 */
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
