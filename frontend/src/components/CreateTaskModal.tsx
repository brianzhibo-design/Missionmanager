/**
 * 新建任务模态框 - 精美 UI 设计
 */
import { useState, useEffect, useRef } from 'react';
import {
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Calendar,
  User,
  Folder,
  Loader2,
  Sparkles,
  Lightbulb,
  Clock,
  Check,
  CheckCircle2,
} from './Icons';
import { taskService } from '../services/task';
import { projectService, Project } from '../services/project';
import { workspaceService, WorkspaceMember } from '../services/workspace';
import { aiService, SuggestedTask } from '../services/ai';
import { usePermissions } from '../hooks/usePermissions';
import { useAuth } from '../hooks/useAuth';
import './CreateTaskModal.css';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultProjectId?: string;
}

const PRIORITY_OPTIONS = [
  { value: 'critical', label: '紧急', color: '#EF4444' },
  { value: 'high', label: '高', color: '#F97316' },
  { value: 'medium', label: '中', color: '#3B82F6' },
  { value: 'low', label: '低', color: '#6B7280' },
];

// 日历组件
function CalendarPopover({
  onSelect,
  selectedDate,
}: {
  onClose: () => void;
  onSelect: (date: Date) => void;
  selectedDate: Date | null;
}) {
  const [currentMonth, setCurrentMonth] = useState(selectedDate || new Date());
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  // 获取当月第一天是星期几
  const firstDay = new Date(year, month, 1).getDay();
  // 获取当月天数
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const today = new Date();

  const prevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  const isToday = (day: number) => {
    return (
      today.getFullYear() === year &&
      today.getMonth() === month &&
      today.getDate() === day
    );
  };

  const isSelected = (day: number) => {
    if (!selectedDate) return false;
    return (
      selectedDate.getFullYear() === year &&
      selectedDate.getMonth() === month &&
      selectedDate.getDate() === day
    );
  };

  const handleSelect = (day: number) => {
    onSelect(new Date(year, month, day));
  };

  const handleSelectToday = () => {
    onSelect(today);
  };

  return (
    <div
      className="ctm-calendar-popover"
      onClick={(e) => e.stopPropagation()}
    >
      {/* 头部：月份切换 */}
      <div className="ctm-calendar-header">
        <button
          type="button"
          className="ctm-calendar-nav"
          onClick={prevMonth}
        >
          <ChevronLeft size={16} />
        </button>
        <span className="ctm-calendar-title">
          {year}年{month + 1}月
        </span>
        <button
          type="button"
          className="ctm-calendar-nav"
          onClick={nextMonth}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* 星期表头 */}
      <div className="ctm-calendar-weekdays">
        {weekDays.map((d) => (
          <div key={d} className="ctm-calendar-weekday">
            {d}
          </div>
        ))}
      </div>

      {/* 日期网格 */}
      <div className="ctm-calendar-grid">
        {/* 空白占位 */}
        {Array(firstDay)
          .fill(null)
          .map((_, i) => (
            <div key={`empty-${i}`} />
          ))}

        {days.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => handleSelect(d)}
            className={`ctm-calendar-day ${isSelected(d) ? 'selected' : ''} ${isToday(d) && !isSelected(d) ? 'today' : ''}`}
          >
            {d}
            {isToday(d) && !isSelected(d) && (
              <span className="ctm-calendar-today-dot" />
            )}
          </button>
        ))}
      </div>

      {/* 底部快捷操作 */}
      <div className="ctm-calendar-footer">
        <button type="button" className="ctm-calendar-time-btn">
          <Clock size={12} /> 设置时间
        </button>
        <button
          type="button"
          className="ctm-calendar-today-btn"
          onClick={handleSelectToday}
        >
          今天
        </button>
      </div>
    </div>
  );
}

export default function CreateTaskModal({
  isOpen,
  onClose,
  onSuccess,
  defaultProjectId,
}: CreateTaskModalProps) {
  const { currentWorkspace } = usePermissions();
  const { user } = useAuth();

  // 表单状态
  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState(defaultProjectId || '');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [assigneeId, setAssigneeId] = useState('');
  const [description, setDescription] = useState('');

  // 数据状态
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // UI 状态
  const [showCalendar, setShowCalendar] = useState(false);
  const [showProjectSelect, setShowProjectSelect] = useState(false);
  const [showAssigneeSelect, setShowAssigneeSelect] = useState(false);
  const [showPrioritySelect, setShowPrioritySelect] = useState(false);

  // AI 建议状态
  const [aiSuggestions, setAiSuggestions] = useState<SuggestedTask[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

  // 提交状态
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const calendarRef = useRef<HTMLDivElement>(null);

  // 加载数据
  useEffect(() => {
    if (!isOpen || !currentWorkspace?.id) return;

    const loadData = async () => {
      try {
        setLoadingData(true);
        const [projectsData, membersData] = await Promise.all([
          projectService.getProjects(currentWorkspace.id),
          workspaceService.getMembers(currentWorkspace.id),
        ]);
        setProjects(projectsData);
        setMembers(membersData);

        if (defaultProjectId) {
          setProjectId(defaultProjectId);
        } else if (projectsData.length === 1) {
          setProjectId(projectsData[0].id);
        }
      } catch (err) {
        console.error('Failed to load data:', err);
        setError('加载数据失败');
      } finally {
        setLoadingData(false);
      }
    };

    loadData();
  }, [isOpen, currentWorkspace?.id, defaultProjectId]);

  // 点击外部关闭日历
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        calendarRef.current &&
        !calendarRef.current.contains(event.target as Node)
      ) {
        setShowCalendar(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 重置表单
  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDueDate(null);
    setAssigneeId('');
    setPriority('medium');
    setError(null);
    setAiSuggestions([]);
  };

  // 关闭模态框
  const handleClose = () => {
    resetForm();
    onClose();
  };

  // 获取 AI 建议
  const handleGetAISuggestions = async () => {
    if (!projectId) {
      setError('请先选择项目');
      return;
    }

    setAiLoading(true);
    try {
      // 获取项目现有任务
      const existingTasks = await taskService.getTasks(projectId);
      const taskData = existingTasks.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate || undefined,
        description: t.description || undefined,
      }));

      const response = await aiService.generateNextTasks(projectId, taskData);
      if (response && Array.isArray(response.suggestedTasks)) {
        setAiSuggestions(response.suggestedTasks);
      } else if (response && Array.isArray(response)) {
        setAiSuggestions(response as unknown as SuggestedTask[]);
      } else {
        setAiSuggestions([]);
      }
    } catch (err) {
      console.error('获取 AI 建议失败:', err);
      setAiSuggestions([]);
    } finally {
      setAiLoading(false);
    }
  };

  // 使用 AI 建议
  const handleUseSuggestion = (suggestion: SuggestedTask) => {
    setTitle(suggestion.title || '');
    setDescription(suggestion.description || '');
    if (suggestion.priority) {
      setPriority(suggestion.priority);
    }
  };

  // 提交表单
  const handleSubmit = async () => {
    setError(null);

    if (!title.trim()) {
      setError('请输入任务标题');
      return;
    }
    if (!projectId) {
      setError('请选择项目');
      return;
    }

    try {
      setSubmitting(true);
      await taskService.createTask({
        projectId,
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        assigneeId: assigneeId || undefined,
        dueDate: dueDate?.toISOString() || undefined,
      });

      resetForm();
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Failed to create task:', err);
      setError('创建任务失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  // 获取当前选中的项目
  const selectedProject = projects.find((p) => p.id === projectId);
  // 获取当前选中的负责人
  const selectedAssignee = members.find((m) => m.user.id === assigneeId);
  // 获取当前选中的优先级
  const selectedPriority = PRIORITY_OPTIONS.find((p) => p.value === priority);

  // 格式化日期显示
  const formatDate = (date: Date | null) => {
    if (!date) return '选择日期';
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  };

  if (!isOpen) return null;

  return (
    <div className="ctm-overlay" onClick={handleClose}>
      {/* 背景遮罩 */}
      <div className="ctm-backdrop" />

      {/* 模态框主体 */}
      <div
        className="ctm-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="ctm-header">
          <h3 className="ctm-title">
            <div className="ctm-title-icon">
              <CheckCircle2 size={20} />
            </div>
            新建任务
          </h3>
          <button className="ctm-close-btn" onClick={handleClose}>
            <X size={20} />
          </button>
        </div>

        {/* 内容区域 */}
        <div className="ctm-body">
          {loadingData ? (
            <div className="ctm-loading">
              <Loader2 size={24} className="ctm-spinner" />
              <span>加载中...</span>
            </div>
          ) : (
            <>
              {/* 错误提示 */}
              {error && <div className="ctm-error">{error}</div>}

              {/* 任务标题 */}
              <div className="ctm-field">
                <label className="ctm-label">任务标题</label>
                <input
                  type="text"
                  className="ctm-title-input"
                  placeholder="需要完成什么？"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  autoFocus
                />
              </div>

              {/* 属性网格 */}
              <div className="ctm-grid">
                {/* 项目选择 */}
                <div className="ctm-field">
                  <label className="ctm-label">项目</label>
                  <div
                    className={`ctm-select-trigger ${showProjectSelect ? 'active' : ''}`}
                    onClick={() => setShowProjectSelect(!showProjectSelect)}
                  >
                    <div className="ctm-select-icon project">
                      <Folder size={16} />
                    </div>
                    <span className={`ctm-select-value ${selectedProject ? 'has-value' : ''}`}>
                      {selectedProject?.name || '选择项目'}
                    </span>
                    <ChevronDown size={14} className="ctm-select-arrow" />
                  </div>
                  {showProjectSelect && (
                    <div className="ctm-dropdown">
                      {projects.map((project) => (
                        <div
                          key={project.id}
                          className={`ctm-dropdown-item ${project.id === projectId ? 'selected' : ''}`}
                          onClick={() => {
                            setProjectId(project.id);
                            setShowProjectSelect(false);
                          }}
                        >
                          {project.name}
                          {project.id === projectId && <Check size={14} />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 截止日期 */}
                <div className="ctm-field" ref={calendarRef}>
                  <label className="ctm-label">截止日期</label>
                  <div
                    className={`ctm-select-trigger ${showCalendar || dueDate ? 'active' : ''}`}
                    onClick={() => setShowCalendar(!showCalendar)}
                  >
                    <div className={`ctm-select-icon date ${dueDate ? 'has-value' : ''}`}>
                      <Calendar size={16} />
                    </div>
                    <span className={`ctm-select-value ${dueDate ? 'has-value' : ''}`}>
                      {formatDate(dueDate)}
                    </span>
                  </div>
                  {showCalendar && (
                    <CalendarPopover
                      onClose={() => setShowCalendar(false)}
                      onSelect={(date) => {
                        setDueDate(date);
                        setShowCalendar(false);
                      }}
                      selectedDate={dueDate}
                    />
                  )}
                </div>

                {/* 负责人 */}
                <div className="ctm-field">
                  <label className="ctm-label">负责人</label>
                  <div
                    className={`ctm-select-trigger ${showAssigneeSelect ? 'active' : ''}`}
                    onClick={() => setShowAssigneeSelect(!showAssigneeSelect)}
                  >
                    {selectedAssignee ? (
                      <div className="ctm-avatar">
                        {selectedAssignee.user.name.charAt(0)}
                      </div>
                    ) : (
                      <div className="ctm-select-icon">
                        <User size={16} />
                      </div>
                    )}
                    <div className="ctm-select-content">
                      <span className={`ctm-select-value ${selectedAssignee ? 'has-value' : ''}`}>
                        {selectedAssignee?.user.name || '选择负责人'}
                      </span>
                      {selectedAssignee && user?.id === selectedAssignee.user.id && (
                        <span className="ctm-select-hint">创建者</span>
                      )}
                    </div>
                    <ChevronDown size={14} className="ctm-select-arrow" />
                  </div>
                  {showAssigneeSelect && (
                    <div className="ctm-dropdown">
                      <div
                        className={`ctm-dropdown-item ${!assigneeId ? 'selected' : ''}`}
                        onClick={() => {
                          setAssigneeId('');
                          setShowAssigneeSelect(false);
                        }}
                      >
                        不指定
                        {!assigneeId && <Check size={14} />}
                      </div>
                      {members.map((member) => (
                        <div
                          key={member.user.id}
                          className={`ctm-dropdown-item ${member.user.id === assigneeId ? 'selected' : ''}`}
                          onClick={() => {
                            setAssigneeId(member.user.id);
                            setShowAssigneeSelect(false);
                          }}
                        >
                          <div className="ctm-dropdown-avatar">
                            {member.user.name.charAt(0)}
                          </div>
                          {member.user.name}
                          {member.user.id === assigneeId && <Check size={14} />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 优先级 */}
                <div className="ctm-field">
                  <label className="ctm-label">优先级</label>
                  <div
                    className={`ctm-select-trigger ${showPrioritySelect ? 'active' : ''}`}
                    onClick={() => setShowPrioritySelect(!showPrioritySelect)}
                  >
                    <div
                      className="ctm-priority-dot"
                      style={{ backgroundColor: selectedPriority?.color }}
                    />
                    <span className="ctm-select-value has-value">
                      {selectedPriority?.label}
                    </span>
                    <ChevronDown size={14} className="ctm-select-arrow" />
                  </div>
                  {showPrioritySelect && (
                    <div className="ctm-dropdown">
                      {PRIORITY_OPTIONS.map((option) => (
                        <div
                          key={option.value}
                          className={`ctm-dropdown-item ${option.value === priority ? 'selected' : ''}`}
                          onClick={() => {
                            setPriority(option.value);
                            setShowPrioritySelect(false);
                          }}
                        >
                          <div
                            className="ctm-priority-dot"
                            style={{ backgroundColor: option.color }}
                          />
                          {option.label}
                          {option.value === priority && <Check size={14} />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* AI 智能建议区域 */}
              <div className="ctm-ai-panel">
                <div className="ctm-ai-panel-header">
                  <span className="ctm-ai-panel-title">
                    <Sparkles size={16} /> AI 智能建议
                  </span>
                  <button
                    type="button"
                    className={`ctm-ai-get-btn ${aiLoading ? 'loading' : ''}`}
                    onClick={handleGetAISuggestions}
                    disabled={aiLoading || !projectId}
                  >
                    {aiLoading ? (
                      <>
                        <Loader2 size={14} className="ctm-spinner" />
                        生成中...
                      </>
                    ) : (
                      '获取建议'
                    )}
                  </button>
                </div>

                {/* AI 建议列表 */}
                {aiSuggestions.length > 0 && (
                  <div className="ctm-ai-suggestions-list">
                    {aiSuggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className="ctm-ai-suggestion-card"
                        onClick={() => handleUseSuggestion(suggestion)}
                      >
                        <div className="ctm-suggestion-header">
                          <span
                            className="ctm-suggestion-priority"
                            style={{
                              backgroundColor: PRIORITY_OPTIONS.find(
                                (p) => p.value === suggestion.priority
                              )?.color || '#3B82F6',
                            }}
                          />
                          <span className="ctm-suggestion-title">
                            {suggestion.title || '未命名任务'}
                          </span>
                        </div>
                        <p className="ctm-suggestion-desc">
                          {suggestion.description
                            ? suggestion.description.substring(0, 80)
                            : '无描述'}
                          {suggestion.description && suggestion.description.length > 80
                            ? '...'
                            : ''}
                        </p>
                        {suggestion.reason && (
                          <div className="ctm-suggestion-reason">
                            <Lightbulb size={12} />
                            <span>{suggestion.reason}</span>
                          </div>
                        )}
                        <span className="ctm-suggestion-hint">点击使用此建议</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* AI 加载状态 */}
                {aiLoading && (
                  <div className="ctm-ai-loading">
                    <div className="ctm-ai-loading-animation">
                      <div className="ctm-ai-loading-spinner" />
                      <div className="ctm-ai-loading-text">
                        <span>AI 正在分析项目...</span>
                        <span className="ctm-ai-loading-subtitle">正在结合已有任务生成智能建议</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 空状态提示 */}
                {aiSuggestions.length === 0 && !aiLoading && (
                  <p className="ctm-ai-hint">
                    {projectId
                      ? '点击"获取建议"让 AI 分析项目并推荐下一步任务'
                      : '请先选择项目，再获取 AI 建议'}
                  </p>
                )}
              </div>

              {/* 描述区域 */}
              <div className="ctm-field">
                <label className="ctm-label">描述</label>
                <textarea
                  className="ctm-textarea"
                  placeholder="添加任务详情..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
              </div>
            </>
          )}
        </div>

        {/* 底部操作栏 */}
        <div className="ctm-footer">
          <div className="ctm-footer-right">
            <button
              type="button"
              className="ctm-cancel-btn"
              onClick={handleClose}
              disabled={submitting}
            >
              取消
            </button>
            <button
              type="button"
              className="ctm-submit-btn"
              onClick={handleSubmit}
              disabled={submitting || !title.trim() || !projectId || loadingData}
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="ctm-spinner" />
                  创建中...
                </>
              ) : (
                '创建任务'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
