/**
 * 报告中心页面 - 集成日报、周报、月报
 * 优化版：支持日期联动、补填历史日报
 */
import { useState, useEffect, useCallback } from 'react';
import { usePermissions } from '../hooks/usePermissions';
import { reportService, Report } from '../services/report';
import { dailyReportService, DailyReport, TeamReportsResult } from '../services/dailyReport';
import { Modal } from '../components/Modal';
import { config } from '../config';
import { 
  BarChart3, Calendar, CalendarRange, AlertTriangle, CheckCircle2, Bot, 
  Sparkles, FileText, TrendingUp, FolderOpen, Mail, ChevronLeft, ChevronRight,
  Users, Clock, Zap, Save, Edit2, Trash2, Eye
} from 'lucide-react';
import DailyReportDetailModal from '../components/DailyReportDetailModal';
import './Reports.css';

type TabType = 'daily' | 'weekly';

export default function Reports() {
  const { currentWorkspace, workspaceRole } = usePermissions();
  const [activeTab, setActiveTab] = useState<TabType>('daily');
  
  // 周报相关状态
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 导出和邮件状态
  const [exporting, setExporting] = useState(false);
  const [sendEmailModalOpen, setSendEmailModalOpen] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [sending, setSending] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 日报相关状态
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [myDailyReports, setMyDailyReports] = useState<DailyReport[]>([]);
  const [teamData, setTeamData] = useState<TeamReportsResult | null>(null);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailyForm, setDailyForm] = useState({
    completed: '',
    planned: '',
    issues: '',
    workHours: '',
  });
  const [currentDateReport, setCurrentDateReport] = useState<DailyReport | null>(null);
  const [savingDaily, setSavingDaily] = useState(false);
  const [aiFilling, setAiFilling] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
  // 日报详情弹窗状态
  const [selectedDailyReport, setSelectedDailyReport] = useState<DailyReport | null>(null);

  const isManager = workspaceRole && ['owner', 'director', 'manager'].includes(workspaceRole);

  // 加载周报
  const loadReports = useCallback(async () => {
    if (!currentWorkspace) return;
    setLoading(true);
    try {
      const data = await reportService.getReports(currentWorkspace.id);
      setReports(data);
      if (data.length > 0) {
        setSelectedReport(prev => prev || data[0]);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '加载报告失败');
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace]);

  // 加载指定日期的日报
  const loadDateReport = useCallback(async (date: Date) => {
    if (!currentWorkspace) return;
    
    const dateStr = date.toISOString().split('T')[0];
    
    try {
      // 获取指定日期的日报
      const report = await dailyReportService.getByDate(currentWorkspace.id, dateStr);
      setCurrentDateReport(report);
      
      if (report) {
        setDailyForm({
          completed: report.completed,
          planned: report.planned,
          issues: report.issues || '',
          workHours: report.workHours?.toString() || '',
        });
        setShowForm(true);
      } else {
        setDailyForm({ completed: '', planned: '', issues: '', workHours: '' });
        setShowForm(false);
      }

      // 如果是管理者，获取团队日报
      if (isManager) {
        const team = await dailyReportService.getTeamReports(currentWorkspace.id, dateStr);
        setTeamData(team);
      }
    } catch (err: unknown) {
      console.error('加载日报失败:', err);
    }
  }, [currentWorkspace, isManager]);

  // 加载日报列表
  const loadDailyReports = useCallback(async () => {
    if (!currentWorkspace) return;
    setDailyLoading(true);
    try {
      const myReports = await dailyReportService.getMyReports(currentWorkspace.id, { limit: 30 });
      setMyDailyReports(myReports);
      
      // 加载当前选中日期的日报
      await loadDateReport(selectedDate);
    } catch (err: unknown) {
      console.error('加载日报失败:', err);
    } finally {
      setDailyLoading(false);
    }
  }, [currentWorkspace, selectedDate, loadDateReport]);

  useEffect(() => {
    if (currentWorkspace) {
      if (activeTab === 'weekly') {
        loadReports();
      } else {
        loadDailyReports();
      }
    }
  }, [currentWorkspace, activeTab, loadReports, loadDailyReports]);

  // 日期切换时重新加载
  useEffect(() => {
    if (activeTab === 'daily' && currentWorkspace) {
      loadDateReport(selectedDate);
    }
  }, [selectedDate, activeTab, currentWorkspace, loadDateReport]);

  // 日期切换
  const changeDate = (delta: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + delta);
    // 限制不能超过今天
    if (newDate <= new Date()) {
      setSelectedDate(newDate);
    }
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // 检查日期是否可以编辑（只能编辑当天）
  const canEditDate = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // AI 自动填充
  const handleAiFill = async () => {
    if (!currentWorkspace) return;
    setAiFilling(true);
    setError(null);
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const result = await dailyReportService.aiFill(currentWorkspace.id, dateStr);
      setDailyForm({
        completed: result.completed,
        planned: result.planned,
        issues: result.issues,
        workHours: '',
      });
      setShowForm(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'AI填充失败');
    } finally {
      setAiFilling(false);
    }
  };

  // 保存日报
  const handleSaveDaily = async () => {
    if (!currentWorkspace || !dailyForm.completed || !dailyForm.planned) {
      setError('请填写今日完成和明日计划');
      return;
    }
    setSavingDaily(true);
    setError(null);
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      await dailyReportService.create({
        workspaceId: currentWorkspace.id,
        date: dateStr,
        completed: dailyForm.completed,
        planned: dailyForm.planned,
        issues: dailyForm.issues || undefined,
        workHours: dailyForm.workHours ? parseFloat(dailyForm.workHours) : undefined,
      });
      setSuccessMessage(currentDateReport ? '日报更新成功！' : '日报保存成功！');
      loadDailyReports();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '保存日报失败');
    } finally {
      setSavingDaily(false);
    }
  };

  // 删除日报
  const handleDeleteDaily = async () => {
    if (!currentDateReport || !confirm('确定要删除这份日报吗？')) return;
    
    try {
      await dailyReportService.delete(currentDateReport.id);
      setSuccessMessage('日报已删除');
      setCurrentDateReport(null);
      setDailyForm({ completed: '', planned: '', issues: '', workHours: '' });
      setShowForm(false);
      loadDailyReports();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '删除失败');
    }
  };

  // 周报相关方法
  const handleGenerateWeekly = async () => {
    if (!currentWorkspace) return;
    setGenerating(true);
    setError(null);
    try {
      const report = await reportService.generateWeekly(currentWorkspace.id);
      setReports([report, ...reports]);
      setSelectedReport(report);
      setSuccessMessage('周报生成成功！');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '生成周报失败');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateMonthly = async () => {
    if (!currentWorkspace) return;
    setGenerating(true);
    setError(null);
    try {
      const report = await reportService.generateMonthly(currentWorkspace.id);
      setReports([report, ...reports]);
      setSelectedReport(report);
      setSuccessMessage('月报生成成功！');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '生成月报失败');
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!confirm('确定要删除这份报告吗？')) return;
    
    try {
      await reportService.deleteReport(reportId);
      setReports(reports.filter(r => r.id !== reportId));
      if (selectedReport?.id === reportId) {
        setSelectedReport(reports.length > 1 ? reports.find(r => r.id !== reportId) || null : null);
      }
      setSuccessMessage('报告已删除');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '删除失败');
    }
  };

  const handleExportPDF = async () => {
    if (!selectedReport) return;
    try {
      setExporting(true);
      setError(null);
      const token = localStorage.getItem(config.storageKeys.token);
      const response = await fetch(`${config.apiBaseUrl}/reports/${selectedReport.id}/export/pdf`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (!response.ok) throw new Error('导出失败');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${selectedReport.title}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setSuccessMessage('PDF 导出成功！');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '导出 PDF 失败');
    } finally {
      setExporting(false);
    }
  };

  const handleExportExcel = async () => {
    if (!selectedReport) return;
    try {
      setExporting(true);
      setError(null);
      const token = localStorage.getItem(config.storageKeys.token);
      const response = await fetch(`${config.apiBaseUrl}/reports/${selectedReport.id}/export/excel`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (!response.ok) throw new Error('导出失败');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${selectedReport.title}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setSuccessMessage('Excel 导出成功！');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '导出 Excel 失败');
    } finally {
      setExporting(false);
    }
  };

  const handleSendEmail = async () => {
    if (!selectedReport || !emailAddress) return;
    try {
      setSending(true);
      setError(null);
      const token = localStorage.getItem(config.storageKeys.token);
      const response = await fetch(`${config.apiBaseUrl}/reports/${selectedReport.id}/send-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: emailAddress,
          recipientName: recipientName || undefined,
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || '发送失败');
      }
      
      setSuccessMessage(`报告已发送到 ${emailAddress}`);
      setSendEmailModalOpen(false);
      setEmailAddress('');
      setRecipientName('');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setError(err.message || '发送邮件失败');
    } finally {
      setSending(false);
    }
  };

  // 格式化日期显示
  const formatDate = (date: Date) => {
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')} (${weekdays[date.getDay()]})`;
  };

  // 点击日报列表项 - 打开详情弹窗
  const handleReportItemClick = (report: DailyReport) => {
    setSelectedDailyReport(report);
  };

  return (
    <div className="reports-page fade-in">
      <div className="page-header">
        <div className="header-content">
          <div className="header-icon"><BarChart3 size={28} /></div>
          <div className="header-text">
            <h1>报告中心</h1>
            <p>日报填写与统计报告生成</p>
          </div>
        </div>
        
        {/* 标签切换 */}
        <div className="report-tabs">
          <button 
            className={`tab-btn ${activeTab === 'daily' ? 'active' : ''}`}
            onClick={() => setActiveTab('daily')}
          >
            <Calendar size={16} /> 日报
          </button>
          <button 
            className={`tab-btn ${activeTab === 'weekly' ? 'active' : ''}`}
            onClick={() => setActiveTab('weekly')}
          >
            <CalendarRange size={16} /> 统计报告
          </button>
        </div>
      </div>

      {error && (
        <div className="error-card" onClick={() => setError(null)}>
          <AlertTriangle size={16} /> {error}
        </div>
      )}
      {successMessage && <div className="success-toast"><CheckCircle2 size={16} /> {successMessage}</div>}

      {/* 日报 Tab */}
      {activeTab === 'daily' && (
        <div className="daily-section">
          {/* 日期选择器 */}
          <div className="date-picker-bar">
            <button className="date-nav-btn" onClick={() => changeDate(-1)}>
              <ChevronLeft size={20} />
            </button>
            <span className="current-date">
              📅 {formatDate(selectedDate)}
              {isToday(selectedDate) && <span className="today-badge">今天</span>}
              {!canEditDate(selectedDate) && <span className="readonly-badge">只读</span>}
            </span>
            <button 
              className="date-nav-btn" 
              onClick={() => changeDate(1)}
              disabled={isToday(selectedDate)}
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="daily-layout">
            {/* 左侧：填写日报 */}
            <div className="daily-form-section card-static">
              <div className="section-header">
                <h3>
                  {currentDateReport ? <><Edit2 size={16} /> 编辑日报</> : <><FileText size={16} /> 填写日报</>}
                </h3>
                <div className="header-actions">
                  {canEditDate(selectedDate) && (
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={handleAiFill}
                      disabled={aiFilling}
                    >
                      <Zap size={14} /> {aiFilling ? '填充中...' : 'AI 自动填充'}
                    </button>
                  )}
                  {currentDateReport && canEditDate(selectedDate) && (
                    <button 
                      className="btn btn-danger btn-sm"
                      onClick={handleDeleteDaily}
                      title="删除日报"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {!canEditDate(selectedDate) ? (
                <div className="daily-form-placeholder">
                  <p>只能编辑当天日报</p>
                  {currentDateReport && (
                    <div className="readonly-report">
                      <div className="report-section">
                        <h4>今日完成</h4>
                        <p>{currentDateReport.completed}</p>
                      </div>
                      <div className="report-section">
                        <h4>明日计划</h4>
                        <p>{currentDateReport.planned}</p>
                      </div>
                      {currentDateReport.issues && (
                        <div className="report-section">
                          <h4>问题/风险</h4>
                          <p>{currentDateReport.issues}</p>
                        </div>
                      )}
                      {currentDateReport.workHours && (
                        <div className="report-section">
                          <h4>工时</h4>
                          <p>{currentDateReport.workHours} 小时</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : !showForm && !currentDateReport ? (
                <div className="daily-form-placeholder">
                  <p>{isToday(selectedDate) ? '今日日报尚未填写' : `${formatDate(selectedDate)} 的日报尚未填写`}</p>
                  <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                    <FileText size={16} /> 开始填写
                  </button>
                </div>
              ) : (
                <div className="daily-form">
                  <div className="form-group">
                    <label className="form-label">
                      今日完成 <span className="required">*</span>
                    </label>
                    <textarea
                      className="form-input"
                      rows={4}
                      placeholder="• 完成任务A的前端开发&#10;• 修复3个Bug"
                      value={dailyForm.completed}
                      onChange={(e) => setDailyForm({ ...dailyForm, completed: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      明日计划 <span className="required">*</span>
                    </label>
                    <textarea
                      className="form-input"
                      rows={4}
                      placeholder="• 继续任务B的API对接&#10;• 参加项目评审会议"
                      value={dailyForm.planned}
                      onChange={(e) => setDailyForm({ ...dailyForm, planned: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">问题/风险 <span className="optional">(可选)</span></label>
                    <textarea
                      className="form-input"
                      rows={2}
                      placeholder="接口文档不完整，需协调后端"
                      value={dailyForm.issues}
                      onChange={(e) => setDailyForm({ ...dailyForm, issues: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">工时 <span className="optional">(可选)</span></label>
                    <div className="work-hours-input">
                      <input
                        type="number"
                        className="form-input"
                        placeholder="8"
                        min="0"
                        max="24"
                        step="0.5"
                        value={dailyForm.workHours}
                        onChange={(e) => setDailyForm({ ...dailyForm, workHours: e.target.value })}
                      />
                      <span className="unit">小时</span>
                    </div>
                  </div>
                  <div className="form-actions">
                    <button 
                      className="btn btn-secondary" 
                      onClick={() => {
                        setShowForm(false);
                        if (!currentDateReport) {
                          setDailyForm({ completed: '', planned: '', issues: '', workHours: '' });
                        } else {
                          setDailyForm({
                            completed: currentDateReport.completed,
                            planned: currentDateReport.planned,
                            issues: currentDateReport.issues || '',
                            workHours: currentDateReport.workHours?.toString() || '',
                          });
                        }
                      }}
                    >
                      取消
                    </button>
                    <button 
                      className="btn btn-primary"
                      onClick={handleSaveDaily}
                      disabled={savingDaily || !dailyForm.completed || !dailyForm.planned}
                    >
                      <Save size={16} /> {savingDaily ? '保存中...' : currentDateReport ? '更新日报' : '保存日报'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 右侧：团队概览或历史日报 */}
            <div className="daily-overview card-static">
              {isManager ? (
                <>
                  <div className="section-header">
                    <h3><Users size={16} /> 团队日报概览</h3>
                    <span className="date-info">{formatDate(selectedDate)}</span>
                  </div>
                  
                  {dailyLoading ? (
                    <div className="loading-placeholder">加载中...</div>
                  ) : teamData ? (
                    <div className="team-overview">
                      <div className="team-stats">
                        <div className="stat-card submitted">
                          <span className="stat-value">{teamData.reports.length}</span>
                          <span className="stat-label">已提交</span>
                        </div>
                        <div className="stat-card pending">
                          <span className="stat-value">{teamData.notSubmitted.length}</span>
                          <span className="stat-label">未提交</span>
                        </div>
                      </div>
                      
                      {teamData.notSubmitted.length > 0 && (
                        <div className="not-submitted-list">
                          <h4>未提交成员</h4>
                          <div className="member-list">
                            {teamData.notSubmitted.map(member => (
                              <div key={member.id} className="member-item">
                                <div className="member-avatar">
                                  {member.avatar ? (
                                    <img src={member.avatar} alt={member.name} />
                                  ) : (
                                    member.name.charAt(0)
                                  )}
                                </div>
                                <span className="member-name">{member.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {teamData.reports.length > 0 && (
                        <div className="submitted-list">
                          <h4>已提交日报</h4>
                          {teamData.reports.map(report => (
                            <div 
                              key={report.id} 
                              className="team-report-item clickable"
                              onClick={() => setSelectedDailyReport(report)}
                            >
                              <div className="report-user">
                                <div className="member-avatar">
                                  {report.user.avatar ? (
                                    <img src={report.user.avatar} alt={report.user.name} />
                                  ) : (
                                    report.user.name.charAt(0)
                                  )}
                                </div>
                                <span className="member-name">{report.user.name}</span>
                                {report.workHours && (
                                  <span className="work-hours">
                                    <Clock size={12} /> {report.workHours}h
                                  </span>
                                )}
                              </div>
                              <div className="report-preview">
                                <p><strong>完成：</strong>{report.completed.substring(0, 50)}...</p>
                              </div>
                              <button 
                                className="btn-view-detail"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedDailyReport(report);
                                }}
                              >
                                <Eye size={14} /> 查看详情
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="empty-placeholder">暂无数据</div>
                  )}
                </>
              ) : (
                <>
                  <div className="section-header">
                    <h3><Calendar size={16} /> 我的日报记录</h3>
                  </div>
                  
                  {dailyLoading ? (
                    <div className="loading-placeholder">加载中...</div>
                  ) : myDailyReports.length > 0 ? (
                    <div className="my-reports-list">
                      {myDailyReports.slice(0, 15).map(report => {
                        const reportDate = new Date(report.date);
                        const isSelected = reportDate.toDateString() === selectedDate.toDateString();
                        return (
                          <div 
                            key={report.id} 
                            className={`my-report-item ${isSelected ? 'active' : ''}`}
                            onClick={() => handleReportItemClick(report)}
                          >
                            <span className="report-date">
                              {reportDate.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                            </span>
                            <span className="report-preview">{report.completed.substring(0, 30)}...</span>
                            {report.workHours && (
                              <span className="work-hours">{report.workHours}h</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="empty-placeholder">
                      <p>暂无日报记录</p>
                      <p className="hint">开始填写你的第一份日报吧</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 统计报告 Tab */}
      {activeTab === 'weekly' && (
        <>
          <div className="report-actions-bar">
            <button
              className="btn btn-secondary"
              onClick={handleGenerateWeekly}
              disabled={generating || !currentWorkspace}
            >
              {generating ? '生成中...' : <><Calendar size={16} /> 生成周报</>}
            </button>
            <button
              className="btn btn-primary"
              onClick={handleGenerateMonthly}
              disabled={generating || !currentWorkspace}
            >
              {generating ? '生成中...' : <><CalendarRange size={16} /> 生成月报</>}
            </button>
          </div>

          <div className="reports-layout">
            {/* 报告列表 */}
            <div className="reports-list card-static">
              <h3>历史报告</h3>
              {loading ? (
                <div className="loading-placeholder">加载中...</div>
              ) : reports.length === 0 ? (
                <div className="empty-placeholder">
                  <p>暂无报告</p>
                  <p className="hint">点击上方按钮生成第一份报告</p>
                </div>
              ) : (
                <div className="report-items">
                  {reports.map((report) => (
                    <div
                      key={report.id}
                      className={`report-item ${selectedReport?.id === report.id ? 'active' : ''}`}
                      onClick={() => setSelectedReport(report)}
                    >
                      <span className="report-type">
                        {report.type === 'weekly' ? <><Calendar size={14} /> 周报</> : <><CalendarRange size={14} /> 月报</>}
                      </span>
                      <span className="report-date">
                        {new Date(report.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 报告详情 */}
            <div className="report-detail card-static">
              {selectedReport ? (
                <>
                  <div className="report-detail-header">
                    <div className="report-title-section">
                      <h2>{selectedReport.title}</h2>
                      <span className="report-period">
                        {new Date(selectedReport.startDate).toLocaleDateString()} ~ 
                        {new Date(selectedReport.endDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="report-actions">
                      <button 
                        className="btn btn-secondary btn-sm"
                        onClick={handleExportPDF}
                        disabled={exporting}
                      >
                        <FileText size={14} /> {exporting ? '导出中...' : '导出 PDF'}
                      </button>
                      <button 
                        className="btn btn-secondary btn-sm"
                        onClick={handleExportExcel}
                        disabled={exporting}
                      >
                        <BarChart3 size={14} /> {exporting ? '导出中...' : '导出 Excel'}
                      </button>
                      <button 
                        className="btn btn-primary btn-sm"
                        onClick={() => setSendEmailModalOpen(true)}
                      >
                        <Mail size={14} /> 发送邮件
                      </button>
                      <button 
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDeleteReport(selectedReport.id)}
                        title="删除报告"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* AI 摘要 */}
                  {selectedReport.summary && (
                    <div className="report-summary">
                      <h4><Bot size={16} /> AI 摘要</h4>
                      <p>{selectedReport.summary}</p>
                    </div>
                  )}

                  {/* 亮点和关注点 */}
                  <div className="report-insights">
                    {Array.isArray(selectedReport.highlights) && selectedReport.highlights.length > 0 && (
                      <div className="insight-section highlights">
                        <h4><Sparkles size={16} /> 亮点</h4>
                        <ul>
                          {selectedReport.highlights.map((h, i) => (
                            <li key={i}>{h}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {Array.isArray(selectedReport.concerns) && selectedReport.concerns.length > 0 && (
                      <div className="insight-section concerns">
                        <h4><AlertTriangle size={16} /> 关注点</h4>
                        <ul>
                          {selectedReport.concerns.map((c, i) => (
                            <li key={i}>{c}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* 统计数据 */}
                  {selectedReport.content && (
                    <div className="report-stats">
                      <h4><TrendingUp size={16} /> 数据统计</h4>
                      <div className="stats-grid">
                        <div className="stat-item">
                          <span className="stat-value">{selectedReport.content.totalProjects || 0}</span>
                          <span className="stat-label">项目总数</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-value">{selectedReport.content.tasksCreated || 0}</span>
                          <span className="stat-label">新建任务</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-value" style={{ color: 'var(--color-success)' }}>
                            {selectedReport.content.tasksCompleted || 0}
                          </span>
                          <span className="stat-label">完成任务</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-value" style={{ color: 'var(--color-danger)' }}>
                            {selectedReport.content.tasksBlocked || 0}
                          </span>
                          <span className="stat-label">阻塞任务</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 日报汇总（周报/月报时显示） */}
                  {selectedReport.content?.dailySummary && (
                    <div className="daily-summary-section">
                      <h4><FileText size={16} /> 日报汇总</h4>
                      <div className="daily-summary-stats">
                        <div className="summary-item">
                          <span className="label">日报数量</span>
                          <span className="value">{selectedReport.content.dailySummary.reportCount} 份</span>
                        </div>
                        <div className="summary-item">
                          <span className="label">累计工时</span>
                          <span className="value">{selectedReport.content.dailySummary.totalWorkHours?.toFixed(1) || 0} 小时</span>
                        </div>
                        <div className="summary-item">
                          <span className="label">日均工时</span>
                          <span className="value">{selectedReport.content.dailySummary.avgWorkHoursPerDay?.toFixed(1) || 0} 小时</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 项目详情 */}
                  {selectedReport.content?.projectStats && selectedReport.content.projectStats.length > 0 && (
                    <div className="report-projects">
                      <h4><FolderOpen size={16} /> 各项目情况</h4>
                      <div className="project-stats-list">
                        {selectedReport.content.projectStats.map((project, i) => (
                          <div key={i} className="project-stat-item">
                            <div className="project-info">
                              <span className="project-name">{project.name}</span>
                              <span className="project-rate">{project.completionRate}% 完成</span>
                            </div>
                            <div className="project-bar">
                              <div
                                className="project-bar-fill"
                                style={{ width: `${project.completionRate}%` }}
                              />
                            </div>
                            <div className="project-numbers">
                              <span>完成 {project.completed}</span>
                              <span>总计 {project.total}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="no-report-selected">
                  <p>选择一份报告查看详情</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* 日报详情弹窗 */}
      <DailyReportDetailModal
        isOpen={!!selectedDailyReport}
        onClose={() => setSelectedDailyReport(null)}
        report={selectedDailyReport || undefined}
      />

      {/* 发送邮件弹窗 */}
      <Modal
        isOpen={sendEmailModalOpen}
        onClose={() => setSendEmailModalOpen(false)}
        title="发送报告"
        size="sm"
      >
        <form onSubmit={(e) => { e.preventDefault(); handleSendEmail(); }}>
          <div className="form-group">
            <label className="form-label">收件人邮箱 *</label>
            <input
              type="email"
              className="form-input"
              placeholder="example@company.com"
              value={emailAddress}
              onChange={(e) => setEmailAddress(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">
              收件人姓名 <span className="form-hint">(可选)</span>
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="张三"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
            />
            <p className="form-hint">用于邮件中的称呼</p>
          </div>
          <div className="form-actions">
            <button 
              type="button"
              className="btn btn-secondary" 
              onClick={() => setSendEmailModalOpen(false)}
            >
              取消
            </button>
            <button 
              type="submit"
              className="btn btn-primary" 
              disabled={!emailAddress || sending}
            >
              {sending ? '发送中...' : '发送报告'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
