import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Alert, Typography } from 'antd';
import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { adminApi } from '../services/api';
import { useAdminAuthStore } from '../stores/auth.store';

const { Title, Text } = Typography;

interface LoginFormValues {
  email: string;
  password: string;
}

interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

interface ApiErrorData {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export function LoginPage() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const { setAuth } = useAdminAuthStore();

  const loginMutation = useMutation({
    mutationFn: async (values: LoginFormValues) => {
      const { data } = await adminApi.post<{ success: true; data: AuthResponse }>(
        '/auth/login',
        values,
      );
      return data.data;
    },
    onSuccess: (data) => {
      if (data.user.role !== 'SYSTEM_ADMIN') {
        setErrorMessage('관리자 권한이 필요합니다.');
        return;
      }
      setAuth(data.accessToken, {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        role: 'SYSTEM_ADMIN',
      });
      navigate('/dashboard');
    },
    onError: (error: unknown) => {
      if (error instanceof AxiosError && error.response?.data) {
        const data = error.response.data as ApiErrorData;
        const code = data.error?.code;
        switch (code) {
          case 'AUTH_001':
            setErrorMessage('이메일 또는 비밀번호가 올바르지 않습니다.');
            break;
          case 'AUTH_003':
            setErrorMessage('계정이 비활성화되었습니다.');
            break;
          default:
            setErrorMessage(data.error?.message || '로그인 중 오류가 발생했습니다.');
        }
      } else {
        setErrorMessage('서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.');
      }
    },
  });

  const onFinish = (values: LoginFormValues) => {
    setErrorMessage(null);
    loginMutation.mutate(values);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f0fdfa 0%, #f8fafc 50%, #faf5ff 100%)',
        padding: '16px',
      }}
    >
      <div
        style={{
          background: '#fff',
          padding: '48px 40px',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '420px',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)',
          border: '1px solid #f1f5f9',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #2dd4bf, #0d9488)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
              boxShadow: '0 4px 12px rgba(20, 184, 166, 0.3)',
            }}
          >
            <LockOutlined style={{ fontSize: '20px', color: '#fff' }} />
          </div>
          <Title level={3} style={{ marginBottom: '4px', color: '#0f766e' }}>
            관리자 로그인
          </Title>
          <Text type="secondary">시스템 관리자만 로그인할 수 있습니다</Text>
        </div>

        {errorMessage && (
          <Alert
            message={errorMessage}
            type="error"
            showIcon
            closable
            onClose={() => setErrorMessage(null)}
            style={{ marginBottom: '24px' }}
          />
        )}

        <Form
          name="admin-login"
          onFinish={onFinish}
          layout="vertical"
          size="large"
          requiredMark={false}
        >
          <Form.Item
            name="email"
            label="이메일"
            rules={[
              { required: true, message: '이메일을 입력해주세요.' },
              { type: 'email', message: '올바른 이메일 형식이 아닙니다.' },
            ]}
          >
            <Input
              prefix={<MailOutlined style={{ color: '#94a3b8' }} />}
              placeholder="관리자 이메일"
              autoFocus
              autoComplete="email"
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="비밀번호"
            rules={[
              { required: true, message: '비밀번호를 입력해주세요.' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#94a3b8' }} />}
              placeholder="비밀번호"
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: '8px' }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loginMutation.isPending}
              block
              style={{
                height: '48px',
                fontWeight: 600,
                borderRadius: '8px',
              }}
            >
              로그인
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
}
