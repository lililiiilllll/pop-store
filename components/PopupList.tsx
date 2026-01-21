import React from 'react';
import { PopupStore } from './types';

interface PopupListProps {
  stores: PopupStore[];
  onStoreClick: (store: PopupStore) => void;
  userLocation: { lat: number; lng: number } | null;
}

const PopupList: React.FC<PopupListProps> = ({ stores, onStoreClick, userLocation }) => {
  
  // 💡 두 좌표 사이의 거리를 계산하는 함수 (Haversine 공식)
  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // 지구 반지름 (km)
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    if (distance < 1) return `${Math.round(distance * 1000)}m`; // 1km 미만은 m로 표시
    return `${distance.toFixed(1)}km`; // 1km 이상은 km로 표시
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      {stores.map((store) => {
        // 거리 계산
        const distance = userLocation 
          ? getDistance(userLocation.lat, userLocation.lng, store.lat, store.lng)
          : null;

        return (
          <div 
            key={store.id}
            onClick={() => onStoreClick(store)}
            className="flex gap-4 p-3 bg-white rounded-2xl border border-gray-100 hover:border-blue-200 transition-all cursor-pointer shadow-sm active:scale-[0.98]"
          >
            {/* 1. 썸네일 이미지 */}
            <div className="relative w-24 h-24 flex-shrink-0">
              <img 
                src={store.imageUrl} 
                className="w-full h-full object-cover rounded-xl"
                alt={store.name}
              />
              {/* 무료입장 배지 (이미지 위 오버레이) */}
              {store.is_free && (
                <span className="absolute top-1 left-1 bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-sm">
                  FREE
                </span>
              )}
            </div>

            {/* 2. 스토어 정보 */}
            <div className="flex flex-col justify-between flex-1 text-left">
              <div>
                <div className="flex justify-between items-start">
                  <span className="text-[10px] text-blue-500 font-bold uppercase tracking-tight">
                    {store.category || 'Pop-up'}
                  </span>
                  {/* 거리 표시 */}
                  {distance && (
                    <span className="text-[11px] text-gray-400 font-medium">
                      {distance}
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-bold text-gray-900 line-clamp-1 mt-0.5">
                  {store.name}
                </h3>
                <p className="text-[12px] text-gray-500 line-clamp-1 mt-0.5">
                  {store.location}
                </p>
              </div>

              {/* 하단 태그 정보 (운영시간, 무료여부 등) */}
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[10px] font-bold px-1.5 py-0.5 bg-gray-50 text-gray-600 rounded">
                  {store.period?.split('~')[1] ? '영업중' : '정보없음'}
                </span>
                <span className="text-[10px] text-gray-400">
                  {store.period || '기간 한정'}
                </span>
                {store.entry_type && (
                  <span className="ml-auto text-[10px] text-orange-500 font-bold">
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
