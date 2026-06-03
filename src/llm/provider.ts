/**
 * provider.ts — LLM 提供商抽象层
 *
 * 定义了 LLM 调用的统一接口，支持两种工作模式：
 *   api  模式 — CLI 直接调用 LLM API（静默模式，适合自动化场景）
 *   pipe 模式 — CLI 将 prompt 输出到 stdout，从 stdin 读取响应
 *                （专为 Helios AI 代理设计：代理读取 prompt，在对话中推理，
 *                 然后将结构化结果写回 → 实现完整的可视化流程）
 */

/**
 * LLM 响应接口
 * 封装 LLM 返回的内容和 token 使用量
 */
export interface LLMResponse {
  /** LLM 生成的文本内容 */
  content: string;
  /** token 使用量统计（可选） */
  usage?: {
    /** 输入 prompt 消耗的 token 数 */
    prompt: number;
    /** 输出 completion 消耗的 token 数 */
    completion: number;
  };
}

/**
 * LLM 提供商接口
 * 所有 LLM 提供商实现都必须遵循此接口
 */
export interface LLMProvider {
  /** 提供商名称标识（如 "api"、"pipe"） */
  name: string;

  /**
   * 发送 prompt 并获取 LLM 响应
   * @param prompt  用户提示词
   * @param system  系统提示词（可选），用于设定 LLM 的角色和行为
   * @returns Promise<LLMResponse> LLM 的响应内容
   */
  complete(prompt: string, system?: string): Promise<LLMResponse>;

  /**
   * 判断此提供商是否需要人工交互
   * - api 模式返回 false（全自动）
   * - pipe 模式返回 true（需要 Helios 代理介入）
   */
  isInteractive(): boolean;
}

/**
 * 从 LLM 响应文本中解析 JSON 数据
 *
 * 解析策略（按优先级）：
 * 1. 先去除 markdown 代码块标记（```json ... ```）
 * 2. 尝试直接 JSON.parse
 * 3. 在文本中查找 JSON 对象/数组并解析
 *
 * @param text LLM 返回的原始文本
 * @returns 解析后的泛型对象
 * @throws 如果所有解析策略都失败则抛出错误
 */
export function parseJSON<T = any>(text: string): T {
  // 去除 markdown 代码块包裹
  let cleaned = text.trim();
  const m = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (m) cleaned = m[1].trim();

  // 策略1：直接解析
  try { return JSON.parse(cleaned); } catch {}

  // 策略2：在文本中查找 JSON 对象或数组
  const objMatch = cleaned.match(/[\[{][\s\S]*[\]]/);
  if (objMatch) {
    try { return JSON.parse(objMatch[0]); } catch {}
  }

  // 所有策略均失败，抛出错误并附带原始文本的前500字符以便调试
  throw new Error(`Failed to parse JSON from LLM response:\n${text.slice(0, 500)}`);
}
