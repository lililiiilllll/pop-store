import React from 'react';
import { PopupStore } from '../types';
import { Icons, DEFAULT_POPUP_IMAGE } from '../constants';

interface DetailModalProps {
  store: PopupStore | null;
  onClose: () => void;
  isLiked: boolean;
  onShowSuccess: (title: string, message: string) => void;
}

// export default 대신 Named Export(export const)를 사용하여 App.tsx와의 연결을 명확히 합니다.
export const DetailModal: React.FC<DetailModalProps> = ({ 
  store, 
  onClose, 
  isLiked, 
  onShowSuccess 
}) => {
  if (!store) return null;

  // 이미지 에러 핸들러 (404 방지: 서버에 이미지가 없으면 기본 이미지로 교체)
  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src = DEFAULT_POPUP_IMAGE;
  };

  return (
    <div className="flex flex-col h-[85vh] lg:h-auto max-h-[90vh] bg-white overflow-hidden rounded-t-[32px] lg:rounded-2xl shadow-2xl">
      {/* 상단 이미지 영역 */}
      <div className="relative h-64 lg:h-80 w-full bg-gray-100 flex-shrink-0">
        <img 
          src={store.imageUrl || DEFAULT_POPUP_IMAGE} 
          alt={store.name} 
          className="w-full h-full object-cover"
          onError={handleImgError}
        />
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-black/30 backdrop-blur-md rounded-full text-white hover:bg-black/50 transition-colors z-10"
        >
          <Icons.Close className="w-6 h-6" />
        </button>
      </div>

      {/* 정보 영역 */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-white">
        <div className="flex justify-between items-start mb-4">
          <div>
            <span className="inline-block px-2 py-1 rounded bg-blue-50 text-blue-600 text-[10px] font-bold mb-2 uppercase tracking-wider">
              {store.category || '팝업스토어'}
            </span>
            <h2 className="text-2xl font-bold text-gray-900 leading-tight">{store.name}</h2>
          </div>
          <button className={`p-3 rounded-xl border transition-all ${isLiked ? 'bg-pink-50 border-pink-100 text-pink-500' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
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
            <span>{store.openTime} - {store.closeTime} (영업중)</span>
          </div>
          <div className="flex items-start gap-3">
            <Icons.Info className="w-5 h-5 text-gray-400 mt-0.5" />
            <span className="flex-1 leading-relaxed">
              {store.description || '상세 설명이 아직 등록되지 않았습니다.'}
            </span>
          </div>
        </div>

        {/* 하단 버튼 (모바일에서 터치하기 쉽게 큼직하게 배치) */}
        <div className="grid grid-cols-2 gap-3 pb-2">
          <button 
            onClick={() => onShowSuccess('예약 완료', '성공적으로 예약되었습니다.')}
            className="py-4 bg-black text-white rounded-2xl font-bold hover:bg-gray-800 transition-all active:scale-95"
          >
            예약하기
          </button>
          <button className="py-4 bg-gray-100 text-gray-900 rounded-2xl font-bold hover:bg-gray-200 transition-all active:scale-95">
            길찾기
          </button>
        </div>
      </div>
    </div>
  );
};
