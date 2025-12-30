/**
 * 移动端全局搜索页面 - 简约蓝主题
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  X,
  Clock,
  ArrowLeft,
  CheckSquare,
  Folder,
  User,
  Loader2,
} from '../../components/Icons';
import { taskService } from '../../services/task';
import { projectService } from '../../services/project';
import { memberService } from '../../services/member';
import { usePermissions } from '../../hooks/usePermissions';
import '../../styles/mobile-minimal.css';

type SearchType = 'all' | 'tasks' | 'projects' | 'members';

interface SearchResult {
  type: 'task' | 'project' | 'member';
  id: string;
  title: string;
  subtitle?: string;
}

const STORAGE_KEY = 'mobile_search_history';

export default function MobileSearch() {
  const navigate = useNavigate();
  const { currentWorkspace } = usePermissions();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<SearchType>('all');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // 自动聚焦并加载历史
  useEffect(() => {
    inputRef.current?.focus();
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch {
        // ignore
      }
    }
  }, []);

  const saveToHistory = useCallback((term: string) => {
    setHistory(prevHistory => {
      const newHistory = [term, ...prevHistory.filter(h => h !== term)].slice(0, 10);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
      return newHistory;
    });
  }, []);

  const performSearch = useCallback(async (searchQuery: string, type: SearchType) => {
    if (!currentWorkspace?.id || searchQuery.length < 2) return;

    setLoading(true);
    setHasSearched(true);

    try {
      const allResults: SearchResult[] = [];

      // 搜索任务
      if (type === 'all' || type === 'tasks') {
        const taskResponse = await taskService.getMyTasks();
        const matchedTasks = taskResponse.tasks.filter(task =>
          task.title.toLowerCase().includes(searchQuery.toLowerCase())
        );
        allResults.push(
          ...matchedTasks.slice(0, 10).map(task => ({
            type: 'task' as const,
            id: task.id,
            title: task.title,
            subtitle: task.project?.name,
          }))
        );
      }

      // 搜索项目
      if (type === 'all' || type === 'projects') {
        const projects = await projectService.getProjects(currentWorkspace.id);
        const matchedProjects = projects.filter(project =>
          project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          project.description?.toLowerCase().includes(searchQuery.toLowerCase())
        );
        allResults.push(
          ...matchedProjects.slice(0, 10).map(project => ({
            type: 'project' as const,
            id: project.id,
            title: project.name,
            subtitle: project.description || undefined,
          }))
        );
      }

      // 搜索成员
      if (type === 'all' || type === 'members') {
        const members = await memberService.getMembers(currentWorkspace.id);
        const matchedMembers = members.filter(member =>
          member.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          member.user.email.toLowerCase().includes(searchQuery.toLowerCase())
        );
        allResults.push(
          ...matchedMembers.slice(0, 10).map(member => ({
            type: 'member' as const,
            id: member.user.id,
            title: member.user.name,
            subtitle: member.user.email,
          }))
        );
      }

      setResults(allResults);

      // 保存到搜索历史
      if (allResults.length > 0) {
        saveToHistory(searchQuery);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace?.id, saveToHistory]);

  // 防抖搜索
  useEffect(() => {
    if (query.length >= 2) {
      const timer = setTimeout(() => {
        performSearch(query, searchType);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setResults([]);
      setHasSearched(false);
    }
  }, [query, searchType, performSearch]);

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const handleResultClick = (result: SearchResult) => {
    switch (result.type) {
      case 'task':
        navigate(`/tasks/${result.id}`);
        break;
      case 'project':
        navigate(`/projects/${result.id}`);
        break;
      case 'member':
        // 可以跳转到成员详情或成员任务树
        navigate(`/admin/members-tree`);
        break;
    }
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'task':
        return <CheckSquare size={18} />;
      case 'project':
        return <Folder size={18} />;
      case 'member':
        return <User size={18} />;
      default:
        return null;
    }
  };

  return (
    <div className="mm-search-page">
      {/* 搜索头部 */}
      <div className="mm-search-header">
        <button className="mm-search-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={24} />
        </button>
        <div className="mm-search-input-wrapper">
          <Search size={18} className="mm-search-icon" />
          <input
            ref={inputRef}
            type="text"
            className="mm-search-input"
            placeholder="搜索任务、项目、成员..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button className="mm-search-clear" onClick={() => setQuery('')}>
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* 搜索类型筛选 */}
      <div className="mm-search-types">
        {[
          { type: 'all', label: '全部' },
          { type: 'tasks', label: '任务' },
          { type: 'projects', label: '项目' },
          { type: 'members', label: '成员' },
        ].map((item) => (
          <button
            key={item.type}
            className={`mm-search-type-btn ${searchType === item.type ? 'active' : ''}`}
            onClick={() => setSearchType(item.type as SearchType)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* 搜索内容 */}
      <div className="mm-search-content">
        {!hasSearched && query.length < 2 ? (
          // 显示搜索历史
          history.length > 0 ? (
            <div>
              <div className="mm-search-history-header">
                <span>搜索历史</span>
                <button onClick={clearHistory}>清除</button>
              </div>
              <div className="mm-search-history-list">
                {history.map((term, index) => (
                  <button
                    key={index}
                    className="mm-search-history-item"
                    onClick={() => setQuery(term)}
                  >
                    <Clock size={14} />
                    <span>{term}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mm-search-empty">
              <Search size={32} style={{ color: 'var(--min-text-muted)', marginBottom: 16 }} />
              <div className="mm-empty-title">输入关键词开始搜索</div>
            </div>
          )
        ) : loading ? (
          <div className="mm-loading" style={{ marginTop: 60 }}>
            <Loader2 size={24} className="mm-spinner-icon" />
            <span>搜索中...</span>
          </div>
        ) : results.length === 0 ? (
          <div className="mm-search-empty">
            <Search size={48} style={{ color: 'var(--min-text-muted)', marginBottom: 16 }} />
            <div className="mm-empty-title">未找到结果</div>
            <div className="mm-empty-desc">换个关键词试试</div>
          </div>
        ) : (
          <div className="mm-search-results">
            {results.map((result) => (
              <div
                key={`${result.type}-${result.id}`}
                className="mm-search-result-item"
                onClick={() => handleResultClick(result)}
              >
                <div className={`mm-search-result-icon mm-icon-${result.type}`}>
                  {getResultIcon(result.type)}
                </div>
                <div className="mm-search-result-content">
                  <div className="mm-search-result-title">{result.title}</div>
                  {result.subtitle && (
                    <div className="mm-search-result-subtitle">{result.subtitle}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}










