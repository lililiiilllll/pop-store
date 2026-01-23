import React from 'react';
import { motion } from 'framer-motion';
import PopupList from './PopupList';

const BottomSheetList = ({ stores, onStoreClick, userLocation, isOpen, setIsOpen }: any) => {
  return (
    <motion.div
      initial={{ y: "70%" }} 
      animate={{ y: isOpen ? "15%" : "72%" }} // 💡 72%일 때 리스트 상단 2개 정도만 보임
      transition={{ type: "spring", damping: 20, stiffness: 120 }}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      onDragEnd={(_, info) => {
        if (info.offset.y < -50) setIsOpen(true);
        if (info.offset.y > 50) setIsOpen(false);
      }}
      className="fixed inset-x-0 bottom-0 z-40 bg-white rounded-t-[32px] shadow-[0_-8px_30px_rgba(0,0,0,0.08)] flex flex-col h-[85vh] border-t border-gray-100"
    >
      {/* 드래그 핸들바 */}
      <div className="w-full flex justify-center py-3">
        <div className="w-10 h-1 bg-gray-200 rounded-full" />
      </div>

      <div className="px-5 pb-3">
        <h2 className="text-[17px] font-bold text-gray-900">내 주변 팝업</h2>
      </div>

      <div className="flex-1 overflow-y-auto pb-32">
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
