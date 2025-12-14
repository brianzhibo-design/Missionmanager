# AI 目录

此目录存放 AI 相关服务和分析模块。

## 职责

- 管理 AI 服务集成（如 OpenAI）
- 处理任务分析 Prompt 模板
- 执行智能任务分析
- 生成风险评估和建议

## 目录结构

```
ai/
├── prompts/                   # Prompt 模板目录
│   ├── taskAnalysis.ts        # 任务分析 Prompt
│   └── progressAssessment.ts  # 进度评估 Prompt
├── schemas/                   # JSON Schema 定义
│   └── analysisResult.ts      # 分析结果 Schema
├── aiService.ts               # AI 服务封装
└── analysisEngine.ts          # 分析引擎
```

## 注意事项

- Prompt 模板应标准化且可配置
- AI 调用结果需要验证和错误处理
- 保持 API Key 等敏感信息在环境变量中

