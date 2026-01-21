import React from 'react';
import { supabase } from '../lib/supabase';
import { Icons } from '../constants';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const handleLogin = async (provider: 'kakao' | 'google') => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (error: any) {
      alert('로그인 중 오류가 발생했습니다: ' + error.message);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-end lg:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-[400px] bg-white rounded-[32px] overflow-hidden animate-in slide-in-from-bottom-10">
        <div className="p-8 pb-12">
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-6">
            <Icons.LogIn className="text-tossBlue" size={24} />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2">간편하게 로그인하고<br />팝업 소식을 받아보세요</h2>
          <p className="text-gray-500 mb-8">가고 싶은 팝업을 저장하고 알림을 받을 수 있어요.</p>

          <div className="space-y-3">
            <button 
              onClick={() => handleLogin('kakao')}
              className="w-full flex items-center justify-center gap-3 bg-[#FEE500] text-gray-900 py-4 rounded-2xl font-bold hover:opacity-90 transition-opacity"
            >
              <img src="https://developers.kakao.com/assets/img/about/logos/kakaotalksharing/kakaolink_btn_medium.png" className="w-5 h-5" alt="" />
              카카오로 시작하기
            </button>
            
            <button 
              onClick={() => handleLogin('google')}
              className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 text-gray-700 py-4 rounded-2xl font-bold hover:bg-gray-50 transition-colors"
            >
              <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="" />
              Google로 시작하기
            </button>
          </div>
          
          <button onClick={onClose} className="w-full mt-6 text-gray-400 font-medium text-sm">
            다음에 하기
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
