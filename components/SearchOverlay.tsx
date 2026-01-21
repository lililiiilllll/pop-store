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

  // --- [중요] 아이콘 안전 장치: Icons에 해당 키가 없어도 앱이 죽지 않도록 설정 ---
  const ArrowLeftIcon = Icons.ArrowLeft || (() => <span>←</span>);
  const XIcon = Icons.X || (() => <span>✕</span>);
  const SearchIcon = Icons.Search || (() => <span>🔍</span>);
  const ChevronRightIcon = Icons.ChevronRight || (() => <span>&gt;</span>);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const filteredResults = searchQuery.trim() === '' 
    ? [] 
    : stores.filter(store => 
        store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        store.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (store.category && store.category.toLowerCase().includes(searchQuery.toLowerCase()))
      );

  const handleItemClick = (store: PopupStore) => {
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
      {/* 상단 바 */}
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
            className="w-full bg-gray-100 border-none rounded-2xl px-5 py-3 text-[16px] outline-none"
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

      {/* 결과 영역 */}
      <div className="flex-1 overflow-y
