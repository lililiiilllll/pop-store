import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// 컴포넌트 임포트 (경로와 대소문자를 반드시 확인하세요!)
import { Icons, POPUP_STORES } from './constants';
import { PopupStore } from './types';
import MapArea from './components/MapArea';
import PopupList from './components/PopupList';

// DetailModal 임포트 방식 변경 (Error #130 해결 핵심)
import DetailModalComp from './components/DetailModal'; 

const App: React.FC = () => {
  const [allStores, setAllStores] = useState<PopupStore[]>([]);
  const [detailStore, setDetailStore] = useState<PopupStore | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);

  // 데이터 로드 생략... (기존 fetchStores 로직 유지)

  const handleStoreSelect = useCallback((id: string) => {
    const store = allStores.find(st => st.id === id);
    if (store) {
      setDetailStore({...store}); // 새로운 객체 참조로 전달
      setSelectedStoreId(id);
    }
  }, [allStores]);

  return (
    <div className="relative h-screen w-full overflow-hidden bg-white">
      <main className="flex h-full">
        {/* 리스트 영역 */}
        <div className="hidden lg:block w-[400px] border-r overflow-y-auto p-4">
          <PopupList stores={allStores} selectedStoreId={selectedStoreId} onStoreSelect={handleStoreSelect} />
        </div>

        {/* 지도 영역 */}
        <div className="flex-1 relative">
          <MapArea stores={allStores} onMarkerClick={handleStoreSelect} />
        </div>
      </main>

      {/* 상세 모달 포탈 레이어 */}
      <AnimatePresence mode="wait">
        {detailStore && (
          <div className="fixed inset-0 z-[9999] flex items-end lg:items-center justify-center">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setDetailStore(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
            />
            <motion.div 
              initial={{ y: "100%" }} 
              animate={{ y: 0 }} 
              exit={{ y: "100%" }}
              className="relative w-full lg:max-w-xl z-[10000] pointer-events-auto"
            >
              {/* 컴포넌트가 undefined가 아닌지 확인 후 렌더링 */}
              {DetailModalComp ? (
                <DetailModalComp 
                  store={detailStore} 
                  onClose={() => setDetailStore(null)} 
                  isLiked={false}
                  onShowSuccess={(t, m) => alert(`${t}: ${m}`)}
                />
              ) : (
                <div className="p-10 bg-white">Loading Component Error...</div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
