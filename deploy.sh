#!/bin/bash
set -e

echo "🚀 TaskFlow 部署脚本"
echo "===================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 检查环境变量
check_env() {
    echo -e "${YELLOW}检查环境变量...${NC}"
    
    if [ ! -f .env.production ]; then
        echo -e "${RED}错误: .env.production 文件不存在${NC}"
        echo "请复制 .env.production.example 并填写配置"
        exit 1
    fi
    
    source .env.production
    
    if [ -z "$DB_PASSWORD" ]; then
        echo -e "${RED}错误: DB_PASSWORD 未设置${NC}"
        exit 1
    fi
    
    if [ -z "$JWT_SECRET" ]; then
        echo -e "${RED}错误: JWT_SECRET 未设置${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ 环境变量检查通过${NC}"
}

# 构建镜像
build() {
    echo -e "${YELLOW}构建 Docker 镜像...${NC}"
    docker-compose -f docker-compose.prod.yml build --no-cache
    echo -e "${GREEN}✓ 镜像构建完成${NC}"
}

# 启动服务
start() {
    echo -e "${YELLOW}启动服务...${NC}"
    docker-compose -f docker-compose.prod.yml --env-file .env.production up -d
    echo -e "${GREEN}✓ 服务启动完成${NC}"
}

# 停止服务
stop() {
    echo -e "${YELLOW}停止服务...${NC}"
    docker-compose -f docker-compose.prod.yml down
    echo -e "${GREEN}✓ 服务已停止${NC}"
}

# 重启服务
restart() {
    stop
    start
}

# 查看日志
logs() {
    docker-compose -f docker-compose.prod.yml logs -f $1
}

# 数据库迁移
migrate() {
    echo -e "${YELLOW}运行数据库迁移...${NC}"
    docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
    echo -e "${GREEN}✓ 数据库迁移完成${NC}"
}

# 备份数据库
backup() {
    echo -e "${YELLOW}备份数据库...${NC}"
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="backup_${TIMESTAMP}.sql"
    
    source .env.production
    docker-compose -f docker-compose.prod.yml exec -T postgres pg_dump -U $DB_USER $DB_NAME > ./backups/$BACKUP_FILE
    
    echo -e "${GREEN}✓ 备份完成: backups/${BACKUP_FILE}${NC}"
}

# 获取 SSL 证书
ssl() {
    echo -e "${YELLOW}获取 SSL 证书...${NC}"
    
    source .env.production
    
    if [ -z "$DOMAIN" ]; then
        echo -e "${RED}错误: DOMAIN 未设置${NC}"
        exit 1
    fi
    
    # 先启动 nginx（用于验证）
    docker-compose -f docker-compose.prod.yml up -d nginx
    
    # 获取证书
    docker-compose -f docker-compose.prod.yml run --rm certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        -d $DOMAIN \
        --email admin@$DOMAIN \
        --agree-tos \
        --no-eff-email
    
    # 重启 nginx 加载证书
    docker-compose -f docker-compose.prod.yml restart nginx
    
    echo -e "${GREEN}✓ SSL 证书获取完成${NC}"
}

# 健康检查
health() {
    echo -e "${YELLOW}健康检查...${NC}"
    
    # 检查容器状态
    docker-compose -f docker-compose.prod.yml ps
    
    # 检查 API
    echo ""
    echo "API 健康检查:"
    curl -s http://localhost/api/health || echo -e "${RED}API 不可用${NC}"
    
    echo ""
    echo -e "${GREEN}✓ 健康检查完成${NC}"
}

# 清理
clean() {
    echo -e "${YELLOW}清理未使用的资源...${NC}"
    docker system prune -f
    docker volume prune -f
    echo -e "${GREEN}✓ 清理完成${NC}"
}

# 帮助
help() {
    echo "用法: ./deploy.sh [命令]"
    echo ""
    echo "命令:"
    echo "  build     构建 Docker 镜像"
    echo "  start     启动所有服务"
    echo "  stop      停止所有服务"
    echo "  restart   重启所有服务"
    echo "  logs      查看日志 (可选: logs backend)"
    echo "  migrate   运行数据库迁移"
    echo "  backup    备份数据库"
    echo "  ssl       获取 SSL 证书"
    echo "  health    健康检查"
    echo "  clean     清理未使用资源"
    echo "  help      显示帮助"
}

# 创建备份目录
mkdir -p backups

# 主逻辑
case "$1" in
    build)
        check_env
        build
        ;;
    start)
        check_env
        start
        ;;
    stop)
        stop
        ;;
    restart)
        check_env
        restart
        ;;
    logs)
        logs $2
        ;;
    migrate)
        migrate
        ;;
    backup)
        backup
        ;;
    ssl)
        ssl
        ;;
    health)
        health
        ;;
    clean)
        clean
        ;;
    help|*)
        help
        ;;
esac

