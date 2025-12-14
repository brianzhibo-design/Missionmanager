/**
 * 报告中心页面
 */
import { useState, useEffect, useCallback } from 'react';
import { usePermissions } from '../hooks/usePermissions';
import { reportService, Report } from '../services/report';
import { Modal } from '../components/Modal';
import { config } from '../config';
import './Reports.css';

export default function Reports() {
  const { currentWorkspace } = usePermissions();
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

  useEffect(() => {
    if (currentWorkspace) {
      loadReports();
    }
  }, [currentWorkspace, loadReports]);

  const handleGenerateWeekly = async () => {
    if (!currentWorkspace) return;
    setGenerating(true);
    setError(null);
    try {
      const report = await reportService.generateWeekly(currentWorkspace.id);
      setReports([report, ...reports]);
      setSelectedReport(report);
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '生成月报失败');
    } finally {
      setGenerating(false);
    }
  };

  // 导出 PDF
  const handleExportPDF = async () => {
    if (!selectedReport) return;
    try {
      setExporting(true);
      setError(null);
      const token = localStorage.getItem(config.storageKeys.token);
      const response = await fetch(`${config.apiBaseUrl}/reports/${selectedReport.id}/export/pdf`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('导出失败');
      }
      
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

  // 导出 Excel
  const handleExportExcel = async () => {
    if (!selectedReport) return;
    try {
      setExporting(true);
      setError(null);
      const token = localStorage.getItem(config.storageKeys.token);
      const response = await fetch(`${config.apiBaseUrl}/reports/${selectedReport.id}/export/excel`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('导出失败');
      }
      
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

  // 发送邮件
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

  return (
    <div className="reports-page fade-in">
      <div className="page-header">
        <div className="header-content">
          <div className="header-icon">📊</div>
          <div className="header-text">
            <h1>报告中心</h1>
            <p>自动生成周报和月报</p>
          </div>
        </div>
        <div className="header-actions">
          <button
            className="btn btn-secondary"
            onClick={handleGenerateWeekly}
            disabled={generating || !currentWorkspace}
          >
            {generating ? '生成中...' : '📅 生成周报'}
          </button>
          <button
            className="btn btn-primary"
            onClick={handleGenerateMonthly}
            disabled={generating || !currentWorkspace}
          >
            {generating ? '生成中...' : '📆 生成月报'}
          </button>
        </div>
      </div>

      {error && <div className="error-card">⚠️ {error}</div>}
      {successMessage && <div className="success-toast">✅ {successMessage}</div>}

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
                    {report.type === 'weekly' ? '📅 周报' : '📆 月报'}
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
                    📄 {exporting ? '导出中...' : '导出 PDF'}
                  </button>
                  <button 
                    className="btn btn-secondary btn-sm"
                    onClick={handleExportExcel}
                    disabled={exporting}
                  >
                    📊 {exporting ? '导出中...' : '导出 Excel'}
                  </button>
                  <button 
                    className="btn btn-primary btn-sm"
                    onClick={() => setSendEmailModalOpen(true)}
                  >
                    ✉️ 发送邮件
                  </button>
                </div>
              </div>

              {/* AI 摘要 */}
              {selectedReport.summary && (
                <div className="report-summary">
                  <h4>🤖 AI 摘要</h4>
                  <p>{selectedReport.summary}</p>
                </div>
              )}

              {/* 亮点和关注点 */}
              <div className="report-insights">
                {Array.isArray(selectedReport.highlights) && selectedReport.highlights.length > 0 && (
                  <div className="insight-section highlights">
                    <h4>✨ 亮点</h4>
                    <ul>
                      {selectedReport.highlights.map((h, i) => (
                        <li key={i}>{h}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {Array.isArray(selectedReport.concerns) && selectedReport.concerns.length > 0 && (
                  <div className="insight-section concerns">
                    <h4>⚠️ 关注点</h4>
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
                  <h4>📈 数据统计</h4>
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

              {/* 项目详情 */}
              {selectedReport.content?.projectStats && selectedReport.content.projectStats.length > 0 && (
                <div className="report-projects">
                  <h4>📁 各项目情况</h4>
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

