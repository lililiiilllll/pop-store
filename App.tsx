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
  // --- 💡 관리자 및 테스트 관련 상태 추가 ---
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [isTestPanelOpen, setIsTestPanelOpen] = useState(true);

  const [activeTab, setActiveTab] = useState<'home' | 'saved'>('home');
  const [selectedFilter, setSelectedFilter] = useState<string>('전체');
  const [allStores, setAllStores] = useState<PopupStore[]>([]);
  const [savedStoreIds, setSavedStoreIds] = useState<string[]>([]); 
  const [userCoords, setUserCoords] = useState<{lat: number, lng: number} | null>(null);
  
  const [mapBounds, setMapBounds] = useState<any>(null);
  const [mapCenter, setMapCenter] = useState<{lat: number, lng: number} | undefined>(undefined);
  const [currentLocationName, setCurrentLocationName] = useState('성수/서울숲');
  const [isMobileListOpen, setIsMobileListOpen] = useState(false);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isLocationSelectorOpen, setIsLocationSelectorOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [successConfig, setSuccessConfig] = useState({ isOpen: false, title: '', message: '' });
  const [detailStore, setDetailStore] = useState<PopupStore | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);

  const MapIcon = Icons.Map || Icons.Square || 'div';
  const HeartIcon = Icons.Heart || Icons.Square || 'div';
  const ListIcon = Icons.List || Icons.Square || 'div';
  const XIcon = Icons.X || Icons.Square || 'div';

  // --- 💡 임시 로그인 핸들러 ---
  const handleAdminLogin = () => {
    setIsAdminLoggedIn(true);
    setSuccessConfig({
      isOpen: true,
      title: '관리자 인증',
      message: '관리자 권한이 활성화되었습니다.'
    });
  };

  const handleUserLogin = () => {
    setIsAdminLoggedIn(false);
    setIsAdminOpen(false);
    setSuccessConfig({
      isOpen: true,
      title: '일반 유저 모드',
      message: '테스트 계정으로 전환되었습니다.'
    });
  };

  const toggleSaveStore = useCallback((id: string) => {
    setSavedStoreIds(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  }, []);

  const handleMapIdle = useCallback((bounds: any, center: {lat: number, lng: number}) => {
    setMapBounds(bounds);
    setMapCenter(center);
  }, []);

  const visibleStores = useMemo(() => {
    let filtered = allStores;
    if (activeTab === 'saved') {
      filtered = filtered.filter(s => savedStoreIds.includes(s.id));
    }
    if (selectedFilter !== '전체') {
      if (selectedFilter === '무료입장') {
        filtered = filtered.filter(s => s.is_free === true);
      } else {
        filtered = filtered.filter(s => s.category === selectedFilter);
      }
    }
    if (activeTab === 'home' && mapBounds) {
      filtered = filtered.filter(s => 
        s.lat >= mapBounds.minLat && s.lat <= mapBounds.maxLat && 
        s.lng >= mapBounds.minLng && s.lng <= mapBounds.maxLng
      );
    }
    return filtered;
  }, [allStores, selectedFilter, mapBounds, activeTab, savedStoreIds]);

  const fetchStores = async () => {
    try {
      const { data } = await supabase.from('popup_stores').select('*').order('created_at', { ascending: false });
      if (data) {
        setAllStores(data.map((s: any) => ({ 
          ...s, id: String(s.id), title: s.title || s.name, 
          is_free: s.is_free === true || s.is_free === 'true',
          imageUrl: s.image_url && s.image_url.startsWith('http') ? s.image_url : FALLBACK_IMAGE 
        })));
      }
    } catch (e) { console.error(e); }
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

  // 관리자 권한이 있고, 관리자 창이 열렸을 때만 대시보드 표시
  if (isAdminOpen && isAdminLoggedIn) {
    return <AdminDashboard allStores={allStores} onBack={() => setIsAdminOpen(false)} onRefresh={fetchStores} />;
  }

  return (
    <div className="relative flex flex-col lg:flex-row h-screen w-full overflow-hidden bg-white text-[#191f28]">
      
      {/* 💡 개발용 임시 테스트 패널 (우측 상단 플로팅) */}
      <AnimatePresence>
        {isTestPanelOpen && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
            className="fixed top-24 right-6 z-[100] bg-white/90 backdrop-blur-xl p-4 rounded-[20px] shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-[#f2f4f6] flex flex-col gap-2 min-w-[160px]"
          >
            <div className="flex justify-between items-center mb-1 px-1">
              <span className="text-[11px] font-bold text-[#3182f6] tracking-tight">DEBUG CONSOLE</span>
              <button onClick={() => setIsTestPanelOpen(false)} className="text-[#8b95a1] hover:text-[#4e5968]"><XIcon size={14} /></button>
            </div>
            <button 
              onClick={handleAdminLogin}
              className={`px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all ${isAdminLoggedIn ? 'bg-[#3182f6] text-white' : 'bg-[#f2f4f6] text-[#4e5968]'}`}
            >
              관리자 로그인
            </button>
            <button 
              onClick={handleUserLogin}
              className={`px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all ${!isAdminLoggedIn ? 'bg-[#3182f6] text-white' : 'bg-[#f2f4f6] text-[#4e5968]'}`}
            >
              테스트 계정
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. PC 사이드바 */}
      <aside className="hidden lg:flex w-[400px] flex-col z-10 bg-white border-r border-[#f2f4f6] shadow-sm overflow-hidden">
        <Header 
          location={currentLocationName} 
          onSearchClick={() => setIsSearchOpen(true)} 
          onAdminClick={() => {
            if (isAdminLoggedIn) setIsAdminOpen(true);
            else alert("관리자 권한이 필요합니다. 디버그 콘솔을 확인해주세요.");
          }} 
          onProfileClick={() => setIsProfileModalOpen(true)} 
          onLocationClick={() => setIsLocationSelectorOpen(true)} 
        />
        
        <div className="no-scrollbar overflow-x-auto">
           <CategoryFilter selected={selectedFilter} onSelect={setSelectedFilter} />
        </div>
        
        <div className="px-5 py-4 bg-white border-b border-[#f9fafb]">
          <div className="flex bg-[#f2f4f6] p-1 rounded-[14px]">
            <button onClick={() => setActiveTab('home')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-[14px] font-bold rounded-[12px] transition-all ${activeTab === 'home' ? 'bg-white shadow-sm text-[#3182f6]' : 'text-[#8b95a1]'}`}>
              <MapIcon size={16} /> 전체 팝업
            </button>
            <button onClick={() => setActiveTab('saved')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-[14px] font-bold rounded-[12px] transition-all ${activeTab === 'saved' ? 'bg-white shadow-sm text-[#3182f6]' : 'text-[#8b95a1]'}`}>
              <HeartIcon size={16} className={activeTab === 'saved' ? 'fill-[#3182f6] text-[#3182f6]' : ''} /> 찜한 목록
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-white p-4 custom-scrollbar">
          <PopupList stores={visibleStores} onStoreClick={(s) => handleStoreSelect(s.id)} userLocation={userCoords} />
        </div>
      </aside>

      {/* 2. 메인 지도 및 모바일 */}
      <main className="flex-1 relative z-0">
        <MapArea 
          stores={activeTab === 'home' ? allStores : allStores.filter(s => savedStoreIds.includes(s.id))} 
          selectedStoreId={selectedStoreId} onMarkerClick={handleStoreSelect} mapCenter={mapCenter} userLocation={userCoords} onMapIdle={handleMapIdle}
          onMapClick={() => { setIsMobileListOpen(false); setDetailStore(null); }}
        />
        
        <div className="lg:hidden absolute top-0 left-0 right-0 z-20 bg-white/80 backdrop-blur-xl border-b border-[#f2f4f6]">
          <Header location={currentLocationName} onSearchClick={() => setIsSearchOpen(true)} onLocationClick={() => setIsLocationSelectorOpen(true)} />
          <div className="no-scrollbar overflow-x-auto">
            <CategoryFilter selected={selectedFilter} onSelect={setSelectedFilter} />
          </div>
        </div>

        {!isMobileListOpen && (
          <div className="lg:hidden absolute bottom-28 left-1/2 -translate-x-1/2 z-30">
            <button onClick={() => setIsMobileListOpen(true)} className="bg-[#191f28] text-white px-8 py-4 rounded-full shadow-xl font-bold text-[15px] flex items-center gap-2 active:scale-95 transition-transform">
              <ListIcon size={18} /> {activeTab === 'home' ? '목록보기' : '찜한 목록보기'}
            </button>
          </div>
        )}

        <div className="lg:hidden">
          <motion.div initial={{ y: "100%" }} animate={{ y: isMobileListOpen ? "8%" : "100%" }} transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-40 bg-white rounded-t-[24px] shadow-2xl flex flex-col h-[92vh]">
            <div className="flex items-center justify-between px-6 pt-6 pb-2">
              <h2 className="text-[20px] font-bold text-[#191f28]">{activeTab === 'home' ? '주변 팝업 리스트' : '찜한 팝업 목록'}</h2>
              <button onClick={() => setIsMobileListOpen(false)} className="p-2 bg-[#f2f4f6] rounded-full text-[#4e5968]"><XIcon size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto pb-32 no-scrollbar">
              <PopupList stores={visibleStores} onStoreClick={(s) => handleStoreSelect(s.id)} userLocation={userCoords} />
            </div>
          </motion.div>
          <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
      </main>

      {/* 3. 모달 레이어 */}
      <AnimatePresence>
        {detailStore && (
          <div className="fixed inset-0 z-[9999] flex items-end lg:items-center justify-center">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setDetailStore(null); setSelectedStoreId(null); }} className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="relative w-full lg:max-w-[480px] bg-white rounded-t-[24px] lg:rounded-[24px] overflow-hidden shadow-2xl">
              <DetailModal store={detailStore} isSaved={savedStoreIds.includes(detailStore.id)} onToggleSave={() => toggleSaveStore(detailStore.id)} onClose={() => { setDetailStore(null); setSelectedStoreId(null); }} onShowSuccess={(t, m) => setSuccessConfig({ isOpen: true, title: t, message: m })} />
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
