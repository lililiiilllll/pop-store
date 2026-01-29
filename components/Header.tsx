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
          <svg 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className="w-full h-full drop-shadow-sm"
    >
      {/* 토스 블루 색상의 P 형태 배경 */}
      <path 
        d="M25 15C25 10.5817 28.5817 7 33 7H65C81.5685 7 95 20.4315 95 37C95 53.5685 81.5685 67 65 67H43V85C43 89.4183 39.4183 93 35 93H33C28.5817 93 25 89.4183 25 85V15Z" 
        fill="#3182F6" 
      />
      {/* P 내부에 뚫린 핀(Pin) 모양의 구멍 (Hole) */}
      <path 
        fillRule="evenodd" 
        clipRule="evenodd" 
        d="M60 37C60 41.4183 56.4183 45 52 45C47.5817 45 44 41.4183 44 37C44 32.5817 47.5817 29 52 29C56.4183 29 60 32.5817 60 37ZM52 57C58 50 64 43.5 64 37C64 30.3726 58.6274 25 52 25C45.3726 25 40 30.3726 40 37C40 43.5 46 50 52 57Z" 
        fill="white" 
      />
    </svg>
        </div>
        <span className="text-[19px] font-black text-[#191f28] tracking-tighter">
          Pin It
        </span>
        {/*
        <span className="text-[10px] font-black text-[#3182f6] tracking-tighter">
          핀 잇
        </span>
         */}
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
