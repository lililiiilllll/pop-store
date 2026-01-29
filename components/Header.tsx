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
    <header className="flex items-center justify-between px-5 py-4 bg-white/80 backdrop-blur-md sticky top-0 z-[60] border-b border-gray-100/50 h-16 w-full">
      {/* 왼쪽: 대칭을 위한 빈 공간 */}
      <div className="flex-1" />

      {/* 중앙: ✅ Pin It 로고와 지역 선택 통합 */}
      <div 
        className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 cursor-pointer active:scale-95 transition-transform"
        onClick={onLocationClick}
      >
        {/* 파란색 핀 아이콘 (보내주신 이미지 스타일) */}
        <div className="w-8 h-8 bg-[#3182F6] rounded-xl flex items-center justify-center shadow-sm shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zM12 11.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
        </div>

        {/* 텍스트 정보 */}
        <div className="flex flex-col items-start min-w-max">
          <span className="text-[17px] font-black text-[#191f28] leading-none tracking-tighter">Pin It</span>
          <div className="flex items-center gap-0.5 mt-0.5">
            <span className="text-[12px] font-bold text-[#3182f6] leading-none">{location}</span>
            <ChevronDownIcon size={10} className="text-[#3182f6]" />
          </div>
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
