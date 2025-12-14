# Frontend 目录

此目录存放前端 React 应用。

## 技术栈

- Vite - 构建工具
- React - UI 框架
- React Router - 路由管理
- TypeScript - 类型安全

## 目录结构

```
frontend/
├── src/
│   ├── components/        # 通用组件
│   ├── pages/             # 页面组件
│   │   ├── Login.tsx
│   │   ├── Projects.tsx
│   │   ├── ProjectDetail.tsx
│   │   └── TaskDetail.tsx
│   ├── hooks/             # 自定义 Hooks
│   ├── services/          # API 服务
│   ├── stores/            # 状态管理
│   └── utils/             # 工具函数
├── public/                # 静态资源
└── index.html
```

## 路由结构

- `/login` - 登录页面
- `/projects` - 项目列表
- `/projects/:id` - 项目详情
- `/tasks/:id` - 任务详情

## 开发命令

```bash
npm install    # 安装依赖
npm run dev    # 启动开发服务器
npm run build  # 构建生产版本
```

