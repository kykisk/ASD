import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  LogoutOutlined,
  RobotOutlined,
  FileTextOutlined,
  MonitorOutlined,
  AuditOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { LoginPage } from './pages/LoginPage';
import { UsersPage } from './pages/UsersPage';
import { AiSettingsPage } from './pages/AiSettingsPage';
import { AiFeatureConfigPage } from './pages/AiFeatureConfigPage';
import { FamilyTierPage } from './pages/FamilyTierPage';
import { QuestionnairesManagementPage } from './pages/QuestionnairesManagementPage';
import { MonitoringPage } from './pages/MonitoringPage';
import { AuditLogPage } from './pages/AuditLogPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAdminAuthStore } from './stores/auth.store';

const { Sider, Content, Header } = Layout;

const MENU_ITEMS = [
  { key: 'dashboard', icon: <DashboardOutlined />, label: '대시보드' },
  { key: 'users', icon: <UserOutlined />, label: '사용자 관리' },
  { key: 'family-tier', icon: <TeamOutlined />, label: '가족 AI 관리' },
  { key: 'ai-settings', icon: <RobotOutlined />, label: 'AI 프로바이더 설정' },
  { key: 'ai-feature-config', icon: <RobotOutlined />, label: '기능별 AI 설정' },
  { key: 'questionnaires', icon: <FileTextOutlined />, label: '질문지 관리' },
  { key: 'monitoring', icon: <MonitorOutlined />, label: '모니터링' },
  { key: 'audit-logs', icon: <AuditOutlined />, label: '감사 로그' },
];

function getSelectedKey(pathname: string): string {
  if (pathname.startsWith('/users')) return 'users';
  if (pathname.startsWith('/family-tier')) return 'family-tier';
  if (pathname.startsWith('/ai-feature-config')) return 'ai-feature-config';
  if (pathname.startsWith('/ai-settings')) return 'ai-settings';
  if (pathname.startsWith('/questionnaires')) return 'questionnaires';
  if (pathname.startsWith('/monitoring')) return 'monitoring';
  if (pathname.startsWith('/audit-logs')) return 'audit-logs';
  return 'dashboard';
}

function AdminLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, clearAuth } = useAdminAuthStore();

  const selectedKey = getSelectedKey(location.pathname);

  const handleMenuClick = ({ key }: { key: string }) => {
    if (key === 'logout') {
      clearAuth();
      navigate('/login');
      return;
    }
    navigate(`/${key}`);
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider theme="light" width={240}>
        <div style={{ padding: '16px', textAlign: 'center', fontWeight: 'bold', fontSize: '18px', color: '#14b8a6' }}>
          AutiCare Admin
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          onClick={handleMenuClick}
          items={MENU_ITEMS}
        />
        <div style={{ position: 'absolute', bottom: 0, width: '100%', borderTop: '1px solid #f0f0f0' }}>
          <Menu
            mode="inline"
            selectable={false}
            onClick={handleMenuClick}
            items={[
              { key: 'logout', icon: <LogoutOutlined />, label: '로그아웃' },
            ]}
          />
        </div>
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 500 }}>관리자 패널</span>
          {user && <span style={{ color: '#64748b', fontSize: '14px' }}>{user.name}</span>}
        </Header>
        <Content style={{ margin: '24px', padding: '24px', background: '#fff', borderRadius: '8px' }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}

function AdminDashboard() {
  return (
    <div>
      <h1>관리자 대시보드</h1>
      <p>시스템 현황이 여기에 표시됩니다.</p>
    </div>
  );
}

function ProtectedPage({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <AdminLayout>{children}</AdminLayout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={<ProtectedPage><AdminDashboard /></ProtectedPage>} />
      <Route path="/users" element={<ProtectedPage><UsersPage /></ProtectedPage>} />
      <Route path="/family-tier" element={<ProtectedPage><FamilyTierPage /></ProtectedPage>} />
      <Route path="/ai-settings" element={<ProtectedPage><AiSettingsPage /></ProtectedPage>} />
      <Route path="/ai-feature-config" element={<ProtectedPage><AiFeatureConfigPage /></ProtectedPage>} />
      <Route path="/questionnaires" element={<ProtectedPage><QuestionnairesManagementPage /></ProtectedPage>} />
      <Route path="/monitoring" element={<ProtectedPage><MonitoringPage /></ProtectedPage>} />
      <Route path="/audit-logs" element={<ProtectedPage><AuditLogPage /></ProtectedPage>} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
