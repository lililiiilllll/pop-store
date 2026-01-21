import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// 1. 설정 및 타입 (모두 현재 폴더 ./ 에서 참조)
import { Icons, POPUP_STORES, DEFAULT_POPUP_IMAGE } from './constants';
import { PopupStore, UserProfile } from './types';
import { supabase } from './lib/supabase';

// 2. 컴포넌트 임포트 (경로를 ./ 로 통일)
import Header from './Header';
import MapArea from './MapArea';
import PopupList from './PopupList';
import CategoryFilter from './CategoryFilter';
import AdminDashboard from './AdminDashboard';
import DetailModal from './DetailModal'; // export default 확인
import SearchOverlay from './SearchOverlay';
import LocationSelector from './LocationSelector';
import SuccessModal from './SuccessModal';
import LoginModal from './LoginModal';
import ProfileModal from './ProfileModal';
import BottomNav from './BottomNav';

const DEFAULT_LOCATION = { lat: 37.5547, lng: 126.9706 };

const App: React.FC = () => {
  // --- 상태 관리 ---
  const [activeTab, setActiveTab] = useState<'home' | 'saved'>('home');
  const [selectedFilter, setSelectedFilter] = useState<string>('전체');
  const [allStores, setAllStores] = useState<PopupStore[]>([]);
  const [sheetOpen, setSheetOpen] = useState(true);
  const [userCoords, setUserCoords] = useState<{lat: number, lng: number} | null>(null);
  
  // 로그인 관련 상태 복구
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [likedStoreIds, setLikedStoreIds] = useState<Set<string>>(new Set());
  const [showLikedOnly, setShowLikedOnly] = useState(false);
  
  // 모달 제어 상태 복구
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isLocationSelectorOpen, setIsLocationSelectorOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [successConfig, setSuccessConfig] = useState({ isOpen: false, title: '', message: '' });

  // 상세 페이지 상태
  const [detailStore, setDetailStore] = useState<PopupStore | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<{lat: number, lng: number} | undefined>(undefined);
  const [currentLocationName, setCurrentLocationName] = useState('성수/서울숲');

  // --- 데이터 로드 및 인증 로직 ---
  const fetchStores = async () => {
    try {
      const { data, error } = await supabase.from('popup_stores').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      const processed = (data || []).map((item: any) => ({
        ...item,
        id: item.id.toString(),
        imageUrl: item.image_url || DEFAULT_POPUP_IMAGE,
        lat: Number(item.lat),
        lng: Number(item.lng),
      }));
      setAllStores(processed.length > 0 ? processed : POPUP_STORES);
    } catch (err) {
      setAllStores(POPUP_STORES);
    }
  };

  useEffect(() => {
    fetchStores();
    // 위치 정보 가져오기
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => setUserCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => setUserCoords(DEFAULT_LOCATION)
      );
    }
    // 세션 체크 (로그인 유지)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, []);

  // --- 핸들러 ---
  const handleStoreSelect = useCallback((id: string) => {
    const store = allStores.find(st => st.id === id);
    if (store) {
      setDetailStore(store);
      setSelectedStoreId(id);
      setMapCenter({ lat: store.lat, lng: store.lng });
      if (window.innerWidth < 1024) setSheetOpen(false);
    }
  }, [allStores]);

  const handleShowSuccess = (title: string, message: string) => {
    setSuccessConfig({ isOpen: true, title, message });
  };

  // 필터링 로직
  const displayStores = useMemo(() => {
    return allStores.filter(s => {
      const likedMatch = !showLikedOnly || likedStoreIds.has(s.id);
      return likedMatch;
    });
  }, [allStores, showLikedOnly, likedStoreIds]);

  if (isAdminOpen) return <AdminDashboard allStores={allStores} onBack={() => setIsAdminOpen(false)} onRefresh={fetchStores} />;

  return (
    <div className="relative flex flex-col lg:flex-row h-screen w-full overflow-hidden bg-white">
      
      {/* 1. 사이드바 (로그인 버튼 포함Header 복구) */}
      <aside className="hidden lg:flex w-[400px] flex-col z-10 bg-white border-r border-gray-100 shadow-xl overflow-hidden">
        <Header 
          location={currentLocationName} 
          userProfile={userProfile} 
          onSearchClick={() => setIsSearchOpen(true)} 
          onAdminClick={() => setIsAdminOpen(true)} 
          onProfileClick={() => !user ? setIsLoginModalOpen(true) : setIsProfileModalOpen(true)} 
          onLocationClick={() => setIsLocationSelectorOpen(true)} 
        />
        <CategoryFilter selected={selectedFilter} onSelect={setSelectedFilter} showLikedOnly={showLikedOnly} onToggleLiked={() => setShowLikedOnly(!showLikedOnly)} />
        <div className="flex-1 overflow-y-auto bg-gray-50/30 p-4">
          <PopupList stores={displayStores} selectedStoreId={selectedStoreId} onStoreSelect={handleStoreSelect} />
        </div>
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      </aside>

      {/* 2. 메인 지도 영역 */}
      <main className="flex-1 relative z-0">
        <MapArea stores={allStores} selectedStoreId={selectedStoreId} onMarkerClick={handleStoreSelect} mapCenter={mapCenter} userLocation={userCoords} onDetailOpen={setDetailStore} />
        
        {/* 모바일 하단 바텀시트 */}
        <div className="lg:hidden absolute inset-0 pointer-events-none z-20 flex flex-col justify-end">
          <motion.div animate={{ y: sheetOpen ? 0 : 'calc(100% - 120px)' }} className="w-full h-[70vh] bg-white rounded-t-[32px] shadow-2xl pointer-events-auto flex flex-col">
            <div className="h-8 flex items-center justify-center" onClick={() => setSheetOpen(!sheetOpen)}>
              <div className="w-10 h-1.5 bg-gray-200 rounded-full" />
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-20">
              <PopupList stores={displayStores} selectedStoreId={selectedStoreId} onStoreSelect={handleStoreSelect} />
            </div>
          </motion.div>
        </div>
      </main>

      {/* 3. 상세 모달 (Portal 레이어) */}
      <AnimatePresence>
        {detailStore && (
          <div className="fixed inset-0 z-[9999] flex items-end lg:items-center justify-center">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { setDetailStore(null); setSelectedStoreId(null); }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
            />
            <motion.div 
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              className="relative w-full lg:max-w-xl bg-white shadow-2xl z-10 rounded-t-[32px] lg:rounded-2xl overflow-hidden pointer-events-auto"
            >
              <DetailModal 
                store={detailStore} 
                onClose={() => { setDetailStore(null); setSelectedStoreId(null); }} 
                isLiked={likedStoreIds.has(detailStore.id)}
                onShowSuccess={handleShowSuccess} 
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. 기타 전역 모달 복구 */}
      <AnimatePresence>
        {isSearchOpen && <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} stores={allStores} onSelectResult={handleStoreSelect} />}
        {isLocationSelectorOpen && <LocationSelector isOpen={isLocationSelectorOpen} onClose={() => setIsLocationSelectorOpen(false)} onSelect={(loc: any) => { setCurrentLocationName(loc.name); setMapCenter({ lat: loc.lat, lng: loc.lng }); setIsLocationSelectorOpen(false); }} />}
        {isLoginModalOpen && <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />}
        {isProfileModalOpen && <ProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} userProfile={userProfile} />}
        {successConfig.isOpen && <SuccessModal isOpen={successConfig.isOpen} title={successConfig.title} message={successConfig.message} onClose={() => setSuccessConfig(p => ({...p, isOpen: false}))} />}
      </AnimatePresence>
    </div>
  );
};

export default App;
