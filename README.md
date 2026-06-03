# plan-engine

**方案文档管理引擎** — 将对话中散落的方案沉淀为可追溯、可复用、可演进的文档资产。

> 对话是短暂的，方案是永恒的。

## 设计背景

传统工作流中，方案散落在聊天记录（难以检索）、临时文件（容易丢失）、人脑记忆（不可靠）中。plan-engine 解决**跨会话上下文丢失**问题，实现方案文档的版本化、可搜索性和持久性存储。

核心思路：

```
对话 → 结构化方案 → 版本化存储 → 可检索
```

## 引擎生态

plan-engine 是 Obsidian 引擎生态的一环：

| 引擎 | 管辖范围 | 存储路径 |
|------|----------|----------|
| **wiki-engine** | 知识网络 | `50-Knowledge/` |
| **work-engine** | 工作任务 | `30-Projects/Work/` |
| **daily-engine** | 时间编排 | `20-Daily/` |
| **plan-engine** | 方案文档 | `50-Knowledge/Permanent/Plans/` |

## 安装

```bash
git clone git@github.com:0269chaoup/plan-engine.git
cd plan-engine
npm install
npm run build
npm link
```

安装后即可在终端使用 `plan-engine` 命令。

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `OBSIDIAN_VAULT` | Obsidian vault 根目录 | 当前工作目录 |
| `ANTHROPIC_AUTH_TOKEN` | Anthropic API Key | — |
| `OPENAI_API_KEY` | OpenAI API Key | — |

## 命令速查

所有命令都需要指定 `--vault` 参数（或设置 `OBSIDIAN_VAULT` 环境变量）指向 Obsidian vault 根目录。

```bash
# 基本格式
plan-engine --vault <vault-path> plan <子命令> [参数] [选项]
```

### create — 创建方案

```bash
plan-engine plan create <title> [--domain <d>] [--background <text>] [--goals <text>] [--design <text>] [--step <s>]
```

创建新的方案文档，初始状态为 `draft`，版本号为 `v1`。

```bash
plan-engine --vault ~/obsidian plan create "daily-engine-编排层架构" --domain daily-engine
plan-engine --vault ~/obsidian plan create "新架构方案" --background "需要解决X问题" --step "第一步" --step "第二步"
```

### show — 查看方案

```bash
plan-engine plan show <title>
```

显示方案详情，支持**模糊匹配**标题。

```bash
plan-engine --vault ~/obsidian plan show "daily-engine"
```

### list — 列出方案

```bash
plan-engine plan list [--status <s>] [--domain <d>]
```

列出所有方案，可按状态和领域过滤。

```bash
plan-engine --vault ~/obsidian plan list
plan-engine --vault ~/obsidian plan list --status active
plan-engine --vault ~/obsidian plan list --domain daily-engine
```

### update — 更新方案

```bash
plan-engine plan update <title> --section <name> --content <text>
```

更新指定章节的内容，自动递增版本号。

```bash
plan-engine --vault ~/obsidian plan update "daily-engine" \
  --section "方案设计" --content "### 策略A\n使用生命周期字段..."
```

### changelog — 添加变更记录

```bash
plan-engine plan changelog <title> <change>
```

向方案的变更记录表格追加一条记录。

```bash
plan-engine --vault ~/obsidian plan changelog "daily-engine" "补充策略A对比分析"
```

### status — 更新状态

```bash
plan-engine plan status <title> <new-status>
```

更新方案状态，合法值：`draft` | `active` | `completed` | `archived`。

```bash
plan-engine --vault ~/obsidian plan status "daily-engine" active
```

### search — 搜索方案

```bash
plan-engine plan search <query>
```

按关键词全文搜索方案（标题 + 内容 + frontmatter）。

```bash
plan-engine --vault ~/obsidian plan search "编排层"
```

### index — 重建索引

```bash
plan-engine plan index
```

扫描所有方案文档，重新生成 `INDEX.md` 索引页（按状态分组，使用 Obsidian Wiki 链接）。

```bash
plan-engine --vault ~/obsidian plan index
```

## 文档生命周期

方案状态遵循如下流转：

```
draft → active → completed → archived
 草稿    进行中    已完成      归档
```

| 状态 | 图标 | 说明 |
|------|------|------|
| `draft` | 📝 | 草稿，初始创建状态 |
| `active` | 🌿 | 进行中，正在实施 |
| `completed` | ✅ | 已完成 |
| `archived` | 🗃️ | 归档，不再维护 |

## 方案文档结构

每个方案是一个带有 YAML frontmatter 的 Markdown 文件：

```yaml
---
type: Plan
status: draft          # draft | active | completed | archived
created: 2026-05-27
updated: 2026-05-27
version: 3
domain: daily-engine
---
```

```markdown
# 方案标题

## 背景
为什么需要这个方案？

## 目标
要达成什么效果？

## 方案设计
具体的设计方案

## 实施状态
- [ ] 第一阶段
- [x] 第二阶段

## 变更记录
| 日期 | 版本 | 变更 |
|------|------|------|
| 2026-05-27 | v1 | 初稿 |
| 2026-05-28 | v2 | 补充策略A |
```

### 存储目录

```
<vault>/50-Knowledge/Permanent/Plans/
├── INDEX.md                      # 自动生成的聚合索引
├── daily-engine-编排层架构.md     # 🌿 active
├── work-engine-日志系统适配.md    # 🌿 active
├── wiki-engine-知识网络架构.md    # ✅ completed
└── ...
```

## 架构概览

```
src/
├── index.ts                    # CLI 入口，定义全局选项（--vault, --llm, --model 等）
├── commands/
│   └── plan.ts                 # plan 子命令组（8 个子命令）
├── lib/
│   ├── plan.ts                 # 核心 CRUD 逻辑（查找/读取/创建/更新/搜索/索引）
│   ├── template.ts             # 文档模板渲染（frontmatter 模板、INDEX.md 模板、changelog 格式化）
│   └── cli-utils.ts            # CLI 工具函数
└── llm/
    ├── provider.ts             # LLM 提供者接口
    ├── factory.ts              # 提供者工厂
    ├── api-provider.ts         # 直接 API 调用提供者
    └── pipe-provider.ts        # 管道模式提供者（通过 Helios Agent）
```

### 核心模块职责

| 模块 | 职责 |
|------|------|
| `commands/plan.ts` | 注册 CLI 子命令，解析参数，调用核心逻辑 |
| `lib/plan.ts` | 方案文件的 CRUD 操作，frontmatter 解析（gray-matter），模糊匹配查找 |
| `lib/template.ts` | 方案文档模板渲染、INDEX.md 索引生成、变更记录格式化 |
| `llm/*` | LLM 提供者抽象，支持 agent 管道模式和直接 API 调用 |

## Agent 集成

plan-engine 设计为可被 AI Agent 调用的工具：

```
用户: "讨论一下 daily-engine 的架构"
       ↓
Agent: plan-engine plan show "daily-engine"        # 加载已有方案
       ↓
Agent: 讨论并形成新的设计思路
       ↓
Agent: plan-engine plan update "daily-engine" \    # 写回方案
         --section "方案设计" --content "..."
       ↓
Agent: plan-engine plan changelog "daily-engine" \ # 记录变更
         "补充策略A对比分析"
```

## 全局选项

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `--vault <path>` | Obsidian vault 根目录 | `$OBSIDIAN_VAULT` 或当前目录 |
| `--llm <provider>` | LLM 模式：`agent` 或 `api` | `agent` |
| `--api-provider <name>` | API 服务商：`anthropic` 或 `openai` | `anthropic` |
| `--model <name>` | LLM 模型名 | `claude-sonnet-4-6` |
| `--api-key <key>` | API 密钥 | 环境变量 |
| `--base-url <url>` | 自定义 API 地址（代理场景） | — |
| `--verbose` | 详细日志输出 | `false` |

## 开发说明

### 技术栈

- **运行时**：Node.js (ESM)
- **语言**：TypeScript
- **CLI 框架**：commander
- **Frontmatter 解析**：gray-matter
- **文件搜索**：glob
- **终端美化**：chalk + cli-table3
- **测试**：vitest

### 开发命令

```bash
# 构建
npm run build

# 开发模式（watch）
npm run dev

# 运行测试
npm test
```

### 依赖说明

| 依赖 | 用途 |
|------|------|
| `commander` | CLI 命令解析 |
| `gray-matter` | YAML frontmatter 解析 |
| `glob` | 文件模式匹配 |
| `chalk` | 终端彩色输出 |
| `cli-table3` | 表格渲染 |

## License

GPL-3.0
