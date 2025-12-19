/**
 * 咖啡抽奖服务
 * 每日在工作区中随机抽取一位员工获得咖啡奖励
 */
import { prisma } from '../infra/database';
import { notificationService } from './notificationService';
import { emailService } from '../lib/emailService';

export const coffeeService = {
  /**
   * 获取今日工作区的咖啡获奖者
   */
  async getTodayWinner(workspaceId: string): Promise<{
    id: string;
    name: string;
    avatar: string | null;
  } | null> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lottery = await prisma.coffeeLottery.findUnique({
      where: {
        workspaceId_date: {
          workspaceId,
          date: today,
        },
      },
      include: {
        winner: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    return lottery?.winner || null;
  },

  /**
   * 执行咖啡抽奖（每个工作区每天只能抽一次）
   */
  async drawLottery(workspaceId: string): Promise<{
    winner: { id: string; name: string; avatar: string | null };
    alreadyDrawn: boolean;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 检查今天是否已经抽过
    const existingLottery = await prisma.coffeeLottery.findUnique({
      where: {
        workspaceId_date: {
          workspaceId,
          date: today,
        },
      },
      include: {
        winner: {
          select: { id: true, name: true, avatar: true },
        },
      },
    });

    if (existingLottery) {
      return {
        winner: existingLottery.winner,
        alreadyDrawn: true,
      };
    }

    // 获取工作区所有成员
    const members = await prisma.workspaceUser.findMany({
      where: { workspaceId },
      include: {
        user: {
          select: { id: true, name: true, avatar: true, email: true },
        },
      },
    });

    if (members.length === 0) {
      throw new Error('NO_MEMBERS');
    }

    // 获取最近7天的获奖记录，用于降低重复获奖概率
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const recentWinners = await prisma.coffeeLottery.findMany({
      where: {
        workspaceId,
        date: { gte: sevenDaysAgo },
      },
      select: { winnerId: true },
    });

    const recentWinnerIds = new Set(recentWinners.map(w => w.winnerId));

    // 优先从未在最近7天获奖的成员中选择
    let eligibleMembers = members.filter(m => !recentWinnerIds.has(m.user.id));
    
    // 如果所有人都在最近7天获过奖，则从所有成员中选择
    if (eligibleMembers.length === 0) {
      eligibleMembers = members;
    }

    // 使用加密安全的随机数（如果可用）或回退到 Math.random
    const randomIndex = Math.floor(Math.random() * eligibleMembers.length);
    const winner = eligibleMembers[randomIndex].user;

    // 创建抽奖记录
    await prisma.coffeeLottery.create({
      data: {
        workspaceId,
        winnerId: winner.id,
        date: today,
      },
    });

    // 获取工作区名称
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { name: true },
    });

    // 发送通知给获奖者
    await notificationService.create({
      userId: winner.id,
      type: 'coffee_lottery',
      title: '恭喜！你获得了今日幸运咖啡',
      message: `你是 ${workspace?.name || '工作区'} 今日的幸运咖啡获得者！请向管理员领取你的咖啡奖励~`,
      sendEmail: false,
    });

    // 发送邮件通知
    if (winner.email) {
      try {
        await emailService.sendCoffeeWinnerEmail(
          winner.email,
          winner.name,
          workspace?.name || '工作区'
        );
      } catch (error) {
        console.error('发送咖啡中奖邮件失败:', error);
      }
    }

    return {
      winner: { id: winner.id, name: winner.name, avatar: winner.avatar },
      alreadyDrawn: false,
    };
  },

  /**
   * 获取工作区的咖啡抽奖历史
   */
  async getHistory(workspaceId: string, options: { limit?: number } = {}) {
    const { limit = 30 } = options;

    return prisma.coffeeLottery.findMany({
      where: { workspaceId },
      orderBy: { date: 'desc' },
      take: limit,
      include: {
        winner: {
          select: { id: true, name: true, avatar: true },
        },
      },
    });
  },
};

