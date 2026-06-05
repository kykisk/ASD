import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../stores/auth.store';
import { useChildStore } from '../stores/child.store';
import { api } from '../services/api';

/**
 * 앱 진입 시 자동으로 유저/가족 데이터를 동기화합니다.
 * JWT의 familyId가 null이어도 DB에서 최신 데이터를 가져옵니다.
 * 로그아웃 없이 서버 재시작 후에도 데이터가 정상 표시됩니다.
 */
export function AppInitializer() {
  const { isAuthenticated, user, setAuth, clearAuth } = useAuthStore();
  const { selectedChildId, setSelectedChild } = useChildStore();
  const queryClient = useQueryClient();
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || initializedRef.current) return;
    initializedRef.current = true;

    const sync = async () => {
      try {
        // 1. 최신 유저 정보 가져오기
        const { data: meData } = await api.get('/users/me');
        const freshUser = meData.data;

        // 2. 가족 정보 가져오기 (JWT familyId가 null이어도 DB 조회)
        const { data: familiesData } = await api.get('/families/my');
        const families = familiesData.data as { id: string; name: string }[];
        const familyId = families[0]?.id ?? null;

        // 3. auth store 업데이트 (familyId 포함)
        const currentToken = useAuthStore.getState().accessToken;
        if (currentToken) {
          setAuth(currentToken, { ...freshUser, familyId });
        }

        // 4. 선택된 아이가 없으면 첫 번째 아이 자동 선택
        if (familyId && !selectedChildId) {
          const { data: childrenData } = await api.get(`/families/${familyId}/children`);
          const children = childrenData.data as { id: string }[];
          if (children.length > 0) {
            setSelectedChild(children[0].id);
          }
        }

        // 5. 전체 React Query 캐시 무효화 (서버 재시작 후 stale 데이터 제거)
        await queryClient.invalidateQueries();
      } catch {
        // 토큰 만료 등 오류 시 로그아웃
        clearAuth();
        queryClient.clear();
      }
    };

    sync();
  }, [isAuthenticated]);

  // 페이지 포커스 시 재동기화 (탭 전환 후 돌아왔을 때)
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleFocus = () => {
      queryClient.invalidateQueries();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isAuthenticated]);

  return null;
}
