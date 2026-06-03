#!/usr/bin/env node
/**
 * index.ts — CLI 入口文件
 *
 * 这是 plan-engine 命令行工具的主入口，负责：
 * 1. 定义全局 CLI 选项（vault路径、LLM提供商、模型等）
 * 2. 注册子命令（plan）
 * 3. 启动命令解析
 */

import { Command } from "commander";
import { planCommand } from "./commands/plan.js";

/** 创建 commander 程序实例 */
const program = new Command();

/**
 * 配置 CLI 程序的基本信息和全局选项
 *
 * 全局选项说明：
 * --vault <path>        指定 Obsidian vault 根目录，默认取 OBSIDIAN_VAULT 环境变量或当前目录
 * --llm <provider>      LLM 提供商模式：agent（通过 Helios 管道）或 api（直接调用 API）
 * --api-provider <name> API 服务商：anthropic 或 openai
 * --model <name>        使用的 LLM 模型名称
 * --api-key <key>       API 密钥，也可通过环境变量 ANTHROPIC_AUTH_TOKEN / OPENAI_API_KEY 设置
 * --base-url <url>      自定义 API 基础 URL（用于代理场景）
 * --verbose             是否输出详细日志
 */
program
  .name("plan-engine")
  .description(
    "Living document engine for architecture plans and technical strategies — persistent, versioned, searchable"
  )
  .version("1.0.0")
  .option("--vault <path>", "vault root directory", process.env.OBSIDIAN_VAULT ?? process.cwd())
  .option("--llm <provider>", "LLM provider: agent | api", "agent")
  .option("--api-provider <name>", "API provider: anthropic | openai", "anthropic")
  .option("--model <name>", "LLM model name", "claude-sonnet-4-6")
  .option("--api-key <key>", "API key (or set ANTHROPIC_AUTH_TOKEN / OPENAI_API_KEY)")
  .option("--base-url <url>", "Custom API base URL (for proxies)")
  .option("--verbose", "verbose output", false);

/** 注册 plan 子命令组 */
program.addCommand(planCommand());

/** 开始解析命令行参数并执行对应命令 */
program.parse();
