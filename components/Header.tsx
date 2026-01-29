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
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zM12 11.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
        </div>
        <span className="text-[19px] font-black text-[#191f28] tracking-tighter">
          Pin It
        </span>
        <span className="text-[10px] font-black text-[#3182f6] tracking-tighter">
          핀 잇
        </span>
      </div>

      {/* [중앙] ✅ 성수/서울숲 위치 선택 (완전 중앙 배치) */}
      <div 
        className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1 cursor-pointer active:scale-95 transition-transform"
        onClick={onLocationClick}
      >
        <span className="text-[14px] font-bold text-[#3182f6] whitespace-nowrap">
          {location}
        </span>
        {/* ✅ Icons.ChevronDown 대신 정의된 변수 사용 */}
        <ChevronDownIcon size={14} className="text-[#3182f6]" />
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
