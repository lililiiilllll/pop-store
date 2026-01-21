import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// 1. 설정 및 타입 (Root 위치)
import { Icons, POPUP_STORES, DEFAULT_POPUP_IMAGE } from './constants';
import { PopupStore, UserProfile } from './types';
import { supabase } from './lib/supabase';

// 2. 컴포넌트 임포트 (components 폴더 위치)
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

const App: React.FC = () => {
  // --- 상태 관리 ---
  const [activeTab, setActiveTab] = useState<'home' | 'saved'>('home');
  const [selectedFilter, setSelectedFilter] = useState<string>('전체');
  const [allStores, setAllStores] = useState<PopupStore[]>([]);
  const [userCoords, setUserCoords] = useState<{lat: number, lng: number} | null>(null);
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  
  // 모달 제어 상태
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isLocationSelectorOpen, setIsLocationSelectorOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [successConfig, setSuccessConfig] = useState({ isOpen: false, title: '', message: '' });

  // 상세 및 지도 제어
  const [detailStore, setDetailStore] = useState<PopupStore | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<{lat: number, lng: number} | undefined>(undefined);
  const [currentLocationName, setCurrentLocationName] = useState('성수/서울숲');

  // --- 데이터 로드 ---
  const fetchStores = async () => {
    try {
      const { data } = await supabase.from('popup_stores').select('*').order('created_at', { ascending: false });
      if (data && data.length > 0) {
        setAllStores(data.map((s: any) => ({ ...s, id: String(s.id), imageUrl: s.image_url || DEFAULT_POPUP_IMAGE })));
      } else {
        setAllStores(POPUP_STORES);
      }
    } catch {
      setAllStores(POPUP_STORES);
    }
  };

  useEffect(() => {
    fetchStores();
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => setUserCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => setUserCoords(DEFAULT_LOCATION)
      );
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, []);

  // --- 핸들러 (모달 미작동 해결 핵심 포인트) ---
  const handleStoreSelect = useCallback((id: string) => {
    const store = allStores.find(st => st.id === id);
    if (store) {
      // 💡 새로운 객체로 복사하여 상태 변화를 강제 알림 (렌더링 트리거)
      setDetailStore({ ...store }); 
      setSelectedStoreId(id);
      setMapCenter({ lat: store.lat, lng: store.lng });
      setIsSearchOpen(false); 
    }
  }, [allStores]);

  if (isAdminOpen) return <AdminDashboard allStores={allStores} onBack={() => setIsAdminOpen(false)} onRefresh={fetchStores} />;

  return (
    <div className="relative flex flex-col lg:flex-row h-screen w-full overflow-hidden bg-white">
      
      {/* 1. 사이드바 */}
      <aside className="hidden lg:flex w-[400px] flex-col z-10 bg-white border-r border-gray-100 shadow-xl overflow-hidden">
        <Header 
          location={currentLocationName} 
          userProfile={userProfile} 
          onSearchClick={() => setIsSearchOpen(true)}
          onAdminClick={() => setIsAdminOpen(true)} 
          onProfileClick={() => !user ? setIsLoginModalOpen(true) : setIsProfileModalOpen(true)} 
          onLocationClick={() => setIsLocationSelectorOpen(true)} 
        />
        <CategoryFilter selected={selectedFilter} onSelect={setSelectedFilter} />
        <div className="flex-1 overflow-y-auto bg-gray-50/30 p-4">
          <PopupList stores={allStores} selectedStoreId={selectedStoreId} onStoreSelect={handleStoreSelect} />
        </div>
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      </aside>

      {/* 2. 메인 지도 */}
      <main className="flex-1 relative z-0">
        <MapArea 
          stores={allStores} 
          selectedStoreId={selectedStoreId} 
          onMarkerClick={handleStoreSelect} 
          mapCenter={mapCenter} 
          userLocation={userCoords} 
          onDetailOpen={(store) => handleStoreSelect(store.id)} // 일관된 핸들러 사용
        />
      </main>

      {/* 3. 오버레이 모달 레이어 */}
      <AnimatePresence mode="wait">
        {/* 상세 모달 (가장 높은 우선순위) */}
        {detailStore && (
          <div key={`detail-${detailStore.id}`} className="fixed inset-0 z-[9999] flex items-end lg:items-center justify-center overflow-hidden">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => { setDetailStore(null); setSelectedStoreId(null); }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
            />
            <motion.div 
              initial={{ y: "100%", opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }} 
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full lg:max-w-xl bg-white shadow-2xl z-[10000] rounded-t-[32px] lg:rounded-2xl overflow-hidden pointer-events-auto"
            >
              <DetailModal 
                store={detailStore} 
                onClose={() => { setDetailStore(null); setSelectedStoreId(null); }} 
                isLiked={false}
                onShowSuccess={(t, m) => setSuccessConfig({ isOpen: true, title: t, message: m })} 
              />
            </motion.div>
          </div>
        )}

        {/* 검색 오버레이 */}
        {isSearchOpen && (
          <SearchOverlay 
            key="search-overlay"
            isOpen={isSearchOpen} 
            onClose={() => setIsSearchOpen(false)} 
            stores={allStores} 
            onSelectResult={handleStoreSelect} 
          />
        )}

        {/* 위치 선택 오버레이 */}
        {isLocationSelectorOpen && (
          <LocationSelector 
            key="location-selector"
            isOpen={isLocationSelectorOpen} 
            onClose={() => setIsLocationSelectorOpen(false)} 
            onSelect={(loc: any) => { 
              setCurrentLocationName(loc.name); 
              setMapCenter({ lat: loc.lat, lng: loc.lng }); 
              setIsLocationSelectorOpen(false); 
            }} 
          />
        )}

        {/* 기타 인증/성공 모달 */}
        {isLoginModalOpen && <LoginModal key="login-modal" isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />}
        {isProfileModalOpen && <ProfileModal key="profile-modal" isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} userProfile={userProfile} />}
        {successConfig.isOpen && (
          <SuccessModal 
            key="success-modal"
            isOpen={successConfig.isOpen} 
            title={successConfig.title} 
            message={successConfig.message} 
            onClose={() => setSuccessConfig(p => ({...p, isOpen: false}))} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
