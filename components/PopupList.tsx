import React from 'react';
import { motion } from 'framer-motion'; // 오류 원인 1: motion 임포트 누락 확인
import { PopupStore } from '../types';
import { Icons } from '../constants';

interface PopupListProps {
  // stores가 undefined로 넘어올 경우를 대비해 선택적 프로퍼티 혹은 기본값 설정 준비
  stores?: PopupStore[]; 
  selectedStoreId: string | null;
  onStoreSelect: (id: string) => void;
}

const PopupList: React.FC<PopupListProps> = ({ 
  stores = [], // 기본값을 빈 배열로 설정하여 .length 오류 방지
  selectedStoreId, 
  onStoreSelect 
}) => {
  
  // 1. 로딩 중이거나 데이터가 없는 경우 처리 (Safety Check)
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
          key={store.id} // key는 항상 최상위 엘리먼트에
          layout
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          onClick={() => onStoreSelect(store.id)}
          className={`group relative flex flex-col bg-white rounded-2xl overflow-hidden shadow-sm border transition-all cursor-pointer hover:shadow-md active:scale-[0.98] ${
            selectedStoreId === store.id ? 'border-blue-500 ring-2 ring-blue-50' : 'border-gray-100'
          }`}
        >
          {/* 1. 이미지 영역 */}
          <div className="relative h-44 w-full overflow-hidden bg-gray-100">
            <img
              src={store.imageUrl || 'https://via.placeholder.com/400x300?text=No+Image'}
              alt={store.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = 'https://via.placeholder.com/400x300?text=No+Image';
              }}
            />
            {/* 카테고리 배지 */}
            <div className="absolute top-3 left-3 flex gap-2">
              <span className="px-2 py-1 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold rounded-md">
                {store.category || '기타'}
              </span>
            </div>
            {/* 무료/유료 배지 */}
            <div className="absolute top-3 right-3">
              <span className={`px-2 py-1 text-[10px] font-bold rounded-md ${
                store.isFree ? 'bg-blue-600 text-white' : 'bg-gray-800 text-white'
              }`}>
                {store.isFree ? '무료' : '유료'}
              </span>
            </div>
          </div>

          {/* 2. 텍스트 정보 영역 */}
          <div className="p-4">
            <div className="flex justify-between items-start mb-1.5">
              <h4 className="font-bold text-gray-900 text-[16px] leading-tight truncate flex-1">
                {store.name}
              </h4>
            </div>
            
            <div className="flex items-center gap-1 text-gray-500 text-[12px] mb-3">
              <Icons.MapPin size={12} className="text-gray-400" />
              <span className="truncate">{store.location || '위치 정보 없음'}</span>
            </div>

            <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-50">
              <div className="flex items-center gap-3 text-[11px] text-gray-400">
                <span className="flex items-center gap-1 font-medium">
                  <Icons.Clock size={12} /> 
                  {store.openTime && store.closeTime ? `${store.openTime} - ${store.closeTime}` : '영업시간 미정'}
                </span>
              </div>
              
              {store.isReservationRequired && (
                <span className="text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">
                  예약필수
                </span>
              )}
            </div>
          </div>

          {/* 선택 시 하이라이트 효과 커버 */}
          {selectedStoreId === store.id && (
            <div className="absolute inset-0 bg-blue-500/5 pointer-events-none" />
          )}
        </motion.div>
      ))}
    </div>
  );
};

export default PopupList;
