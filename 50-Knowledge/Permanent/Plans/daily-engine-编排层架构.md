---
type: Plan
status: active
created: 2026-05-27T00:00:00.000Z
updated: '2026-05-27'
version: 3
domain: daily-engine
---

# daily-engine-编排层架构

## 背景

当前系统中时间维度与业务维度存在数据孤岛，需要 daily-engine 作为编排层统一调度

## 目标

消除数据孤岛，实现任务 SSOT 在 Work/，日记仅作为事件流

## 方案设计

### 核心原则\n- 任务 SSOT 在 Work/\n- 日记仅作为事件流\n- daily-engine 作为编排层\n\n### 数据模型\n- Task frontmatter: created_at, created_log, completed_at, completed_log\n- 日记事件: #task-created, #task-completed
## 实施状态

- [ ] （待补充）

## 变更记录

| 日期 | 版本 | 变更 |
|------|------|------|
| 2026-05-27 | v1 | 初稿 |
| 2026-05-27 | v3 | 补充策略A数据模型 |
