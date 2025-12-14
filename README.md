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
- Anthropic Claude API (AI 功能)

### 前端
- Vite + React
- TypeScript
- React Router
- Lucide React (图标库)

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

---

## 更新日志

### 2024-12-14 更新

#### 🎯 功能更新

| 功能 | 描述 |
|------|------|
| **AI 项目优化** | 新增项目级别的 AI 优化功能，可自动优化项目标题、描述，并提供负责人建议和团队构成建议 |
| **项目优化按钮位置调整** | 将"项目优化"按钮从工具栏移至项目名称旁边，提升操作便捷性 |
| **AI 响应解析修复** | 修复了 AI 响应 JSON 解析失败的问题，增加 maxTokens 限制并改进 parseJSON 函数 |

#### 📁 更新文件

**后端 (backend/)**

| 文件路径 | 更新内容 |
|----------|----------|
| `src/services/aiService.ts` | 1. 新增 `optimizeProject` 函数实现项目优化功能<br>2. 改进 `parseJSON` 函数，更稳健地处理 markdown 代码块包裹的 JSON<br>3. 将项目优化的 `maxTokens` 从 1500 增加到 3000，避免 AI 响应被截断 |
| `src/controllers/aiController.ts` | 新增 `GET /ai/projects/:id/optimize-project` 路由 |

**前端 (frontend/)**

| 文件路径 | 更新内容 |
|----------|----------|
| `src/pages/ProjectDetail.tsx` | 1. 新增 AI 项目优化弹窗组件<br>2. 将"项目优化"按钮移至项目名称旁边<br>3. 新增 `handleProjectOptimization` 和 `handleApplyProjectOptimization` 函数 |
| `src/pages/ProjectDetail.css` | 新增项目优化弹窗相关样式（`.project-optimization-modal`, `.leader-suggestion`, `.team-suggestions` 等） |
| `src/services/ai.ts` | 1. 新增 `ProjectOptimizationResult` 接口<br>2. 新增 `optimizeProject` 方法 |

#### 🔧 技术改进

1. **AI JSON 解析优化**
   - 简化 `parseJSON` 函数逻辑
   - 支持移除 markdown 代码块标记（` ```json ` 和 ` ``` `）
   - 自动清理尾随逗号

2. **响应长度优化**
   - 项目优化 API 的 `maxTokens` 从 1500 增加到 3000
   - 避免复杂项目的 AI 分析结果被截断

#### 🎨 UI 改进

- 项目优化弹窗展示：
  - 📝 项目标题优化对比
  - 📋 项目描述优化对比
  - 👤 建议项目负责人（角色、技能、理由）
  - 👥 建议团队构成（角色、人数、技能、职责）
  - 💡 其他优化建议
  - 一键应用标题和描述优化

---

## 许可证

MIT
