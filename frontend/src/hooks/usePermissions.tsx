import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { workspaceService, Workspace } from '../services/workspace';
import { 
  WorkspaceRole, 
  hasWorkspacePermission, 
  hasProjectPermission,
  PERMISSIONS 
} from '../config/permissions';

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
  
  // 当前工作区角色
  workspaceRole: WorkspaceRole | undefined;
  
  // 项目负责人标记缓存
  projectLeaders: Record<string, boolean>;
  setProjectLeader: (projectId: string, isLeader: boolean) => void;
  
  // 权限检查方法
  canWorkspace: (permission: keyof typeof PERMISSIONS.workspace) => boolean;
  canProject: (projectId: string, isLeader: boolean, permission: string) => boolean;
  
  // 是否是管理员（用于显示管理菜单）
  isAdmin: boolean;
  
  // 刷新工作区数据
  refreshWorkspaces: () => Promise<void>;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const [workspaces, setWorkspaces] = useState<WorkspaceWithRole[]>([]);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(true);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string>('');
  const [projectLeaders, setProjectLeaders] = useState<Record<string, boolean>>({});

  // 加载工作区列表
  const loadWorkspaces = async () => {
    setLoadingWorkspaces(true);
    try {
      const data = await workspaceService.getWorkspaces();
      const workspacesWithRole = data.map(ws => ({
        ...ws,
        role: (ws as any).role || 'member',
      })) as WorkspaceWithRole[];
      
      setWorkspaces(workspacesWithRole);
      
      // 如果没有选中工作区，选择第一个
      if (!currentWorkspaceId && workspacesWithRole.length > 0) {
        setCurrentWorkspaceId(workspacesWithRole[0].id);
      }
    } catch (err) {
      console.error('Failed to load workspaces:', err);
    } finally {
      setLoadingWorkspaces(false);
    }
  };

  useEffect(() => {
    loadWorkspaces();
  }, []);

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

  // 设置项目负责人标记
  const setProjectLeader = (projectId: string, isLeader: boolean) => {
    setProjectLeaders(prev => ({ ...prev, [projectId]: isLeader }));
  };

  // 设置当前工作区（接受完整工作区对象）
  const setCurrentWorkspace = (workspace: WorkspaceWithRole) => {
    setCurrentWorkspaceId(workspace.id);
  };

  return (
    <PermissionsContext.Provider
      value={{
        currentWorkspace,
        setCurrentWorkspaceId,
        setCurrentWorkspace,
        workspaces,
        loadingWorkspaces,
        workspaceRole,
        projectLeaders,
        setProjectLeader,
        canWorkspace,
        canProject,
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

