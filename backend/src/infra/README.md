# Infrastructure 目录

此目录存放基础设施相关代码。

## 职责

- 配置管理
- 数据库连接
- 外部服务集成
- 中间件实现
- 日志和监控

## 目录结构

```
infra/
├── config.ts              # 环境变量配置
├── database/              # 数据库相关
│   └── prisma.ts          # Prisma 客户端
├── middleware/            # 中间件
│   ├── auth.ts            # 认证中间件
│   └── errorHandler.ts    # 错误处理
└── logger/                # 日志
    └── index.ts
```

## 注意事项

- 所有外部依赖应在此层封装
- 配置应通过环境变量注入
- 提供依赖注入的基础设施

