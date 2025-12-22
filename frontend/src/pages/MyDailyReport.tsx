/**
 * 我的日报页面 - 所有成员可访问
 * 只显示个人日报填写和历史记录
 */
import { useState, useEffect, useCallback } from 'react';
import { usePermissions } from '../hooks/usePermissions';
import { useIsMobile } from '../hooks/useIsMobile';
import { dailyReportService, DailyReport } from '../services/dailyReport';
import { 
  FileText, Calendar, AlertTriangle, CheckCircle2, 
  ChevronLeft, ChevronRight, Zap, Save, Edit2, Trash2, Clock,
  Activity, Circle, AlertCircle, Lock
} from '../components/Icons';
import MobileDailyReport from './mobile/MobileDailyReport';
import './MyDailyReport.css';

export default function MyDailyReport() {
  const isMobile = useIsMobile();

  // 移动端渲染
  if (isMobile) {
    return <MobileDailyReport />;
  }

  return <DesktopMyDailyReport />;
}

function DesktopMyDailyReport() {
  const { currentWorkspace} = usePermissions();
  
  // 日报相关状态
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [myDailyReports, setMyDailyReports] = useState<DailyReport[]>([]);
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
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 加载指定日期的日报
  const loadDateReport = useCallback(async (date: Date) => {
    if (!currentWorkspace) return;
    
    const dateStr = date.toISOString().split('T')[0];
    
    try {
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
    } catch (err: unknown) {
      console.error('加载日报失败:', err);
    }
  }, [currentWorkspace]);

  // 加载日报列表
  const loadDailyReports = useCallback(async () => {
    if (!currentWorkspace) return;
    setDailyLoading(true);
    try {
      const myReports = await dailyReportService.getMyReports(currentWorkspace.id, { limit: 30 });
      setMyDailyReports(myReports);
      await loadDateReport(selectedDate);
    } catch (err: unknown) {
      console.error('加载日报失败:', err);
    } finally {
      setDailyLoading(false);
    }
  }, [currentWorkspace, selectedDate, loadDateReport]);

  useEffect(() => {
    if (currentWorkspace) {
      loadDailyReports();
    }
  }, [currentWorkspace, loadDailyReports]);

  // 日期切换时重新加载
  useEffect(() => {
    if (currentWorkspace) {
      loadDateReport(selectedDate);
    }
  }, [selectedDate, currentWorkspace, loadDateReport]);

  // 日期切换
  const changeDate = (delta: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + delta);
    if (newDate <= new Date()) {
      setSelectedDate(newDate);
    }
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // 只能编辑当天日报
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

  // 格式化日期显示
  const formatDate = (date: Date) => {
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')} (${weekdays[date.getDay()]})`;
  };

  // 点击日报列表项
  const handleReportItemClick = (report: DailyReport) => {
    const reportDate = new Date(report.date);
    setSelectedDate(reportDate);
  };

  return (
    <div className="my-daily-report-page fade-in">
      <div className="page-header">
        <div className="header-content">
          <div className="header-icon"><FileText size={28} /></div>
          <div className="header-text">
            <h1>我的日报</h1>
            <p>记录每日工作进展</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-card" onClick={() => setError(null)}>
          <AlertTriangle size={16} /> {error}
        </div>
      )}
      {successMessage && <div className="success-toast"><CheckCircle2 size={16} /> {successMessage}</div>}

      {/* 日期选择器 */}
      <div className="date-picker-bar">
        <button className="date-nav-btn" onClick={() => changeDate(-1)}>
          <ChevronLeft size={20} />
        </button>
        <span className="current-date">
          {formatDate(selectedDate)}
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
            <div className="readonly-report-view">
              <div className="readonly-header">
                <Lock size={14} />
                <span>只能编辑当天日报</span>
              </div>
              {currentDateReport ? (
                <div className="readonly-content">
                  {/* 今日完成 */}
                  <div className="readonly-section">
                    <h4 className="readonly-section-title">
                      <Activity size={14} className="icon-completed" />
                      今日完成
                    </h4>
                    <ul className="readonly-list">
                      {currentDateReport.completed.split('\n').filter(line => line.trim()).map((line, i) => (
                        <li key={i} className="readonly-list-item">
                          <div className="readonly-item-icon completed">
                            <CheckCircle2 size={16} />
                          </div>
                          <span>{line.replace(/^[-•]\s*/, '')}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* 任务统计 */}
                  {currentDateReport.taskStats && (
                    <div className="readonly-task-stats">
                      <div className="readonly-stat-item stat-completed">
                        <span className="stat-value">{currentDateReport.taskStats.completedCount}</span>
                        <span className="stat-label">已完成</span>
                      </div>
                      <div className="readonly-stat-item stat-progress">
                        <span className="stat-value">{currentDateReport.taskStats.inProgressCount}</span>
                        <span className="stat-label">进行中</span>
                      </div>
                    </div>
                  )}

                  {/* 明日计划 */}
                  <div className="readonly-section">
                    <h4 className="readonly-section-title">
                      <Zap size={14} className="icon-planned" />
                      明日计划
                    </h4>
                    <ul className="readonly-list">
                      {currentDateReport.planned.split('\n').filter(line => line.trim()).map((line, i) => (
                        <li key={i} className="readonly-list-item">
                          <div className="readonly-item-icon planned">
                            <Circle size={16} />
                          </div>
                          <span>{line.replace(/^[-•]\s*/, '')}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* 问题与风险 */}
                  {currentDateReport.issues && (
                    <div className="readonly-section">
                      <h4 className="readonly-section-title">
                        <AlertCircle size={14} className="icon-issues" />
                        问题与风险
                      </h4>
                      <ul className="readonly-list issues">
                        {currentDateReport.issues.split('\n').filter(line => line.trim()).map((line, i) => (
                          <li key={i} className="readonly-list-item">
                            <div className="readonly-item-icon issues">
                              <AlertCircle size={16} />
                            </div>
                            <span>{line.replace(/^[-•]\s*/, '')}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* 工时 */}
                  {currentDateReport.workHours && (
                    <div className="readonly-work-hours">
                      <Clock size={14} />
                      <span>工作时长：{currentDateReport.workHours} 小时</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="readonly-empty">
                  <p>该日期未填写日报</p>
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

        {/* 右侧：历史日报 */}
        <div className="daily-history card-static">
          <div className="section-header">
            <h3><Calendar size={16} /> 我的日报记录</h3>
          </div>
          
          {dailyLoading ? (
            <div className="loading-placeholder">加载中...</div>
          ) : myDailyReports.length > 0 ? (
            <div className="my-reports-list">
              {myDailyReports.map(report => {
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
                      <span className="work-hours">
                        <Clock size={12} /> {report.workHours}h
                      </span>
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
        </div>
      </div>
    </div>
  );
}

