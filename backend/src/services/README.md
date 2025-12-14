# Services 目录

此目录存放业务逻辑服务层。

## 职责

- 实现核心业务逻辑
- 协调多个 Repository 的数据操作
- 处理事务管理
- 调用 AI 分析服务

## 目录结构

```
services/
├── userService.ts         # 用户业务逻辑
├── projectService.ts      # 项目业务逻辑
├── taskService.ts         # 任务业务逻辑
└── workspaceService.ts    # 工作区业务逻辑
```

## 注意事项

- Service 层是业务逻辑的核心
- 不应直接操作数据库，使用 Repository 层
- 不应处理 HTTP 请求/响应相关逻辑

