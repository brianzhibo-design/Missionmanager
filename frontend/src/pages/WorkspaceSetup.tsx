/**
 * 工作区设置页面
 * 新用户选择创建工作区或加入现有工作区
 */
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { workspaceService } from '../services/workspace';
import { useAuth } from '../hooks/useAuth';
import { 
  Building2, Users, Plus, Search, ArrowRight, CheckCircle2, 
  Clock, AlertCircle, Loader2
} from '../components/Icons';
import './WorkspaceSetup.css';

type Mode = 'select' | 'create' | 'join';

export default function WorkspaceSetup() {
  const [searchParams] = useSearchParams();
  const joinId = searchParams.get('join'); // 从 URL 获取工作区 ID

  const [mode, setMode] = useState<Mode>(joinId ? 'join' : 'select');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // 创建工作区
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceDesc, setWorkspaceDesc] = useState('');
  
  // 加入工作区
  const [workspaceId, setWorkspaceId] = useState(joinId || '');
  const [foundWorkspace, setFoundWorkspace] = useState<{ id: string; name: string; description: string | null } | null>(null);
  const [joinMessage, setJoinMessage] = useState('');
  const [searching, setSearching] = useState(false);
  
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  // 如果 URL 中有工作区 ID，自动搜索
  useEffect(() => {
    if (joinId) {
      handleSearchWorkspaceById(joinId);
    }
  }, [joinId]);

  const handleSearchWorkspaceById = async (id: string) => {
    setSearching(true);
    setError('');
    setFoundWorkspace(null);
    
    try {
      const workspace = await workspaceService.lookupWorkspace(id);
      if (workspace) {
        setFoundWorkspace(workspace);
      } else {
        setError('未找到该工作区，请检查链接是否正确');
      }
    } catch {
      setError('查找失败');
    } finally {
      setSearching(false);
    }
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceName.trim()) {
      setError('请输入工作区名称');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await workspaceService.createWorkspace(workspaceName.trim(), workspaceDesc.trim() || undefined);
      await refreshUser();
      navigate('/projects', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchWorkspace = async () => {
    if (!workspaceId.trim()) {
      setError('请输入工作区 ID');
      return;
    }
    await handleSearchWorkspaceById(workspaceId.trim());
  };

  const handleJoinRequest = async () => {
    if (!foundWorkspace) return;

    setLoading(true);
    setError('');
    try {
      await workspaceService.requestJoin(foundWorkspace.id, joinMessage.trim() || undefined);
      setSuccess('申请已提交！管理员审批后您将收到通知。');
      setFoundWorkspace(null);
      setWorkspaceId('');
      setJoinMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '申请失败');
    } finally {
      setLoading(false);
    }
  };

  const renderSelectMode = () => (
    <div className="setup-options">
      <div className="setup-option" onClick={() => setMode('create')}>
        <div className="option-icon create">
          <Plus size={32} />
        </div>
        <div className="option-content">
          <h3>创建新工作区</h3>
          <p>创建一个新的工作区，成为工作区创始人，邀请成员加入</p>
        </div>
        <ArrowRight size={20} className="option-arrow" />
      </div>

      <div className="setup-option" onClick={() => setMode('join')}>
        <div className="option-icon join">
          <Users size={32} />
        </div>
        <div className="option-content">
          <h3>加入现有工作区</h3>
          <p>通过工作区 ID 申请加入，等待管理员审批</p>
        </div>
        <ArrowRight size={20} className="option-arrow" />
      </div>
    </div>
  );

  const renderCreateMode = () => (
    <form className="setup-form" onSubmit={handleCreateWorkspace}>
      <button type="button" className="back-btn" onClick={() => setMode('select')}>
        ← 返回
      </button>
      
      <div className="form-header">
        <div className="form-icon create">
          <Building2 size={28} />
        </div>
        <h2>创建工作区</h2>
        <p>创建后您将成为工作区的创始人</p>
      </div>

      {error && <div className="error-message"><AlertCircle size={16} /> {error}</div>}

      <div className="form-group">
        <label>工作区名称 <span className="required">*</span></label>
        <input
          type="text"
          value={workspaceName}
          onChange={e => setWorkspaceName(e.target.value)}
          placeholder="例如：我的团队"
          maxLength={50}
          autoFocus
        />
      </div>

      <div className="form-group">
        <label>工作区描述</label>
        <textarea
          value={workspaceDesc}
          onChange={e => setWorkspaceDesc(e.target.value)}
          placeholder="简单介绍一下这个工作区..."
          rows={3}
          maxLength={200}
        />
      </div>

      <button type="submit" className="submit-btn" disabled={loading}>
        {loading ? <><Loader2 size={18} className="spin" /> 创建中...</> : '创建工作区'}
      </button>
    </form>
  );

  const renderJoinMode = () => (
    <div className="setup-form">
      <button type="button" className="back-btn" onClick={() => { setMode('select'); setFoundWorkspace(null); setSuccess(''); }}>
        ← 返回
      </button>
      
      <div className="form-header">
        <div className="form-icon join">
          <Users size={28} />
        </div>
        <h2>加入工作区</h2>
        <p>输入工作区 ID，向管理员发送加入申请</p>
      </div>

      {error && <div className="error-message"><AlertCircle size={16} /> {error}</div>}
      {success && <div className="success-message"><CheckCircle2 size={16} /> {success}</div>}

      {!foundWorkspace && !success && (
        <>
          <div className="form-group">
            <label>工作区 ID <span className="required">*</span></label>
            <div className="search-input-wrapper">
              <input
                type="text"
                value={workspaceId}
                onChange={e => setWorkspaceId(e.target.value)}
                placeholder="请输入工作区 ID"
                onKeyDown={e => e.key === 'Enter' && handleSearchWorkspace()}
              />
              <button 
                type="button" 
                className="search-btn"
                onClick={handleSearchWorkspace}
                disabled={searching}
              >
                {searching ? <Loader2 size={18} className="spin" /> : <Search size={18} />}
              </button>
            </div>
            <p className="form-hint">工作区 ID 可以向工作区管理员索取</p>
          </div>
        </>
      )}

      {foundWorkspace && (
        <div className="found-workspace">
          <div className="workspace-card">
            <Building2 size={24} />
            <div className="workspace-info">
              <h4>{foundWorkspace.name}</h4>
              {foundWorkspace.description && <p>{foundWorkspace.description}</p>}
              <span className="workspace-id">ID: {foundWorkspace.id}</span>
            </div>
          </div>

          <div className="form-group">
            <label>申请留言（可选）</label>
            <textarea
              value={joinMessage}
              onChange={e => setJoinMessage(e.target.value)}
              placeholder="向管理员说明您是谁..."
              rows={2}
              maxLength={200}
            />
          </div>

          <div className="action-buttons">
            <button 
              type="button" 
              className="cancel-btn"
              onClick={() => { setFoundWorkspace(null); setWorkspaceId(''); }}
            >
              取消
            </button>
            <button 
              type="button" 
              className="submit-btn"
              onClick={handleJoinRequest}
              disabled={loading}
            >
              {loading ? <><Loader2 size={18} className="spin" /> 提交中...</> : '发送申请'}
            </button>
          </div>
        </div>
      )}

      {success && (
        <div className="success-actions">
          <p className="success-hint">
            <Clock size={16} /> 申请状态：等待审批中
          </p>
          <button 
            type="button" 
            className="secondary-btn"
            onClick={() => { setSuccess(''); setMode('select'); }}
          >
            继续操作
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="workspace-setup-page">
      <div className="setup-container">
        <div className="setup-header">
          <div className="logo-icon"><Building2 size={32} /></div>
          <h1>欢迎使用 TaskFlow</h1>
          <p>选择创建新工作区或加入现有团队</p>
        </div>

        {mode === 'select' && renderSelectMode()}
        {mode === 'create' && renderCreateMode()}
        {mode === 'join' && renderJoinMode()}
      </div>
    </div>
  );
}








