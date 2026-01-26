import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// 1. 외부 라이브러리 및 설정/타입 임포트
import { Icons } from './constants';
import { PopupStore, UserProfile } from './types';
import { supabase, signInWithSocial, getProfile } from './lib/supabase';

// 2. 하위 컴포넌트 임포트
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

// [상수 설정]
const DEFAULT_LOCATION = { lat: 37.5547, lng: 126.9706 };
const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1531050171669-7df9b2089206?q=80&w=400&auto=format&fit=crop';

/**
 * [기능 플래그 (Feature Flag)]
 */
const AUTH_CONFIG = {
  KAKAO: { enabled: false, provider: 'kakao' as const },
  NAVER: { enabled: false, provider: 'naver' as const },
  TOSS: { enabled: true, provider: 'toss' as const },
};

const App: React.FC = () => {
  // --- [상태 관리: 관리자 및 테스트] ---
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [isTestPanelOpen, setIsTestPanelOpen] = useState(true);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  // --- [상태 관리: 유저 및 공통 데이터] ---
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'home' | 'saved'>('home');
  const [selectedFilter, setSelectedFilter] = useState<string>('전체');
  const [allStores, setAllStores] = useState<PopupStore[]>([]);
  const [savedStoreIds, setSavedStoreIds] = useState<string[]>([]);
  const [userCoords, setUserCoords] = useState<{lat: number, lng: number} | null>(null);
  
  // --- [상태 관리: 지도 및 검색] ---
  const [searchQuery, setSearchQuery] = useState(""); // 검색어 상태 추가
  const [mapBounds, setMapBounds] = useState<any>(null);
  const [mapCenter, setMapCenter] = useState<{lat: number, lng: number} | undefined>(undefined);
  const [currentLocationName, setCurrentLocationName] = useState('성수/서울숲');
  const [isMobileListOpen, setIsMobileListOpen] = useState(false);

  // --- [상태 관리: 모달 및 오버레이] ---
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isLocationSelectorOpen, setIsLocationSelectorOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [successConfig, setSuccessConfig] = useState({ isOpen: false, title: '', message: '' });
  const [detailStore, setDetailStore] = useState<PopupStore | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);

  // 아이콘 안전 장치
  const MapIcon = Icons.Map || 'span';
  const HeartIcon = Icons.Heart || 'span';
  const ListIcon = Icons.List || 'span';
  const XIcon = Icons.X || 'span';

  // --- [데이터 통신 및 세션 관리] ---
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
    
    // 세션 유지 확인 로직
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) fetchAndSetProfile(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) fetchAndSetProfile(session.user.id);
      else setUserProfile(null);
    });

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => setUserCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => setUserCoords(DEFAULT_LOCATION),
        { enableHighAccuracy: false, timeout: 5000 }
      );
    }

    return () => subscription.unsubscribe();
  }, []);

  const fetchAndSetProfile = async (uid: string) => {
    const profile = await getProfile(uid);
    if (profile) setUserProfile(profile);
  };

  // --- [핸들러: 인증 및 로그인 액션] ---
  
  const handleProfileClick = useCallback(() => {
    if (!userProfile) {
      setIsProfileModalOpen(true);
    }
  }, [userProfile]);

  // 실제 supabase.ts의 기능을 사용하는 통합 로그인 핸들러
  const handleSocialLogin = async (provider: 'kakao' | 'naver' | 'toss') => {
    try {
      await signInWithSocial(provider);
      // OAuth 특성상 페이지 리다이렉트가 발생하므로, 
      // 이후 처리는 useEffect의 onAuthStateChange에서 담당합니다.
    } catch (e: any) {
      console.error("로그인 에러:", e.message);
    }
  };

  const handleAdminLogin = useCallback(() => {
    setIsAdminLoggedIn(true);
    setIsAdminOpen(true); 
    setSuccessConfig({ isOpen: true, title: '관리자 인증 완료', message: '대시보드에 진입합니다.' });
  }, []);

  const handleUserLogin = useCallback(() => {
    setIsAdminLoggedIn(false);
    setIsAdminOpen(false);
    setIsMobileListOpen(false);
    setIsSearchOpen(false);
    setSearchQuery(""); // 검색 초기화
    setSuccessConfig({ isOpen: true, title: '일반 모드 전환', message: '화면 흐림 현상을 방지하기 위해 모든 오버레이를 초기화했습니다.' });
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

  // --- [연산: 검색 및 카테고리 필터링 통합 로직] ---
  const visibleStores = useMemo(() => {
    let filtered = allStores;

    // 1. 검색어 필터링 (SearchQuery 반영)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(s => 
        s.title.toLowerCase().includes(q) || 
        (s.category && s.category.toLowerCase().includes(q))
      );
    }

    // 2. 탭 필터링 (찜한 목록)
    if (activeTab === 'saved') {
      filtered = filtered.filter(s => savedStoreIds.includes(s.id));
    }

    // 3. 카테고리 필터링
    if (selectedFilter !== '전체') {
      if (selectedFilter === '무료입장') {
        filtered = filtered.filter(s => s.is_free);
      } else {
        filtered = filtered.filter(s => s.category === selectedFilter);
      }
    }

    // 4. 지도 범위 필터링 (홈 탭일 때만)
    if (activeTab === 'home' && mapBounds && !searchQuery) {
      filtered = filtered.filter(s => 
        s.lat >= mapBounds.minLat && s.lat <= mapBounds.maxLat && 
        s.lng >= mapBounds.minLng && s.lng <= mapBounds.maxLng
      );
    }

    return filtered;
  }, [allStores, selectedFilter, mapBounds, activeTab, savedStoreIds, searchQuery]);

  if (isAdminOpen && isAdminLoggedIn) {
    return <AdminDashboard allStores={allStores} onBack={() => setIsAdminOpen(false)} onRefresh={fetchStores} />;
  }

  return (
    <div className="relative flex flex-col lg:flex-row h-screen w-full overflow-hidden bg-white text-[#191f28]">
      
      {/* 디버그 패널 */}
      <AnimatePresence>
        {isTestPanelOpen && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="fixed top-24 right-6 z-[999] bg-white/95 backdrop-blur-xl p-5 rounded-[24px] shadow-2xl border border-[#f2f4f6] flex flex-col gap-3 min-w-[200px]">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[12px] font-bold text-[#3182f6]">DEBUG MODE</span>
              <button onClick={() => setIsTestPanelOpen(false)} className="text-[#8b95a1] p-1"><XIcon size={16} /></button>
            </div>
            <button onClick={handleAdminLogin} className={`w-full py-3 rounded-xl text-[14px] font-bold ${isAdminLoggedIn ? 'bg-[#3182f6] text-white' : 'bg-[#f2f4f6] text-[#4e5968]'}`}>관리자 모드</button>
            <button onClick={handleUserLogin} className={`w-full py-3 rounded-xl text-[14px] font-bold ${!isAdminLoggedIn ? 'bg-[#3182f6] text-white' : 'bg-[#f2f4f6] text-[#4e5968]'}`}>일반 유저 모드</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PC 사이드바 */}
      <aside className="hidden lg:flex w-[400px] flex-col z-10 bg-white border-r border-[#f2f4f6] shadow-sm">
        <Header location={currentLocationName} userProfile={userProfile} onSearchClick={() => setIsSearchOpen(true)} onAdminClick={() => isAdminLoggedIn ? setIsAdminOpen(true) : alert("권한 없음")} onProfileClick={handleProfileClick} onLocationClick={() => setIsLocationSelectorOpen(true)} />
        <div className="no-scrollbar overflow-x-auto"><CategoryFilter selected={selectedFilter} onSelect={setSelectedFilter} /></div>
        <div className="px-5 py-4 border-b border-[#f9fafb]">
          <div className="flex bg-[#f2f4f6] p-1 rounded-[14px]">
            <button onClick={() => setActiveTab('home')} className={`flex-1 py-2 text-[14px] font-bold rounded-[12px] ${activeTab === 'home' ? 'bg-white text-[#3182f6] shadow-sm' : 'text-[#8b95a1]'}`}>지도</button>
            <button onClick={() => setActiveTab('saved')} className={`flex-1 py-2 text-[14px] font-bold rounded-[12px] ${activeTab === 'saved' ? 'bg-white text-[#3182f6] shadow-sm' : 'text-[#8b95a1]'}`}>찜한 목록</button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar"><PopupList stores={visibleStores} onStoreClick={(s) => handleStoreSelect(s.id)} userLocation={userCoords} /></div>
      </aside>

      {/* 지도 영역 */}
      <main className="flex-1 relative">
        <MapArea 
          stores={visibleStores} // 필터링된 결과만 지도에 표시
          selectedStoreId={selectedStoreId} 
          onMarkerClick={handleStoreSelect} 
          mapCenter={mapCenter} 
          userLocation={userCoords} 
          onMapIdle={(bounds, center) => { setMapBounds(bounds); setMapCenter(center); }}
          onMapClick={() => { setIsMobileListOpen(false); setDetailStore(null); }}
        />
        
        {/* 모바일 인터페이스 */}
        <div className="lg:hidden absolute top-0 left-0 right-0 z-20 bg-white/80 backdrop-blur-xl border-b border-[#f2f4f6]">
          <Header location={currentLocationName} userProfile={userProfile} onProfileClick={handleProfileClick} onSearchClick={() => setIsSearchOpen(true)} onLocationClick={() => setIsLocationSelectorOpen(true)} />
          <div className="no-scrollbar overflow-x-auto"><CategoryFilter selected={selectedFilter} onSelect={setSelectedFilter} /></div>
        </div>

        {!isMobileListOpen && (
          <div className="lg:hidden absolute bottom-28 left-1/2 -translate-x-1/2 z-30">
            <button onClick={() => setIsMobileListOpen(true)} className="bg-[#191f28] text-white px-8 py-4 rounded-full shadow-2xl font-bold flex items-center gap-2"><ListIcon size={18} /> 목록보기</button>
          </div>
        )}

        <div className="lg:hidden">
          <motion.div initial={{ y: "100%" }} animate={{ y: isMobileListOpen ? "8%" : "100%" }} className="fixed inset-x-0 bottom-0 z-40 bg-white rounded-t-[24px] h-[92vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-50">
              <h2 className="text-[18px] font-bold">{activeTab === 'home' ? '주변 팝업' : '찜한 팝업'}</h2>
              <button onClick={() => setIsMobileListOpen(false)} className="p-2 bg-[#f2f4f6] rounded-full"><XIcon size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto pb-32"><PopupList stores={visibleStores} onStoreClick={(s) => handleStoreSelect(s.id)} userLocation={userCoords} /></div>
          </motion.div>
          <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
      </main>

      {/* 오버레이 섹션 */}
      <AnimatePresence>
        {isProfileModalOpen && !userProfile && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white p-8 rounded-[32px] shadow-2xl w-full max-w-sm text-center">
              <h2 className="text-2xl font-bold mb-6">시작하기</h2>
              <div className="flex flex-col gap-3">
                {AUTH_CONFIG.KAKAO.enabled && (
                  <button onClick={() => handleSocialLogin('kakao')} className="w-full py-4 bg-[#FEE500] text-[#3c1e1e] font-bold rounded-2xl">카카오 로그인</button>
                )}
                {AUTH_CONFIG.TOSS.enabled && (
                  <button onClick={() => handleSocialLogin('toss')} className="w-full py-4 bg-[#3182f6] text-white font-bold rounded-2xl">토스로 시작하기</button>
                )}
                {AUTH_CONFIG.NAVER.enabled && (
                  <button onClick={() => handleSocialLogin('naver')} className="w-full py-4 bg-[#03C75A] text-white font-bold rounded-2xl">네이버로 시작하기</button>
                )}
              </div>
              <button onClick={() => setIsProfileModalOpen(false)} className="mt-6 text-[#8b95a1] underline text-sm">나중에 하기</button>
            </motion.div>
          </div>
        )}

        {(isSearchOpen || isLocationSelectorOpen) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-[90]" onClick={() => { setIsSearchOpen(false); setIsLocationSelectorOpen(false); }} />
        )}
        
        {detailStore && (
          <div className="fixed inset-0 z-[9999] flex items-end lg:items-center justify-center">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => setDetailStore(null)} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} className="relative w-full lg:max-w-[480px] bg-white rounded-t-[32px] lg:rounded-[32px] overflow-hidden">
              <DetailModal store={detailStore} isSaved={savedStoreIds.includes(detailStore.id)} onToggleSave={() => toggleSaveStore(detailStore.id)} onClose={() => setDetailStore(null)} onShowSuccess={(t, m) => setSuccessConfig({ isOpen: true, title: t, message: m })} />
            </motion.div>
          </div>
        )}
        
        {isSearchOpen && (
          <SearchOverlay 
            isOpen={isSearchOpen} 
            onClose={() => { setIsSearchOpen(false); setSearchQuery(""); }} 
            stores={allStores} 
            onSelectResult={(id) => { handleStoreSelect(id); setSearchQuery(""); }} 
            onSearchChange={setSearchQuery} // 검색어 입력 시 상태 업데이트
          />
        )}
        {successConfig.isOpen && <SuccessModal isOpen={successConfig.isOpen} title={successConfig.title} message={successConfig.message} onClose={() => setSuccessConfig(p => ({...p, isOpen: false}))} />}
      </AnimatePresence>
    </div>
  );
};

export default App;
