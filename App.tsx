import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// 1. 설정 및 타입 파일
import { Icons, POPUP_STORES, DEFAULT_POPUP_IMAGE } from './constants';
import { PopupStore, UserProfile } from './types';
import { supabase } from './lib/supabase';

// 2. 컴포넌트들
import Header from './components/Header';
import MapArea from './components/MapArea';
import PopupList from './components/PopupList';
import CategoryFilter from './components/CategoryFilter';
import AdminDashboard from './components/AdminDashboard';
import SearchOverlay from './components/SearchOverlay';
import LocationSelector from './components/LocationSelector';
import SuccessModal from './components/SuccessModal';
import LoginModal from './components/LoginModal';
import BottomNav from './components/BottomNav';

// 💡 404 및 Error 130 방지를 위한 명확한 Import
import DetailModal from './components/DetailModal';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'home' | 'saved'>('home');
  const [selectedFilter, setSelectedFilter] = useState<string>('전체');
  const [allStores, setAllStores] = useState<PopupStore[]>([]);
  const [sheetOpen, setSheetOpen] = useState(true);
  const [userCoords, setUserCoords] = useState<{lat: number, lng: number} | null>(null);
  const [likedStoreIds] = useState<Set<string>>(new Set());
  const [showLikedOnly, setShowLikedOnly] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isLocationSelectorOpen, setIsLocationSelectorOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [successConfig, setSuccessConfig] = useState({ isOpen: false, title: '', message: '' });

  const [detailStore, setDetailStore] = useState<PopupStore | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<{lat: number, lng: number} | undefined>(undefined);
  const [currentLocationName, setCurrentLocationName] = useState('성수/서울숲');

  const fetchStores = async () => {
    try {
      const { data, error } = await supabase.from('popup_stores').select('*');
      if (error) throw error;
      const processed = (data || []).map((item: any) => ({
        ...item,
        id: item.id.toString(),
        imageUrl: item.image_url || DEFAULT_POPUP_IMAGE,
        lat: Number(item.lat),
        lng: Number(item.lng),
      }));
      setAllStores(processed);
    } catch (err) {
      setAllStores(POPUP_STORES);
    }
  };

  useEffect(() => {
    fetchStores();
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => setUserCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => setUserCoords({ lat: 37.5547, lng: 126.9706 })
      );
    }
  }, []);

  const displayStores = useMemo(() => {
    return allStores.filter(s => {
      if (selectedFilter === '지금 오픈') return true; // 필터 로직 생략(단순화)
      return true;
    });
  }, [allStores, selectedFilter]);

  const handleStoreSelect = useCallback((id: string) => {
    const store = allStores.find(st => st.id === id);
    if (store) {
      setSelectedStoreId(id);
      setDetailStore(store);
      setMapCenter({ lat: store.lat, lng: store.lng });
      if (window.innerWidth < 1024) setSheetOpen(false);
    }
  }, [allStores]);

  if (isAdminOpen) return <AdminDashboard allStores={allStores} onBack={() => setIsAdminOpen(false)} onRefresh={fetchStores} />;

  return (
    <div className="relative h-screen w-full overflow-hidden bg-white">
      {/* 데스크탑 사이드바 */}
      <aside className="hidden lg:flex w-[400px] flex-col z-10 bg-white border-r h-full">
        <Header location={currentLocationName} onSearchClick={() => setIsSearchOpen(true)} onAdminClick={() => setIsAdminOpen(true)} onProfileClick={() => setIsLoginModalOpen(true)} onLocationClick={() => setIsLocationSelectorOpen(true)} />
        <CategoryFilter selected={selectedFilter} onSelect={setSelectedFilter} showLikedOnly={showLikedOnly} onToggleLiked={() => setShowLikedOnly(!showLikedOnly)} />
        <div className="flex-1 overflow-y-auto p-4">
          <PopupList stores={displayStores} selectedStoreId={selectedStoreId} onStoreSelect={handleStoreSelect} />
        </div>
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      </aside>

      {/* 메인 지도 영역 */}
      <main className="flex-1 relative">
        <MapArea stores={allStores} selectedStoreId={selectedStoreId} onMarkerClick={handleStoreSelect} mapCenter={mapCenter} userLocation={userCoords} onDetailOpen={setDetailStore} />
        
        {/* 모바일 하단 시트 */}
        <div className="lg:hidden absolute inset-0 pointer-events-none z-20 flex flex-col justify-end">
          <motion.div animate={{ y: sheetOpen ? 0 : '70%' }} className="w-full h-[70vh] bg-white rounded-t-[32px] shadow-2xl pointer-events-auto flex flex-col">
            <div className="h-8 flex items-center justify-center" onClick={() => setSheetOpen(!sheetOpen)}>
              <div className="w-10 h-1.5 bg-gray-200 rounded-full" />
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-20">
              <PopupList stores={displayStores} selectedStoreId={selectedStoreId} onStoreSelect={handleStoreSelect} />
            </div>
          </motion.div>
        </div>
      </main>

      {/* 상세 모달 포탈 (가장 높은 z-index) */}
      <AnimatePresence>
        {detailStore && (
          <div className="fixed inset-0 z-[9999] flex items-end lg:items-center justify-center p-0 lg:p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { setDetailStore(null); setSelectedStoreId(null); }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
            />
            <motion.div 
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              className="relative w-full lg:max-w-xl bg-white shadow-2xl z-50 rounded-t-[32px] lg:rounded-2xl overflow-hidden"
            >
              <DetailModal 
                store={detailStore} 
                onClose={() => { setDetailStore(null); setSelectedStoreId(null); }} 
                isLiked={likedStoreIds.has(detailStore.id)}
                onShowSuccess={(t, m) => setSuccessConfig({ isOpen: true, title: t, message: m })}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 성공 모달 */}
      <SuccessModal isOpen={successConfig.isOpen} title={successConfig.title} message={successConfig.message} onClose={() => setSuccessConfig(p => ({...p, isOpen: false}))} />
    </div>
  );
};

export default App;
