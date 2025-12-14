import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { workspaceService, Workspace } from '../services/workspace';
import { 
  WorkspaceRole, 
  ProjectRole, 
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
  
  // 项目角色缓存
  projectRoles: Record<string, ProjectRole>;
  setProjectRole: (projectId: string, role: ProjectRole) => void;
  
  // 权限检查方法
  canWorkspace: (permission: keyof typeof PERMISSIONS.workspace) => boolean;
  canProject: (projectId: string, permission: keyof typeof PERMISSIONS.project) => boolean;
  
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
  const [projectRoles, setProjectRoles] = useState<Record<string, ProjectRole>>({});

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
  const canProject = (projectId: string, permission: keyof typeof PERMISSIONS.project) => {
    const role = projectRoles[projectId];
    return hasProjectPermission(role, permission);
  };

  // 设置项目角色
  const setProjectRole = (projectId: string, role: ProjectRole) => {
    setProjectRoles(prev => ({ ...prev, [projectId]: role }));
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
        projectRoles,
        setProjectRole,
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

