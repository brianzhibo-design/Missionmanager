/**
 * Excel 生成服务
 * 使用 exceljs 生成报告 Excel
 */
import ExcelJS from 'exceljs';

interface ReportData {
  id: string;
  type: 'weekly' | 'monthly';
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
    taskList?: Array<{
      title: string;
      status: string;
      priority: string;
      assignee?: string;
      dueDate?: string;
    }>;
  };
  createdAt: string;
}

/**
 * 生成报告 Excel
 */
export async function generateReportExcel(report: ReportData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'TaskFlow';
  workbook.created = new Date();

  // 摘要工作表
  const summarySheet = workbook.addWorksheet('Summary');
  
  // 标题样式
  summarySheet.mergeCells('A1:D1');
  const titleCell = summarySheet.getCell('A1');
  titleCell.value = report.title;
  titleCell.font = { size: 18, bold: true };
  titleCell.alignment = { horizontal: 'center' };

  // 基本信息
  summarySheet.addRow([]);
  summarySheet.addRow(['Workspace', report.workspace.name]);
  summarySheet.addRow(['Period', `${report.period.start} ~ ${report.period.end}`]);
  summarySheet.addRow(['Generated', new Date(report.createdAt).toLocaleString('zh-CN')]);
  summarySheet.addRow([]);

  // 数据摘要
  summarySheet.addRow(['📊 Data Summary']);
  summarySheet.addRow(['Metric', 'Value']);
  
  const summary = report.data.summary || {};
  summarySheet.addRow(['Total Projects', summary.totalProjects || 0]);
  summarySheet.addRow(['Total Tasks', summary.totalTasks || 0]);
  summarySheet.addRow(['Completed', summary.completedTasks || 0]);
  summarySheet.addRow(['New Tasks', summary.newTasks || 0]);
  summarySheet.addRow(['Blocked Tasks', summary.blockedTasks || 0]);
  summarySheet.addRow(['Overdue Tasks', summary.overdueCount || 0]);
  
  const completionRate = (summary.totalTasks || 0) > 0 
    ? Math.round(((summary.completedTasks || 0) / (summary.totalTasks || 1)) * 100) 
    : 0;
  summarySheet.addRow(['Completion Rate', `${completionRate}%`]);

  // 设置列宽
  summarySheet.getColumn(1).width = 20;
  summarySheet.getColumn(2).width = 30;

  // 项目明细工作表
  const projectSheet = workbook.addWorksheet('Projects');
  
  projectSheet.addRow(['Project Name', 'Total Tasks', 'Completed', 'Completion Rate']);
  const headerRow = projectSheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF6366F1' }
  };

  if (report.data.projectBreakdown) {
    report.data.projectBreakdown.forEach(project => {
      projectSheet.addRow([
        project.projectName,
        project.totalTasks,
        project.completedTasks,
        `${project.completionRate}%`
      ]);
    });
  }

  projectSheet.getColumn(1).width = 30;
  projectSheet.getColumn(2).width = 15;
  projectSheet.getColumn(3).width = 15;
  projectSheet.getColumn(4).width = 15;

  // 任务列表工作表（如果有）
  if (report.data.taskList && report.data.taskList.length > 0) {
    const taskSheet = workbook.addWorksheet('Tasks');
    
    taskSheet.addRow(['Task Title', 'Status', 'Priority', 'Assignee', 'Due Date']);
    const taskHeaderRow = taskSheet.getRow(1);
    taskHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    taskHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF6366F1' }
    };

    report.data.taskList.forEach(task => {
      taskSheet.addRow([
        task.title,
        task.status,
        task.priority,
        task.assignee || '-',
        task.dueDate || '-'
      ]);
    });

    taskSheet.getColumn(1).width = 40;
    taskSheet.getColumn(2).width = 15;
    taskSheet.getColumn(3).width = 15;
    taskSheet.getColumn(4).width = 20;
    taskSheet.getColumn(5).width = 15;
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

