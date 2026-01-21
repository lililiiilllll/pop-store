// PopupList.tsx 예시
import React from 'react';
import { PopupStore } from '../types';

interface Props {
  stores: PopupStore[];
  selectedStoreId: string | null;
  onStoreSelect: (id: string) => void;
}

const PopupList: React.FC<Props> = ({ stores, selectedStoreId, onStoreSelect }) => {
  if (stores.length === 0) return <div className="text-center py-10 text-gray-400">결과가 없습니다.</div>;

  return (
    <div className="space-y-4">
      {stores.map((store) => (
        <div 
          key={store.id} 
          onClick={() => onStoreSelect(store.id)}
          className={`bg-white p-4 rounded-2xl shadow-sm border cursor-pointer transition-all ${
            selectedStoreId === store.id ? 'border-blue-500 ring-1 ring-blue-500' : 'border-transparent'
          }`}
        >
          <img src={store.imageUrl} className="w-full h-40 object-cover rounded-xl mb-3" />
          <h4 className="font-bold text-lg">{store.name}</h4>
          <p className="text-sm text-gray-500">{store.location}</p>
        </div>
      ))}
    </div>
  );
};

export default PopupList;
