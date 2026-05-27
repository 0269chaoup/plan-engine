# plan-engine

Living document engine for architecture plans and technical strategies — persistent, versioned, searchable.

> Part of the engine ecosystem:
> - **wiki-engine** → 知识网络（50-Knowledge/）
> - **work-engine** → 任务管理（30-Projects/Work/）
> - **daily-engine** → 时间编排（20-Daily/）
> - **plan-engine** → 方案文档管理（50-Knowledge/Permanent/Plans/）

## Install

```bash
git clone git@github.com:0269chaoup/plan-engine.git
cd plan-engine
npm install
npm run build
npm link
```

## Quick Start

```bash
# Create a plan
plan-engine --vault ~/Documents/obsidian_cache plan create "daily-engine-编排层架构" --domain daily-engine

# Show plan details
plan-engine --vault ~/Documents/obsidian_cache plan show "daily-engine"

# List all plans
plan-engine --vault ~/Documents/obsidian_cache plan list

# Search plans
plan-engine --vault ~/Documents/obsidian_cache plan search "编排层"

# Update a section
plan-engine --vault ~/Documents/obsidian_cache plan update "daily-engine" \
  --section "方案设计" --content "### 策略A\n使用生命周期字段..."

# Add changelog entry
plan-engine --vault ~/Documents/obsidian_cache plan changelog "daily-engine" "补充策略A对比分析"

# Update status
plan-engine --vault ~/Documents/obsidian_cache plan status "daily-engine" active

# Regenerate INDEX.md
plan-engine --vault ~/Documents/obsidian_cache plan index
```

## Commands

| Command | Description |
|---------|-------------|
| `plan create <title>` | Create a new plan document |
| `plan show <title>` | Show plan details (fuzzy match) |
| `plan list` | List all plans (filter by --status, --domain) |
| `plan update <title>` | Update a section (--section, --content) |
| `plan changelog <title> <change>` | Add a changelog entry |
| `plan status <title> <status>` | Update plan status (draft/active/completed/archived) |
| `plan search <query>` | Search plans by keyword |
| `plan index` | Regenerate INDEX.md |

## File Structure

```
50-Knowledge/Permanent/Plans/
├── INDEX.md                      # Auto-generated index
├── daily-engine-编排层架构.md
├── work-engine-日志系统适配.md
└── ...
```

## Plan Document Format

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
# daily-engine 编排层架构

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

## Status Lifecycle

```
draft → active → completed → archived
```

## Architecture

```
src/
├── index.ts              # CLI entry
├── commands/
│   └── plan.ts           # 7 subcommands
└── lib/
    ├── plan.ts           # Core logic (CRUD, search, versioning)
    └── template.ts       # Document templates
```

## Agent Integration

```
用户: "讨论一下 daily-engine 的架构"
       ↓
Agent: plan-engine plan show "daily-engine"
       ↓
Agent: 讨论后 → plan-engine plan update --section "方案设计" --content "..."
       ↓
Agent: plan-engine plan changelog "补充策略A对比分析"
```

## License

GPL-3.0
