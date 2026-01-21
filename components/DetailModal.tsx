import React from 'react';
import { Icons } from '../constants';
import { PopupStore } from '../types';

// 404 에러 방지를 위한 폴백 이미지 주소 직접 정의
const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=1000&auto=format&fit=crop";

interface DetailModalProps {
  store: PopupStore | null;
  onClose: () => void;
  isLiked: boolean;
  onShowSuccess: (title: string, message: string) => void;
}

// Named Export와 Default Export를 모두 제공하여 Import 에러를 방지합니다.
export const DetailModal: React.FC<DetailModalProps> = ({ 
  store, 
  onClose, 
  isLiked, 
  onShowSuccess 
}) => {
  if (!store) return null;

  return (
    <div className="flex flex-col h-[85vh] lg:h-auto max-h-[90vh] bg-white overflow-hidden rounded-t-[32px] lg:rounded-2xl shadow-2xl pointer-events-auto">
      <div className="relative h-64 lg:h-80 w-full bg-gray-100 flex-shrink-0">
        <img 
          src={store.imageUrl || FALLBACK_IMAGE} 
          alt={store.name} 
          className="w-full h-full object-cover"
          onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
        />
        <button 
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="absolute top-4 right-4 p-2 bg-black/30 backdrop-blur-md rounded-full text-white z-50"
        >
          <Icons.Close className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-white">
        <div className="mb-6">
          <span className="inline-block px-2 py-1 rounded bg-blue-50 text-blue-600 text-[10px] font-bold mb-2 uppercase tracking-wider">
            {store.category || 'POPUP STORE'}
          </span>
          <h2 className="text-2xl font-bold text-gray-900 leading-tight">{store.name}</h2>
          <p className="text-sm text-gray-500 mt-1">{store.location}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 pb-2">
          <button 
            onClick={() => onShowSuccess('예약 완료', '정상적으로 처리되었습니다.')}
            className="py-4 bg-black text-white rounded-2xl font-bold active:scale-95 transition-transform"
          >
            예약하기
          </button>
          <button onClick={onClose} className="py-4 bg-gray-100 text-gray-900 rounded-2xl font-bold">
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

export default DetailModal;
