import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { workspaceService, Workspace } from '../services/workspace';
import { 
  WorkspaceRole, 
  hasWorkspacePermission, 
  hasProjectPermission,
  PERMISSIONS 
} from '../config/permissions';
import { permissionService, WorkspacePermission, DEFAULT_ROLE_PERMISSIONS } from '../services/permission';

interface WorkspaceWithRole extends Workspace {
  role: WorkspaceRole;
}

interface PermissionsContextType {
  // 当前选中的工作区
  currentWorkspace: WorkspaceWithRole | null;
  setCurrentWorkspaceId: (id: string) => void;
  setCurrentWorkspace: (workspace: WorkspaceWithRole) => void;
  
  // 工作区列表（带角色）
  workspaces: WorkspaceWithRole[];
  loadingWorkspaces: boolean;
  loadError: string | null;
  
  // 当前工作区角色
  workspaceRole: WorkspaceRole | undefined;
  
  // 项目负责人标记缓存
  projectLeaders: Record<string, boolean>;
  setProjectLeader: (projectId: string, isLeader: boolean) => void;
  
  // 权限检查方法
  canWorkspace: (permission: keyof typeof PERMISSIONS.workspace) => boolean;
  canProject: (projectId: string, isLeader: boolean, permission: string) => boolean;
  
  // 自定义权限检查（群发消息、咖啡抽奖等）
  hasCustomPermission: (permission: WorkspacePermission) => boolean;
  customPermissions: WorkspacePermission[];
  
  // 是否是管理员（用于显示管理菜单）
  isAdmin: boolean;
  
  // 刷新工作区数据
  refreshWorkspaces: () => Promise<void>;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const [workspaces, setWorkspaces] = useState<WorkspaceWithRole[]>([]);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  // 从 localStorage 读取初始工作区ID，避免刷新后丢失
  const [currentWorkspaceId, setCurrentWorkspaceIdState] = useState<string>(() => {
    return localStorage.getItem('currentWorkspaceId') || '';
  });
  const [projectLeaders, setProjectLeaders] = useState<Record<string, boolean>>({});
  const [customPermissions, setCustomPermissions] = useState<WorkspacePermission[]>([]);

  // 加载工作区列表
  const loadWorkspaces = useCallback(async () => {
    setLoadingWorkspaces(true);
    setLoadError(null);
    try {
      const data = await workspaceService.getWorkspaces();
      const workspacesWithRole = data.map(ws => ({
        ...ws,
        role: ((ws as { role?: string }).role || 'member') as WorkspaceRole,
      })) as WorkspaceWithRole[];
      
      setWorkspaces(workspacesWithRole);
      
      // 验证当前工作区ID是否有效，无效则选择第一个
      setCurrentWorkspaceIdState(prev => {
        // 如果有之前的 ID，检查是否在新列表中存在
        if (prev) {
          const exists = workspacesWithRole.some(ws => ws.id === prev);
          if (exists) {
            return prev; // 保持当前选择
          }
        }
        // 没有有效的选择，选择第一个工作区
        if (workspacesWithRole.length > 0) {
          const firstId = workspacesWithRole[0].id;
          localStorage.setItem('currentWorkspaceId', firstId);
          return firstId;
        }
        return '';
      });
    } catch (err) {
      console.error('Failed to load workspaces:', err);
      setLoadError(err instanceof Error ? err.message : '加载工作区失败');
      // 不要在加载失败时清空工作区列表，保持之前的状态
    } finally {
      setLoadingWorkspaces(false);
    }
  }, []);

  // 加载当前用户的自定义权限
  const loadMyPermissions = useCallback(async (workspaceId: string) => {
    if (!workspaceId) return;
    try {
      const data = await permissionService.getMyPermissions(workspaceId);
      setCustomPermissions(data.permissions || []);
    } catch (err) {
      console.error('Failed to load my permissions:', err);
      // 加载失败时使用默认角色权限
      const workspace = workspaces.find(ws => ws.id === workspaceId);
      if (workspace?.role) {
        setCustomPermissions(DEFAULT_ROLE_PERMISSIONS[workspace.role] || []);
      }
    }
  }, [workspaces]);

  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  // 当工作区变化时，加载自定义权限
  useEffect(() => {
    if (currentWorkspaceId) {
      loadMyPermissions(currentWorkspaceId);
    }
  }, [currentWorkspaceId, loadMyPermissions]);

  // 当前工作区
  const currentWorkspace = workspaces.find(ws => ws.id === currentWorkspaceId) || null;
  const workspaceRole = currentWorkspace?.role;

  // 是否是管理员
  const isAdmin = hasWorkspacePermission(workspaceRole, 'adminTree');

  // 工作区权限检查
  const canWorkspace = (permission: keyof typeof PERMISSIONS.workspace) => {
    return hasWorkspacePermission(workspaceRole, permission);
  };

  // 项目权限检查
  const canProject = (_projectId: string, isLeader: boolean, permission: string) => {
    return hasProjectPermission(workspaceRole, isLeader, permission as any);
  };

  // 自定义权限检查
  const hasCustomPermission = useCallback((permission: WorkspacePermission): boolean => {
    // owner 拥有所有权限
    if (workspaceRole === 'owner') return true;
    // 检查自定义权限列表
    if (customPermissions.includes(permission)) return true;
    // 回退到默认角色权限
    const defaultPerms = DEFAULT_ROLE_PERMISSIONS[workspaceRole || 'observer'] || [];
    return defaultPerms.includes(permission);
  }, [workspaceRole, customPermissions]);

  // 设置项目负责人标记
  const setProjectLeader = (projectId: string, isLeader: boolean) => {
    setProjectLeaders(prev => ({ ...prev, [projectId]: isLeader }));
  };

  // 设置当前工作区 ID，同时保存到 localStorage
  const setCurrentWorkspaceId = (id: string) => {
    setCurrentWorkspaceIdState(id);
    if (id) {
      localStorage.setItem('currentWorkspaceId', id);
    } else {
      localStorage.removeItem('currentWorkspaceId');
    }
  };

  // 设置当前工作区（接受完整工作区对象）
  const setCurrentWorkspace = (workspace: WorkspaceWithRole) => {
    setCurrentWorkspaceIdState(workspace.id);
    localStorage.setItem('currentWorkspaceId', workspace.id);
  };

  return (
    <PermissionsContext.Provider
      value={{
        currentWorkspace,
        setCurrentWorkspaceId,
        setCurrentWorkspace,
        workspaces,
        loadingWorkspaces,
        loadError,
        workspaceRole,
        projectLeaders,
        setProjectLeader,
        canWorkspace,
        canProject,
        hasCustomPermission,
        customPermissions,
        isAdmin,
        refreshWorkspaces: loadWorkspaces,
      }}
    >
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionsProvider');
  }
  return context;
}

