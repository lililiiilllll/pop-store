import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// 1. 설정 및 타입
import { Icons } from './constants';
import { PopupStore } from './types';
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
import BottomNav from './components/BottomNav';

const DEFAULT_LOCATION = { lat: 37.5547, lng: 126.9706 };
const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1531050171669-7df9b2089206?q=80&w=400&auto=format&fit=crop';

const App: React.FC = () => {
  // --- 관리자 및 테스트 관련 상태 ---
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [isTestPanelOpen, setIsTestPanelOpen] = useState(true);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  // --- 기본 앱 상태 ---
  const [activeTab, setActiveTab] = useState<'home' | 'saved'>('home');
  const [selectedFilter, setSelectedFilter] = useState<string>('전체');
  const [allStores, setAllStores] = useState<PopupStore[]>([]);
  const [savedStoreIds, setSavedStoreIds] = useState<string[]>([]); 
  const [userCoords, setUserCoords] = useState<{lat: number, lng: number} | null>(null);
  
  const [mapBounds, setMapBounds] = useState<any>(null);
  const [mapCenter, setMapCenter] = useState<{lat: number, lng: number} | undefined>(undefined);
  const [currentLocationName, setCurrentLocationName] = useState('성수/서울숲');
  const [isMobileListOpen, setIsMobileListOpen] = useState(false);

  // --- 모달 상태 ---
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isLocationSelectorOpen, setIsLocationSelectorOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [successConfig, setSuccessConfig] = useState({ isOpen: false, title: '', message: '' });
  const [detailStore, setDetailStore] = useState<PopupStore | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);


  const App = () => {
  const [userProfile, setUserProfile] = React.useState(null);

  // 1. 함수 정의
  const handleProfileClick = () => {
    console.log("로그인 로직 실행");
    // 여기서 로그인 모달을 띄우거나 페이지를 이동시킵니다.
    const mockUser = { id: 1, name: '홍길동', avatarUrl: '', isAdmin: false };
    setUserProfile(mockUser); 
  };

  return (
    <div className="app">
      <Header 
        location="성수동"
        userProfile={userProfile}
        // 2. 💡 반드시 'onProfileClick'이라는 이름으로 위 함수를 전달해야 합니다!
        onProfileClick={handleProfileClick} 
        onSearchClick={() => {}}
        onLocationClick={() => {}}
      />
    </div>
  );
};
  
  // 아이콘 안전 할당
  const MapIcon = Icons.Map || 'span';
  const HeartIcon = Icons.Heart || 'span';
  const ListIcon = Icons.List || 'span';
  const XIcon = Icons.X || 'span';

  // --- [데이터 처리] Supabase 연동 ---
  const fetchStores = async () => {
    try {
      const { data, error } = await supabase
        .from('popup_stores')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      if (data) {
        setAllStores(data.map((s: any) => ({ 
          ...s, 
          id: String(s.id), 
          title: s.title || s.name, 
          is_free: Boolean(s.is_free),
          imageUrl: s.image_url?.startsWith('http') ? s.image_url : FALLBACK_IMAGE 
        })));
      }
    } catch (e) { 
      console.error("데이터 로딩 실패:", e); 
    }
  };

  useEffect(() => {
    fetchStores();
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => setUserCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => setUserCoords(DEFAULT_LOCATION),
        { enableHighAccuracy: false, timeout: 5000 }
      );
    }
  }, []);

  // --- [핸들러] 로그인 및 액션 (수정 포인트) ---
  const handleAdminLogin = useCallback(() => {
    console.log("관리자 모드 활성화");
    setIsAdminLoggedIn(true);
    setIsAdminOpen(true); 
    setSuccessConfig({
      isOpen: true,
      title: '관리자 인증 완료',
      message: '관리자 대시보드 기능을 사용할 수 있습니다.'
    });
  }, []);

  const handleUserLogin = useCallback(() => {
    console.log("일반 유저 모드 전환: 모든 오버레이 초기화");
    setIsAdminLoggedIn(false);
    setIsAdminOpen(false);
    
    // 흐림 현상 방지를 위해 모든 열린 상태 강제 초기화
    setIsMobileListOpen(false);
    setIsSearchOpen(false);
    setIsLocationSelectorOpen(false);
    setDetailStore(null);
    setSelectedStoreId(null);
    
    setSuccessConfig({
      isOpen: true,
      title: '일반 모드 전환',
      message: '사용자 화면으로 전환되었습니다.'
    });
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

  const toggleSaveStore = useCallback((id: string) => {
    setSavedStoreIds(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  }, []);

  // --- [필터링] 화면에 보여줄 팝업 계산 ---
  const visibleStores = useMemo(() => {
    let filtered = allStores;
    if (activeTab === 'saved') {
      filtered = filtered.filter(s => savedStoreIds.includes(s.id));
    }
    if (selectedFilter !== '전체') {
      if (selectedFilter === '무료입장') {
        filtered = filtered.filter(s => s.is_free);
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

  // --- [조건부 렌더링] 관리자 대시보드 ---
  if (isAdminOpen && isAdminLoggedIn) {
    return (
      <AdminDashboard 
        allStores={allStores} 
        onBack={() => setIsAdminOpen(false)} 
        onRefresh={fetchStores} 
      />
    );
  }

  return (
    <div className="relative flex flex-col lg:flex-row h-screen w-full overflow-hidden bg-white text-[#191f28]">
      
      {/* 개발용 디버그 패널 */}
      <AnimatePresence>
        {isTestPanelOpen && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
            className="fixed top-24 right-6 z-[999] bg-white/95 backdrop-blur-xl p-5 rounded-[24px] shadow-2xl border border-[#f2f4f6] flex flex-col gap-3 min-w-[200px]"
          >
            <div className="flex justify-between items-center mb-1">
              <span className="text-[12px] font-bold text-[#3182f6]">DEBUG MODE</span>
              <button onClick={() => setIsTestPanelOpen(false)} className="text-[#8b95a1] hover:text-black p-1"><XIcon size={16} /></button>
            </div>
            <button onClick={handleAdminLogin} className={`w-full py-3 rounded-xl text-[14px] font-bold transition-all ${isAdminLoggedIn ? 'bg-[#3182f6] text-white shadow-md' : 'bg-[#f2f4f6] text-[#4e5968]'}`}>
              관리자 모드
            </button>
            <button onClick={handleUserLogin} className={`w-full py-3 rounded-xl text-[14px] font-bold transition-all ${!isAdminLoggedIn ? 'bg-[#3182f6] text-white shadow-md' : 'bg-[#f2f4f6] text-[#4e5968]'}`}>
              일반 유저 모드
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PC 사이드바 */}
      <aside className="hidden lg:flex w-[400px] flex-col z-10 bg-white border-r border-[#f2f4f6] shadow-sm overflow-hidden">
        <Header 
          location={currentLocationName} 
          onSearchClick={() => setIsSearchOpen(true)} 
          onAdminClick={() => isAdminLoggedIn ? setIsAdminOpen(true) : alert("관리자 권한이 없습니다.")} 
          onProfileClick={() => setIsProfileModalOpen(true)} 
          onLocationClick={() => setIsLocationSelectorOpen(true)} 
        />
        
        <div className="no-scrollbar overflow-x-auto bg-white">
           <CategoryFilter selected={selectedFilter} onSelect={setSelectedFilter} />
        </div>
        
        <div className="px-5 py-4 bg-white border-b border-[#f9fafb]">
          <div className="flex bg-[#f2f4f6] p-1 rounded-[14px]">
            <button onClick={() => setActiveTab('home')} className={`flex-1 flex items-center justify-center gap-2 py-2 text-[14px] font-bold rounded-[12px] transition-all ${activeTab === 'home' ? 'bg-white shadow-sm text-[#3182f6]' : 'text-[#8b95a1]'}`}>
              <MapIcon size={16} /> 지도
            </button>
            <button onClick={() => setActiveTab('saved')} className={`flex-1 flex items-center justify-center gap-2 py-2 text-[14px] font-bold rounded-[12px] transition-all ${activeTab === 'saved' ? 'bg-white shadow-sm text-[#3182f6]' : 'text-[#8b95a1]'}`}>
              <HeartIcon size={16} className={activeTab === 'saved' ? 'fill-[#3182f6]' : ''} /> 찜한 목록
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-white custom-scrollbar">
          <PopupList stores={visibleStores} onStoreClick={(s) => handleStoreSelect(s.id)} userLocation={userCoords} />
        </div>
      </aside>

      {/* 메인 지도 영역 */}
      <main className="flex-1 relative z-0">
        <MapArea 
          stores={activeTab === 'home' ? allStores : allStores.filter(s => savedStoreIds.includes(s.id))} 
          selectedStoreId={selectedStoreId} 
          onMarkerClick={handleStoreSelect} 
          mapCenter={mapCenter} 
          userLocation={userCoords} 
          onMapIdle={(bounds, center) => { setMapBounds(bounds); setMapCenter(center); }}
          onMapClick={() => { setIsMobileListOpen(false); setDetailStore(null); setSelectedStoreId(null); }}
        />
        
        {/* 모바일 상단 헤더 */}
        <div className="lg:hidden absolute top-0 left-0 right-0 z-20 bg-white/80 backdrop-blur-xl border-b border-[#f2f4f6]">
          <Header location={currentLocationName} onSearchClick={() => setIsSearchOpen(true)} onLocationClick={() => setIsLocationSelectorOpen(true)} />
          <div className="no-scrollbar overflow-x-auto">
            <CategoryFilter selected={selectedFilter} onSelect={setSelectedFilter} />
          </div>
        </div>

        {/* 모바일 하단 리스트 제어 */}
        {!isMobileListOpen && (
          <div className="lg:hidden absolute bottom-28 left-1/2 -translate-x-1/2 z-30">
            <button onClick={() => setIsMobileListOpen(true)} className="bg-[#191f28] text-white px-8 py-4 rounded-full shadow-2xl font-bold text-[15px] flex items-center gap-2">
              <ListIcon size={18} /> {activeTab === 'home' ? '목록보기' : '찜한 목록'}
            </button>
          </div>
        )}

        <div className="lg:hidden">
          <motion.div 
            initial={{ y: "100%" }} 
            animate={{ y: isMobileListOpen ? "8%" : "100%" }} 
            className="fixed inset-x-0 bottom-0 z-40 bg-white rounded-t-[24px] shadow-2xl flex flex-col h-[92vh]"
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-50">
              <h2 className="text-[18px] font-bold">{activeTab === 'home' ? '주변 팝업' : '찜한 팝업'}</h2>
              <button onClick={() => setIsMobileListOpen(false)} className="p-2 bg-[#f2f4f6] rounded-full"><XIcon size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto pb-32">
              <PopupList stores={visibleStores} onStoreClick={(s) => handleStoreSelect(s.id)} userLocation={userCoords} />
            </div>
          </motion.div>
          <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
      </main>

      {/* 모달 레이어 (Z-index 및 흐림 현상 제어) */}
      <AnimatePresence>
        {(isSearchOpen || isLocationSelectorOpen) && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
            className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-[90]"
            onClick={() => { setIsSearchOpen(false); setIsLocationSelectorOpen(false); }}
          />
        )}
        
        {detailStore && (
          <div className="fixed inset-0 z-[9999] flex items-end lg:items-center justify-center p-0 lg:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDetailStore(null)} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="relative w-full lg:max-w-[480px] bg-white rounded-t-[32px] lg:rounded-[32px] overflow-hidden shadow-2xl">
              <DetailModal 
                store={detailStore} 
                isSaved={savedStoreIds.includes(detailStore.id)} 
                onToggleSave={() => toggleSaveStore(detailStore.id)} 
                onClose={() => setDetailStore(null)} 
                onShowSuccess={(t, m) => setSuccessConfig({ isOpen: true, title: t, message: m })} 
              />
            </motion.div>
          </div>
        )}
        
        {isSearchOpen && <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} stores={allStores} onSelectResult={handleStoreSelect} />}
        {successConfig.isOpen && <SuccessModal isOpen={successConfig.isOpen} title={successConfig.title} message={successConfig.message} onClose={() => setSuccessConfig(p => ({...p, isOpen: false}))} />}
      </AnimatePresence>
    </div>
  );
};

export default App;
