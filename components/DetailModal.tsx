import React from 'react';
// 상위 폴더(../)가 없으므로 현재 폴더(./)에서 가져옵니다.
import { Icons } from './constants'; 
import { PopupStore } from './types';

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=1000&auto=format&fit=crop";

interface DetailModalProps {
  store: PopupStore | null;
  onClose: () => void;
  isLiked: boolean;
  onShowSuccess: (title: string, message: string) => void;
}

const DetailModal: React.FC<DetailModalProps> = ({ store, onClose, isLiked, onShowSuccess }) => {
  if (!store) return null;

  return (
    <div className="flex flex-col h-[85vh] lg:h-auto max-h-[90vh] bg-white overflow-hidden rounded-t-[32px] lg:rounded-2xl shadow-2xl pointer-events-auto">
      <div className="relative h-64 lg:h-80 w-full bg-gray-200 flex-shrink-0">
        <img 
          src={store.imageUrl || FALLBACK_IMAGE} 
          alt={store.name} 
          className="w-full h-full object-cover"
          onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
        />
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-black/30 backdrop-blur-md rounded-full text-white z-50"
        >
          <Icons.Close className="w-6 h-6" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-6 bg-white">
        <h2 className="text-2xl font-bold text-gray-900">{store.name}</h2>
        <p className="text-sm text-gray-500 mb-6">{store.location}</p>
        <button 
          onClick={() => onShowSuccess('완료', '예약되었습니다.')}
          className="w-full py-4 bg-black text-white rounded-2xl font-bold"
        >
          예약하기
        </button>
      </div>
    </div>
  );
};

export default DetailModal;
