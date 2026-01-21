import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Icons } from '../constants';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const [loadingProvider, setLoadingProvider] = useState<'kakao' | 'google' | null>(null);

  if (!isOpen) return null;

  const handleLogin = async (provider: 'kakao' | 'google') => {
    try {
      setLoadingProvider(provider);
      
      // Supabase OAuth 로그인 시도
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          // 중요: 배포 환경이라면 배포된 URL이, 로컬이라면 로컬 URL이 들어갑니다.
          redirectTo: window.location.origin,
          // 카카오의 경우 별도의 scope가 필요할 수 있습니다.
          queryParams: provider === 'kakao' ? {
            access_type: 'offline',
            prompt: 'consent',
          } : undefined
        }
      });

      if (error) throw error;
      
      // 성공 시 브라우저가 공급자(카카오/구글) 페이지로 이동하므로 
      // 이후 로직은 필요하지 않으나 모달은 닫아줍니다.
      onClose();
    } catch (error: any) {
      console.error('Login Error:', error);
      alert('로그인 시도 중 오류가 발생했습니다. Supabase 대시보드 설정을 확인해주세요.\n' + error.message);
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
        <div className="p-8 pb-12">
          {/* 로고 영역 */}
          <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-6">
            <Icons.LogIn className="text-tossBlue" size={28} />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2 leading-tight">
            간편하게 로그인하고<br />팝업 소식을 받아보세요
          </h2>
          <p className="text-gray-500 mb-10 text-[15px]">
            가고 싶은 팝업을 저장하고 알림을 받을 수 있어요.
          </p>

          <div className="space-y-3">
            {/* 카카오 로그인 버튼 */}
            <button 
              onClick={() => handleLogin('kakao')}
              disabled={!!loadingProvider}
              className={`w-full flex items-center justify-center gap-3 bg-[#FEE500] text-gray-900 py-4 rounded-2xl font-bold transition-all active:scale-[0.98] ${
                loadingProvider === 'kakao' ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'
              }`}
            >
              {loadingProvider === 'kakao' ? (
                <div className="w-5 h-5 border-2 border-gray-900/30 border-t-gray-900 rounded-full animate-spin" />
              ) : (
                <img src="https://developers.kakao.com/assets/img/about/logos/kakaotalksharing/kakaolink_btn_medium.png" className="w-5 h-5" alt="Kakao" />
              )}
              카카오로 시작하기
            </button>
            
            {/* 구글 로그인 버튼 */}
            <button 
              onClick={() => handleLogin('google')}
              disabled={!!loadingProvider}
              className={`w-full flex items-center justify-center gap-3 bg-white border border-gray-200 text-gray-700 py-4 rounded-2xl font-bold transition-all active:scale-[0.98] ${
                loadingProvider === 'google' ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'
              }`}
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
