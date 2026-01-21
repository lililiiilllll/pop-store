import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Icons } from '../constants';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const [loadingProvider, setLoadingProvider] = useState<'kakao' | 'google' | null>(null);

  // --- 안전한 아이콘 참조 (Icons.LogIn이 없으면 기본 아이콘이나 텍스트 출력) ---
  const LogInIcon = Icons.LogIn || Icons.User || (() => <span>🔑</span>);

  if (!isOpen) return null;

  const handleLogin = async (provider: 'kakao' | 'google') => {
    try {
      setLoadingProvider(provider);
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin,
          queryParams: provider === 'kakao' ? {
            access_type: 'offline',
            prompt: 'consent',
          } : undefined
        }
      });

      if (error) throw error;
      onClose();
    } catch (error: any) {
      console.error('Login Error:', error);
      alert('로그인 시도 중 오류가 발생했습니다: ' + error.message);
    } finally {
      setLoadingProvider(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-end lg:items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
        onClick={onClose} 
      />
      
      <div className="relative w-full max-w-[400px] bg-white rounded-[32px] overflow-hidden shadow-2xl">
        <div className="p-8 pb-12">
          {/* Icons.LogIn 대신 LogInIcon 사용 */}
          <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-6">
            <LogInIcon className="text-blue-500" size={28} />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2 leading-tight">
            간편하게 로그인하고<br />팝업 소식을 받아보세요
          </h2>
          <p className="text-gray-500 mb-10 text-[15px]">
            가고 싶은 팝업을 저장하고 알림을 받을 수 있어요.
          </p>

          <div className="space-y-3">
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
