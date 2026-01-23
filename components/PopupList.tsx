import React from 'react';
import { PopupStore } from './types';

interface PopupListProps {
  stores: PopupStore[];
  onStoreClick: (store: PopupStore) => void;
  userLocation: { lat: number; lng: number } | null;
  onFindNearest?: () => void;
}

const PopupList: React.FC<PopupListProps> = ({ stores, onStoreClick, userLocation, onFindNearest }) => {
  
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

  // 💡 데이터가 없을 때 표시할 화면
  if (stores.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        </div>
        <p className="text-gray-500 text-sm font-medium mb-4">현재 지도 영역에 팝업이 없습니다.</p>
        {onFindNearest && (
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

  return (
    <div className="flex flex-col gap-3 p-4">
      {stores.map((store) => {
        const distance = userLocation 
          ? getDistance(userLocation.lat, userLocation.lng, store.lat, store.lng)
          : null;

        return (
          <div 
            key={store.id}
            onClick={() => onStoreClick(store)}
            className="flex items-center gap-4 p-3 bg-white rounded-2xl border border-gray-100 hover:border-blue-200 transition-all cursor-pointer shadow-sm active:scale-[0.97]"
          >
            {/* 1. 썸네일 이미지 (고정 크기) */}
            <div className="relative w-24 h-24 flex-shrink-0">
              <img 
                src={store.imageUrl} 
                className="w-full h-full object-cover rounded-xl"
                alt={store.title} // 💡 store.name 대신 store.title 사용
              />
              {store.is_free && (
                <span className="absolute top-1 left-1 bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-sm">
                  FREE
                </span>
              )}
            </div>

            {/* 2. 스토어 정보 (사진 옆으로 배치) */}
            <div className="flex flex-col justify-between flex-1 min-w-0 h-24 py-0.5 text-left">
              <div>
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-[10px] text-blue-500 font-extrabold uppercase">
                    {store.category}
                  </span>
                  {distance && <span className="text-[11px] text-gray-400 font-medium">{distance}</span>}
                </div>
                
                {/* 💡 팝업 이름: store.title로 변경 */}
                <h3 className="text-[15px] font-bold text-gray-900 truncate mb-0.5">
                  {store.title} 
                </h3>
                
                <p className="text-[12px] text-gray-500 truncate leading-tight">
                  {store.location}
                </p>
              </div>

              {/* 하단 정보 라인 */}
              <div className="flex items-center gap-2 mt-1">
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 bg-gray-50 text-gray-600 rounded whitespace-nowrap">
                    {/* 간단한 날짜 비교 로직이나 상태 표시 */}
                    {store.period?.includes('~') ? '진행중' : '팝업정보'}
                  </span>
                  <span className="text-[10px] text-gray-400 truncate">
                    {store.period}
                  </span>
                </div>
                {store.entry_type && (
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
