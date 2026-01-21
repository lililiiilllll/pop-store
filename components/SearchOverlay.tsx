import React, { useState, useMemo } from 'react';
import { Icons } from '../constants';
import { PopupStore } from '../types';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  stores: PopupStore[];
  onSelectResult: (id: string) => void;
}

const SearchOverlay: React.FC<SearchOverlayProps> = ({ isOpen, onClose, stores, onSelectResult }) => {
  const [keyword, setKeyword] = useState('');

  // 키워드에 따른 실시간 필터링
  const filteredResults = useMemo(() => {
    if (!keyword.trim()) return [];
    return stores.filter(s => 
      s.name.toLowerCase().includes(keyword.toLowerCase()) || 
      s.location.toLowerCase().includes(keyword.toLowerCase())
    );
  }, [keyword, stores]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col animate-in fade-in slide-in-from-bottom-4">
      {/* 검색 헤더 */}
      <div className="p-4 flex items-center gap-3 border-b border-gray-100">
        <button onClick={onClose} className="p-2 -ml-2 text-gray-400">
          <Icons.ChevronLeft size={24} />
        </button>
        <div className="flex-1 relative">
          <input
            autoFocus
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="팝업스토어 이름이나 지역 검색"
            className="w-full bg-gray-100 px-4 py-2.5 rounded-xl text-[15px] focus:outline-none focus:ring-2 focus:ring-tossBlue/20"
          />
          {keyword && (
            <button 
              onClick={() => setKeyword('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 bg-gray-200 rounded-full p-0.5"
            >
              <Icons.X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* 검색 결과 리스트 */}
      <div className="flex-1 overflow-y-auto p-4">
        {keyword.length > 0 ? (
          filteredResults.length > 0 ? (
            <div className="space-y-4">
              {filteredResults.map(store => (
                <div 
                  key={store.id}
                  onClick={() => {
                    onSelectResult(store.id);
                    onClose();
                  }}
                  className="flex items-center gap-4 p-2 active:bg-gray-50 rounded-xl transition-colors cursor-pointer"
                >
                  <img src={store.imageUrl} alt="" className="w-14 h-14 rounded-lg object-cover" />
                  <div className="flex-1 border-b border-gray-50 pb-2">
                    <h4 className="font-bold text-gray-900">{store.name}</h4>
                    <p className="text-sm text-gray-500 truncate">{store.location}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 pb-20">
              <Icons.Search size={48} className="mb-4 opacity-20" />
              <p>검색 결과가 없어요</p>
            </div>
          )
        ) : (
          <div className="pt-4">
            <h3 className="text-xs font-bold text-gray-400 mb-4 px-2 uppercase tracking-wider">추천 검색어</h3>
            <div className="flex flex-wrap gap-2">
              {['성수', '잠실', '전시', '무료'].map(tag => (
                <button 
                  key={tag}
                  onClick={() => setKeyword(tag)}
                  className="px-4 py-2 bg-gray-50 rounded-full text-sm text-gray-600 font-medium hover:bg-gray-100"
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchOverlay;
