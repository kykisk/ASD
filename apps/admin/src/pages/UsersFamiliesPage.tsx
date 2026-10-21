import { useSearchParams } from 'react-router-dom';
import { Tabs, Typography } from 'antd';
import { UsersPage } from './UsersPage';
import { FamilyTierPage } from './FamilyTierPage';

const { Title } = Typography;

export function UsersFamiliesPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'families' ? 'families' : 'users';

  return (
    <div>
      <Title level={4} style={{ marginTop: 0 }}>
        사용자 · 가족
      </Title>
      <Tabs
        activeKey={tab}
        onChange={(k) => setParams(k === 'users' ? {} : { tab: k })}
        items={[
          { key: 'users', label: '사용자', children: <UsersPage /> },
          { key: 'families', label: '가족 · AI 사용 범위', children: <FamilyTierPage /> },
        ]}
      />
    </div>
  );
}
