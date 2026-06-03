/**
 * api-provider.ts — 基于 HTTP API 的 LLM 提供商实现
 *
 * 直接通过 HTTP 请求调用 LLM API，支持两种服务商：
 *   - Anthropic (Claude 系列模型)
 *   - OpenAI (GPT 系列模型)
 *
 * 适用于自动化场景，无需人工交互。
 */

import type { LLMProvider, LLMResponse } from "./provider.js";

/**
 * API 配置接口
 * 定义调用 LLM API 所需的配置参数
 */
interface APIConfig {
  /** API 服务商类型 */
  provider: "anthropic" | "openai";
  /** API 认证密钥 */
  apiKey: string;
  /** 使用的模型名称（如 claude-sonnet-4-6、gpt-4 等） */
  model: string;
  /** 自定义 API 基础 URL（用于代理或私有部署场景） */
  baseUrl?: string;
}

/**
 * APIProvider — 通过 HTTP API 直接调用 LLM 的提供商类
 *
 * 实现了 LLMProvider 接口，封装了 Anthropic 和 OpenAI 两种 API 的调用逻辑。
 * 构造时自动从配置或环境变量中获取 API 密钥。
 */
export class APIProvider implements LLMProvider {
  /** 提供商名称标识 */
  name = "api";

  /** 内部配置对象 */
  private config: APIConfig;

  /**
   * 构造函数
   * @param config 部分配置，未提供的字段使用默认值或环境变量
   * @throws 如果找不到有效的 API 密钥则抛出错误
   */
  constructor(config?: Partial<APIConfig>) {
    this.config = {
      provider: config?.provider ?? "anthropic",
      // 优先使用传入的 apiKey，其次尝试环境变量 ANTHROPIC_AUTH_TOKEN，最后尝试 OPENAI_API_KEY
      apiKey: config?.apiKey ?? process.env.ANTHROPIC_AUTH_TOKEN ?? process.env.OPENAI_API_KEY ?? "",
      model: config?.model ?? "claude-sonnet-4-6",
      baseUrl: config?.baseUrl,
    };
    if (!this.config.apiKey) {
      throw new Error("No API key found. Set ANTHROPIC_AUTH_TOKEN or OPENAI_API_KEY env var.");
    }
  }

  /** API 模式不需要人工交互，返回 false */
  isInteractive() { return false; }

  /**
   * 发送 prompt 获取 LLM 响应
   * 根据配置的 provider 类型自动选择对应的 API 调用方法
   * @param prompt 用户提示词
   * @param system 系统提示词（可选）
   * @returns LLM 响应内容和 token 使用量
   */
  async complete(prompt: string, system?: string): Promise<LLMResponse> {
    if (this.config.provider === "anthropic") {
      return this.callAnthropic(prompt, system);
    }
    return this.callOpenAI(prompt, system);
  }

  /**
   * 调用 Anthropic Messages API
   *
   * API 端点：POST /v1/messages
   * 认证方式：x-api-key 请求头
   * 支持自定义 baseUrl 以适配代理服务
   *
   * @param prompt 用户提示词
   * @param system 系统提示词
   * @returns 解析后的 LLM 响应
   * @throws 如果 API 返回错误则抛出异常
   */
  private async callAnthropic(prompt: string, system?: string): Promise<LLMResponse> {
    const url = this.config.baseUrl ?? "https://api.anthropic.com";
    const resp = await fetch(`${url}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.config.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: 4096,
        system: system ?? "You are a knowledge analysis engine. Always respond in valid JSON when asked.",
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await resp.json() as any;
    // 检查 API 是否返回错误
    if (data.error) throw new Error(`Anthropic API error: ${data.error.message}`);
    return {
      // 提取第一个 content 块的文本内容
      content: data.content?.[0]?.text ?? "",
      // 转换 Anthropic 的 token 使用量格式（input_tokens/output_tokens → prompt/completion）
      usage: data.usage ? { prompt: data.usage.input_tokens, completion: data.usage.output_tokens } : undefined,
    };
  }

  /**
   * 调用 OpenAI Chat Completions API
   *
   * API 端点：POST /v1/chat/completions
   * 认证方式：Bearer Token（Authorization 请求头）
   * 支持自定义 baseUrl 以适配代理服务
   *
   * @param prompt 用户提示词
   * @param system 系统提示词
   * @returns 解析后的 LLM 响应
   * @throws 如果 API 返回错误则抛出异常
   */
  private async callOpenAI(prompt: string, system?: string): Promise<LLMResponse> {
    const url = this.config.baseUrl ?? "https://api.openai.com";
    const resp = await fetch(`${url}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: 4096,
        messages: [
          { role: "system", content: system ?? "You are a knowledge analysis engine. Always respond in valid JSON when asked." },
          { role: "user", content: prompt },
        ],
      }),
    });
    const data = await resp.json() as any;
    // 检查 API 是否返回错误
    if (data.error) throw new Error(`OpenAI API error: ${data.error.message}`);
    return {
      // 提取第一个 choice 的 message 内容
      content: data.choices?.[0]?.message?.content ?? "",
      // 转换 OpenAI 的 token 使用量格式
      usage: data.usage ? { prompt: data.usage.prompt_tokens, completion: data.usage.completion_tokens } : undefined,
    };
  }
}
