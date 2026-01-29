import React from 'react';
import { PopupStore } from '../types';

interface PopupListProps {
  stores: (PopupStore & { isEnded?: boolean; isRecommendation?: boolean })[];
  onStoreClick: (store: PopupStore) => void;
  userLocation: { lat: number; lng: number } | null;
  onFindNearest?: () => void;
  activeTab?: string;
  userProfile?: any;
  onLoginClick?: () => void;
}

const PopupList: React.FC<PopupListProps> = ({ 
  stores, 
  onStoreClick, 
  userLocation, 
  onFindNearest,
  activeTab,
  userProfile,
  onLoginClick 
}) => {
  
  // 💡 거리 계산 함수 (Haversine 공식)
  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    if (distance < 1) return `${Math.round(distance * 1000)}m`;
    return `${distance.toFixed(1)}km`;
  };

  // 1. [비로그인] '찜한 목록' 탭인데 로그인이 안 된 경우 전용 화면
  if (activeTab === 'saved' && !userProfile) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-10 text-center">
        <div className="w-16 h-16 bg-[#f2f4f6] rounded-full flex items-center justify-center mb-6">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#adb5bd" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
        </div>
        <h3 className="text-[17px] font-bold text-[#191f28] mb-2">로그인이 필요해요</h3>
        <p className="text-[#8b95a1] text-[14px] leading-relaxed mb-8">
          로그인하고 관심 있는 팝업을 저장해서<br/>나만의 리스트를 만들어보세요!
        </p>
        <button 
          onClick={onLoginClick}
          className="px-8 py-3.5 bg-[#3182f6] text-white text-[15px] font-bold rounded-2xl shadow-lg active:scale-95 transition-all"
        >
          로그인하고 시작하기
        </button>
      </div>
    );
  }

  // 2. [데이터 없음] 검색 결과나 주변 팝업이 하나도 없을 때
  if (stores.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        </div>
        <p className="text-gray-500 text-sm font-medium mb-4">현재 영역에 표시할 팝업이 없습니다.</p>
        {onFindNearest && activeTab !== 'saved' && (
          <button 
            onClick={onFindNearest}
            className="px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl shadow-md active:scale-95 transition-all"
          >
            가장 가까운 팝업 찾기
          </button>
        )}
      </div>
    );
  }

  // 3. [메인 리스트] 모든 기능이 포함된 리스트 렌더링
  return (
    <div className="flex flex-col gap-3 p-4 pb-24">
      {stores.map((store) => {
        const distanceStr = userLocation 
          ? getDistance(userLocation.lat, userLocation.lng, store.lat, store.lng)
          : null;

        return (
          <div 
            key={store.id}
            onClick={() => onStoreClick(store)}
            // 🌟 종료된 팝업은 투명도를 낮추고 흑백 처리 (기능 추가)
            className={`flex items-center gap-4 p-3 bg-white rounded-2xl border border-gray-100 transition-all cursor-pointer shadow-sm active:scale-[0.97] ${
              store.isEnded ? 'opacity-40 grayscale-[0.8]' : 'hover:border-blue-200'
            }`}
          >
            {/* 썸네일 이미지 영역 */}
            <div className="relative w-24 h-24 flex-shrink-0">
              <img 
                src={store.image_url || store.imageUrl || 'https://placehold.co/400x400?text=No+Image'} 
                className="w-full h-full object-cover rounded-xl"
                alt={store.title}
              />
              {/* 무료 입장 뱃지 */}
              {store.is_free && (
                <span className="absolute top-1 left-1 bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-sm">
                  FREE
                </span>
              )}
              {/* 종료 뱃지 (종료된 경우만 노출) */}
              {store.isEnded && (
                <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center">
                  <span className="text-white text-[10px] font-bold border border-white/50 px-2 py-0.5 rounded">종료</span>
                </div>
              )}
            </div>

            {/* 정보 텍스트 영역 */}
            <div className="flex flex-col justify-between flex-1 min-w-0 h-24 py-0.5 text-left">
              <div>
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-[10px] text-blue-500 font-extrabold uppercase">
                    {store.category}
                  </span>
                  {distanceStr && <span className="text-[11px] text-gray-400 font-medium">{distanceStr}</span>}
                </div>
                
                <h3 className="text-[15px] font-bold text-gray-900 truncate mb-0.5">
                  {store.title} 
                </h3>
                
                <p className="text-[12px] text-gray-500 truncate leading-tight">
                  {store.address || store.location}
                </p>
              </div>

              {/* 하단 메타 정보 (진행상태, 날짜, 추천여부) */}
              <div className="flex items-center gap-2 mt-1">
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap ${
                    store.isEnded ? 'bg-gray-100 text-gray-400' : : 'bg-green-50 text-green-600'
                  }`}>
                    {store.isEnded ? '종료됨' : '진행중'}
                  </span>
                  <span className="text-[10px] text-gray-400 truncate">
                    {store.end_date ? `${store.end_date.slice(5).replace('-', '.')} 종료` : store.period}
                  </span>
                </div>
                {/* 추천 마크 (거리순 정렬 시 상단 노출용) */}
                {store.isRecommendation && (
                  <span className="ml-auto text-[10px] text-blue-600 font-bold whitespace-nowrap bg-blue-50 px-1.5 py-0.5 rounded">
                    추천
                  </span>
                )}
                {/* 입장 방식 (예약/현장 등) */}
                {store.entry_type && !store.isRecommendation && (
                  <span className="ml-auto text-[10px] text-orange-500 font-bold whitespace-nowrap">
                    {store.entry_type}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PopupList;
