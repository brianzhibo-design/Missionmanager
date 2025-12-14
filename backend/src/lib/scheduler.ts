/**
 * 定时任务调度器
 * 使用 node-cron 调度各种定时任务
 */
import cron from 'node-cron';
import { sendTaskReminders, sendDailySummaries } from '../services/notificationEmailService';

export function startScheduler(): void {
  console.log('⏰ Starting scheduler...');

  // 每天早上 8:00 发送每日工作摘要
  cron.schedule('0 8 * * *', async () => {
    console.log('🕗 Running daily summary job...');
    try {
      await sendDailySummaries();
    } catch (error) {
      console.error('Daily summary job failed:', error);
    }
  }, {
    timezone: 'Asia/Shanghai'
  });

  // 每天早上 9:00 发送任务到期提醒
  cron.schedule('0 9 * * *', async () => {
    console.log('🕘 Running task reminder job...');
    try {
      await sendTaskReminders();
    } catch (error) {
      console.error('Task reminder job failed:', error);
    }
  }, {
    timezone: 'Asia/Shanghai'
  });

  // 每周一早上 9:30 可以添加周报提醒
  cron.schedule('30 9 * * 1', async () => {
    console.log('📊 Weekly report reminder...');
    // 可以在这里添加周报生成和发送逻辑
  }, {
    timezone: 'Asia/Shanghai'
  });

  console.log('✅ Scheduler started with the following jobs:');
  console.log('   - Daily summary: 8:00 AM (Asia/Shanghai)');
  console.log('   - Task reminders: 9:00 AM (Asia/Shanghai)');
  console.log('   - Weekly report: Monday 9:30 AM (Asia/Shanghai)');
}

