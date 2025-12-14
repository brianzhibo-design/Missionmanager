# Controllers 目录

此目录存放 HTTP 请求处理器（Controller）。

## 职责

- 接收并验证 HTTP 请求
- 调用 Service 层处理业务逻辑
- 返回标准化的 HTTP 响应

## 目录结构

```
controllers/
├── healthController.ts    # 健康检查接口
├── userController.ts      # 用户相关接口
├── projectController.ts   # 项目相关接口
└── taskController.ts      # 任务相关接口
```

## 注意事项

- Controller 不应包含业务逻辑
- 所有业务逻辑应委托给 Service 层

