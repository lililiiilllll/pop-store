import React from 'react';
import { motion } from 'framer-motion';
import { PopupStore } from '../types';
import { Icons, DEFAULT_POPUP_IMAGE } from '../constants';

interface PopupListProps {
  stores?: (PopupStore & { 
    distanceText?: string; 
    statusText?: string; 
    isOpenNow?: boolean; 
  })[]; 
  selectedStoreId: string | null;
  onStoreSelect: (id: string) => void;
}

const PopupList: React.FC<PopupListProps> = ({ 
  stores = [], 
  selectedStoreId, 
  onStoreSelect 
}) => {
  
  // 이미지 로드 실패 시 무한 루프 방지 처리
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.currentTarget;
    const fallback = 'https://placehold.co/400x300?text=No+Image';
    if (target.src !== fallback) {
      target.src = fallback;
    }
  };

  if (!stores || stores.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
        <Icons.Info size={32} className="mb-2 opacity-20" />
        <p className="text-sm font-medium">표시할 팝업이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {stores.map((store) => (
        <motion.div
          key={store.id}
          layout
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => onStoreSelect(store.id)}
          className={`group relative flex flex-col bg-white rounded-2xl overflow-hidden shadow-sm border transition-all cursor-pointer hover:shadow-md active:scale-[0.98] ${
            selectedStoreId === store.id ? 'border-blue-500 ring-2 ring-blue-50' : 'border-gray-100'
          }`}
        >
          {/* 1. 이미지 영역 */}
          <div className="relative h-44 w-full overflow-hidden bg-gray-100">
            <img
              src={store.imageUrl || DEFAULT_POPUP_IMAGE}
              alt={store.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
              onError={handleImageError}
            />
            
            {/* 좌상단: 거리 및 영업 상태 뱃지 */}
            <div className="absolute top-3 left-3 flex flex-col gap-1.5">
              <div className="flex gap-1.5">
                <span className="px-2 py-1 bg-black/70 backdrop-blur-md text-white text-[10px] font-bold rounded-md flex items-center gap-1">
                  <Icons.MapPin size={10} />
                  {store.distanceText || '거리 정보 없음'}
                </span>
                <span className={`px-2 py-1 backdrop-blur-md text-white text-[10px] font-bold rounded-md ${
                  store.isOpenNow ? 'bg-emerald-500/90' : 'bg-gray-500/90'
                }`}>
                  {store.statusText || '정보 없음'}
                </span>
              </div>
            </div>

            {/* 우상단: 무료/유료 배지 */}
            <div className="absolute top-3 right-3">
              <span className={`px-2 py-1 text-[10px] font-bold rounded-md shadow-sm ${
                store.isFree ? 'bg-white text-blue-600' : 'bg-gray-900 text-white'
              }`}>
                {store.isFree ? '무료입장' : '유료'}
              </span>
            </div>
          </div>

          {/* 2. 텍스트 정보 영역 */}
          <div className="p-4">
            <div className="flex justify-between items-start mb-1">
              <h4 className="font-bold text-gray-900 text-[17px] leading-tight truncate">
                {store.name}
              </h4>
            </div>
            
            <div className="flex items-center gap-1 text-gray-500 text-[12px] mb-3">
              <span className="truncate opacity-80">{store.location}</span>
            </div>

            <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-50">
              <div className="flex items-center gap-3 text-[11px] text-gray-500">
                <span className="flex items-center gap-1">
                  <Icons.Clock size={12} className="text-gray-400" /> 
                  {store.openTime} - {store.closeTime}
                </span>
              </div>
              
              {/* 예약 상태 뱃지 */}
              <div className="flex gap-1">
                {store.isReservationRequired ? (
                  <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded border border-red-100">
                    예약 필수
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                    현장 대기
                  </span>
                )}
              </div>
            </div>
          </div>

          {selectedStoreId === store.id && (
            <div className="absolute inset-0 bg-blue-500/5 pointer-events-none" />
          )}
        </motion.div>
      ))}
    </div>
  );
};

export default PopupList;
