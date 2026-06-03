/**
 * factory.ts — LLM 提供商工厂模块
 *
 * 根据 CLI 选项创建对应的 LLM 提供商实例。
 * 封装了提供商的选择逻辑，让上层调用方无需关心具体实现细节。
 */

import type { LLMProvider } from "./provider.js";
import { APIProvider } from "./api-provider.js";
import { PipeProvider } from "./pipe-provider.js";

/**
 * LLM 配置选项接口
 * 从 CLI 参数中提取，用于决定创建哪种 LLM 提供商
 */
export interface LLMOptions {
  /** 提供商模式：api（直接调用API）或 agent（通过管道与Helios通信） */
  provider: "api" | "agent";
  /** API 服务商名称：anthropic 或 openai（仅在 provider="api" 时有效） */
  apiProvider?: "anthropic" | "openai";
  /** LLM 模型名称（如 claude-sonnet-4-6） */
  model?: string;
  /** API 认证密钥 */
  apiKey?: string;
  /** 自定义 API 基础 URL（用于代理服务） */
  baseUrl?: string;
}

/**
 * LLM 提供商工厂函数
 *
 * 根据 CLI 选项创建并返回对应的 LLM 提供商实例：
 *   --llm api    → APIProvider：静默模式，直接调用 LLM API
 *   --llm agent  → PipeProvider：Helios 模式，通过管道与 AI 代理通信
 *
 * 如果提供商创建失败（例如缺少 API 密钥），返回 null，
 * 使得不需要 LLM 功能的命令仍可正常运行。
 *
 * @param opts LLM 配置选项
 * @returns LLMProvider 实例或 null
 */
export function createLLM(opts: LLMOptions): LLMProvider | null {
  // agent 模式：创建管道提供商（不需要 API 密钥）
  if (opts.provider === "agent") {
    return new PipeProvider();
  }
  // api 模式：尝试创建 HTTP API 提供商
  try {
    return new APIProvider({
      provider: opts.apiProvider ?? "anthropic",
      model: opts.model ?? "claude-sonnet-4-6",
      apiKey: opts.apiKey,
      baseUrl: opts.baseUrl,
    });
  } catch {
    // 创建失败（如缺少密钥），静默返回 null
    return null;
  }
}
