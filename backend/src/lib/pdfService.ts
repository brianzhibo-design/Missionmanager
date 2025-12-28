/**
 * PDF 生成服务
 * 使用 puppeteer 从 HTML 生成 PDF，支持中文
 */
import puppeteer from 'puppeteer';

interface ReportData {
  id: string;
  type: 'weekly' | 'monthly' | 'daily';
  title: string;
  period: {
    start: string;
    end: string;
  };
  workspace: {
    name: string;
  };
  data: {
    summary: {
      totalProjects: number;
      totalTasks: number;
      completedTasks: number;
      newTasks: number;
      blockedTasks: number;
      overdueCount: number;
    };
    projectBreakdown: Array<{
      projectName: string;
      totalTasks: number;
      completedTasks: number;
      completionRate: number;
    }>;
    aiInsights?: string[];
  };
  createdAt: string;
}

/**
 * 生成报告 HTML
 */
function generateReportHTML(report: ReportData): string {
  const summary = report.data.summary;
  const completionRate = summary.totalTasks > 0 
    ? Math.round((summary.completedTasks / summary.totalTasks) * 100) 
    : 0;

  const projectRows = report.data.projectBreakdown.map((project, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${project.projectName}</td>
      <td>${project.completedTasks} / ${project.totalTasks}</td>
      <td>${project.completionRate}%</td>
    </tr>
  `).join('');

  const insightItems = (report.data.aiInsights || []).map((insight, index) => `
    <li>${insight}</li>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <!-- 引入 Google 字体确保中文支持 -->
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;600;700&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: "Noto Sans SC", "PingFang SC", "Microsoft YaHei", "Hiragino Sans GB", "WenQuanYi Micro Hei", sans-serif;
      line-height: 1.6;
      color: #1a1a2e;
      padding: 40px;
      background: white;
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 2px solid #6366F1;
    }
    .header h1 {
      font-size: 28px;
      color: #6366F1;
      margin-bottom: 10px;
    }
    .header .meta {
      color: #64748b;
      font-size: 14px;
    }
    .section {
      margin-bottom: 30px;
    }
    .section-title {
      font-size: 18px;
      font-weight: 600;
      color: #1e293b;
      margin-bottom: 15px;
      padding-bottom: 8px;
      border-bottom: 1px solid #e2e8f0;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      margin-bottom: 20px;
    }
    .stat-card {
      background: #f8fafc;
      border-radius: 8px;
      padding: 15px;
      text-align: center;
    }
    .stat-value {
      font-size: 28px;
      font-weight: 700;
      color: #6366F1;
    }
    .stat-label {
      font-size: 12px;
      color: #64748b;
      margin-top: 5px;
    }
    .stat-value.success { color: #10B981; }
    .stat-value.danger { color: #EF4444; }
    .stat-value.warning { color: #F59E0B; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #e2e8f0;
    }
    th {
      background: #f8fafc;
      font-weight: 600;
      color: #475569;
    }
    tr:last-child td {
      border-bottom: none;
    }
    .insights-list {
      list-style: none;
      padding: 0;
    }
    .insights-list li {
      padding: 10px 15px;
      background: #f0fdf4;
      border-left: 3px solid #10B981;
      margin-bottom: 8px;
      border-radius: 0 6px 6px 0;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      color: #94a3b8;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 ${report.title}</h1>
    <div class="meta">
      <p>工作区：${report.workspace.name}</p>
      <p>报告周期：${report.period.start} ~ ${report.period.end}</p>
      <p>生成时间：${new Date(report.createdAt).toLocaleString('zh-CN')}</p>
    </div>
  </div>

  <div class="section">
    <h2 class="section-title">📈 数据摘要</h2>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">${summary.totalProjects}</div>
        <div class="stat-label">项目总数</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${summary.totalTasks}</div>
        <div class="stat-label">任务总数</div>
      </div>
      <div class="stat-card">
        <div class="stat-value success">${summary.completedTasks}</div>
        <div class="stat-label">已完成</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${completionRate}%</div>
        <div class="stat-label">完成率</div>
      </div>
    </div>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">${summary.newTasks}</div>
        <div class="stat-label">新建任务</div>
      </div>
      <div class="stat-card">
        <div class="stat-value warning">${summary.blockedTasks}</div>
        <div class="stat-label">阻塞任务</div>
      </div>
      <div class="stat-card">
        <div class="stat-value danger">${summary.overdueCount}</div>
        <div class="stat-label">逾期任务</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${summary.totalTasks - summary.completedTasks}</div>
        <div class="stat-label">待处理</div>
      </div>
    </div>
  </div>

  ${report.data.projectBreakdown.length > 0 ? `
  <div class="section">
    <h2 class="section-title">📁 项目明细</h2>
    <table>
      <thead>
        <tr>
          <th style="width: 50px;">#</th>
          <th>项目名称</th>
          <th style="width: 120px;">任务进度</th>
          <th style="width: 100px;">完成率</th>
        </tr>
      </thead>
      <tbody>
        ${projectRows}
      </tbody>
    </table>
  </div>
  ` : ''}

  ${report.data.aiInsights && report.data.aiInsights.length > 0 ? `
  <div class="section">
    <h2 class="section-title">🤖 AI 洞察</h2>
    <ul class="insights-list">
      ${insightItems}
    </ul>
  </div>
  ` : ''}

  <div class="footer">
    <p>—— 由 TaskFlow 自动生成 ——</p>
  </div>
</body>
</html>
  `;
}

/**
 * 生成报告 PDF
 * 支持中文字体渲染
 */
export async function generateReportPDF(report: ReportData): Promise<Buffer> {
  const html = generateReportHTML(report);
  
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--font-render-hinting=none', // 改善字体渲染
    ],
  });
  
  try {
    const page = await browser.newPage();
    
    // 设置页面内容，等待字体和样式加载完成
    await page.setContent(html, { 
      waitUntil: ['networkidle0', 'domcontentloaded'] 
    });
    
    // 等待字体加载
    await page.evaluateHandle('document.fonts.ready');
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px',
      },
      preferCSSPageSize: true,
    });
    
    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}
