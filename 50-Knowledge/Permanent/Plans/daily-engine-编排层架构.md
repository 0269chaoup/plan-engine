---
type: Plan
status: active
created: 2026-05-27T00:00:00.000Z
updated: '2026-05-27'
version: 6
domain: daily-engine
---

# daily-engine-编排层架构

## 背景

当前系统中时间维度与业务维度存在数据孤岛，需要 daily-engine 作为编排层统一调度

## 目标

消除数据孤岛，实现任务 SSOT 在 Work/，日记仅作为事件流

## 方案设计

### 核心原则
- 日记 SSOT 在 20-Daily/
- 任务 SSOT 在 Work/（通过 work-engine 管理）
- daily-engine 作为编排层，负责时间线事件记录和跨引擎调度
- 日记仅作为事件流，不存储任务状态
- Strategy A：Task frontmatter 使用生命周期字段（created_at, completed_at, blocked_at）

### 数据模型
**Task frontmatter（由 daily-engine 写入）：**
```yaml
---
type: Task
status: 🌿 Active
created_at: 2026-05-27
created_log: "[[20-Daily/2026/05/第22周/2026-05-27]]"
completed_at: 2026-05-30
completed_log: "[[20-Daily/2026/05/第22周/2026-05-30]]"
blocked_at: 2026-05-28
blocked_log: "[[20-Daily/2026/05/第22周/2026-05-28]]"
---
```

**日记事件格式：**
```markdown
## 日志
- `10:30` 🆕 新增任务 [[30-Projects/Work/MCP/...|MCP: ...]] #task-created
- `14:00` 📝 推进进度 [[30-Projects/Work/MCP/...|MCP: ...]] #task-log
- `18:30` ✅ 完成任务 [[30-Projects/Work/MCP/...|MCP: ...]] #task-completed
```

### CLI 命令
| 命令 | 功能 |
|------|------|
| init | 初始化今日日记 |
| task | 创建任务（调 work-engine）+ 写日记事件 + 双链 |
| log | 追加日志事件（可选关联任务） |
| complete | 完成任务 + 写日记事件 + 双链 |
| block/unblock | 阻塞/解除阻塞 |
| today | 今日摘要（日记事件 + Work/ 活跃任务） |
| week-review | 周复盘报表 |
| link | 双链校验（--fix 自动补全） |

### 双链系统（Strategy A）
- daily-engine 负责写入 Task frontmatter 的 _at/_log 字段
- daily-engine 负责写入日记事件（带 wikilink）
- Obsidian 自动生成 backlinks（UI 层）
- Dataview 可通过 Task 字段进行 O(1) 查询

### 与 work-engine 的分工
| 谁 | 写哪里 | 写什么 |
|----|--------|--------|
| work-engine | Task.md body/结构 | 任务详情、问题、方案 |
| daily-engine | Task.md frontmatter | _at/_log 字段（指向日记） |
| daily-engine | 日记 | 事件记录（[[Task链接]]） |
| Obsidian | backlinks | 自动反向索引 |
## 实施状态

- [x] 核心 CLI 框架（commander）
- [x] 初始化今日日记（init）
- [x] 创建任务 + 双链（task）
- [x] 追加日志事件（log）
- [x] 完成任务 + 双链（complete）
- [x] 阻塞/解除阻塞（block/unblock）
- [x] 今日摘要（today）
- [x] 周复盘报表（week-review）
- [x] 双链校验（link --fix）
- [x] work-engine 桥接（work-bridge.ts）
- [x] 旧日记任务迁移（migrate-diary-tasks.ts）
## 变更记录

| 日期 | 版本 | 变更 |
|------|------|------|
| 2026-05-27 | v1 | 初稿 |
| 2026-05-27 | v3 | 补充策略A数据模型 |
| 2026-05-27 | v6 | 补充完整架构设计（Strategy A、双链系统、与 work-engine 分工） |
