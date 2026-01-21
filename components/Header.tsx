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
  // 아이콘 존재 여부 안전하게 확인
  const SearchIcon = Icons.Search || (() => <span>🔍</span>);
  const UserIcon = Icons.User || (() => <span>👤</span>);
  const ChevronDownIcon = Icons.ChevronDown || (() => <span>▼</span>);
  const SettingsIcon = Icons.Settings || (() => <span>⚙️</span>);

  return (
    <header className="flex items-center justify-between px-5 py-4 bg-white/80 backdrop-blur-md sticky top-0 z-[60]">
      {/* 왼쪽: 위치 선택 */}
      <div 
        className="flex items-center gap-1 cursor-pointer active:opacity-60 transition-opacity"
        onClick={onLocationClick}
      >
        <h1 className="text-xl font-bold text-gray-900 leading-tight">{location}</h1>
        <ChevronDownIcon size={18} className="text-gray-400 mt-0.5" />
      </div>

      {/* 오른쪽: 검색 및 유저 버튼 */}
      <div className="flex items-center gap-2">
        {/* 검색 버튼 */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onSearchClick();
          }}
          className="p-2.5 hover:bg-gray-100 rounded-full transition-colors text-gray-700 active:scale-95"
          aria-label="검색"
        >
          <SearchIcon size={22} />
        </button>

        {/* 관리자 버튼 (프로필이 있고 관리자일 때만 노출) */}
        {userProfile?.isAdmin && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onAdminClick?.();
            }}
            className="p-2.5 text-tossBlue hover:bg-blue-50 rounded-full transition-colors active:scale-95"
          >
            <SettingsIcon size={22} />
          </button>
        )}

        {/* 프로필/로그인 버튼 */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onProfileClick();
          }}
          className="ml-1 flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 overflow-hidden border border-gray-200 active:scale-90 transition-transform shadow-sm"
        >
          {userProfile?.avatarUrl ? (
            <img src={userProfile.avatarUrl} alt="profile" className="w-full h-full object-cover" />
          ) : (
            <UserIcon size={20} className="text-gray-400" />
          )}
        </button>
      </div>
    </header>
  );
};

// 반드시 default로 내보내야 App.tsx에서 'undefined' 에러가 나지 않습니다.
export default Header;
