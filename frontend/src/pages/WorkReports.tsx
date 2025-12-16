/**
 * 工作日报页面
 */
import { useState, useEffect } from 'react';
import { usePermissions } from '../hooks/usePermissions';
import { 
  workReportService, 
  WorkReport, 
  ReportType, 
  Mood, 
  Workload,
  REPORT_TYPE_LABELS,
  MOOD_LABELS,
  WORKLOAD_LABELS,
  MOOD_ICONS,
  TeamReportStats,
} from '../services/workReport';
import { projectService, Project } from '../services/project';
import { Modal } from '../components/Modal';
import { Avatar } from '../components/Avatar';
import { 
  FileText, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Users,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Eye,
  Filter,
  TrendingUp,
  Target,
  MessageSquare,
  HelpCircle,
} from 'lucide-react';
import './WorkReports.css';

export default function WorkReports() {
  const { currentWorkspace, workspaceRole } = usePermissions();
  const [activeTab, setActiveTab] = useState<'my' | 'team'>('my');
  const [reportType, setReportType] = useState<ReportType>('daily');
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // 我的日报
  const [myReports, setMyReports] = useState<WorkReport[]>([]);
  const [myTotal, setMyTotal] = useState(0);
  const [myLoading, setMyLoading] = useState(true);
  
  // 团队日报
  const [teamReports, setTeamReports] = useState<WorkReport[]>([]);
  const [teamTotal, setTeamTotal] = useState(0);
  const [teamLoading, setTeamLoading] = useState(true);
  const [teamStats, setTeamStats] = useState<TeamReportStats | null>(null);
  const [canViewTeam, setCanViewTeam] = useState(false);
  
  // 项目筛选
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  
  // 模态框
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<WorkReport | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  
  // 表单
  const [formData, setFormData] = useState({
    todayWork: '',
    tomorrowPlan: '',
    issues: '',
    needSupport: '',
    summary: '',
    mood: '' as Mood | '',
    workload: '' as Workload | '',
    totalHours: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const isManager = ['owner', 'director', 'manager'].includes(workspaceRole || '');

  useEffect(() => {
    if (currentWorkspace) {
      loadProjects();
      if (activeTab === 'my') {
        loadMyReports();
      } else {
        loadTeamReports();
      }
    }
  }, [currentWorkspace, activeTab, reportType, selectedDate, selectedProjectId]);

  const loadProjects = async () => {
    if (!currentWorkspace) return;
    try {
      const data = await projectService.getAll(currentWorkspace.id);
      setProjects(data);
    } catch (error) {
      console.error('加载项目失败:', error);
    }
  };

  const loadMyReports = async () => {
    if (!currentWorkspace) return;
    setMyLoading(true);
    try {
      const { startDate, endDate } = getDateRangeForType(reportType, selectedDate);
      const result = await workReportService.getMyReports(currentWorkspace.id, {
        type: reportType,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        limit: 50,
      });
      setMyReports(result.reports);
      setMyTotal(result.total);
    } catch (error) {
      console.error('加载日报失败:', error);
    } finally {
      setMyLoading(false);
    }
  };

  const loadTeamReports = async () => {
    if (!currentWorkspace) return;
    setTeamLoading(true);
    try {
      const dateStr = formatDateForApi(selectedDate);
      const [reportsResult, statsResult] = await Promise.all([
        workReportService.getTeamReports(currentWorkspace.id, {
          type: reportType,
          reportDate: dateStr,
          projectId: selectedProjectId || undefined,
          limit: 100,
        }),
        workReportService.getTeamStats(
          currentWorkspace.id, 
          reportType, 
          dateStr,
          selectedProjectId || undefined
        ),
      ]);
      setTeamReports(reportsResult.reports);
      setTeamTotal(reportsResult.total);
      setCanViewTeam(reportsResult.canView);
      setTeamStats(statsResult);
    } catch (error) {
      console.error('加载团队日报失败:', error);
    } finally {
      setTeamLoading(false);
    }
  };

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace) return;
    
    setSubmitting(true);
    try {
      await workReportService.createOrUpdate(currentWorkspace.id, {
        type: reportType,
        reportDate: formatDateForApi(selectedDate),
        projectId: selectedProjectId || undefined,
        todayWork: formData.todayWork || undefined,
        tomorrowPlan: formData.tomorrowPlan || undefined,
        issues: formData.issues || undefined,
        needSupport: formData.needSupport || undefined,
        summary: formData.summary || undefined,
        mood: formData.mood || undefined,
        workload: formData.workload || undefined,
        totalHours: formData.totalHours ? parseFloat(formData.totalHours) : undefined,
      });
      setShowCreateModal(false);
      resetForm();
      loadMyReports();
    } catch (error) {
      console.error('提交日报失败:', error);
      alert('提交日报失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewDetail = async (report: WorkReport) => {
    setSelectedReport(report);
    setShowDetailModal(true);
    setDetailLoading(true);
    try {
      const detail = await workReportService.getById(report.id);
      setSelectedReport(detail);
    } catch (error) {
      console.error('加载详情失败:', error);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDelete = async (reportId: string) => {
    if (!confirm('确定要删除这份日报吗？')) return;
    try {
      await workReportService.delete(reportId);
      loadMyReports();
    } catch (error) {
      console.error('删除日报失败:', error);
      alert('删除失败');
    }
  };

  const resetForm = () => {
    setFormData({
      todayWork: '',
      tomorrowPlan: '',
      issues: '',
      needSupport: '',
      summary: '',
      mood: '',
      workload: '',
      totalHours: '',
    });
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    if (reportType === 'daily') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    } else if (reportType === 'weekly') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    }
    setSelectedDate(newDate);
  };

  const formatDateDisplay = (date: Date) => {
    if (reportType === 'daily') {
      return date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' });
    } else if (reportType === 'weekly') {
      const weekStart = getWeekStart(date);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      return `${weekStart.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}`;
    } else {
      return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' });
    }
  };

  const getReportLabel = () => {
    switch (reportType) {
      case 'daily': return { today: '今日工作', tomorrow: '明日计划' };
      case 'weekly': return { today: '本周工作', tomorrow: '下周计划' };
      case 'monthly': return { today: '本月工作', tomorrow: '下月计划' };
    }
  };

  const labels = getReportLabel();

  return (
    <div className="work-reports-page">
      <div className="page-header">
        <div className="header-left">
          <FileText size={24} />
          <h1>工作日报</h1>
        </div>
        <div className="header-actions">
          <button 
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus size={16} />
            写{REPORT_TYPE_LABELS[reportType]}
          </button>
        </div>
      </div>

      {/* 标签页 */}
      <div className="reports-tabs">
        <button
          className={`tab-btn ${activeTab === 'my' ? 'active' : ''}`}
          onClick={() => setActiveTab('my')}
        >
          <FileText size={16} />
          我的日报
        </button>
        {isManager && (
          <button
            className={`tab-btn ${activeTab === 'team' ? 'active' : ''}`}
            onClick={() => setActiveTab('team')}
          >
            <Users size={16} />
            团队日报
          </button>
        )}
      </div>

      {/* 筛选栏 */}
      <div className="reports-filters">
        <div className="filter-group">
          <label>报告类型</label>
          <div className="type-selector">
            {(['daily', 'weekly', 'monthly'] as ReportType[]).map(type => (
              <button
                key={type}
                className={`type-btn ${reportType === type ? 'active' : ''}`}
                onClick={() => setReportType(type)}
              >
                {REPORT_TYPE_LABELS[type]}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <label>日期</label>
          <div className="date-navigator">
            <button className="nav-btn" onClick={() => navigateDate('prev')}>
              <ChevronLeft size={18} />
            </button>
            <span className="date-display">{formatDateDisplay(selectedDate)}</span>
            <button className="nav-btn" onClick={() => navigateDate('next')}>
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {activeTab === 'team' && (
          <div className="filter-group">
            <label>项目筛选</label>
            <select
              value={selectedProjectId}
              onChange={e => setSelectedProjectId(e.target.value)}
              className="project-filter"
            >
              <option value="">全部项目</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 团队统计 */}
      {activeTab === 'team' && teamStats && (
        <div className="team-stats">
          <div className="stat-card submitted">
            <CheckCircle2 size={20} />
            <div className="stat-info">
              <span className="stat-value">{teamStats.submittedCount}/{teamStats.totalMembers}</span>
              <span className="stat-label">已提交</span>
            </div>
          </div>
          {teamStats.notSubmittedMembers.length > 0 && (
            <div className="stat-card pending">
              <AlertCircle size={20} />
              <div className="stat-info">
                <span className="stat-value">{teamStats.notSubmittedMembers.length}</span>
                <span className="stat-label">未提交</span>
              </div>
              <div className="not-submitted-list">
                {teamStats.notSubmittedMembers.slice(0, 5).map(member => (
                  <Avatar 
                    key={member.id} 
                    name={member.name} 
                    src={member.avatar || undefined} 
                    size="sm" 
                  />
                ))}
                {teamStats.notSubmittedMembers.length > 5 && (
                  <span className="more">+{teamStats.notSubmittedMembers.length - 5}</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 日报列表 */}
      <div className="reports-content">
        {activeTab === 'my' ? (
          myLoading ? (
            <div className="loading-state">加载中...</div>
          ) : myReports.length === 0 ? (
            <div className="empty-state">
              <FileText size={48} />
              <p>暂无日报记录</p>
              <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                写{REPORT_TYPE_LABELS[reportType]}
              </button>
            </div>
          ) : (
            <div className="reports-list">
              {myReports.map(report => (
                <ReportCard 
                  key={report.id} 
                  report={report}
                  onView={() => handleViewDetail(report)}
                  onDelete={() => handleDelete(report.id)}
                  showActions
                />
              ))}
            </div>
          )
        ) : (
          teamLoading ? (
            <div className="loading-state">加载中...</div>
          ) : !canViewTeam ? (
            <div className="empty-state">
              <Users size={48} />
              <p>暂无查看权限</p>
            </div>
          ) : teamReports.length === 0 ? (
            <div className="empty-state">
              <FileText size={48} />
              <p>暂无团队日报</p>
            </div>
          ) : (
            <div className="reports-list team-list">
              {teamReports.map(report => (
                <ReportCard 
                  key={report.id} 
                  report={report}
                  onView={() => handleViewDetail(report)}
                  showUser
                />
              ))}
            </div>
          )
        )}
      </div>

      {/* 创建日报模态框 */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={`写${REPORT_TYPE_LABELS[reportType]}`}
        size="lg"
      >
        <form onSubmit={handleCreateReport} className="report-form">
          <div className="form-section">
            <label>
              <TrendingUp size={16} />
              {labels.today}
            </label>
            <textarea
              value={formData.todayWork}
              onChange={e => setFormData({ ...formData, todayWork: e.target.value })}
              placeholder={`请描述${labels.today}的主要内容...`}
              rows={4}
            />
          </div>

          <div className="form-section">
            <label>
              <Target size={16} />
              {labels.tomorrow}
            </label>
            <textarea
              value={formData.tomorrowPlan}
              onChange={e => setFormData({ ...formData, tomorrowPlan: e.target.value })}
              placeholder={`请描述${labels.tomorrow}的安排...`}
              rows={3}
            />
          </div>

          <div className="form-section">
            <label>
              <AlertCircle size={16} />
              遇到的问题
            </label>
            <textarea
              value={formData.issues}
              onChange={e => setFormData({ ...formData, issues: e.target.value })}
              placeholder="工作中遇到的问题和困难..."
              rows={2}
            />
          </div>

          <div className="form-section">
            <label>
              <HelpCircle size={16} />
              需要的支持
            </label>
            <textarea
              value={formData.needSupport}
              onChange={e => setFormData({ ...formData, needSupport: e.target.value })}
              placeholder="需要团队或领导提供的帮助..."
              rows={2}
            />
          </div>

          {reportType !== 'daily' && (
            <div className="form-section">
              <label>
                <MessageSquare size={16} />
                工作总结
              </label>
              <textarea
                value={formData.summary}
                onChange={e => setFormData({ ...formData, summary: e.target.value })}
                placeholder="整体工作总结和心得..."
                rows={3}
              />
            </div>
          )}

          <div className="form-row">
            <div className="form-section half">
              <label>今日心情</label>
              <div className="mood-selector">
                {(Object.keys(MOOD_LABELS) as Mood[]).map(mood => (
                  <button
                    key={mood}
                    type="button"
                    className={`mood-btn ${formData.mood === mood ? 'active' : ''}`}
                    onClick={() => setFormData({ ...formData, mood })}
                  >
                    {MOOD_ICONS[mood]}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-section half">
              <label>工作负荷</label>
              <select
                value={formData.workload}
                onChange={e => setFormData({ ...formData, workload: e.target.value as Workload })}
              >
                <option value="">请选择</option>
                {(Object.keys(WORKLOAD_LABELS) as Workload[]).map(w => (
                  <option key={w} value={w}>{WORKLOAD_LABELS[w]}</option>
                ))}
              </select>
            </div>

            <div className="form-section half">
              <label>工作时长（小时）</label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="24"
                value={formData.totalHours}
                onChange={e => setFormData({ ...formData, totalHours: e.target.value })}
                placeholder="可选"
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
              取消
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? '提交中...' : '提交日报'}
            </button>
          </div>
        </form>
      </Modal>

      {/* 日报详情模态框 */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title="日报详情"
        size="lg"
      >
        {selectedReport && (
          <div className="report-detail">
            <div className="detail-header">
              <div className="detail-user">
                <Avatar 
                  name={selectedReport.user.name} 
                  src={selectedReport.user.avatar || undefined}
                  size="md"
                />
                <div className="user-info">
                  <span className="user-name">{selectedReport.user.name}</span>
                  <span className="report-date">
                    {new Date(selectedReport.reportDate).toLocaleDateString('zh-CN')}
                  </span>
                </div>
              </div>
              <div className="detail-meta">
                {selectedReport.mood && (
                  <span className="mood-badge">{MOOD_ICONS[selectedReport.mood]}</span>
                )}
                {selectedReport.workload && (
                  <span className="workload-badge">{WORKLOAD_LABELS[selectedReport.workload]}</span>
                )}
                {selectedReport.totalHours && (
                  <span className="hours-badge">
                    <Clock size={14} /> {selectedReport.totalHours}h
                  </span>
                )}
              </div>
            </div>

            <div className="detail-stats">
              <div className="stat">
                <CheckCircle2 size={16} />
                <span>完成 {selectedReport.completedCount} 项任务</span>
              </div>
              <div className="stat">
                <Clock size={16} />
                <span>进行中 {selectedReport.inProgressCount} 项任务</span>
              </div>
            </div>

            {selectedReport.todayWork && (
              <div className="detail-section">
                <h4><TrendingUp size={16} /> {labels.today}</h4>
                <p>{selectedReport.todayWork}</p>
              </div>
            )}

            {selectedReport.tomorrowPlan && (
              <div className="detail-section">
                <h4><Target size={16} /> {labels.tomorrow}</h4>
                <p>{selectedReport.tomorrowPlan}</p>
              </div>
            )}

            {selectedReport.issues && (
              <div className="detail-section">
                <h4><AlertCircle size={16} /> 遇到的问题</h4>
                <p>{selectedReport.issues}</p>
              </div>
            )}

            {selectedReport.needSupport && (
              <div className="detail-section">
                <h4><HelpCircle size={16} /> 需要的支持</h4>
                <p>{selectedReport.needSupport}</p>
              </div>
            )}

            {selectedReport.summary && (
              <div className="detail-section">
                <h4><MessageSquare size={16} /> 工作总结</h4>
                <p>{selectedReport.summary}</p>
              </div>
            )}

            {/* 关联任务 */}
            {!detailLoading && selectedReport.completedTasks && selectedReport.completedTasks.length > 0 && (
              <div className="detail-section">
                <h4><CheckCircle2 size={16} /> 已完成任务</h4>
                <ul className="task-list">
                  {selectedReport.completedTasks.map(task => (
                    <li key={task.id}>
                      <span className="task-title">{task.title}</span>
                      {task.project && <span className="task-project">{task.project.name}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {!detailLoading && selectedReport.inProgressTasks && selectedReport.inProgressTasks.length > 0 && (
              <div className="detail-section">
                <h4><Clock size={16} /> 进行中任务</h4>
                <ul className="task-list">
                  {selectedReport.inProgressTasks.map(task => (
                    <li key={task.id}>
                      <span className="task-title">{task.title}</span>
                      {task.project && <span className="task-project">{task.project.name}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

// 日报卡片组件
interface ReportCardProps {
  report: WorkReport;
  onView: () => void;
  onDelete?: () => void;
  showUser?: boolean;
  showActions?: boolean;
}

function ReportCard({ report, onView, onDelete, showUser, showActions }: ReportCardProps) {
  return (
    <div className="report-card" onClick={onView}>
      {showUser && (
        <div className="card-user">
          <Avatar 
            name={report.user.name} 
            src={report.user.avatar || undefined}
            size="sm"
          />
          <span className="user-name">{report.user.name}</span>
        </div>
      )}
      
      <div className="card-header">
        <span className="card-date">
          {new Date(report.reportDate).toLocaleDateString('zh-CN', {
            month: 'short',
            day: 'numeric',
          })}
        </span>
        <div className="card-badges">
          {report.mood && <span className="mood">{MOOD_ICONS[report.mood]}</span>}
          {report.workload && (
            <span className={`workload workload-${report.workload}`}>
              {WORKLOAD_LABELS[report.workload]}
            </span>
          )}
        </div>
      </div>

      <div className="card-stats">
        <span className="stat completed">
          <CheckCircle2 size={14} /> {report.completedCount}
        </span>
        <span className="stat in-progress">
          <Clock size={14} /> {report.inProgressCount}
        </span>
        {report.totalHours && (
          <span className="stat hours">{report.totalHours}h</span>
        )}
      </div>

      {report.todayWork && (
        <p className="card-preview">{report.todayWork.substring(0, 100)}...</p>
      )}

      {showActions && (
        <div className="card-actions" onClick={e => e.stopPropagation()}>
          <button className="action-btn" onClick={onView} title="查看详情">
            <Eye size={16} />
          </button>
          {onDelete && (
            <button className="action-btn danger" onClick={onDelete} title="删除">
              <Trash2 size={16} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// 辅助函数
function formatDateForApi(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

function getDateRangeForType(type: ReportType, date: Date): { startDate: Date; endDate: Date } {
  const startDate = new Date(date);
  const endDate = new Date(date);

  if (type === 'daily') {
    // 最近30天
    startDate.setDate(startDate.getDate() - 30);
  } else if (type === 'weekly') {
    // 最近12周
    startDate.setDate(startDate.getDate() - 84);
  } else {
    // 最近12个月
    startDate.setMonth(startDate.getMonth() - 12);
  }

  return { startDate, endDate };
}

