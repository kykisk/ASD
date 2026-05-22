import { useState, useCallback } from 'react';
import {
  Table,
  Input,
  Select,
  Tag,
  Switch,
  Space,
  Typography,
  App,
  Tooltip,
} from 'antd';
import { EyeOutlined, SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  useAdminUsers,
  useUpdateUserRole,
  useToggleUserStatus,
  type AdminUser,
  type UserRole,
  type UserStatus,
} from '../hooks/use-admin-users';

const { Title } = Typography;

const ROLE_LABELS: Record<UserRole, string> = {
  SYSTEM_ADMIN: '시스템 관리자',
  FAMILY_ADMIN: '가족 관리자',
  FAMILY_MEMBER: '가족 구성원',
  THERAPIST: '치료사',
};

const ROLE_COLORS: Record<UserRole, string> = {
  SYSTEM_ADMIN: 'red',
  FAMILY_ADMIN: 'blue',
  FAMILY_MEMBER: 'green',
  THERAPIST: 'purple',
};

function formatDate(iso: string | null): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function UsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<UserStatus | 'ALL'>('ALL');
  const { message } = App.useApp();

  const { data: usersData, isLoading } = useAdminUsers({
    page,
    search: search || undefined,
    role: roleFilter !== 'ALL' ? roleFilter : undefined,
    status: statusFilter !== 'ALL' ? statusFilter : undefined,
  });
  const users = usersData?.data ?? [];
  const total = usersData?.meta?.total ?? 0;
  const updateRole = useUpdateUserRole();
  const toggleStatus = useToggleUserStatus();

  const handleRoleChange = useCallback(
    async (userId: string, role: UserRole) => {
      updateRole.mutate({ userId, role });
      message.success('역할이 변경되었습니다.');
    },
    [updateRole],
  );

  const handleStatusToggle = useCallback(
    async (userId: string, active: boolean) => {
      toggleStatus.mutate({ userId, isActive: active });
      message.success(active ? '계정이 활성화되었습니다.' : '계정이 비활성화되었습니다.');
    },
    [toggleStatus],
  );

  const columns: ColumnsType<AdminUser> = [
    {
      title: '이메일',
      dataIndex: 'email',
      key: 'email',
      ellipsis: true,
      width: 220,
    },
    {
      title: '이름',
      dataIndex: 'name',
      key: 'name',
      width: 100,
    },
    {
      title: '역할',
      dataIndex: 'role',
      key: 'role',
      width: 160,
      render: (role: UserRole, record) => (
        <Select
          value={role}
          size="small"
          style={{ width: 140 }}
          onChange={(value) => handleRoleChange(record.id, value)}
          disabled={role === 'SYSTEM_ADMIN'}
          options={[
            { value: 'FAMILY_ADMIN', label: '가족 관리자' },
            { value: 'FAMILY_MEMBER', label: '가족 구성원' },
            { value: 'THERAPIST', label: '치료사' },
          ]}
        />
      ),
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (status: UserStatus, record) => (
        <Switch
          checked={status === 'active'}
          size="small"
          onChange={(checked) => handleStatusToggle(record.id, checked)}
          disabled={record.role === 'SYSTEM_ADMIN'}
        />
      ),
    },
    {
      title: '가입일',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: formatDate,
    },
    {
      title: '최근 로그인',
      dataIndex: 'lastLoginAt',
      key: 'lastLoginAt',
      width: 160,
      render: formatDateTime,
    },
    {
      title: '액션',
      key: 'actions',
      width: 70,
      align: 'center',
      render: (_, record) => (
        <Tooltip title="상세 보기">
          <EyeOutlined
            style={{ fontSize: 16, color: '#14b8a6', cursor: 'pointer' }}
            onClick={() => message.info(`${record.name} 상세 페이지 (추후 구현)`)}
          />
        </Tooltip>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ marginBottom: 16 }}>
          사용자 관리
        </Title>
        <Space wrap size="middle">
          <Input
            placeholder="이메일 또는 이름 검색"
            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            style={{ width: 260 }}
            allowClear
          />
          <Select
            value={roleFilter}
            onChange={(value) => {
              setRoleFilter(value);
              setPage(1);
            }}
            style={{ width: 150 }}
            options={[
              { value: 'ALL', label: '전체 역할' },
              { value: 'SYSTEM_ADMIN', label: '시스템 관리자' },
              { value: 'FAMILY_ADMIN', label: '가족 관리자' },
              { value: 'FAMILY_MEMBER', label: '가족 구성원' },
              { value: 'THERAPIST', label: '치료사' },
            ]}
          />
          <Select
            value={statusFilter}
            onChange={(value) => {
              setStatusFilter(value);
              setPage(1);
            }}
            style={{ width: 120 }}
            options={[
              { value: 'ALL', label: '전체 상태' },
              { value: 'active', label: '활성' },
              { value: 'inactive', label: '비활성' },
            ]}
          />
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={users}
        rowKey="id"
        loading={isLoading}
        pagination={{
          current: page,
          pageSize: 20,
          total,
          onChange: setPage,
          showTotal: (t) => `총 ${t}명`,
          showSizeChanger: false,
        }}
        scroll={{ x: 900 }}
        size="middle"
        locale={{
          emptyText: '사용자가 없습니다.',
        }}
      />

      <div style={{ marginTop: 16 }}>
        <Space size="small" wrap>
          {Object.entries(ROLE_LABELS).map(([role, label]) => (
            <Tag key={role} color={ROLE_COLORS[role as UserRole]}>
              {label}
            </Tag>
          ))}
        </Space>
      </div>
    </div>
  );
}
