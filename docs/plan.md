---
type: plan
status: active
version: 1
created_at: 2026-05-26
updated_at: 2026-05-26
summary: 方案文档管理引擎，解决跨会话上下文丢失问题，实现方案文档的版本化、可搜索性和持久性存储
tags: [plan-engine, 方案管理, PKM, CLI]
---

# Plan-Engine 方案文档管理

## 一、设计背景

### 1.1 核心问题

对话是短暂的，方案是永恒的。传统工作流中，方案散落在：
- 聊天记录（难以检索）
- 临时文件（容易丢失）
- 人脑记忆（不可靠）

### 1.2 解决思路

```
对话 → 结构化方案 → 版本化存储 → 可检索
```

将方案沉淀为可追溯、可复用、可演进的文档资产。

---

## 二、存储架构

### 2.1 目录结构

```
50-Knowledge/Permanent/Plans/
├── INDEX.md                      # 自动聚合索引
├── work-engine-任务管理架构.md     # 🌿 active
├── wiki-engine-知识网络架构.md     # 🌿 active
├── daily-engine-编排层架构.md      # 🌿 active
└── plan-engine-方案文档管理.md     # 🌿 active（本文件）
```

### 2.2 Frontmatter 规范

```yaml
---
type: plan
status: active | draft | deprecated
version: 1
created_at: 2026-05-26
updated_at: 2026-05-26
summary: 一句话方案摘要
tags: [标签1, 标签2]
---
```

### 2.3 版本管理

- 每次 `plan update` 自动递增版本号
- 更新记录追加到 `## 变更日志`
- 支持 `plan changelog <name>` 查看历史

---

## 三、CLI 命令

### 3.1 核心命令

| 命令 | 说明 | 示例 |
|------|------|------|
| `plan create <name>` | 创建方案 | `plan create "xxx方案" --status draft` |
| `plan show <name>` | 查看方案 | `plan show work-engine-任务管理架构` |
| `plan list` | 列出方案 | `plan list --status active` |
| `plan update <name>` | 更新内容 | `plan update xxx --content "新内容"` |
| `plan changelog <name>` | 查看历史 | `plan changelog xxx` |
| `plan status <name>` | 改状态 | `plan status xxx --set deprecated` |
| `plan search <query>` | 搜索方案 | `plan search "任务管理"` |
| `plan index` | 重建索引 | `plan index` |

### 3.2 使用示例

```bash
# 创建新方案
plan create "新的架构方案" --status draft --summary "描述"

# 更新方案内容
plan update "新的架构方案" --content "## 新增章节\n内容..."

# 激活方案
plan status "新的架构方案" --set active

# 查看所有活跃方案
plan list --status active
```

---

## 四、与其他引擎的关系

| 引擎 | 管辖范围 | 交互方式 |
|------|----------|----------|
| wiki-engine | 知识库 (50-Knowledge/) | 方案可引用知识文档 |
| work-engine | 工作任务 (30-Projects/Work/) | 方案可关联任务 |
| daily-engine | 日记 (20-Daily/) | 方案可被日记引用 |
| plan-engine | 方案 (50-Knowledge/Permanent/Plans/) | 本引擎 |

---

## 五、版本历史

| 版本 | 日期 | 变更 |
|------|------|------|
| v1 | 2026-05-26 | 初始版本，定义 plan-engine 设计 |
