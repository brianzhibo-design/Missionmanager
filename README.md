# 任务管理系统

基于 AI 增强的智能任务管理系统。

## 项目结构

```
任务管理系统/
├── backend/               # 后端服务
│   └── src/
│       ├── controllers/   # HTTP 控制器
│       ├── services/      # 业务逻辑层
│       ├── repositories/  # 数据访问层
│       ├── ai/            # AI 分析模块
│       ├── domain/        # 领域模型
│       └── infra/         # 基础设施
├── frontend/              # 前端应用
├── docker/                # Docker 配置
└── docs/                  # 项目文档
```

## 技术栈

### 后端
- Node.js + TypeScript
- Express.js
- Prisma ORM
- PostgreSQL

### 前端
- Vite + React
- TypeScript
- React Router

### 基础设施
- Docker & Docker Compose
- PostgreSQL
- Redis（可选）

## 快速开始

### 1. 启动数据库服务

```bash
cd docker
docker-compose up -d
```

### 2. 启动后端服务

```bash
cd backend
npm install
npm run dev
```

### 3. 启动前端应用

```bash
cd frontend
npm install
npm run dev
```

## 环境变量

复制 `.env.example` 为 `.env` 并配置相应的环境变量。

## 许可证

MIT

