# Repositories 目录

此目录存放数据访问层（Repository）。

## 职责

- 封装数据库操作
- 提供数据访问抽象
- 实现 CRUD 操作
- 处理数据映射

## 目录结构

```
repositories/
├── userRepository.ts         # 用户数据访问
├── projectRepository.ts      # 项目数据访问
├── taskRepository.ts         # 任务数据访问
├── taskEventRepository.ts    # 任务事件数据访问
└── workspaceRepository.ts    # 工作区数据访问
```

## 注意事项

- Repository 只负责数据存取，不包含业务逻辑
- 使用 Prisma ORM 进行数据库操作
- 提供类型安全的数据访问接口

