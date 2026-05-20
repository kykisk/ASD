import { useState, useMemo, useCallback } from 'react';

export type UserRole = 'SYSTEM_ADMIN' | 'FAMILY_ADMIN' | 'FAMILY_MEMBER' | 'THERAPIST';
export type UserStatus = 'active' | 'inactive';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface UseAdminUsersResult {
  users: AdminUser[];
  total: number;
  isLoading: boolean;
}

// Mock data: 20 sample Korean users
const MOCK_USERS: AdminUser[] = [
  { id: '1', email: 'admin@auticare.kr', name: '김관리', role: 'SYSTEM_ADMIN', status: 'active', createdAt: '2024-01-15T09:00:00Z', lastLoginAt: '2025-05-18T08:30:00Z' },
  { id: '2', email: 'park.jihye@gmail.com', name: '박지혜', role: 'FAMILY_ADMIN', status: 'active', createdAt: '2024-02-10T14:30:00Z', lastLoginAt: '2025-05-17T19:45:00Z' },
  { id: '3', email: 'lee.minho@naver.com', name: '이민호', role: 'FAMILY_MEMBER', status: 'active', createdAt: '2024-02-12T10:00:00Z', lastLoginAt: '2025-05-16T12:00:00Z' },
  { id: '4', email: 'choi.yuna@daum.net', name: '최유나', role: 'THERAPIST', status: 'active', createdAt: '2024-03-01T08:00:00Z', lastLoginAt: '2025-05-18T07:15:00Z' },
  { id: '5', email: 'jung.siwoo@gmail.com', name: '정시우', role: 'FAMILY_ADMIN', status: 'inactive', createdAt: '2024-03-05T11:20:00Z', lastLoginAt: '2025-03-10T16:00:00Z' },
  { id: '6', email: 'kim.soojin@naver.com', name: '김수진', role: 'FAMILY_MEMBER', status: 'active', createdAt: '2024-03-15T09:45:00Z', lastLoginAt: '2025-05-15T14:30:00Z' },
  { id: '7', email: 'oh.junhyuk@kakao.com', name: '오준혁', role: 'THERAPIST', status: 'active', createdAt: '2024-04-01T13:00:00Z', lastLoginAt: '2025-05-18T10:00:00Z' },
  { id: '8', email: 'han.soyeon@gmail.com', name: '한소연', role: 'FAMILY_ADMIN', status: 'active', createdAt: '2024-04-10T15:30:00Z', lastLoginAt: '2025-05-17T22:10:00Z' },
  { id: '9', email: 'yoon.dohyun@naver.com', name: '윤도현', role: 'FAMILY_MEMBER', status: 'inactive', createdAt: '2024-04-20T08:15:00Z', lastLoginAt: '2025-02-28T09:00:00Z' },
  { id: '10', email: 'seo.minji@daum.net', name: '서민지', role: 'THERAPIST', status: 'active', createdAt: '2024-05-01T10:00:00Z', lastLoginAt: '2025-05-18T06:45:00Z' },
  { id: '11', email: 'kang.hyunjoo@gmail.com', name: '강현주', role: 'FAMILY_ADMIN', status: 'active', createdAt: '2024-05-12T14:00:00Z', lastLoginAt: '2025-05-16T20:30:00Z' },
  { id: '12', email: 'shin.woojin@naver.com', name: '신우진', role: 'FAMILY_MEMBER', status: 'active', createdAt: '2024-06-01T09:30:00Z', lastLoginAt: '2025-05-17T11:20:00Z' },
  { id: '13', email: 'lim.hayoung@kakao.com', name: '임하영', role: 'THERAPIST', status: 'inactive', createdAt: '2024-06-15T16:00:00Z', lastLoginAt: '2025-01-15T13:00:00Z' },
  { id: '14', email: 'cho.sunghoon@gmail.com', name: '조성훈', role: 'FAMILY_ADMIN', status: 'active', createdAt: '2024-07-01T08:45:00Z', lastLoginAt: '2025-05-18T09:10:00Z' },
  { id: '15', email: 'baek.jieun@naver.com', name: '백지은', role: 'FAMILY_MEMBER', status: 'active', createdAt: '2024-07-10T12:00:00Z', lastLoginAt: '2025-05-14T17:45:00Z' },
  { id: '16', email: 'kwon.taehyung@daum.net', name: '권태형', role: 'THERAPIST', status: 'active', createdAt: '2024-08-01T10:30:00Z', lastLoginAt: '2025-05-17T15:00:00Z' },
  { id: '17', email: 'song.nayeon@gmail.com', name: '송나연', role: 'FAMILY_ADMIN', status: 'inactive', createdAt: '2024-08-20T14:15:00Z', lastLoginAt: '2025-04-01T08:30:00Z' },
  { id: '18', email: 'hwang.jinho@naver.com', name: '황진호', role: 'FAMILY_MEMBER', status: 'active', createdAt: '2024-09-05T09:00:00Z', lastLoginAt: '2025-05-18T11:30:00Z' },
  { id: '19', email: 'moon.seoha@kakao.com', name: '문서하', role: 'THERAPIST', status: 'active', createdAt: '2024-09-15T11:45:00Z', lastLoginAt: '2025-05-16T18:20:00Z' },
  { id: '20', email: 'na.youngmin@gmail.com', name: '나영민', role: 'FAMILY_MEMBER', status: 'inactive', createdAt: '2024-10-01T13:30:00Z', lastLoginAt: '2025-03-20T10:00:00Z' },
];

export function useAdminUsers(
  page: number,
  search: string,
  roleFilter: UserRole | 'ALL',
  statusFilter: UserStatus | 'ALL',
): UseAdminUsersResult {
  const filtered = useMemo(() => {
    let result = MOCK_USERS;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (u) => u.email.toLowerCase().includes(q) || u.name.toLowerCase().includes(q),
      );
    }

    if (roleFilter !== 'ALL') {
      result = result.filter((u) => u.role === roleFilter);
    }

    if (statusFilter !== 'ALL') {
      result = result.filter((u) => u.status === statusFilter);
    }

    return result;
  }, [search, roleFilter, statusFilter]);

  const pageSize = 20;
  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

  return {
    users: paginated,
    total: filtered.length,
    isLoading: false,
  };
}

export function useUpdateUserRole() {
  const [isLoading, setIsLoading] = useState(false);

  const mutate = useCallback(async (_userId: string, _role: UserRole) => {
    setIsLoading(true);
    // TODO: Replace with real API call
    // await adminApi.patch(`/admin/users/${userId}`, { role });
    await new Promise((resolve) => setTimeout(resolve, 500));
    setIsLoading(false);
  }, []);

  return { mutate, isLoading };
}

export function useToggleUserStatus() {
  const [isLoading, setIsLoading] = useState(false);

  const mutate = useCallback(async (_userId: string, _active: boolean) => {
    setIsLoading(true);
    // TODO: Replace with real API call
    // await adminApi.patch(`/admin/users/${userId}`, { status: active ? 'active' : 'inactive' });
    await new Promise((resolve) => setTimeout(resolve, 500));
    setIsLoading(false);
  }, []);

  return { mutate, isLoading };
}
