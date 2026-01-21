import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Icons } from '../constants';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// 지원하는 로그인 공급자 타입 정의
type LoginProvider = 'kakao' | 'google' | 'naver' | 'toss';

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const [loadingProvider, setLoadingProvider] = useState<LoginProvider | null>(null);

  // --- 안전한 아이콘 참조 ---
  const LogInIcon = Icons?.LogIn || Icons?.User || (() => <span>🔑</span>);

  if (!isOpen) return null;

  const handleLogin = async (provider: LoginProvider) => {
    try {
      setLoadingProvider(provider);
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          // 배포 환경과 로컬 환경에 맞게 자동으로 리다이렉트
          redirectTo: window.location.origin,
          queryParams: provider === 'kakao' ? {
            access_type: 'offline',
            prompt: 'consent',
          } : undefined
        }
      });

      if (error) throw error;
      
      // OAuth 로그인은 페이지 이동이 일어나므로 닫기 처리를 미리 해줍니다.
      onClose();
    } catch (error: any) {
      console.error('Login Error:', error);
      alert(`${provider} 로그인 시도 중 오류가 발생했습니다. Supabase 설정을 확인해주세요.\n` + error.message);
    } finally {
      setLoadingProvider(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-end lg:items-center justify-center p-4">
      {/* 배경 오버레이 */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300" 
        onClick={onClose} 
      />
      
      {/* 모달 콘텐츠 */}
      <div className="relative w-full max-w-[400px] bg-white rounded-[32px] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10 duration-500">
        <div className="p-8 pb-10">
          {/* 로고 영역 */}
          <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-6">
            <LogInIcon className="text-blue-500" size={28} />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2 leading-tight">
            간편하게 로그인하고<br />팝업 소식을 받아보세요
          </h2>
          <p className="text-gray-500 mb-8 text-[15px]">
            가고 싶은 팝업을 저장하고 알림을 받을 수 있어요.
          </p>

          <div className="space-y-3">
            {/* 1. 토스 로그인 */}
            <button 
              onClick={() => handleLogin('toss')}
              disabled={!!loadingProvider}
              className="w-full flex items-center justify-center gap-3 bg-[#0050FF] text-white py-4 rounded-2xl font-bold transition-all active:scale-[0.98] hover:opacity-90 disabled:opacity-50"
            >
              {loadingProvider === 'toss' ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <img src="https://static.toss.im/assets/homepage/favicon-16x16.png" className="w-5 h-5 brightness-200" alt="Toss" />
              )}
              토스로 시작하기
            </button>

            {/* 2. 네이버 로그인 */}
            <button 
              onClick={() => handleLogin('naver')}
              disabled={!!loadingProvider}
              className="w-full flex items-center justify-center gap-3 bg-[#03C75A] text-white py-4 rounded-2xl font-bold transition-all active:scale-[0.98] hover:opacity-90 disabled:opacity-50"
            >
              {loadingProvider === 'naver' ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <img src="https://www.naver.com/favicon.ico" className="w-5 h-5" alt="Naver" />
              )}
              네이버로 시작하기
            </button>

            {/* 3. 카카오 로그인 (아이콘 수정 완료) */}
            <button 
              onClick={() => handleLogin('kakao')}
              disabled={!!loadingProvider}
              className="w-full flex items-center justify-center gap-3 bg-[#FEE500] text-gray-900 py-4 rounded-2xl font-bold transition-all active:scale-[0.98] hover:opacity-90 disabled:opacity-50"
            >
              {loadingProvider === 'kakao' ? (
                <div className="w-5 h-5 border-2 border-gray-900/30 border-t-gray-900 rounded-full animate-spin" />
              ) : (
                <img src="https://k.kakaocdn.net/14/dn/btroD9Wkh13/otjuxW0baAsxN9KAcpCAK1/o.jpg" className="w-5 h-5 rounded-full" alt="Kakao" />
              )}
              카카오로 시작하기
            </button>
            
            {/* 4. 구글 로그인 */}
            <button 
              onClick={() => handleLogin('google')}
              disabled={!!loadingProvider}
              className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 text-gray-700 py-4 rounded-2xl font-bold transition-all active:scale-[0.98] hover:bg-gray-50 disabled:opacity-50"
            >
              {loadingProvider === 'google' ? (
                <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
              ) : (
                <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
              )}
              Google로 시작하기
            </button>
          </div>
          
          <button 
            onClick={onClose} 
            disabled={!!loadingProvider}
            className="w-full mt-8 text-gray-400 font-medium text-sm hover:text-gray-600 transition-colors"
          >
            다음에 하기
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
