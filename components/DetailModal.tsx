import React from 'react';
// 상위 폴더의 constants와 types 참조
import { Icons, DEFAULT_POPUP_IMAGE } from '../constants'; 
import { PopupStore } from '../types';

interface DetailModalProps {
  store: PopupStore | null;
  onClose: () => void;
  isLiked: boolean;
  onShowSuccess: (title: string, message: string) => void;
}

const DetailModal: React.FC<DetailModalProps> = ({ store, onClose, isLiked, onShowSuccess }) => {
  // 데이터가 없으면 아예 렌더링하지 않음
  if (!store) return null;

  return (
    /* 💡 onClick={(e) => e.stopPropagation()}: 모달 내부 클릭 시 배경 클릭 이벤트가 발생하여 모달이 닫히는 것을 방지 */
    <div 
      onClick={(e) => e.stopPropagation()} 
      className="flex flex-col w-full h-[85vh] lg:h-auto max-h-[90vh] bg-white overflow-hidden rounded-t-[32px] lg:rounded-2xl shadow-2xl pointer-events-auto"
    >
      {/* 상단 이미지 영역 */}
      <div className="relative h-64 lg:h-80 w-full bg-gray-200 flex-shrink-0">
        <img 
          src={store.imageUrl || DEFAULT_POPUP_IMAGE} 
          alt={store.name} 
          className="w-full h-full object-cover"
          onError={(e) => { e.currentTarget.src = DEFAULT_POPUP_IMAGE; }}
        />
        {/* 닫기 버튼: 터치 영역 확보를 위해 p-2 추가 */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-black/30 backdrop-blur-md rounded-full text-white z-50 hover:bg-black/50 transition-colors"
          aria-label="Close modal"
        >
          <Icons.Close className="w-6 h-6" />
        </button>
      </div>

      {/* 정보 컨텐츠 영역 */}
      <div className="flex-1 overflow-y-auto p-6 bg-white text-left">
        <div className="mb-6">
          <span className="inline-block px-2 py-1 rounded bg-blue-50 text-blue-600 text-[10px] font-bold mb-2 uppercase tracking-wider">
            {store.category || 'POPUP STORE'}
          </span>
          <h2 className="text-2xl font-bold text-gray-900 leading-tight">{store.name}</h2>
          <div className="flex items-center gap-1 mt-1 text-gray-500">
            <Icons.MapPin className="w-4 h-4" />
            <p className="text-sm">{store.location}</p>
          </div>
        </div>

        {/* 설명이 있다면 표시 (선택 사항) */}
        {store.description && (
          <p className="text-gray-600 text-sm mb-6 leading-relaxed">
            {store.description}
          </p>
        )}

        {/* 하단 버튼 그룹 */}
        <div className="grid grid-cols-2 gap-3 pb-2 mt-auto">
          <button 
            onClick={() => onShowSuccess('예약 완료', `${store.name} 예약이 정상적으로 처리되었습니다.`)}
            className="py-4 bg-black text-white rounded-2xl font-bold active:scale-95 transition-transform hover:bg-gray-800"
          >
            예약하기
          </button>
          <button 
            onClick={onClose} 
            className="py-4 bg-gray-100 text-gray-900 rounded-2xl font-bold active:scale-95 transition-transform hover:bg-gray-200"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

export default DetailModal;
