# TaskFlow 部署指南

## 服务器要求

- Ubuntu 24.04 LTS
- 2 核 CPU
- 4GB 内存
- 20GB+ 磁盘空间
- 开放端口: 80, 443

## 1. 服务器初始化

### 1.1 更新系统

```bash
sudo apt update && sudo apt upgrade -y
```

### 1.2 安装 Docker

```bash
# 安装依赖
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common

# 添加 Docker GPG 密钥
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# 添加 Docker 仓库
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 安装 Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 添加当前用户到 docker 组
sudo usermod -aG docker $USER
newgrp docker
```

### 1.3 配置防火墙

```bash
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### 1.4 配置 Swap（推荐 4GB 内存服务器）

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## 2. 部署应用

### 2.1 上传代码

```bash
# 使用 Git 克隆
git clone https://github.com/your-repo/taskflow.git
cd taskflow

# 或使用 scp 上传
scp -r ./taskflow user@server:/home/user/
```

### 2.2 配置环境变量

```bash
cp env.production.example .env.production
nano .env.production

# 填写以下配置:
# DB_PASSWORD=强密码
# JWT_SECRET=至少32位随机字符串
# DOMAIN=your-domain.com
# ANTHROPIC_API_KEY=你的 API 密钥（可选）
```

### 2.3 配置 Nginx（选择一种）

**生产环境（有 SSL）:**
```bash
# 编辑 nginx/conf.d/taskflow.conf
# 将 your-domain.com 替换为你的真实域名
nano nginx/conf.d/taskflow.conf
```

**测试环境（无 SSL）:**
```bash
# 使用开发配置
mv nginx/conf.d/taskflow.conf nginx/conf.d/taskflow.conf.bak
cp nginx/conf.d/taskflow-dev.conf.example nginx/conf.d/taskflow-dev.conf
```

### 2.4 构建和启动

```bash
chmod +x deploy.sh
./deploy.sh build
./deploy.sh start
./deploy.sh migrate
```

### 2.5 获取 SSL 证书（可选）

```bash
# 确保域名已解析到服务器 IP
./deploy.sh ssl
```

## 3. 日常维护

### 查看日志

```bash
./deploy.sh logs           # 所有服务
./deploy.sh logs backend   # 仅后端
./deploy.sh logs nginx     # 仅 Nginx
./deploy.sh logs postgres  # 仅数据库
```

### 备份数据库

```bash
./deploy.sh backup
# 备份文件保存在 backups/ 目录
```

### 更新部署

```bash
git pull
./deploy.sh build
./deploy.sh restart
./deploy.sh migrate
```

### 健康检查

```bash
./deploy.sh health
```

## 4. 资源使用估算（2核4G服务器）

| 服务 | 内存限制 | 内存预留 |
|------|---------|---------|
| PostgreSQL | 512MB | 256MB |
| Redis | 192MB | 64MB |
| Backend | 512MB | 256MB |
| Frontend | 128MB | 64MB |
| Nginx | 64MB | 32MB |
| **总计** | **~1.4GB** | **~672MB** |

剩余内存用于系统和突发负载。

## 5. 性能优化建议

### 5.1 数据库优化

编辑 PostgreSQL 配置（可选）：

```bash
docker exec -it taskflow_postgres psql -U taskflow -c "
  ALTER SYSTEM SET shared_buffers = '256MB';
  ALTER SYSTEM SET effective_cache_size = '512MB';
  ALTER SYSTEM SET maintenance_work_mem = '64MB';
"
# 重启 PostgreSQL 生效
docker-compose -f docker-compose.prod.yml restart postgres
```

### 5.2 监控资源使用

```bash
# 查看容器资源使用
docker stats

# 查看磁盘使用
df -h

# 查看内存使用
free -h
```

### 5.3 日志轮转

Docker 默认会积累日志，建议配置轮转：

```bash
# 创建 /etc/docker/daemon.json
sudo nano /etc/docker/daemon.json
```

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

```bash
sudo systemctl restart docker
```

## 6. 故障排除

### 容器无法启动

```bash
# 查看容器日志
docker-compose -f docker-compose.prod.yml logs

# 检查端口占用
sudo lsof -i :80
sudo lsof -i :443
```

### 数据库连接失败

```bash
# 检查 PostgreSQL 容器
docker exec -it taskflow_postgres pg_isready

# 检查连接
docker exec -it taskflow_postgres psql -U taskflow -c "SELECT 1"
```

### SSL 证书问题

```bash
# 检查证书状态
docker-compose -f docker-compose.prod.yml run --rm certbot certificates

# 强制续期
docker-compose -f docker-compose.prod.yml run --rm certbot renew --force-renewal
```

### 内存不足

```bash
# 检查内存使用
docker stats --no-stream

# 清理未使用资源
./deploy.sh clean

# 重启服务释放内存
./deploy.sh restart
```

## 7. 安全建议

1. **定期更新**：保持系统和 Docker 镜像更新
2. **强密码**：使用强 JWT_SECRET 和 DB_PASSWORD
3. **限流**：Nginx 已配置 API 限流防止滥用
4. **备份**：定期运行 `./deploy.sh backup`
5. **监控**：考虑接入监控系统（如 Prometheus + Grafana）

## 8. 常用命令速查

| 命令 | 说明 |
|------|------|
| `./deploy.sh build` | 构建镜像 |
| `./deploy.sh start` | 启动服务 |
| `./deploy.sh stop` | 停止服务 |
| `./deploy.sh restart` | 重启服务 |
| `./deploy.sh logs` | 查看日志 |
| `./deploy.sh migrate` | 数据库迁移 |
| `./deploy.sh backup` | 备份数据库 |
| `./deploy.sh ssl` | 获取SSL证书 |
| `./deploy.sh health` | 健康检查 |
| `./deploy.sh clean` | 清理资源 |

