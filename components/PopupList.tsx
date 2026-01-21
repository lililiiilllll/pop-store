import React from 'react';
import { PopupStore } from '../types';

interface PopupListProps {
  stores: PopupStore[];
  selectedStoreId: string | null;
  onStoreSelect: (id: string) => void;
}

const PopupList: React.FC<PopupListProps> = ({ stores, selectedStoreId, onStoreSelect }) => {
  if (stores.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <p className="text-sm">해당 영역에 등록된 팝업이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {stores.map((store) => (
        <div
          key={store.id}
          onClick={() => onStoreSelect(store.id)}
          className={`group relative flex flex-col bg-white rounded-2xl overflow-hidden shadow-sm border transition-all cursor-pointer hover:shadow-md active:scale-[0.98] ${
            selectedStoreId === store.id ? 'border-blue-500 ring-2 ring-blue-50' : 'border-gray-100'
          }`}
        >
          {/* 이미지 영역 */}
          <div className="relative h-48 w-full overflow-hidden bg-gray-100">
            <img
              src={store.imageUrl}
              alt={store.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute top-3 right-3">
              <span className="px-2.5 py-1 bg-black/50 backdrop-blur-md text-white text-[11px] font-bold rounded-lg">
                {store.category}
              </span>
            </div>
          </div>

          {/* 텍스트 정보 */}
          <div className="p-4">
            <div className="flex justify-between items-start mb-1">
              <h4 className="font-bold text-gray-900 text-[17px] truncate flex-1">
                {store.name}
              </h4>
              <span className="text-[13px] font-bold text-blue-600 ml-2">
                {store.isFree ? '무료' : '유료'}
              </span>
            </div>
            
            <p className="text-gray-500 text-[13px] mb-3 truncate">
              {store.location}
            </p>

            <div className="flex items-center gap-3 text-[12px] text-gray-400">
              <span className="flex items-center gap-1">
                🕒 {store.openTime} - {store.closeTime}
              </span>
              {store.isReservationRequired && (
                <span className="text-red-500 font-medium">● 예약필수</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PopupList;
