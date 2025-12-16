import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './hooks/useTheme';
import { PermissionsProvider } from './hooks/usePermissions';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import AppLayout from './components/AppLayout';

// 页面组件
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import MyTasks from './pages/MyTasks';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import TaskDetail from './pages/TaskDetail';
import MembersTree from './pages/admin/MembersTree';
import ProjectsTree from './pages/admin/ProjectsTree';
import MembersManage from './pages/admin/MembersManage';
import AiInsights from './pages/AiInsights';
import Settings from './pages/Settings';
import Reports from './pages/Reports';

/**
 * 应用主组件
 * 定义路由结构，带主题系统、权限控制和路由守卫
 */
function App() {
  return (
    <ThemeProvider>
      <Routes>
        {/* 登录页面（无需认证，不使用 AppLayout） */}
        <Route path="/login" element={<Login />} />

        {/* 受保护的路由（使用 AppLayout + Outlet） */}
        <Route
          element={
            <ProtectedRoute>
              <PermissionsProvider>
                <AppLayout />
              </PermissionsProvider>
            </ProtectedRoute>
          }
        >
          {/* 默认重定向到 Dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          {/* 主要页面 */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/my-tasks" element={<MyTasks />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/tasks/:id" element={<TaskDetail />} />
          
          {/* 设置页面 */}
          <Route path="/settings" element={<Settings />} />
          
          {/* 工作日报 */}
          <Route path="/work-reports" element={<WorkReports />} />
          
          {/* Admin 页面 - 需要管理员权限 */}
          <Route 
            path="/admin/members" 
            element={
              <AdminRoute permission="invite">
                <MembersManage />
              </AdminRoute>
            } 
          />
          <Route 
            path="/admin/members-tree" 
            element={
              <AdminRoute permission="adminTree">
                <MembersTree />
              </AdminRoute>
            } 
          />
          <Route 
            path="/admin/projects-tree" 
            element={
              <AdminRoute permission="adminTree">
                <ProjectsTree />
              </AdminRoute>
            } 
          />
          <Route 
            path="/reports" 
            element={
              <AdminRoute permission="adminTree">
                <Reports />
              </AdminRoute>
            } 
          />
          
          {/* AI 页面 - 需要 AI 分析权限 */}
          <Route 
            path="/ai-insights" 
            element={
              <AdminRoute permission="aiGlobalAnalysis">
                <AiInsights />
              </AdminRoute>
            } 
          />
          
          {/* 404 - 重定向到 Dashboard */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </ThemeProvider>
  );
}

export default App;
