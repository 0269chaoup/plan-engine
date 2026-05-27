---
type: Plan
status: active
created: 2026-05-27T00:00:00.000Z
updated: '2026-05-27'
version: 4
domain: wiki-engine
---

# wiki-engine-知识网络架构

## 背景

Obsidian vault 中的知识文件缺乏结构化管理，需要 wiki-engine 提供图谱分析、去重检测、连接发现、内容导入等能力

## 目标

构建结构化的知识网络，支持四层本体模型（Story/Event/Entity/Concept），提供高效的 vault 分析和内容管理

## 方案设计

### 核心原则
- 知识 SSOT 在 50-Knowledge/
- 四层本体模型：Story/Event/Entity/Concept
- MOC（Map of Content）作为横向控制台
- 全局四法则：禁止单纯概括、强制原文锚定、Obsidian 原生 Callout、归档块前置
- 与 work-engine 解耦：Knowledge = reference，Work = action

### 四层本体模型
| 类型 | 目录 | 用途 |
|------|------|------|
| Story | 50-Knowledge/Permanent/Stories/ | 宏观叙事，纵向聚合 |
| Event | 50-Knowledge/Permanent/Events/ | 历史切片，时空定标 |
| Entity | 50-Knowledge/Permanent/Entities/ | 实体档案，关系网络 |
| Concept | 50-Knowledge/Permanent/Concepts/ | 概念剖析，第一性原理 |

### CLI 命令
| 命令 | 功能 |
|------|------|
| graph | 生成 vault 图谱（链接关系） |
| connect | 发现潜在连接（本地 + LLM） |
| dedup | 检测重复/相似内容 |
| ingest | 导入外部内容（URL/文件） |
| scan | 扫描 vault 统计信息 |
| moc-sync | 同步 MOC 索引 |
| quote | 管理个人语录 |
| validate | 验证 frontmatter |
| create | 创建知识文件 |
| fix-frontmatter | 修复 frontmatter |

### LLM 集成
- 支持 api 模式（直接调用 API）
- 支持 agent 模式（pipe 协议给 Agent 用）
- 用于 connect 命令的深度连接分析
- 用于 ingest 命令的内容提取和分类

### 文件结构
```
src/
├── index.ts              # CLI 入口
├── commands/
│   ├── graph.ts          # 图谱生成
│   ├── connect.ts        # 连接发现
│   ├── dedup.ts          # 去重检测
│   ├── ingest.ts         # 内容导入
│   ├── scan.ts           # 扫描统计
│   ├── moc-sync.ts       # MOC 同步
│   ├── quote.ts          # 语录管理
│   ├── validate.ts       # 验证
│   ├── create.ts         # 创建
│   └── fix-frontmatter.ts # 修复
└── lib/
    ├── graph.ts          # 图谱逻辑
    ├── dedup.ts          # 去重逻辑
    ├── ingest.ts         # 导入逻辑
    ├── vault.ts          # vault 操作
    ├── types.ts          # 类型定义
    └── ...
```
## 实施状态

- [x] 核心 CLI 框架（commander）
- [x] 图谱生成（graph）
- [x] 连接发现（connect）— 本地 + LLM
- [x] 去重检测（dedup）
- [x] 内容导入（ingest）— URL/文件
- [x] 扫描统计（scan）
- [x] MOC 同步（moc-sync）
- [x] 语录管理（quote）
- [x] frontmatter 验证/修复
- [x] LLM 集成（api/agent 模式）
## 变更记录

| 日期 | 版本 | 变更 |
|------|------|------|
| 2026-05-27 | v1 | 初稿 |
| 2026-05-27 | v4 | 初稿：整理现有架构到 plan-engine |
