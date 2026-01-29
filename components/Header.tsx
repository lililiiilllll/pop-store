import React from 'react';
import { Icons } from '../constants';
import { UserProfile } from '../types';

interface HeaderProps {
  location: string;
  userProfile: UserProfile | null;
  onSearchClick: () => void;
  onProfileClick: () => void; // 로그인 시 -> ProfileModal, 미로그인 시 -> LoginModal 실행
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
  const SearchIcon = Icons.Search || (() => <span>🔍</span>);
  const UserIcon = Icons.User || (() => <span>👤</span>);
  const ChevronDownIcon = Icons.ChevronDown || (() => <span>▼</span>);
  const SettingsIcon = Icons.Settings || (() => <span>⚙️</span>);

  return (
    <header className="flex items-center justify-between px-5 py-3 bg-white/80 backdrop-blur-md sticky top-0 z-[60] border-b border-gray-100/50 h-16">
      
      {/* [왼쪽] 위치 선택 아이콘만 배치 (또는 빈 공간) */}
      <div className="flex-1 flex items-center">
        <div 
          className="p-2 hover:bg-gray-100 rounded-full cursor-pointer transition-colors"
          onClick={onLocationClick}
        >
          <ChevronDownIcon size={20} className="text-gray-600" />
        </div>
      </div>

      {/* [중앙] ✅ 로고 삽입 (기존 성수/서울숲 글자 위치) */}
      <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center cursor-pointer active:scale-95 transition-transform" onClick={onLocationClick}>
        <h1 className="text-[20px] font-black text-[#191f28] tracking-tight leading-none">
          Pin It
        </h1>
        <div className="flex items-center gap-1 mt-0.5">
          <span className="text-[12px] font-bold text-[#3182f6]">{location}</span>
          <div className="w-1 h-1 bg-[#3182f6] rounded-full animate-pulse" />
        </div>
      </div>
      
      {/* 오른쪽: 검색 및 유저 버튼 세트 */}
      <div className="flex items-center gap-1.5">
        {/* 검색 버튼 */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onSearchClick();
          }}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-700 active:scale-95"
          aria-label="검색"
        >
          <SearchIcon size={22} />
        </button>

        {/* 관리자 설정 버튼 (관리자 계정일 때만) */}
        {userProfile?.isAdmin && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onAdminClick?.();
            }}
            className="p-2 text-tossBlue hover:bg-blue-50 rounded-full transition-colors active:scale-95"
            aria-label="관리자 설정"
          >
            <SettingsIcon size={22} />
          </button>
        )}

        {/* [수정 포인트] 프로필/로그인 통합 버튼 */}
        <div 
          onClick={() => {
            if (typeof onProfileClick === 'function') {
              onProfileClick();
            }
          }}
          className="flex items-center gap-2 ml-1 px-1 py-1 rounded-full hover:bg-gray-50 cursor-pointer transition-colors active:scale-95"
        >
          {/* 로그인 상태일 때 이름 표시 (선택 사항, 깔끔함을 위해 추가) */}
          {userProfile && (
            <span className="text-[13px] font-semibold text-gray-700 ml-1 hidden sm:block">
              {userProfile.name}
            </span>
          )}
          
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 overflow-hidden border border-gray-200 shadow-sm">
            {userProfile?.avatarUrl ? (
              <img src={userProfile.avatarUrl} alt="profile" className="w-full h-full object-cover" />
            ) : (
              <UserIcon size={20} className="text-gray-400" />
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
