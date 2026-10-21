import { Modal, Form, Input, App } from 'antd';
import { adminApi } from '../services/api';

interface Props {
  open: boolean;
  onClose: () => void;
  /** 바꾸면 모든 세션이 끊기므로 다시 로그인하게 함 */
  onChanged: () => void;
}

interface FormValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const PASSWORD_RULES = [
  { required: true, message: '새 비밀번호를 입력해주세요' },
  { min: 8, message: '8자 이상이어야 합니다' },
  { pattern: /[A-Z]/, message: '대문자를 포함해주세요' },
  { pattern: /[a-z]/, message: '소문자를 포함해주세요' },
  { pattern: /[0-9]/, message: '숫자를 포함해주세요' },
  { pattern: /[^A-Za-z0-9]/, message: '특수문자를 포함해주세요' },
];

export function ChangePasswordModal({ open, onClose, onChanged }: Props) {
  const [form] = Form.useForm<FormValues>();
  const { message } = App.useApp();

  const handleOk = async () => {
    const values = await form.validateFields();
    try {
      await adminApi.post('/auth/change-password', {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      message.success('비밀번호를 바꿨습니다. 새 비밀번호로 다시 로그인해주세요.');
      form.resetFields();
      onChanged();
    } catch (err) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response
        ?.data?.error?.message;
      message.error(msg ?? '비밀번호를 바꾸지 못했습니다.');
    }
  };

  return (
    <Modal
      title="비밀번호 변경"
      open={open}
      onOk={handleOk}
      onCancel={() => {
        form.resetFields();
        onClose();
      }}
      okText="변경"
      cancelText="취소"
      destroyOnHidden
    >
      <Form form={form} layout="vertical" requiredMark={false}>
        <Form.Item
          label="현재 비밀번호"
          name="currentPassword"
          rules={[{ required: true, message: '현재 비밀번호를 입력해주세요' }]}
        >
          <Input.Password autoComplete="current-password" />
        </Form.Item>
        <Form.Item
          label="새 비밀번호"
          name="newPassword"
          rules={PASSWORD_RULES}
          extra="8자 이상, 대·소문자·숫자·특수문자 포함. 바꾸면 모든 기기에서 로그아웃됩니다."
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Form.Item
          label="새 비밀번호 확인"
          name="confirmPassword"
          dependencies={['newPassword']}
          rules={[
            { required: true, message: '한 번 더 입력해주세요' },
            ({ getFieldValue }) => ({
              validator: (_, value) =>
                !value || value === getFieldValue('newPassword')
                  ? Promise.resolve()
                  : Promise.reject(new Error('새 비밀번호와 같지 않습니다')),
            }),
          ]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
