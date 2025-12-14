# Docker 目录

此目录存放 Docker 相关配置。

## 服务说明

### PostgreSQL
- 端口: 5432
- 用途: 主数据库，存储所有业务数据

### Redis（可选）
- 端口: 6379
- 用途: 缓存、会话存储、消息队列

## 使用方法

```bash
# 启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 停止服务
docker-compose down

# 停止并删除数据卷
docker-compose down -v
```

## 数据持久化

- PostgreSQL 数据: `./data/postgres`
- Redis 数据: `./data/redis`

## 注意事项

- 生产环境请修改默认密码
- 确保数据目录有正确的权限

