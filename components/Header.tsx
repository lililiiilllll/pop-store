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
      
      {/* [왼쪽] 서비스 로고 고정 */}
      <div className="flex-1 flex items-center gap-2">
        <div className="w-8 h-8 bg-[#3182F6] rounded-xl flex items-center justify-center shadow-sm shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M13 10V3L4 14H11V21L20 10H13Z" fill="white" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <span className="text-xl font-bold tracking-tight text-[#191F28] hidden sm:block">팝업나우</span>
      </div>

      {/* [중앙] 위치 선택 */}
      <div 
        onClick={onLocationClick}
        className="flex items-center gap-1.5 px-4 py-2 bg-gray-50/80 rounded-full cursor-pointer hover:bg-gray-100 transition-all active:scale-95"
      >
        <span className="text-[14px] font-bold text-[#333D4B]">{location}</span>
        <ChevronDownIcon size={14} className="text-[#8B95A1]" />
      </div>

      {/* [오른쪽] 검색 및 프로필 */}
      <div className="flex-1 flex items-center justify-end gap-2">
        <button 
          onClick={onSearchClick}
          className="p-2.5 text-[#4E5968] hover:bg-gray-50 rounded-full transition-colors active:scale-90"
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
            className="p-2 text-[#3182F6] hover:bg-blue-50 rounded-full transition-colors active:scale-95"
            aria-label="관리자 설정"
          >
            <SettingsIcon size={22} />
          </button>
        )}

        {/* 프로필/로그인 통합 버튼 */}
        <div 
          onClick={() => {
            // 원본의 typeof 체크 로직 유지
            if (typeof onProfileClick === 'function') {
              console.log("Header: onProfileClick triggered");
              onProfileClick();
            }
          }}
          className="flex items-center gap-2 ml-1 px-1 py-1 rounded-full hover:bg-gray-50 cursor-pointer transition-colors active:scale-95"
        >
          {/* 주석 처리되어 있던 닉네임 노출 로직 보존 */}
          {/* 
          {userProfile && (
            <span className="text-[13px] font-semibold text-gray-700 ml-1 hidden sm:block">
              {userProfile.name}
            </span>
          )}
           */}
          
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 overflow-hidden border border-gray-200 shadow-sm">
            {userProfile?.avatarUrl ? (
              <img src={userProfile.avatarUrl} alt="profile" className="w-full h-full object-cover" />
            ) : (
              <UserIcon size={20} className="text-[#8B95A1]" />
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
