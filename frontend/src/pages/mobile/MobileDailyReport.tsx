/**
 * 移动端日报页面 - 简约蓝主题
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Send,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Sparkles,
} from '../../components/Icons';
import MobileLayout from '../../components/mobile/MobileLayout';
import {
  dailyReportService,
  DailyReport,
  TaskStats,
  CreateDailyReportInput,
} from '../../services/dailyReport';
import { usePermissions } from '../../hooks/usePermissions';
import '../../styles/mobile-minimal.css';

// 格式化日期显示
function formatDateDisplay(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (dateStr === today.toISOString().split('T')[0]) {
    return '今天';
  } else if (dateStr === yesterday.toISOString().split('T')[0]) {
    return '昨天';
  } else {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return `${month}月${day}日 ${weekDays[date.getDay()]}`;
  }
}

export default function MobileDailyReport() {
  const navigate = useNavigate();
  const { currentWorkspace } = usePermissions();

  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [report, setReport] = useState<DailyReport | null>(null);
  const [taskStats, setTaskStats] = useState<TaskStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // 表单状态
  const [completed, setCompleted] = useState('');
  const [planned, setPlanned] = useState('');
  const [issues, setIssues] = useState('');

  const loadReport = useCallback(async (date: string) => {
    if (!currentWorkspace?.id) return;

    setLoading(true);
    try {
      const existingReport = await dailyReportService.getByDate(
        currentWorkspace.id,
        date
      );

      if (existingReport) {
        setReport(existingReport);
        setCompleted(existingReport.completed || '');
        setPlanned(existingReport.planned || '');
        setIssues(existingReport.issues || '');
        setTaskStats(existingReport.taskStats);
      } else {
        setReport(null);
        setCompleted('');
        setPlanned('');
        setIssues('');
        setTaskStats(null);
      }
    } catch (error) {
      console.error('Failed to load report:', error);
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace?.id]);

  useEffect(() => {
    loadReport(selectedDate);
  }, [selectedDate, loadReport]);

  const handleAiFill = async () => {
    if (!currentWorkspace?.id) return;

    setAiLoading(true);
    try {
      const result = await dailyReportService.aiFill(currentWorkspace.id, selectedDate);
      setCompleted(result.completed);
      setPlanned(result.planned);
      setIssues(result.issues);
      setTaskStats(result.taskStats);
    } catch (error) {
      console.error('Failed to AI fill:', error);
    } finally {
      setAiLoading(false);
    }
  };

  const handleSave = async () => {
    if (!currentWorkspace?.id) return;

    setSaving(true);
    try {
      const input: CreateDailyReportInput = {
        workspaceId: currentWorkspace.id,
        date: selectedDate,
        completed,
        planned,
        issues: issues || undefined,
      };
      const savedReport = await dailyReportService.create(input);
      setReport(savedReport);
      // 显示成功提示
      setToast({ type: 'success', message: report ? '日报更新成功！' : '日报提交成功！' });
      setTimeout(() => setToast(null), 3000);
    } catch (error) {
      console.error('Failed to save:', error);
      setToast({ type: 'error', message: '提交失败，请重试' });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const isToday = selectedDate === new Date().toISOString().split('T')[0];
  const canEdit = isToday || !report; // 只能编辑今天或未提交的日报

  return (
    <MobileLayout
      headerType="manage"
      headerTitle="工作日报"
      showBottomNav={false}
      headerProps={{
        rightContent: (
          <button
            className="mm-header-icon"
            onClick={handleAiFill}
            disabled={aiLoading}
          >
            {aiLoading ? <Loader2 size={20} className="mm-spinner-icon" /> : <Sparkles size={20} />}
          </button>
        ),
      }}
    >
      {/* Toast 提示 */}
      {toast && (
        <div className={`mm-toast mm-toast-${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}
      {/* 日期选择器 */}
      <div className="mm-date-selector">
        <button className="mm-date-nav" onClick={handlePrevDay}>
          <ChevronLeft size={20} />
        </button>
        <div className="mm-date-current">
          <Calendar size={16} />
          <span>{formatDateDisplay(selectedDate)}</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="mm-date-input-native"
            max={new Date().toISOString().split('T')[0]}
          />
        </div>
        <button
          className="mm-date-nav"
          onClick={handleNextDay}
          disabled={isToday}
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {loading ? (
        <div className="mm-loading" style={{ marginTop: 60 }}>
          <Loader2 size={24} className="mm-spinner-icon" />
          <span>加载中...</span>
        </div>
      ) : (
        <div className="mm-report-content">
          {/* 今日完成任务统计 */}
          {taskStats && taskStats.completed.length > 0 && (
            <div className="mm-report-section">
              <div className="mm-report-section-header">
                <CheckCircle size={18} className="mm-icon-success" />
                <span>今日完成 ({taskStats.completedCount})</span>
              </div>
              <div className="mm-report-tasks">
                {taskStats.completed.map((task) => (
                  <div
                    key={task.id}
                    className="mm-report-task-item"
                    onClick={() => navigate(`/tasks/${task.id}`)}
                  >
                    <CheckCircle size={16} className="mm-icon-success" />
                    <span>{task.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 进行中任务 */}
          {taskStats && taskStats.inProgress.length > 0 && (
            <div className="mm-report-section">
              <div className="mm-report-section-header">
                <ArrowRight size={18} className="mm-icon-primary" />
                <span>进行中 ({taskStats.inProgressCount})</span>
              </div>
              <div className="mm-report-tasks">
                {taskStats.inProgress.slice(0, 5).map((task) => (
                  <div
                    key={task.id}
                    className="mm-report-task-item"
                    onClick={() => navigate(`/tasks/${task.id}`)}
                  >
                    <ArrowRight size={16} className="mm-icon-primary" />
                    <span>{task.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 工作总结 */}
          <div className="mm-report-section">
            <div className="mm-report-section-header">
              <span>📝 今日工作总结</span>
            </div>
            <textarea
              className="mm-report-textarea"
              placeholder="总结一下今天完成了什么工作..."
              value={completed}
              onChange={(e) => setCompleted(e.target.value)}
              rows={4}
              disabled={!canEdit}
            />
          </div>

          {/* 明日计划 */}
          <div className="mm-report-section">
            <div className="mm-report-section-header">
              <span>明日计划</span>
            </div>
            <textarea
              className="mm-report-textarea"
              placeholder="明天计划做什么..."
              value={planned}
              onChange={(e) => setPlanned(e.target.value)}
              rows={3}
              disabled={!canEdit}
            />
          </div>

          {/* 问题与支持 */}
          <div className="mm-report-section">
            <div className="mm-report-section-header">
              <AlertCircle size={18} className="mm-icon-warning" />
              <span>问题与需要的支持</span>
            </div>
            <textarea
              className="mm-report-textarea"
              placeholder="遇到什么问题？需要什么支持？（可选）"
              value={issues}
              onChange={(e) => setIssues(e.target.value)}
              rows={3}
              disabled={!canEdit}
            />
          </div>

          {/* 已提交状态 */}
          {report && !canEdit && (
            <div className="mm-report-submitted">
              <CheckCircle size={16} />
              <span>日报已提交于 {new Date(report.updatedAt).toLocaleTimeString()}</span>
            </div>
          )}
        </div>
      )}

      {/* 底部操作栏 */}
      {canEdit && (
        <div className="mm-report-actions">
          <button
            className="mm-btn mm-btn-secondary"
            onClick={() => navigate(-1)}
          >
            取消
          </button>
          <button
            className="mm-btn mm-btn-primary"
            onClick={handleSave}
            disabled={saving || !completed.trim()}
          >
            {saving ? (
              <>
                <Loader2 size={18} className="mm-spinner-icon" />
                保存中...
              </>
            ) : (
              <>
                <Send size={18} />
                提交日报
              </>
            )}
          </button>
        </div>
      )}
    </MobileLayout>
  );
}











