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
  Button,
  Modal,
  Dropdown,
  Alert,
} from 'antd';
import { SearchOutlined, MoreOutlined, KeyOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  useAdminUsers,
  useUpdateUserRole,
  useToggleUserStatus,
  type AdminUser,
  type UserRole,
  type UserStatus,
} from '../hooks/use-admin-users';
import { useDeleteUser, useIssueTempPassword } from '../hooks/use-admin-ops';

/** 이 패턴의 이메일은 테스트 계정 (서버 TEST_ACCOUNT_PATTERN 과 같음) */
const TEST_ACCOUNT = /^qa-.*@example\.com$/;

const { Text, Paragraph } = Typography;

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
  const { message, modal } = App.useApp();

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
  const issueTemp = useIssueTempPassword();
  const deleteUser = useDeleteUser();
  const [tempResult, setTempResult] = useState<{ email: string; tempPassword: string } | null>(
    null,
  );
  const [deleting, setDeleting] = useState<AdminUser | null>(null);
  const [confirmEmail, setConfirmEmail] = useState('');

  const handleTempPassword = useCallback(
    (user: AdminUser) => {
      modal.confirm({
        title: '임시 비밀번호를 발급할까요?',
        content: `${user.name} (${user.email}) 님의 지금 비밀번호는 더 이상 쓸 수 없고, 로그인된 기기에서도 로그아웃돼요. 임시 비밀번호로 로그인하면 새 비밀번호를 정하는 화면이 나와요.`,
        okText: '발급',
        cancelText: '취소',
        onOk: async () => {
          try {
            setTempResult(await issueTemp.mutateAsync(user.id));
          } catch {
            message.error('발급하지 못했습니다. 다시 시도해주세요.');
          }
        },
      });
    },
    [issueTemp, message, modal],
  );

  const handleDelete = useCallback(async () => {
    if (!deleting) return;
    try {
      const r = await deleteUser.mutateAsync({ userId: deleting.id, confirmEmail });
      message.success(
        `${r.email} 계정을 삭제했어요${r.deletedFamilies ? ` (가족 ${r.deletedFamilies}곳 · 아이 ${r.deletedChildren}명 함께)` : ''}`,
      );
      setDeleting(null);
      setConfirmEmail('');
    } catch (err: any) {
      message.error(err?.response?.data?.error?.message ?? '삭제하지 못했습니다.');
    }
  }, [deleting, confirmEmail, deleteUser, message]);

  const handleRoleChange = useCallback(
    async (userId: string, role: UserRole) => {
      try {
        await updateRole.mutateAsync({ userId, role });
        message.success('역할이 변경되었습니다.');
      } catch {
        message.error('역할을 바꾸지 못했습니다. 다시 시도해주세요.');
      }
    },
    [updateRole, message],
  );

  const handleStatusToggle = useCallback(
    (user: AdminUser, active: boolean) => {
      modal.confirm({
        title: active ? '계정을 활성화할까요?' : '계정을 비활성화할까요?',
        content: active
          ? `${user.name} (${user.email}) 님이 다시 로그인할 수 있게 됩니다.`
          : `${user.name} (${user.email}) 님은 더 이상 로그인할 수 없습니다.`,
        okText: active ? '활성화' : '비활성화',
        okButtonProps: { danger: !active },
        cancelText: '취소',
        onOk: async () => {
          try {
            await toggleStatus.mutateAsync({ userId: user.id, isActive: active });
            message.success(active ? '계정이 활성화되었습니다.' : '계정이 비활성화되었습니다.');
          } catch {
            message.error('상태를 바꾸지 못했습니다. 다시 시도해주세요.');
          }
        },
      });
    },
    [toggleStatus, message, modal],
  );

  const columns: ColumnsType<AdminUser> = [
    {
      title: '이메일',
      dataIndex: 'email',
      key: 'email',
      ellipsis: true,
      width: 260,
      render: (email: string) => (
        <span>
          {email} {TEST_ACCOUNT.test(email) && <Tag style={{ marginLeft: 4 }}>테스트</Tag>}
        </span>
      ),
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
      dataIndex: 'isActive',
      key: 'isActive',
      width: 90,
      render: (isActive: boolean, record) => (
        <Switch
          checked={isActive}
          size="small"
          onChange={(checked) => handleStatusToggle(record, checked)}
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
      title: '',
      key: 'actions',
      width: 60,
      align: 'center',
      render: (_, record) =>
        record.role === 'SYSTEM_ADMIN' ? null : (
          <Dropdown
            trigger={['click']}
            menu={{
              items: [
                { key: 'temp', icon: <KeyOutlined />, label: '임시 비밀번호 발급' },
                { type: 'divider' },
                { key: 'delete', icon: <DeleteOutlined />, label: '계정 삭제', danger: true },
              ],
              onClick: ({ key }) => {
                if (key === 'temp') handleTempPassword(record);
                if (key === 'delete') {
                  setConfirmEmail('');
                  setDeleting(record);
                }
              },
            }}
          >
            <Button type="text" size="small" icon={<MoreOutlined />} aria-label="계정 작업" />
          </Dropdown>
        ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
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
          <Button
            onClick={() => {
              setSearch('qa-');
              setPage(1);
            }}
          >
            테스트 계정만 보기
          </Button>
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

      <Modal
        open={!!tempResult}
        title="임시 비밀번호"
        onCancel={() => setTempResult(null)}
        footer={
          <Button type="primary" onClick={() => setTempResult(null)}>
            확인했어요
          </Button>
        }
      >
        {tempResult && (
          <>
            <Paragraph>
              <Text strong>{tempResult.email}</Text> 님에게 아래 비밀번호를 전해주세요. 이 창을
              닫으면 다시 볼 수 없어요.
            </Paragraph>
            <Paragraph
              copyable={{ text: tempResult.tempPassword }}
              style={{
                fontFamily: 'monospace',
                fontSize: 18,
                background: '#F8FAFC',
                padding: '10px 14px',
                borderRadius: 8,
              }}
            >
              {tempResult.tempPassword}
            </Paragraph>
            <Text type="secondary">처음 로그인하면 새 비밀번호를 정하는 화면이 나와요.</Text>
          </>
        )}
      </Modal>

      <Modal
        open={!!deleting}
        title="계정 삭제"
        okText="영구 삭제"
        okButtonProps={{
          danger: true,
          disabled: !deleting || confirmEmail.trim().toLowerCase() !== deleting.email.toLowerCase(),
        }}
        confirmLoading={deleteUser.isPending}
        cancelText="취소"
        onOk={handleDelete}
        onCancel={() => setDeleting(null)}
      >
        {deleting && (
          <>
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 12 }}
              title="되돌릴 수 없어요"
              description="계정과 함께, 이 사람만 있는 가족과 그 가족의 아이 · 기록 · 커리큘럼이 모두 지워져요. 다른 가족 구성원이 있는 가족은 남아요."
            />
            <Paragraph>
              확인을 위해 이메일 <Text code>{deleting.email}</Text> 을(를) 그대로 입력하세요.
            </Paragraph>
            <Input
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              placeholder={deleting.email}
              autoFocus
            />
          </>
        )}
      </Modal>

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
