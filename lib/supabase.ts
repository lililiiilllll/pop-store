import { createClient } from '@supabase/supabase-js';
import { UserProfile } from '../types';

/**
 * --- 1. 설정 및 초기화 (보안 강화) ---
 * 깃허브 웹에서 직접 수정 시, 아래 변수들은 환경 변수에서 값을 읽어옵니다.
 * 실제 값은 Vercel이나 .env 파일에만 저장하세요.
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// 설정 여부 확인용 (내부 로직에서 사용)
export const isSupabaseConfigured = !!supabaseUrl && !!supabaseKey;

// 클라이언트 생성
export const supabase = createClient(supabaseUrl, supabaseKey);

// 설정이 누락되었을 때 콘솔에 경고 표시
if (!isSupabaseConfigured) {
  console.warn(
    "Supabase 환경 변수가 설정되지 않았습니다. .env 파일 혹은 배포 환경(Vercel 등)의 Settings > Environment Variables를 확인하세요."
  );
}

/**
 * --- 2. 소셜 인증 API Functions ---
 */

/**
 * 소셜 로그인 실행 (카카오, 네이버, 토스)
 */
export const signInWithSocial = async (provider: 'kakao' | 'naver' | 'toss') => {
  if (!isSupabaseConfigured) return alert("Supabase 설정이 올바르지 않습니다.");

  const { error } = await supabase.auth.signInWithOAuth({
    provider: provider as any,
    options: {
      redirectTo: window.location.origin, // 로그인 후 돌아올 주소
      queryParams: { prompt: 'select_account' },
    },
  });

  if (error) {
    console.error(`${provider} 로그인 중 오류 발생:`, error.message);
    throw error;
  }
};

/**
 * 로그아웃 함수 (추가 권장)
 */
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) console.error("로그아웃 오류:", error.message);
};

/**
 * --- 3. 기존 API Functions (유지 및 최적화) ---
 */

/**
 * 사용자 프로필 가져오기
 */
export const getProfile = async (userId: string) => {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    return data as UserProfile;
  } catch (err) {
    console.error('Unexpected error in getProfile:', err);
    return null;
  }
};

/**
 * 프로필 업데이트
 */
export const updateProfile = async (userId: string, updates: Partial<UserProfile>) => {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * 알림 목록 가져오기
 */
export const fetchNotifications = async (userId: string) => {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
  return data;
};

/**
 * 알림 읽음 처리
 */
export const markNotificationAsRead = async (notificationId: string) => {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);
  
  if (error) {
    console.error('Error marking notification as read:', error);
  }
};

/**
 * 팝업 스토어 목록 가져오기 (필터링 포함)
 */
export const fetchPopupStores = async (category?: string) => {
  if (!isSupabaseConfigured) return [];
  let query = supabase.from('popup_stores').select('*');

  if (category && category !== 'all') {
    query = query.eq('category', category);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching popup stores:', error);
    return [];
  }
  return data;
};

/**
 * 팝업 스토어 좋아요 토글
 */
export const toggleLikeStore = async (userId: string, storeId: string) => {
  if (!isSupabaseConfigured) return { liked: false, error: null };
  
  const { data: existing } = await supabase
    .from('likes')
    .select('id')
    .eq('user_id', userId)
    .eq('store_id', storeId)
    .single();

  if (existing) {
    const { error } = await supabase
      .from('likes')
      .delete()
      .eq('id', existing.id);
    return { liked: false, error };
  } else {
    const { error } = await supabase
      .from('likes')
      .insert({ user_id: userId, store_id: storeId });
    return { liked: true, error };
  }
};

/**
 * 현재 로그인한 세션 확인
 */
export const getCurrentSession = async () => {
  if (!isSupabaseConfigured) return null;
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) return null;
  return session;
};
