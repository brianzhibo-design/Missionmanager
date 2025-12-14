# Domain 目录

此目录存放领域模型和业务规则。

## 职责

- 定义核心领域实体
- 封装业务规则和验证逻辑
- 定义值对象（Value Objects）
- 定义领域事件

## 目录结构

```
domain/
├── entities/              # 领域实体
│   ├── User.ts
│   ├── Project.ts
│   ├── Task.ts
│   └── Workspace.ts
├── valueObjects/          # 值对象
│   ├── TaskStatus.ts
│   └── Priority.ts
├── events/                # 领域事件
│   └── TaskEvents.ts
└── rules/                 # 业务规则
    └── taskRules.ts
```

## 注意事项

- 领域模型应独立于基础设施
- 业务规则应在此层实现
- 保持领域模型的纯粹性

