import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// 💡 src 폴더가 없으므로 모든 경로를 현재 폴더(./)로 수정합니다.
import { Icons, POPUP_STORES } from './constants';
import { PopupStore } from './types';
import { supabase } from './lib/supabase';

// 컴포넌트들도 현재 폴더에 있다고 가정합니다.
import MapArea from './MapArea'; 
import PopupList from './PopupList';
import DetailModal from './DetailModal'; 

const App: React.FC = () => {
  const [allStores, setAllStores] = useState<PopupStore[]>([]);
  const [detailStore, setDetailStore] = useState<PopupStore | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);

  useEffect(() => {
    // 초기 데이터 설정 (Supabase 연결 안될 시 로컬 데이터 사용)
    const loadInitialData = async () => {
      try {
        const { data } = await supabase.from('popup_stores').select('*');
        if (data && data.length > 0) {
          setAllStores(data.map((s: any) => ({ ...s, id: String(s.id) })));
        } else {
          setAllStores(POPUP_STORES);
        }
      } catch {
        setAllStores(POPUP_STORES);
      }
    };
    loadInitialData();
  }, []);

  const handleStoreSelect = useCallback((id: string) => {
    const store = allStores.find(st => st.id === id);
    if (store) {
      setSelectedStoreId(id);
      setDetailStore(store);
    }
  }, [allStores]);

  return (
    <div className="relative flex h-screen w-full bg-white overflow-hidden">
      {/* 1. 사이드바 목록 */}
      <aside className="hidden lg:flex w-[350px] flex-col border-r border-gray-100 z-10">
        <div className="p-6 border-b font-bold text-xl">팝업스토어 탐색</div>
        <div className="flex-1 overflow-y-auto p-4">
          <PopupList stores={allStores} selectedStoreId={selectedStoreId} onStoreSelect={handleStoreSelect} />
        </div>
      </aside>

      {/* 2. 지도 영역 */}
      <main className="flex-1 relative">
        <MapArea stores={allStores} selectedStoreId={selectedStoreId} onMarkerClick={handleStoreSelect} />
      </main>

      {/* 3. 상세 모달 */}
      <AnimatePresence>
        {detailStore && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setDetailStore(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-lg z-50 overflow-hidden"
            >
              <DetailModal 
                store={detailStore} 
                onClose={() => setDetailStore(null)} 
                isLiked={false}
                onShowSuccess={(t, m) => alert(m)} 
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
