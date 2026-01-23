import React from 'react';
import { motion, useDragControls } from 'framer-motion';
import { PopupStore } from '../types';
import PopupList from './PopupList';

interface BottomSheetProps {
  stores: PopupStore[];
  onStoreClick: (store: PopupStore) => void;
  userLocation: { lat: number; lng: number } | null;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const BottomSheetList: React.FC<BottomSheetProps> = ({ 
  stores, onStoreClick, userLocation, isOpen, setIsOpen 
}) => {
  return (
    <motion.div
      initial={{ y: "60%" }} // 처음에 중간 정도만 올라와 있음
      animate={{ y: isOpen ? "15%" : "65%" }} // 열리면 위로, 닫히면 하단으로
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      onDragEnd={(_, info) => {
        if (info.offset.y < -50) setIsOpen(true); // 위로 올리면 전체 공개
        if (info.offset.y > 50) setIsOpen(false); // 아래로 내리면 축소
      }}
      className="fixed inset-x-0 bottom-0 z-40 bg-white rounded-t-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] flex flex-col h-[85vh]"
    >
      {/* 💡 핸들 바: 유저가 끌어올릴 수 있음을 인지하게 함 */}
      <div className="w-full flex justify-center py-4 cursor-grab active:cursor-grabbing">
        <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
      </div>

      <div className="px-5 pb-4 flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-900">주변 팝업 리스트</h2>
        <span className="text-sm text-gray-400 font-medium">{stores.length}개</span>
      </div>

      {/* 리스트 영역: 화면 중간까지만 보이게 높이 조절 */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pb-32">
        <PopupList 
          stores={stores} 
          onStoreClick={onStoreClick} 
          userLocation={userLocation} 
        />
      </div>
    </motion.div>
  );
};

export default BottomSheetList;
