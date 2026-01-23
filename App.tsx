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

const App: React.FC = () => {
  // --- 상태 관리 ---
  const [activeTab, setActiveTab] = useState<'home' | 'saved'>('home');
  const [selectedFilter, setSelectedFilter] = useState<string>('전체');
  const [allStores, setAllStores] = useState<PopupStore[]>([]);
  const [userCoords, setUserCoords] = useState<{lat: number, lng: number} | null>(null);
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  
  // 지도 및 리스트 제어
  const [mapBounds, setMapBounds] = useState<any>(null);
  const [mapCenter, setMapCenter] = useState<{lat: number, lng: number} | undefined>(undefined);
  const [currentLocationName, setCurrentLocationName] = useState('성수/서울숲');
  const [isMobileListOpen, setIsMobileListOpen] = useState(false); // 💡 모바일 리스트 열림 상태

  // 모달 제어
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isLocationSelectorOpen, setIsLocationSelectorOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [successConfig, setSuccessConfig] = useState({ isOpen: false, title: '', message: '' });
  const [detailStore, setDetailStore] = useState<PopupStore | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);

  // --- 거리 계산 로직 ---
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    return Math.sqrt(Math.pow(lat2 - lat1, 2) + Math.pow(lng2 - lng1, 2));
  };

  // --- 필터링 로직 ---
  const visibleStores = useMemo(() => {
    let filtered = allStores;
    if (selectedFilter !== '전체') {
      filtered = filtered.filter(s => s.category === selectedFilter);
    }

    if (mapBounds) {
      const inBounds = filtered.filter(s => 
        s.lat >= mapBounds.minLat && s.lat <= mapBounds.maxLat && 
        s.lng >= mapBounds.minLng && s.lng <= mapBounds.maxLng
      );

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
  }, [allStores, selectedFilter, mapBounds, mapCenter]);

  // --- 데이터 로드 ---
  const fetchStores = async () => {
    try {
      const { data } = await supabase.from('popup_stores').select('*').order('created_at', { ascending: false });
      if (data && data.length > 0) {
        setAllStores(data.map((s: any) => ({ 
          ...s, 
          id: String(s.id), 
          // 💡 DB의 title 컬럼이 이름이므로 title 우선 사용
          title: s.title || s.name, 
          imageUrl: s.image_url && s.image_url.startsWith('http') 
            ? s.image_url 
            : 'https://via.placeholder.com/400x400?text=No+Image'
        })));
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
  }, []);

  // --- 핸들러 ---
  const handleStoreSelect = useCallback((id: string) => {
    const store = allStores.find(st => st.id === id);
    if (store) {
      setDetailStore({ ...store }); 
      setSelectedStoreId(id);
      setMapCenter({ lat: store.lat, lng: store.lng });
      setIsSearchOpen(false);
      setIsMobileListOpen(false); // 💡 상세 보기 시 리스트는 내림
    }
  }, [allStores]);

  const handleMapIdle = (bounds: any, center: {lat: number, lng: number}) => {
    setMapBounds(bounds);
    setMapCenter(center);
  };

  if (isAdminOpen) return <AdminDashboard allStores={allStores} onBack={() => setIsAdminOpen(false)} onRefresh={fetchStores} />;

  return (
    <div className="relative flex flex-col lg:flex-row h-screen w-full overflow-hidden bg-white text-gray-900">
      
      {/* 1. PC 사이드바 (데스크톱에서만 보임) */}
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
          {visibleStores.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
              <p className="text-gray-400 text-sm mb-4">현재 영역에 팝업이 없습니다.</p>
            </div>
          ) : (
            <PopupList 
              stores={visibleStores} 
              onStoreClick={(s) => handleStoreSelect(s.id)} 
              userLocation={userCoords} 
            />
          )}
        </div>
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      </aside>

      {/* 2. 메인 지도 영역 */}
      <main className="flex-1 relative z-0">
        <MapArea 
          stores={allStores} 
          selectedStoreId={selectedStoreId} 
          onMarkerClick={handleStoreSelect} 
          mapCenter={mapCenter} 
          userLocation={userCoords} 
          onMapIdle={handleMapIdle}
          onMapClick={() => { 
            setDetailStore(null); 
            setSelectedStoreId(null); 
            setIsMobileListOpen(false); // 💡 지도 클릭 시 모바일 리스트 내림
          }}
          onDetailOpen={(store) => handleStoreSelect(store.id)}
        />
        
        {/* 모바일 상단 헤더 & 필터 (지도를 가리지 않게 플로팅) */}
        <div className="lg:hidden absolute top-0 left-0 right-0 z-20 bg-white/80 backdrop-blur-md pb-2">
          <Header 
            location={currentLocationName} 
            userProfile={userProfile} 
            onSearchClick={() => setIsSearchOpen(true)}
            onAdminClick={() => setIsAdminOpen(true)} 
            onProfileClick={() => !user ? setIsLoginModalOpen(true) : setIsProfileModalOpen(true)} 
            onLocationClick={() => setIsLocationSelectorOpen(true)} 
          />
          <CategoryFilter selected={selectedFilter} onSelect={setSelectedFilter} />
        </div>

        {/* 💡 3. 모바일 전용 바텀 시트 리스트 */}
        <div className="lg:hidden">
          <motion.div
            initial={{ y: "70%" }}
            animate={{ y: isMobileListOpen ? "15%" : "72%" }} // 72% 정도일 때 2개 정도 보임
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            onDragEnd={(_, info) => {
              if (info.offset.y < -50) setIsMobileListOpen(true);
              if (info.offset.y > 50) setIsMobileListOpen(false);
            }}
            className="fixed inset-x-0 bottom-0 z-40 bg-white rounded-t-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] flex flex-col h-[85vh]"
          >
            {/* 드래그 핸들 */}
            <div className="w-full flex justify-center py-4">
              <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
            </div>
            
            <div className="px-5 pb-2">
              <h2 className="text-lg font-bold text-gray-900">주변 팝업 리스트</h2>
            </div>

            <div className="flex-1 overflow-y-auto pb-32">
              <PopupList 
                stores={visibleStores} 
                onStoreClick={(s) => handleStoreSelect(s.id)} 
                userLocation={userCoords} 
              />
            </div>
          </motion.div>
          
          {/* 모바일 하단 네비게이션 */}
          <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
      </main>

      {/* 4. 오버레이 모달 레이어 */}
      <AnimatePresence>
        {detailStore && (
          <div className="fixed inset-0 z-[9999] flex items-end lg:items-center justify-center overflow-hidden">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { setDetailStore(null); setSelectedStoreId(null); }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full lg:max-w-xl bg-white rounded-t-[32px] lg:rounded-2xl overflow-hidden shadow-2xl"
            >
              <DetailModal 
                store={detailStore} 
                onClose={() => { setDetailStore(null); setSelectedStoreId(null); }} 
                onShowSuccess={(t, m) => setSuccessConfig({ isOpen: true, title: t, message: m })} 
              />
            </motion.div>
          </div>
        )}

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
