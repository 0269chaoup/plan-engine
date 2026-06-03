/**
 * pipe-provider.ts — 管道模式 LLM 提供商（Helios 代理模式）
 *
 * 本模块实现了一种特殊的 LLM 调用方式：不直接调用 API，而是通过 stdin/stdout
 * 管道与外部 AI 代理（Helios）进行通信。
 *
 * 工作流程：
 *   1. CLI 将 prompt 以 JSON 格式输出到 stdout
 *   2. Helios 代理读取 prompt，在对话中进行推理（可视化！）
 *   3. Helios 将结果以 JSON 格式写回 stdin
 *   4. CLI 继续执行后续逻辑
 *
 * 通信协议（JSON Lines 格式）：
 *   → stdout: {"type":"prompt","id":"...","prompt":"...","system":"..."}
 *   ← stdin:  {"type":"response","id":"...","content":"..."}
 */

import * as readline from "readline";
import type { LLMProvider, LLMResponse } from "./provider.js";

/**
 * PipeProvider — 通过管道与外部 AI 代理通信的 LLM 提供商
 *
 * 实现了 LLMProvider 接口，专门用于 Helios 代理编排场景。
 * 使用 readline 监听 stdin，等待外部代理返回响应。
 */
export class PipeProvider implements LLMProvider {
  /** 提供商名称标识 */
  name = "pipe";

  /**
   * 待处理的请求映射表
   * key: 请求ID，value: 对应的 Promise resolve 函数
   * 当收到响应时，通过 ID 匹配并 resolve 对应的 Promise
   */
  private pendingResolves = new Map<string, (value: string) => void>();

  /** readline 接口实例，用于逐行读取 stdin 输入 */
  private rl: readline.Interface;

  /** prompt 请求计数器，用于生成递增的唯一请求 ID */
  private promptCounter = 0;

  /**
   * 构造函数
   * 初始化 readline 监听 stdin，解析每行输入的 JSON 响应消息。
   * 当收到 type="response" 的消息时，查找并 resolve 对应的 pending promise。
   */
  constructor() {
    // 创建 readline 接口监听 stdin（非终端模式）
    this.rl = readline.createInterface({ input: process.stdin, terminal: false });
    this.rl.on("line", (line) => {
      try {
        const msg = JSON.parse(line);
        // 如果是响应消息且有待处理的请求，则 resolve 对应的 promise
        if (msg.type === "response" && msg.id && this.pendingResolves.has(msg.id)) {
          this.pendingResolves.get(msg.id)!(msg.content);
          this.pendingResolves.delete(msg.id);
        }
      } catch {
        // 忽略无法解析的行（可能是非 JSON 格式的日志输出）
      }
    });
  }

  /** 管道模式需要人工（AI代理）交互，返回 true */
  isInteractive() { return true; }

  /**
   * 发送 prompt 并等待 AI 代理返回响应
   *
   * 流程：
   * 1. 生成唯一的请求 ID
   * 2. 将 prompt 以 JSON 行格式写入 stdout（供 Helios 读取）
   * 3. 创建 Promise 等待对应的响应（5 分钟超时）
   *
   * @param prompt 用户提示词
   * @param system 系统提示词（可选）
   * @returns AI 代理返回的响应内容
   * @throws 如果超过 5 分钟未收到响应则超时报错
   */
  async complete(prompt: string, system?: string): Promise<LLMResponse> {
    // 生成递增的唯一请求 ID
    const id = `p${++this.promptCounter}`;

    // 将 prompt 消息以 JSON 行格式输出到 stdout
    const msg = JSON.stringify({ type: "prompt", id, prompt, system });
    process.stdout.write(msg + "\n");

    // 返回 Promise，等待外部代理通过 stdin 写回响应
    return new Promise((resolve, reject) => {
      // 设置 5 分钟（300秒）超时定时器
      const timer = setTimeout(() => {
        this.pendingResolves.delete(id);
        reject(new Error(`Pipe timeout waiting for response (id=${id}). Is Helios listening?`));
      }, 300_000);

      // 注册 pending resolve，等待匹配的响应
      this.pendingResolves.set(id, (content) => {
        clearTimeout(timer);
        resolve({ content });
      });
    });
  }

  /**
   * 关闭管道连接
   * 释放 readline 接口资源，停止监听 stdin
   */
  close() {
    this.rl.close();
  }
}
