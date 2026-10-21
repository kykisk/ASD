import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Layout, Menu, Dropdown } from 'antd';
import {
  DashboardOutlined,
  TeamOutlined,
  LogoutOutlined,
  RobotOutlined,
  FileTextOutlined,
  ScheduleOutlined,
  AuditOutlined,
  SafetyCertificateOutlined,
  KeyOutlined,
  DownOutlined,
  ReadOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { LoginPage } from './pages/LoginPage';
import { OverviewPage } from './pages/OverviewPage';
import { UsersFamiliesPage } from './pages/UsersFamiliesPage';
import { AiPage } from './pages/AiPage';
import { JobsPage } from './pages/JobsPage';
import { ResearchPage } from './pages/ResearchPage';
import { QuestionnairesManagementPage } from './pages/QuestionnairesManagementPage';
import { AuditLogPage } from './pages/AuditLogPage';
import { LicenseManagementPage } from './pages/LicenseManagementPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAdminAuthStore } from './stores/auth.store';
import { adminApi } from './services/api';
import { ChangePasswordModal } from './components/ChangePasswordModal';

const { Sider, Content, Header } = Layout;

const MENU_ITEMS: MenuProps['items'] = [
  { key: 'overview', icon: <DashboardOutlined />, label: '운영 현황' },
  { key: 'users', icon: <TeamOutlined />, label: '사용자 · 가족' },
  { key: 'ai', icon: <RobotOutlined />, label: 'AI' },
  { key: 'jobs', icon: <ScheduleOutlined />, label: '자동 작업' },
  {
    type: 'group',
    label: '콘텐츠',
    children: [
      { key: 'research', icon: <ReadOutlined />, label: '논문' },
      { key: 'questionnaires', icon: <FileTextOutlined />, label: '질문지' },
      { key: 'licenses', icon: <SafetyCertificateOutlined />, label: '라이선스' },
    ],
  },
  {
    type: 'group',
    label: '기록',
    children: [{ key: 'audit-logs', icon: <AuditOutlined />, label: '감사 로그' }],
  },
];

const PAGE_KEYS = ['users', 'ai', 'jobs', 'research', 'questionnaires', 'licenses', 'audit-logs'];

function getSelectedKey(pathname: string): string {
  return PAGE_KEYS.find((k) => pathname.startsWith(`/${k}`)) ?? 'overview';
}

function AdminLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, clearAuth } = useAdminAuthStore();
  const [passwordOpen, setPasswordOpen] = useState(false);

  const selectedKey = getSelectedKey(location.pathname);

  const signOut = () => {
    clearAuth();
    navigate('/login');
  };

  const handleMenuClick = ({ key }: { key: string }) => {
    if (key === 'logout') {
      // 서버의 로그인 토큰도 폐기 (실패해도 이 기기에서는 로그아웃)
      adminApi
        .post('/auth/logout')
        .catch(() => undefined)
        .finally(signOut);
      return;
    }
    if (key === 'change-password') {
      setPasswordOpen(true);
      return;
    }
    navigate(`/${key}`);
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider theme="light" width={240}>
        <div
          style={{
            padding: '16px',
            textAlign: 'center',
            fontWeight: 'bold',
            fontSize: '18px',
            color: '#14b8a6',
          }}
        >
          AutiCare Admin
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          onClick={handleMenuClick}
          items={MENU_ITEMS}
        />
        <div
          style={{ position: 'absolute', bottom: 0, width: '100%', borderTop: '1px solid #f0f0f0' }}
        >
          <Menu
            mode="inline"
            selectable={false}
            onClick={handleMenuClick}
            items={[{ key: 'logout', icon: <LogoutOutlined />, label: '로그아웃' }]}
          />
        </div>
      </Sider>
      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            borderBottom: '1px solid #f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontWeight: 500 }}>관리자 패널</span>
          {user && (
            <Dropdown
              menu={{
                onClick: handleMenuClick,
                items: [
                  { key: 'change-password', icon: <KeyOutlined />, label: '비밀번호 변경' },
                  { key: 'logout', icon: <LogoutOutlined />, label: '로그아웃' },
                ],
              }}
              trigger={['click']}
            >
              <button
                type="button"
                style={{
                  color: '#475569',
                  fontSize: '14px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {user.name} <DownOutlined style={{ fontSize: 10 }} />
              </button>
            </Dropdown>
          )}
          <ChangePasswordModal
            open={passwordOpen}
            onClose={() => setPasswordOpen(false)}
            onChanged={() => {
              setPasswordOpen(false);
              signOut();
            }}
          />
        </Header>
        <Content
          style={{ margin: '24px', padding: '24px', background: '#fff', borderRadius: '8px' }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}

function ProtectedPage({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, setAuth, clearAuth } = useAdminAuthStore();
  const REFRESH_THRESHOLD = 5 * 60 * 1000;

  useEffect(() => {
    if (!isAuthenticated) return;
    const refresh = async () => {
      const { tokenExpiresAt: exp, user } = useAdminAuthStore.getState();
      if (!exp || exp - Date.now() > REFRESH_THRESHOLD) return;
      try {
        const { data } = await axios.post(
          `${import.meta.env.VITE_API_URL || '/v1'}/auth/refresh`,
          {},
          { withCredentials: true },
        );
        const newToken = data.data?.accessToken || data.accessToken;
        if (newToken && user) setAuth(newToken, user);
      } catch (_) {
        clearAuth();
        window.location.href = '/login';
      }
    };
    refresh();
    const interval = setInterval(refresh, 60 * 1000);
    return () => clearInterval(interval);
  }, [isAuthenticated, setAuth, clearAuth]);

  return (
    <ProtectedRoute>
      <AdminLayout>{children}</AdminLayout>
    </ProtectedRoute>
  );
}

const PAGES: Array<[string, React.ReactNode]> = [
  ['/overview', <OverviewPage />],
  ['/users', <UsersFamiliesPage />],
  ['/ai', <AiPage />],
  ['/jobs', <JobsPage />],
  ['/research', <ResearchPage />],
  ['/questionnaires', <QuestionnairesManagementPage />],
  ['/licenses', <LicenseManagementPage />],
  ['/audit-logs', <AuditLogPage />],
];

/** 예전 메뉴 주소 → 새 주소 (즐겨찾기 호환) */
const REDIRECTS: Array<[string, string]> = [
  ['/dashboard', '/overview'],
  ['/family-tier', '/users?tab=families'],
  ['/ai-settings', '/ai?tab=connections'],
  ['/ai-feature-config', '/ai'],
  ['/monitoring', '/jobs'],
];

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      {PAGES.map(([path, page]) => (
        <Route key={path} path={path} element={<ProtectedPage>{page}</ProtectedPage>} />
      ))}
      {REDIRECTS.map(([from, to]) => (
        <Route key={from} path={from} element={<Navigate to={to} replace />} />
      ))}
      <Route path="*" element={<Navigate to="/overview" replace />} />
    </Routes>
  );
}
