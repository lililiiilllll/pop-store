import React from 'react';
import { PopupStore } from '../types';
import { Icons, DEFAULT_POPUP_IMAGE } from '../constants';

interface DetailModalProps {
  store: PopupStore | null;
  onClose: () => void;
  isLiked: boolean;
  onShowSuccess: (title: string, message: string) => void;
}

const DetailModal: React.FC<DetailModalProps> = ({ 
  store, 
  onClose, 
  isLiked, 
  onShowSuccess 
}) => {
  if (!store) return null;

  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src = DEFAULT_POPUP_IMAGE;
  };

  return (
    <div className="flex flex-col h-[85vh] lg:h-auto max-h-[90vh] bg-white overflow-hidden rounded-t-[32px] lg:rounded-2xl shadow-2xl pointer-events-auto">
      <div className="relative h-64 lg:h-80 w-full bg-gray-100 flex-shrink-0">
        <img 
          src={store.imageUrl || DEFAULT_POPUP_IMAGE} 
          alt={store.name} 
          className="w-full h-full object-cover"
          onError={handleImgError}
        />
        <button 
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="absolute top-4 right-4 p-2 bg-black/30 backdrop-blur-md rounded-full text-white z-50"
        >
          <Icons.Close className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-white">
        <div className="flex justify-between items-start mb-4">
          <div>
            <span className="inline-block px-2 py-1 rounded bg-blue-50 text-blue-600 text-[10px] font-bold mb-2 uppercase">
              {store.category || '팝업스토어'}
            </span>
            <h2 className="text-2xl font-bold text-gray-900 leading-tight">{store.name}</h2>
          </div>
          <button className={`p-3 rounded-xl border ${isLiked ? 'bg-pink-50 border-pink-100 text-pink-500' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
            <Icons.Heart className={`w-6 h-6 ${isLiked ? 'fill-current' : ''}`} />
          </button>
        </div>

        <div className="space-y-4 text-sm text-gray-600 mb-8">
          <div className="flex items-start gap-3">
            <Icons.MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
            <span className="flex-1">{store.location}</span>
          </div>
          <div className="flex items-center gap-3">
            <Icons.Clock className="w-5 h-5 text-gray-400" />
            <span>{store.openTime} - {store.closeTime}</span>
          </div>
          <div className="flex items-start gap-3">
            <Icons.Info className="w-5 h-5 text-gray-400 mt-0.5" />
            <span className="flex-1 leading-relaxed">{store.description || '상세 정보가 없습니다.'}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pb-2">
          <button 
            onClick={() => onShowSuccess('예약 완료', '성공적으로 예약되었습니다.')}
            className="py-4 bg-black text-white rounded-2xl font-bold active:scale-95 transition-transform"
          >
            예약하기
          </button>
          <button className="py-4 bg-gray-100 text-gray-900 rounded-2xl font-bold active:scale-95 transition-transform">
            길찾기
          </button>
        </div>
      </div>
    </div>
  );
};

// 💡 중요: export default를 명시합니다.
export default DetailModal;
