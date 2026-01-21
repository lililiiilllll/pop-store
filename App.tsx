import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// 1. 설정 및 타입 (경로 확인 필수)
import { Icons, POPUP_STORES, DEFAULT_POPUP_IMAGE } from './constants';
import { PopupStore } from './types';
import { supabase } from './lib/supabase';

// 2. 컴포넌트 임포트
import MapArea from './components/MapArea';
import PopupList from './components/PopupList';
import DetailModal from './components/DetailModal'; // export default 방식

const App: React.FC = () => {
  const [allStores, setAllStores] = useState<PopupStore[]>([]);
  const [detailStore, setDetailStore] = useState<PopupStore | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 데이터 가져오기 (실패 시 로컬 데이터라도 사용)
  const fetchStores = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('popup_stores').select('*');
      
      if (error || !data || data.length === 0) {
        console.log("Supabase 데이터 없음, 로컬 데이터를 사용합니다.");
        setAllStores(POPUP_STORES);
      } else {
        const processed = data.map((item: any) => ({
          ...item,
          id: String(item.id),
          imageUrl: item.image_url || DEFAULT_POPUP_IMAGE,
          lat: Number(item.lat),
          lng: Number(item.lng),
        }));
        setAllStores(processed);
      }
    } catch (err) {
      setAllStores(POPUP_STORES);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStores();
  }, []);

  const handleStoreSelect = useCallback((id: string) => {
    const store = allStores.find(st => st.id === id);
    if (store) {
      setSelectedStoreId(id);
      setDetailStore(store);
    }
  }, [allStores]);

  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-white">
      {/* 사이드바 리스트 */}
      <aside className="w-[350px] border-r flex flex-col z-10 bg-white">
        <div className="p-4 border-b font-bold text-lg">팝업 스토어 목록</div>
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-10">데이터 로딩 중...</div>
          ) : (
            <PopupList 
              stores={allStores} 
              selectedStoreId={selectedStoreId} 
              onStoreSelect={handleStoreSelect} 
            />
          )}
        </div>
      </aside>

      {/* 메인 지도 */}
      <main className="flex-1 relative">
        <MapArea 
          stores={allStores} 
          selectedStoreId={selectedStoreId} 
          onMarkerClick={handleStoreSelect} 
        />
      </main>

      {/* 상세 모달 (Error #130 방어를 위해 컴포넌트 존재 여부 체크) */}
      <AnimatePresence>
        {detailStore && DetailModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setDetailStore(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-lg z-50 shadow-2xl"
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
