import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Icons } from '../constants';
import { PopupStore } from '../types';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  stores: PopupStore[];
  onSelectResult: (id: string) => void;
}

const SearchOverlay: React.FC<SearchOverlayProps> = ({ isOpen, onClose, stores, onSelectResult }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // --- [방어 코드] 아이콘이 undefined일 경우 대비 ---
  const ArrowLeftIcon = Icons?.ArrowLeft || (() => <span>←</span>);
  const XIcon = Icons?.X || (() => <span>✕</span>);
  const SearchIcon = Icons?.Search || (() => <span>🔍</span>);
  const ChevronRightIcon = Icons?.ChevronRight || (() => <span>&gt;</span>);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // 검색 필터링 (데이터 누락 대비 Optional Chaining 사용)
  const filteredResults = searchQuery.trim() === '' 
    ? [] 
    : (stores || []).filter(store => 
        store?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        store?.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        store?.category?.toLowerCase().includes(searchQuery.toLowerCase())
      );

  const handleItemClick = (store: PopupStore) => {
    if (!store?.id) return;
    onSelectResult(store.id);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[120] bg-white flex flex-col"
    >
      {/* 검색 상단 바 */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-100">
        <button 
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeftIcon size={24} className="text-gray-700" />
        </button>
        
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="팝업스토어 이름, 지역 검색"
            className="w-full bg-gray-100 border-none rounded-2xl px-5 py-3 text-[16px] focus:ring-2 focus:ring-blue-100 outline-none transition-all"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 bg-gray-300 rounded-full"
            >
              <XIcon size={12} className="text-white" />
            </button>
          )}
        </div>
      </div>

      {/* 검색 결과 영역 */}
      <div className="flex-1 overflow-y-auto bg-white">
        {searchQuery.trim() === '' ? (
          <div className="p-8 text-center text-gray-400">
            <SearchIcon size={48} className="mx-auto mb-4 opacity-20" />
            <p className="text-sm font-medium">찾으시는 팝업스토어를 입력해 보세요</p>
          </div>
        ) : filteredResults.length > 0 ? (
          <div className="p-2">
            <p className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
              검색 결과 {filteredResults.length}
            </p>
            {filteredResults.map((store) => (
              <button
                key={store.id}
                onClick={() => handleItemClick(store)}
                className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 active:bg-gray-100 rounded-2xl transition-colors text-left"
              >
                <div className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                  <img 
                    src={store.imageUrl} 
                    alt="" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=Popup';
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-gray-900 truncate">{store.name || '정보 없음'}</h4>
                  <p className="text-sm text-gray-500 truncate">{store.location || '위치 미정'}</p>
                </div>
                <ChevronRightIcon size={18} className="text-gray-300" />
              </button>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <p className="text-gray-500 font-medium">검색 결과가 없어요 🥲</p>
            <p className="text-sm text-gray-400 mt-1">철자가 맞는지 확인해 보세요.</p>
          </div>
        )}
      </div>

      {/* 추천 키워드 */}
      {searchQuery.trim() === '' && (
        <div className="p-6 border-t border-gray-50 bg-gray-50/30">
          <h5 className="text-sm font-bold text-gray-900 mb-4">인기 검색어</h5>
          <div className="flex flex-wrap gap-2">
            {['성수', '서울숲', '전시', '무료'].map(keyword => (
              <button 
                key={keyword}
                onClick={() => setSearchQuery(keyword)}
                className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-600 hover:border-blue-500 hover:text-blue-500 transition-all"
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
