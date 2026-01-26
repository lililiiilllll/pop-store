import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icons } from '../constants';
import { PopupStore } from '../types';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  stores: PopupStore[];
  onSelectResult: (id: string) => void;
  onSearchChange: (query: string) => void; // 부모(App)의 검색 상태를 업데이트하기 위한 함수 추가
}

const SearchOverlay: React.FC<SearchOverlayProps> = ({ 
  isOpen, 
  onClose, 
  stores = [], 
  onSelectResult,
  onSearchChange // 프롭스 받아오기
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // 모달 오픈 시 자동 포커스
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => inputRef.current?.focus(), 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // 검색 로직: 이름, 지역, 카테고리 통합 검색
  const filteredResults = searchQuery.trim() === '' 
    ? [] 
    : stores.filter(store => {
        const query = searchQuery.toLowerCase();
        // store.name 또는 store.title (App.tsx에서 변환한 값) 대응
        const nameMatch = (store.name || store.title || "").toLowerCase().includes(query);
        const locationMatch = (store.location || "").toLowerCase().includes(query);
        const categoryMatch = (store.category || "").toLowerCase().includes(query);
        return nameMatch || locationMatch || categoryMatch;
      });

  const handleItemClick = (storeId: string) => {
    onSelectResult(storeId); // 부모(App.tsx)의 이동 로직 호출
    onClose(); // 검색창 닫기
    setSearchQuery(''); 
    onSearchChange(''); // 부모 상태도 초기화
  };

  // 입력값이 바뀔 때마다 부모에게 전달하는 핸들러
  const handleInputChange = (val: string) => {
    setSearchQuery(val);
    onSearchChange(val); // 핵심: 입력 시마다 App.tsx의 visibleStores 연산에 영향을 줌
  };

  // 아이콘 안전장치
  const ArrowLeftIcon = Icons?.ArrowLeft || (() => <span>←</span>);
  const XIcon = Icons?.X || (() => <span>✕</span>);
  const SearchIcon = Icons?.Search || (() => <span>🔍</span>);
  const ChevronRightIcon = Icons?.ChevronRight || (() => <span>&gt;</span>);

  if (!isOpen) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="fixed inset-0 z-[120] bg-white flex flex-col"
    >
      {/* 상단 검색바 */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-100">
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeftIcon size={24} className="text-gray-700" />
        </button>
        
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => handleInputChange(e.target.value)} // 커스텀 핸들러 사용
            placeholder="팝업스토어 이름, 지역 검색"
            className="w-full bg-gray-100 border-none rounded-2xl px-5 py-3.5 text-[16px] focus:ring-2 focus:ring-blue-100 outline-none transition-all"
          />
          {searchQuery && (
            <button 
              onClick={() => handleInputChange('')} // 초기화 시에도 부모에게 알림
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 bg-gray-300 rounded-full hover:bg-gray-400 transition-colors"
            >
              <XIcon size={12} className="text-white" />
            </button>
          )}
        </div>
      </div>

      {/* 검색 결과 영역 */}
      <div className="flex-1 overflow-y-auto">
        {searchQuery.trim() === '' ? (
          <div className="p-12 text-center text-gray-400">
            <SearchIcon size={56} className="mx-auto mb-4 opacity-10" />
            <p className="text-[15px] font-medium">가고 싶은 팝업을 찾아보세요</p>
          </div>
        ) : filteredResults.length > 0 ? (
          <div className="p-2">
            <div className="px-4 py-3 flex justify-between items-center">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">검색 결과 {filteredResults.length}</span>
            </div>
            {filteredResults.map((store) => (
              <button
                key={store.id}
                onClick={() => handleItemClick(store.id)}
                className="w-full flex items-center gap-4 p-4 hover:bg-blue-50/50 active:bg-blue-50 rounded-2xl transition-colors text-left group"
              >
                <div className="w-14 h-14 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-50">
                  <img 
                    src={store.imageUrl} 
                    alt="" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/150?text=Popup')}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-gray-900 truncate mb-0.5">{store.name || store.title}</h4>
                  <p className="text-[13px] text-gray-500 truncate flex items-center gap-1">
                    <span className="inline-block w-1 h-1 bg-gray-300 rounded-full" />
                    {store.location}
                  </p>
                </div>
                <ChevronRightIcon size={18} className="text-gray-300 group-hover:text-blue-400 transition-colors" />
              </button>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <p className="text-gray-500 font-medium">검색 결과가 없어요 🥲</p>
            <p className="text-sm text-gray-400 mt-1">철자가 맞는지 다시 확인해 볼까요?</p>
          </div>
        )}
      </div>

      {/* 하단 추천 키워드 */}
      {searchQuery.trim() === '' && (
        <div className="p-8 border-t border-gray-50 bg-gray-50/30">
          <h5 className="text-[13px] font-bold text-gray-400 mb-4 px-1 uppercase tracking-wider">인기 키워드</h5>
          <div className="flex flex-wrap gap-2">
            {['성수', '서울숲', '한정판', '무료전시'].map(keyword => (
              <button 
                key={keyword}
                onClick={() => handleInputChange(keyword)} // 추천 클릭 시에도 연동
                className="px-4 py-2 bg-white border border-gray-200 rounded-full text-[14px] font-medium text-gray-600 hover:border-blue-500 hover:text-blue-500 transition-all shadow-sm"
              >
                # {keyword}
              </button>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default SearchOverlay;
