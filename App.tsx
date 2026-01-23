import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// 1. 설정 및 타입
import { Icons, POPUP_STORES } from './constants';
import { PopupStore, UserProfile } from './types';
import { supabase } from './lib/supabase';

// 2. 컴포넌트 임포트
import Header from './components/Header';
import MapArea from './components/MapArea';
import PopupList from './components/PopupList';
import CategoryFilter from './components/CategoryFilter';
import AdminDashboard from './components/AdminDashboard';
import DetailModal from './components/DetailModal';
import SearchOverlay from './components/SearchOverlay';
import LocationSelector from './components/LocationSelector';
import SuccessModal from './components/SuccessModal';
import LoginModal from './components/LoginModal';
import ProfileModal from './components/ProfileModal';
import BottomNav from './components/BottomNav';

const DEFAULT_LOCATION = { lat: 37.5547, lng: 126.9706 };
const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1531050171669-7df9b2089206?q=80&w=400&auto=format&fit=crop';

const App: React.FC = () => {
  // --- 상태 관리 ---
  const [activeTab, setActiveTab] = useState<'home' | 'saved'>('home');
  const [selectedFilter, setSelectedFilter] = useState<string>('전체');
  const [allStores, setAllStores] = useState<PopupStore[]>([]);
  const [savedStoreIds, setSavedStoreIds] = useState<string[]>([]); 
  const [userCoords, setUserCoords] = useState<{lat: number, lng: number} | null>(null);
  
  // 지도 영역 및 센터 관리
  const [mapBounds, setMapBounds] = useState<any>(null);
  const [mapCenter, setMapCenter] = useState<{lat: number, lng: number} | undefined>(undefined);
  const [currentLocationName, setCurrentLocationName] = useState('성수/서울숲');
  const [isMobileListOpen, setIsMobileListOpen] = useState(false);

  // 모달 제어
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isLocationSelectorOpen, setIsLocationSelectorOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [successConfig, setSuccessConfig] = useState({ isOpen: false, title: '', message: '' });
  const [detailStore, setDetailStore] = useState<PopupStore | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);

  // --- 헬퍼 함수: 거리 계산 ---
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    return Math.sqrt(Math.pow(lat2 - lat1, 2) + Math.pow(lng2 - lng1, 2));
  };

  // --- 💡 찜하기 토글 함수 ---
  const toggleSaveStore = useCallback((id: string) => {
    setSavedStoreIds(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  }, []);

  // --- 💡 [에러 해결] handleMapIdle 함수 정의 ---
  const handleMapIdle = useCallback((bounds: any, center: {lat: number, lng: number}) => {
    setMapBounds(bounds);
    setMapCenter(center);
  }, []);

  // --- 💡 필터링 로직 ---
  const visibleStores = useMemo(() => {
    let filtered = allStores;

    // 1. 탭 필터 (찜한 목록 모드)
    if (activeTab === 'saved') {
      filtered = filtered.filter(s => savedStoreIds.includes(s.id));
    }

    // 2. 카테고리 필터
    if (selectedFilter !== '전체') {
      filtered = filtered.filter(s => s.category === selectedFilter);
    }

    // 3. 지도 영역 필터 (홈 탭일 때만 지도를 따라감)
    if (activeTab === 'home' && mapBounds) {
      const inBounds = filtered.filter(s => 
        s.lat >= mapBounds.minLat && s.lat <= mapBounds.maxLat && 
        s.lng >= mapBounds.minLng && s.lng <= mapBounds.maxLng
      );
      
      // 영역 내 데이터가 없을 때 가장 가까운 것 하나 추천
      if (inBounds.length === 0 && filtered.length > 0 && mapCenter) {
        const closest = filtered.reduce((prev, curr) => {
          const prevDist = calculateDistance(mapCenter.lat, mapCenter.lng, prev.lat, prev.lng);
          const currDist = calculateDistance(mapCenter.lat, mapCenter.lng, curr.lat, curr.lng);
          return prevDist < currDist ? prev : curr;
        });
        return [closest];
      }
      return inBounds;
    }
    return filtered;
  }, [allStores, selectedFilter, mapBounds, mapCenter, activeTab, savedStoreIds]);

  // --- 데이터 로드 ---
  const fetchStores = async () => {
    try {
      const { data } = await supabase.from('popup_stores').select('*').order('created_at', { ascending: false });
      if (data) {
        setAllStores(data.map((s: any) => ({ 
          ...s, 
          id: String(s.id), 
          title: s.title || s.name, 
          imageUrl: s.image_url && s.image_url.startsWith('http') ? s.image_url : FALLBACK_IMAGE 
        })));
      }
    } catch (e) { console.error("Fetch Error:", e); }
  };

  useEffect(() => {
    fetchStores();
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => setUserCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => setUserCoords(DEFAULT_LOCATION)
      );
    }
  }, []);

  // --- 핸들러 ---
  const handleStoreSelect = useCallback((id: string) => {
    const store = allStores.find(st => st.id === id);
    if (store) {
      setDetailStore({ ...store }); 
      setSelectedStoreId(id);
      setMapCenter({ lat: store.lat, lng: store.lng });
      setIsSearchOpen(false); 
      if (activeTab === 'home') setIsMobileListOpen(false);
    }
  }, [allStores, activeTab]);

  if (isAdminOpen) return <AdminDashboard allStores={allStores} onBack={() => setIsAdminOpen(false)} onRefresh={fetchStores} />;

  return (
    <div className="relative flex flex-col lg:flex-row h-screen w-full overflow-hidden bg-white text-gray-900 font-sans">
      
      {/* PC 사이드바 */}
      <aside className="hidden lg:flex w-[400px] flex-col z-10 bg-white border-r border-gray-100 shadow-xl overflow-hidden">
        <Header location={currentLocationName} onSearchClick={() => setIsSearchOpen(true)} onAdminClick={() => setIsAdminOpen(true)} onProfileClick={() => setIsProfileModalOpen(true)} onLocationClick={() => setIsLocationSelectorOpen(true)} />
        <CategoryFilter selected={selectedFilter} onSelect={setSelectedFilter} />
        <div className="px-5 pt-4 pb-2"><h2 className="text-lg font-bold">{activeTab === 'home' ? '주변 인기 팝업' : '내가 찜한 팝업'}</h2></div>
        <div className="flex-1 overflow-y-auto bg-gray-50/30 p-4">
          <PopupList stores={visibleStores} onStoreClick={(s) => handleStoreSelect(s.id)} userLocation={userCoords} />
        </div>
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      </aside>

      {/* 메인 지도 영역 */}
      <main className="flex-1 relative z-0">
        <MapArea 
          stores={activeTab === 'home' ? allStores : allStores.filter(s => savedStoreIds.includes(s.id))} 
          selectedStoreId={selectedStoreId} 
          onMarkerClick={handleStoreSelect} 
          mapCenter={mapCenter} 
          userLocation={userCoords} 
          onMapIdle={handleMapIdle} // 💡 이제 정상적으로 정의됨
          onMapClick={() => { setIsMobileListOpen(false); setDetailStore(null); }}
        />
        
        {/* 모바일 상단 헤더 */}
        <div className="lg:hidden absolute top-0 left-0 right-0 z-20 bg-white/90 backdrop-blur-md shadow-sm">
          <Header location={currentLocationName} onSearchClick={() => setIsSearchOpen(true)} onLocationClick={() => setIsLocationSelectorOpen(true)} />
          <CategoryFilter selected={selectedFilter} onSelect={setSelectedFilter} />
        </div>

        {/* 모바일 하단 버튼 & 바텀 시트 */}
        {!isMobileListOpen && (
          <div className="lg:hidden absolute bottom-28 left-1/2 -translate-x-1/2 z-30">
            <button onClick={() => setIsMobileListOpen(true)} className="bg-black text-white px-7 py-4 rounded-full shadow-2xl font-bold text-sm flex items-center gap-2">
              <Icons.List size={18} /> {activeTab === 'home' ? '목록보기' : '찜한 목록보기'}
            </button>
          </div>
        )}

        <div className="lg:hidden">
          <motion.div initial={{ y: "100%" }} animate={{ y: isMobileListOpen ? "8%" : "100%" }} transition={{ type: "spring", damping: 28, stiffness: 220 }}
            className="fixed inset-x-0 bottom-0 z-40 bg-white rounded-t-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.15)] flex flex-col h-[92vh]">
            <div className="flex items-center justify-between px-6 pt-7 pb-3">
              <h2 className="text-xl font-extrabold text-gray-900">{activeTab === 'home' ? '주변 팝업 리스트' : '찜한 팝업 목록'}</h2>
              <button onClick={() => setIsMobileListOpen(false)} className="p-2.5 bg-gray-100 rounded-full text-gray-500"><Icons.X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto pb-32">
              {visibleStores.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <p>{activeTab === 'home' ? '주변에 팝업이 없어요' : '찜한 팝업이 없습니다.'}</p>
                </div>
              ) : (
                <PopupList stores={visibleStores} onStoreClick={(s) => handleStoreSelect(s.id)} userLocation={userCoords} />
              )}
            </div>
          </motion.div>
          <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
      </main>

      {/* 모달 레이어 */}
      <AnimatePresence>
        {detailStore && (
          <div className="fixed inset-0 z-[9999] flex items-end lg:items-center justify-center overflow-hidden">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setDetailStore(null); setSelectedStoreId(null); }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="relative w-full lg:max-w-xl bg-white rounded-t-[32px] lg:rounded-2xl overflow-hidden shadow-2xl">
              <DetailModal 
                store={detailStore} 
                isSaved={savedStoreIds.includes(detailStore.id)} 
                onToggleSave={() => toggleSaveStore(detailStore.id)} 
                onClose={() => { setDetailStore(null); setSelectedStoreId(null); }} 
                onShowSuccess={(t, m) => setSuccessConfig({ isOpen: true, title: t, message: m })} 
              />
            </motion.div>
          </div>
        )}
        {isSearchOpen && <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} stores={allStores} onSelectResult={handleStoreSelect} />}
        {isLocationSelectorOpen && <LocationSelector isOpen={isLocationSelectorOpen} onClose={() => setIsLocationSelectorOpen(false)} onSelect={(loc: any) => { setCurrentLocationName(loc.name); setMapCenter({ lat: loc.lat, lng: loc.lng }); setIsLocationSelectorOpen(false); }} />}
        {successConfig.isOpen && <SuccessModal isOpen={successConfig.isOpen} title={successConfig.title} message={successConfig.message} onClose={() => setSuccessConfig(p => ({...p, isOpen: false}))} />}
      </AnimatePresence>
    </div>
  );
};

export default App;
