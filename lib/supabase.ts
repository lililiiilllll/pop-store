import { createClient } from '@supabase/supabase-js';
import { UserProfile, Task } from '../types';

// --- 1. 환경 변수 처리 (보안 및 유연성 강화) ---
const getEnv = (key: string) => {
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      return import.meta.env[key] || import.meta.env[`VITE_${key}`];
    }
  } catch (e) {}
  
  try {
    if (typeof process !== 'undefined' && process.env) {
      return process.env[key] || process.env[`VITE_${key}`];
    }
  } catch (e) {}

  return '';
};

// 깃허브 웹에서 수정할 내용
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 두 값이 없을 경우를 대비해 내보내기 전에 체크 (선택 사항이지만 권장)
if (!supabaseUrl || !supabaseKey) {
  console.warn("Supabase 환경 변수가 설정되지 않았습니다. 배포 설정(Vercel 등)을 확인하세요.");
}

export const supabase = createClient(supabaseUrl || '', supabaseKey || '');

// 나중에 삭제할 부분
const rawSupabaseUrl = getEnv('SUPABASE_URL');
const rawSupabaseKey = getEnv('SUPABASE_ANON_KEY');

// 하드코딩된 키는 환경 변수가 없을 때를 위한 Fallback으로 유지
const supabaseUrl = rawSupabaseUrl || 'https://rfnigedsfgnaqrsxjdaz.supabase.co';
const supabaseKey = rawSupabaseKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmbmlnZWRzZmduYXFyc3hqZGF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxODUxOTMsImV4cCI6MjA4Mzc2MTE5M30.JqGG--Zbbivx0MbSRqWDMU6aRdgHscz60ZQ2gzLXxos';

export const isSupabaseConfigured = !!supabaseUrl && !!supabaseKey;

export const supabase = createClient(supabaseUrl, supabaseKey);
//나중에 삭제할 부분


// --- 2. 신규 추가: 소셜 인증 API Functions ---

/**
 * 소셜 로그인 실행 (카카오, 네이버, 토스)
 * App.tsx의 handleKakaoLogin, handleNaverLogin 등에서 호출합니다.
 */
export const signInWithSocial = async (provider: 'kakao' | 'naver' | 'toss') => {
  if (!isSupabaseConfigured) return alert("Supabase 설정이 올바르지 않습니다.");

  const { error } = await supabase.auth.signInWithOAuth({
    provider: provider as any, // Supabase 공식 지원 외의 커스텀 제공자는 OAuth 설정 필요
    options: {
      redirectTo: window.location.origin, // 로그인 완료 후 돌아올 주소
      queryParams: { prompt: 'select_account' },
    },
  });

  if (error) {
    console.error(`${provider} 로그인 중 오류 발생:`, error.message);
    throw error;
  }
};

// --- 3. 기존 API Functions (100% 유지) ---

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
  // 먼저 좋아요 여부 확인
  const { data: existing } = await supabase
    .from('likes')
    .select('id')
    .eq('user_id', userId)
    .eq('store_id', storeId)
    .single();

  if (existing) {
    // 이미 좋아요 상태면 삭제
    const { error } = await supabase
      .from('likes')
      .delete()
      .eq('id', existing.id);
    return { liked: false, error };
  } else {
    // 좋아요 추가
    const { error } = await supabase
      .from('likes')
      .insert({ user_id: userId, store_id: storeId });
    return { liked: true, error };
  }
};

/**
 * 헬퍼: 현재 로그인한 세션 확인
 */
export const getCurrentSession = async () => {
  if (!isSupabaseConfigured) return null;
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) return null;
  return session;
};
