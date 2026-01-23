import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// 1. 설정 및 타입
import { Icons, POPUP_STORES, DEFAULT_POPUP_IMAGE } from './constants';
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
  
  // 지도 영역 및 센터 관리
  const [mapBounds, setMapBounds] = useState<any>(null);
  const [mapCenter, setMapCenter] = useState<{lat: number, lng: number} | undefined>(undefined);
  const [currentLocationName, setCurrentLocationName] = useState('성수/서울숲');

  // 모달 제어
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isLocationSelectorOpen, setIsLocationSelectorOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [successConfig, setSuccessConfig] = useState({ isOpen: false, title: '', message: '' });
  const [detailStore, setDetailStore] = useState<PopupStore | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);

  // --- 거리 계산 로직 (가장 가까운 팝업 찾기용) ---
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    return Math.sqrt(Math.pow(lat2 - lat1, 2) + Math.pow(lng2 - lng1, 2));
  };

  // --- 💡 핵심: 필터링 및 "가장 가까운 곳 찾기" 로직 ---
  const visibleStores = useMemo(() => {
    let filtered = allStores;

    // 1. 카테고리 필터
    if (selectedFilter !== '전체') {
      filtered = filtered.filter(s => s.category === selectedFilter);
    }

    // 2. 지도 영역 내 필터
    if (mapBounds) {
      const inBounds = filtered.filter(s => 
        s.lat >= mapBounds.minLat && s.lat <= mapBounds.maxLat && 
        s.lng >= mapBounds.minLng && s.lng <= mapBounds.maxLng
      );

      // 💡 [기능 추가] 영역 내에 팝업이 하나도 없고, 전체 스토어가 있을 때
      if (inBounds.length === 0 && filtered.length > 0 && mapCenter) {
        // 현재 지도 중심에서 가장 가까운 스토어 찾기
        const closest = filtered.reduce((prev, curr) => {
          const prevDist = calculateDistance(mapCenter.lat, mapCenter.lng, prev.lat, prev.lng);
          const currDist = calculateDistance(mapCenter.lat, mapCenter.lng, curr.lat, curr.lng);
          return prevDist < currDist ? prev : curr;
        });
        
        // 검색 결과가 너무 멀지 않다면 리스트에는 일단 전체 혹은 가장 가까운 것 하나를 보여줌
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
          imageUrl: s.image_url || DEFAULT_POPUP_IMAGE 
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
    }
  }, [allStores]);

  const handleMapIdle = (bounds: any, center: {lat: number, lng: number}) => {
    setMapBounds(bounds);
    setMapCenter(center);
  };

  const findNearestStore = () => {
    if (allStores.length > 0 && mapCenter) {
      const closest = allStores.reduce((prev, curr) => {
        const prevDist = calculateDistance(mapCenter.lat, mapCenter.lng, prev.lat, prev.lng);
        const currDist = calculateDistance(mapCenter.lat, mapCenter.lng, curr.lat, curr.lng);
        return prevDist < currDist ? prev : curr;
      });
      setMapCenter({ lat: closest.lat, lng: closest.lng });
    }
  };

  if (isAdminOpen) return <AdminDashboard allStores={allStores} onBack={() => setIsAdminOpen(false)} onRefresh={fetchStores} />;

  return (
    <div className="relative flex flex-col lg:flex-row h-screen w-full overflow-hidden bg-white text-gray-900">
      
      {/* 1. 사이드바 (리스트 영역) */}
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
              <button 
                onClick={findNearestStore}
                className="text-sm font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded-full hover:bg-blue-100 transition-colors"
              >
                가장 가까운 팝업 보기
              </button>
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
          onMapClick={() => { setDetailStore(null); setSelectedStoreId(null); }}
          onDetailOpen={(store) => handleStoreSelect(store.id)}
        />
        
        {/* 모바일용 플로팅 리스트 버튼 (선택사항) */}
        <div className="lg:hidden absolute bottom-24 left-1/2 -translate-x-1/2 z-10">
           <button onClick={() => {/* 모바일 리스트 토글 로직 */}} className="bg-black text-white px-6 py-3 rounded-full shadow-2xl font-bold text-sm flex items-center gap-2">
             <Icons.List size={18} /> 목록보기
           </button>
        </div>
      </main>

      {/* 3. 오버레이 모달 레이어 */}
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
              className="relative w-full lg:max-w-xl bg-white rounded-t-[32px] lg:rounded-2xl overflow-hidden"
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
