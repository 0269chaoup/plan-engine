/**
 * cli-utils.ts — CLI 上下文构建和通用工具函数
 *
 * 提供以下功能：
 * - CLIContext 接口与构建函数：统一管理 vault 路径、LLM 实例等运行时上下文
 * - requireLLM：断言 LLM 可用性
 * - row / fmtBytes：终端输出格式化工具
 */

import { Command } from "commander";
import fs from "fs";
import { createLLM } from "../llm/factory.js";
import type { LLMOptions } from "../llm/factory.js";
import type { LLMProvider } from "../llm/provider.js";

// ── CLI 上下文 ────────────────────────────────────────────────────────────

/**
 * CLI 运行时上下文接口
 * 封装了所有子命令执行时需要的共享资源
 */
export interface CLIContext {
  /** Obsidian vault 相关配置 */
  vault: {
    /** vault 根目录的绝对路径 */
    root: string;
  };
  /** LLM 提供商实例（可能为 null，如果未配置 API 密钥） */
  llm: LLMProvider | null;
  /** 是否输出详细日志 */
  verbose: boolean;
}

/**
 * 从命令行选项构建 CLI 运行时上下文
 *
 * 处理逻辑：
 * 1. 确定 vault 根目录（优先级：--vault 选项 > OBSIDIAN_VAULT 环境变量 > 当前目录）
 * 2. 验证 vault 目录存在
 * 3. 构建 LLM 配置并创建提供商实例
 *
 * @param opts 命令行选项对象（来自 commander 解析结果）
 * @returns CLIContext 运行时上下文
 * @throws 如果 vault 目录不存在则抛出错误
 */
export function buildContext(opts: any): CLIContext {
  // 按优先级解析 vault 根目录路径
  const vaultRoot: string =
    opts.vault ?? process.env.OBSIDIAN_VAULT ?? process.cwd();
  if (!fs.existsSync(vaultRoot)) {
    throw new Error(`Vault not found: ${vaultRoot}`);
  }

  // 构建 LLM 配置
  const llmOpts: LLMOptions = {
    provider: opts.llm ?? "agent",
    apiProvider: opts.apiProvider ?? "anthropic",
    model: opts.model,
    apiKey: opts.apiKey,
    baseUrl: opts.baseUrl,
  };
  const llm = createLLM(llmOpts);
  return { vault: { root: vaultRoot }, llm, verbose: opts.verbose ?? false };
}

/**
 * 断言 LLM 提供商可用
 *
 * 对于需要 LLM 功能的命令，调用此函数确保 LLM 已正确初始化。
 * 如果 LLM 不可用则抛出友好的错误提示。
 *
 * @param ctx CLI 运行时上下文
 * @returns 可用的 LLMProvider 实例
 * @throws 如果 LLM 未配置则抛出错误
 */
export function requireLLM(ctx: CLIContext): LLMProvider {
  if (!ctx.llm) {
    throw new Error("This command requires an LLM provider. Set ANTHROPIC_AUTH_TOKEN or use --llm agent");
  }
  return ctx.llm;
}

/**
 * 在终端打印格式化的表格行
 *
 * 输出格式：标签（左对齐，占24字符宽度） + 值
 * 支持 ANSI 颜色码高亮显示
 *
 * @param label  行标签文本
 * @param value  行值（字符串或数字）
 * @param color  ANSI 颜色码（可选，如 "32" 表示绿色）
 */
export function row(label: string, value: string | number, color?: string): void {
  const c = color ? `\x1b[${color}m` : "";
  const r = "\x1b[0m"; // 重置颜色
  console.log(`  ${c}${label.padEnd(24)}${r} ${value}`);
}

/**
 * 将字节数格式化为人类可读的字符串
 *
 * 转换规则：
 *   < 1024       → "xB"
 *   < 1024²      → "x.xKB"
 *   >= 1024²     → "x.xMB"
 *
 * @param bytes 字节数
 * @returns 格式化后的字符串（如 "1.5KB"、"2.3MB"）
 */
export function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}
