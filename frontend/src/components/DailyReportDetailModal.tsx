/**
 * 日报详情弹窗
 * 用于查看团队成员的日报详细内容
 */
import { useState, useEffect } from 'react';
import { X, Calendar, CheckCircle, ArrowRight, AlertCircle, Clock, Loader2 } from 'lucide-react';
import { dailyReportService, DailyReport } from '../services/dailyReport';
import './DailyReportDetailModal.css';

interface DailyReportDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportId?: string;
  report?: DailyReport; // 可以直接传入报告对象
}

export default function DailyReportDetailModal({
  isOpen,
  onClose,
  reportId,
  report: initialReport,
}: DailyReportDetailModalProps) {
  const [report, setReport] = useState<DailyReport | null>(initialReport || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && reportId && !initialReport) {
      loadReport();
    } else if (initialReport) {
      setReport(initialReport);
    }
  }, [isOpen, reportId, initialReport]);

  const loadReport = async () => {
    if (!reportId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await dailyReportService.getById(reportId);
      setReport(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '加载日报失败');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${weekdays[date.getDay()]}`;
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="daily-report-detail-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>
          <X size={20} />
        </button>

        {loading ? (
          <div className="modal-loading">
            <Loader2 size={32} className="spin" />
            <p>加载中...</p>
          </div>
        ) : error ? (
          <div className="modal-error">
            <AlertCircle size={32} />
            <p>{error}</p>
            <button className="btn btn-secondary" onClick={loadReport}>重试</button>
          </div>
        ) : report ? (
          <>
            {/* 头部 */}
            <div className="modal-header">
              <div className="user-info">
                <div className="user-avatar">
                  {report.user.avatar ? (
                    <img src={report.user.avatar} alt={report.user.name} />
                  ) : (
                    report.user.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="user-details">
                  <h3>{report.user.name} 的工作日报</h3>
                  <p className="report-date">
                    <Calendar size={14} />
                    {formatDate(report.date)}
                    {report.workHours && (
                      <span className="work-hours">
                        <Clock size={14} /> {report.workHours} 小时
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* 内容 */}
            <div className="modal-content">
              {/* 今日完成 */}
              <div className="report-section">
                <div className="section-header completed">
                  <CheckCircle size={18} />
                  <h4>今日完成</h4>
                </div>
                <div className="section-content">
                  {report.completed.split('\n').map((line, i) => (
                    <p key={i}>{line || <br />}</p>
                  ))}
                </div>
              </div>

              {/* 任务统计 */}
              {report.taskStats && (
                <div className="task-stats-section">
                  <div className="task-stat completed">
                    <span className="stat-value">{report.taskStats.completedCount}</span>
                    <span className="stat-label">已完成任务</span>
                  </div>
                  <div className="task-stat in-progress">
                    <span className="stat-value">{report.taskStats.inProgressCount}</span>
                    <span className="stat-label">进行中任务</span>
                  </div>
                </div>
              )}

              {/* 明日计划 */}
              <div className="report-section">
                <div className="section-header planned">
                  <ArrowRight size={18} />
                  <h4>明日计划</h4>
                </div>
                <div className="section-content">
                  {report.planned.split('\n').map((line, i) => (
                    <p key={i}>{line || <br />}</p>
                  ))}
                </div>
              </div>

              {/* 问题与风险 */}
              {report.issues && (
                <div className="report-section">
                  <div className="section-header issues">
                    <AlertCircle size={18} />
                    <h4>问题与需要的支持</h4>
                  </div>
                  <div className="section-content issues-content">
                    {report.issues.split('\n').map((line, i) => (
                      <p key={i}>{line || <br />}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 底部 */}
            <div className="modal-footer">
              <span className="submit-time">
                提交于 {new Date(report.createdAt).toLocaleString('zh-CN')}
              </span>
              <button className="btn btn-secondary" onClick={onClose}>
                关闭
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
