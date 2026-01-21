import React from 'react';
import { Icons } from '../constants';
import { UserProfile } from '../types';

interface HeaderProps {
  location: string;
  userProfile: UserProfile | null;
  onSearchClick: () => void;
  onProfileClick: () => void;
  onLocationClick: () => void;
  onAdminClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
  location, 
  userProfile, 
  onSearchClick, 
  onProfileClick, 
  onLocationClick,
  onAdminClick 
}) => {
  return (
    <header className="flex items-center justify-between px-5 py-4 bg-white/80 backdrop-blur-md">
      {/* 왼쪽: 위치 선택 */}
      <div 
        className="flex items-center gap-1 cursor-pointer active:opacity-60 transition-opacity"
        onClick={onLocationClick}
      >
        <h1 className="text-xl font-bold text-gray-900">{location}</h1>
        <Icons.ChevronDown size={18} className="text-gray-400" />
      </div>

      {/* 오른쪽: 검색 및 유저 버튼 */}
      <div className="flex items-center gap-4">
        {/* 검색 버튼 */}
        <button 
          onClick={onSearchClick}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-700"
          aria-label="검색"
        >
          <Icons.Search size={22} />
        </button>

        {/* 관리자 버튼 (프로필이 있고 관리자일 때만 노출) */}
        {userProfile?.isAdmin && (
          <button 
            onClick={onAdminClick}
            className="p-2 text-tossBlue hover:bg-blue-50 rounded-full transition-colors"
          >
            <Icons.Settings size={22} />
          </button>
        )}

        {/* 프로필/로그인 버튼 */}
        <button 
          onClick={onProfileClick}
          className="flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 overflow-hidden border border-gray-200 active:scale-90 transition-transform"
        >
          {userProfile?.avatarUrl ? (
            <img src={userProfile.avatarUrl} alt="profile" className="w-full h-full object-cover" />
          ) : (
            <Icons.User size={20} className="text-gray-400" />
          )}
        </button>
      </div>
    </header>
  );
};

export default Header;
