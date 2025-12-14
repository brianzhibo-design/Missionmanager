# AI 分析 Prompt 模板

本文档定义任务管理系统中所有 AI 分析功能的 Prompt 模板与调用策略。

---

## 一、模板总览

| 模板名称 | 用途 | 输入 | 输出 |
|----------|------|------|------|
| task-analysis | 单任务分析 | 任务详情 | 进度评估、建议、风险 |
| project-analysis | 项目整体分析 | 项目 + 所有任务 | 项目健康度、瓶颈、建议 |
| event-stream-analysis | 基于事件流分析 | 任务 + 近期事件 | 趋势判断、异常检测 |
| task-decomposition | 任务分解 | 任务标题/描述 | 子任务列表 |
| daily-planning | 每日规划 | 用户所有待办任务 | 今日优先任务排序 |

---

## 二、任务级分析（task-analysis）

### 2.1 使用场景

- 用户点击"AI 分析任务"按钮
- 任务停滞超过设定时间，系统自动触发

### 2.2 输入字段

```json
{
  "task": {
    "id": "string",
    "title": "string",
    "description": "string | null",
    "status": "TODO | IN_PROGRESS | REVIEW | BLOCKED | DONE",
    "priority": "LOW | MEDIUM | HIGH | URGENT",
    "createdAt": "ISO datetime",
    "updatedAt": "ISO datetime",
    "dueDate": "ISO datetime | null",
    "estimatedHours": "number | null",
    "spentHours": "number | null",
    "assignee": "string | null",
    "subtasks": [
      { "title": "string", "completed": "boolean" }
    ],
    "recentEvents": [
      { "type": "string", "description": "string", "createdAt": "ISO datetime" }
    ]
  },
  "context": {
    "projectName": "string",
    "totalProjectTasks": "number",
    "completedProjectTasks": "number"
  }
}
```

### 2.3 Prompt 模板

```
你是一个专业的任务管理助手。请分析以下任务并提供结构化建议。

## 任务信息
- 标题：{{task.title}}
- 描述：{{task.description || "无"}}
- 状态：{{task.status}}
- 优先级：{{task.priority}}
- 创建时间：{{task.createdAt}}
- 截止日期：{{task.dueDate || "未设置"}}
- 预估工时：{{task.estimatedHours || "未设置"}} 小时
- 已花费工时：{{task.spentHours || 0}} 小时
- 负责人：{{task.assignee || "未分配"}}

## 子任务完成情况
{{#each task.subtasks}}
- [{{#if completed}}✓{{else}} {{/if}}] {{title}}
{{/each}}
{{#unless task.subtasks}}
无子任务
{{/unless}}

## 近期动态
{{#each task.recentEvents}}
- {{createdAt}}: {{type}} - {{description}}
{{/each}}
{{#unless task.recentEvents}}
无近期动态
{{/unless}}

## 项目背景
- 所属项目：{{context.projectName}}
- 项目进度：{{context.completedProjectTasks}}/{{context.totalProjectTasks}} 任务完成

---

请用 JSON 格式返回分析结果，包含以下字段：

{
  "progress_assessment": {
    "percentage": 0-100 的整数,
    "status": "on_track | at_risk | delayed | blocked",
    "summary": "一句话总结当前进度"
  },
  "next_actions": [
    {
      "action": "具体可执行的下一步",
      "priority": "high | medium | low",
      "estimated_minutes": 预估分钟数
    }
  ],
  "risks": [
    {
      "description": "风险描述",
      "severity": "high | medium | low",
      "mitigation": "建议的缓解措施"
    }
  ],
  "insights": "其他观察或建议（可选）"
}

注意：
1. next_actions 最多 5 条，按优先级排序
2. risks 只列出真实存在的风险，没有则返回空数组
3. 所有建议必须具体、可执行，避免空泛的描述
```

### 2.4 输出 Schema

见 `task-analysis-schema.json`

---

## 三、项目级分析（project-analysis）

### 3.1 使用场景

- 用户在项目详情页点击"AI 分析项目"
- 周报生成时自动调用

### 3.2 输入字段

```json
{
  "project": {
    "id": "string",
    "name": "string",
    "description": "string | null",
    "createdAt": "ISO datetime",
    "dueDate": "ISO datetime | null"
  },
  "tasks": [
    {
      "id": "string",
      "title": "string",
      "status": "string",
      "priority": "string",
      "assignee": "string | null",
      "dueDate": "ISO datetime | null",
      "updatedAt": "ISO datetime"
    }
  ],
  "statistics": {
    "total": "number",
    "byStatus": { "TODO": 0, "IN_PROGRESS": 0, "REVIEW": 0, "BLOCKED": 0, "DONE": 0 },
    "byPriority": { "LOW": 0, "MEDIUM": 0, "HIGH": 0, "URGENT": 0 },
    "overdueCount": "number",
    "avgCompletionDays": "number | null"
  }
}
```

### 3.3 Prompt 模板

```
你是一个项目管理专家。请分析以下项目的整体健康状况。

## 项目信息
- 名称：{{project.name}}
- 描述：{{project.description || "无"}}
- 创建时间：{{project.createdAt}}
- 目标日期：{{project.dueDate || "未设置"}}

## 任务统计
- 总任务数：{{statistics.total}}
- 按状态分布：
  - 待办：{{statistics.byStatus.TODO}}
  - 进行中：{{statistics.byStatus.IN_PROGRESS}}
  - 审核中：{{statistics.byStatus.REVIEW}}
  - 已阻塞：{{statistics.byStatus.BLOCKED}}
  - 已完成：{{statistics.byStatus.DONE}}
- 逾期任务：{{statistics.overdueCount}}
- 平均完成周期：{{statistics.avgCompletionDays || "数据不足"}} 天

## 当前任务列表（按优先级排序）
{{#each tasks}}
- [{{status}}] {{title}} | 优先级: {{priority}} | 负责人: {{assignee || "未分配"}}
{{/each}}

---

请用 JSON 格式返回分析结果：

{
  "health_score": 0-100 的整数,
  "health_status": "healthy | needs_attention | at_risk | critical",
  "summary": "一段话总结项目状态",
  "bottlenecks": [
    {
      "description": "瓶颈描述",
      "affected_tasks": ["任务标题1", "任务标题2"],
      "suggestion": "解决建议"
    }
  ],
  "recommendations": [
    {
      "action": "建议的行动",
      "impact": "high | medium | low",
      "effort": "high | medium | low"
    }
  ],
  "timeline_assessment": {
    "on_track": true/false,
    "estimated_completion": "ISO datetime 或 null",
    "risk_factors": ["风险因素1", "风险因素2"]
  }
}
```

---

## 四、事件流分析（event-stream-analysis）

### 4.1 使用场景

- 任务长时间无进展，系统自动触发
- 用户请求"分析这个任务为什么卡住了"

### 4.2 输入字段

```json
{
  "task": {
    "id": "string",
    "title": "string",
    "status": "string",
    "createdAt": "ISO datetime"
  },
  "events": [
    {
      "type": "CREATED | STATUS_CHANGED | UPDATED | COMMENT_ADDED | ASSIGNEE_CHANGED",
      "oldValue": "string | null",
      "newValue": "string | null",
      "description": "string",
      "createdAt": "ISO datetime",
      "actor": "string | null"
    }
  ],
  "timeRange": {
    "from": "ISO datetime",
    "to": "ISO datetime",
    "totalDays": "number"
  }
}
```

### 4.3 Prompt 模板

```
你是一个任务分析专家。请根据以下事件历史分析任务的进展模式。

## 任务信息
- 标题：{{task.title}}
- 当前状态：{{task.status}}
- 创建时间：{{task.createdAt}}

## 事件历史（时间范围：{{timeRange.totalDays}} 天）
{{#each events}}
[{{createdAt}}] {{type}}
  {{#if oldValue}}从 "{{oldValue}}" {{/if}}{{#if newValue}}变为 "{{newValue}}"{{/if}}
  {{#if description}}说明：{{description}}{{/if}}
  {{#if actor}}操作人：{{actor}}{{/if}}
---
{{/each}}

---

请分析事件模式并返回 JSON：

{
  "pattern_analysis": {
    "activity_level": "active | moderate | stagnant",
    "avg_days_between_updates": 数字,
    "status_change_count": 数字,
    "most_time_in_status": "状态名"
  },
  "anomalies": [
    {
      "type": "long_stagnation | frequent_status_changes | blocked_loop",
      "description": "异常描述",
      "period": "时间段描述"
    }
  ],
  "diagnosis": {
    "likely_cause": "可能的原因",
    "confidence": "high | medium | low",
    "evidence": ["支持判断的证据1", "证据2"]
  },
  "recommended_action": "建议的下一步行动"
}
```

---

## 五、任务分解（task-decomposition）

### 5.1 使用场景

- 用户创建任务后点击"AI 生成子任务"
- 任务描述较长时自动建议分解

### 5.2 Prompt 模板

```
你是一个任务规划专家。请将以下任务分解为可执行的子任务。

## 主任务
- 标题：{{title}}
- 描述：{{description || "无"}}
- 优先级：{{priority}}
- 预估工时：{{estimatedHours || "未设置"}} 小时

---

请返回 JSON 格式的子任务列表：

{
  "subtasks": [
    {
      "title": "子任务标题（简洁明确）",
      "description": "具体说明（可选）",
      "estimated_minutes": 预估分钟数,
      "order": 执行顺序（从1开始）
    }
  ],
  "decomposition_notes": "分解说明或注意事项"
}

规则：
1. 子任务数量 3-7 个为宜
2. 每个子任务应该是 30 分钟到 2 小时可完成的
3. 子任务标题用动词开头（如"编写"、"测试"、"Review"）
4. 按照逻辑依赖关系排序
```

---

## 六、调用策略说明

### 6.1 何时使用任务级分析

- 用户主动请求分析单个任务
- 任务状态为 BLOCKED 超过 24 小时
- 任务即将逾期（距离 dueDate < 2 天）

### 6.2 何时使用项目级分析

- 用户主动请求分析项目
- 生成周报/月报时
- 项目中 BLOCKED 任务占比 > 20%

### 6.3 何时引入事件流上下文

- 任务在同一状态停留超过 7 天
- 任务状态频繁变更（24 小时内 > 3 次）
- 用户明确询问"为什么卡住了"

### 6.4 Token 优化策略

| 场景 | 策略 |
|------|------|
| 子任务 > 10 个 | 只传最近 5 个未完成的 |
| 事件 > 20 条 | 只传最近 20 条 |
| 项目任务 > 50 个 | 只传 BLOCKED + 高优先级 + 最近更新的 |

---

## 七、错误处理

### 7.1 AI 返回非 JSON

重试一次，提示"请只返回 JSON，不要包含其他内容"

### 7.2 AI 返回 JSON 但 Schema 不匹配

使用默认值填充缺失字段，记录日志

### 7.3 AI 调用超时

返回缓存的上次分析结果（如果有），否则返回"分析暂时不可用"

---

## 八、版本记录

| 版本 | 日期 | 变更说明 |
|------|------|----------|
| 1.0 | 2025-01-XX | 初始版本，包含 5 种模板 |
