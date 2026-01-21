import React from 'react';

// 💡 types 폴더가 없는 경우를 대비해 인터페이스를 내부에 직접 정의하거나 
// 만약 types 파일이 루트에 있다면 경로를 수정해야 합니다. 
// 여기서는 안전하게 내부에 정의하거나 기존 import를 유지합니다.
interface PopupStore {
  id: string;
  name: string;
  location: string;
  category?: string;
  imageUrl?: string;
  description?: string;
  lat: number;
  lng: number;
}

const DEFAULT_POPUP_IMAGE = "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?q=80&w=1000&auto=format&fit=crop";

interface DetailModalProps {
  store: PopupStore | null;
  onClose: () => void;
  isLiked: boolean;
  onShowSuccess: (title: string, message: string) => void;
}

const DetailModal: React.FC<DetailModalProps> = ({ store, onClose, isLiked, onShowSuccess }) => {
  if (!store) return null;

  return (
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
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-black/30 backdrop-blur-md rounded-full text-white z-50 hover:bg-black/50 transition-colors"
          aria-label="Close modal"
        >
          {/* 💡 Icons.Close 대신 직접 SVG 삽입 */}
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
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
            {/* 💡 Icons.MapPin 대신 직접 SVG 삽입 */}
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            <p className="text-sm">{store.location}</p>
          </div>
        </div>

        {store.description && (
          <p className="text-gray-600 text-sm mb-6 leading-relaxed italic border-l-2 border-gray-100 pl-3">
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
