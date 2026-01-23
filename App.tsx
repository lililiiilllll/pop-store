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
// 💡 이미지 에러 방지를 위한 신뢰도 높은 기본 이미지 주소
const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1531050171669-7df9b2089206?q=80&w=400&auto=format&fit=crop';

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

  // 모바일 리스트 제어
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

  // --- 거리 계산 로직 ---
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    return Math.sqrt(Math.pow(lat2 - lat1, 2) + Math.pow(lng2 - lng1, 2));
  };

  // --- 필터링 및 리스트 로직 ---
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

  // --- 데이터 로드 (이미지 에러 방지 포함) ---
  const fetchStores = async () => {
    try {
      const { data } = await supabase.from('popup_stores').select('*').order('created_at', { ascending: false });
      if (data && data.length > 0) {
        setAllStores(data.map((s: any) => ({ 
          ...s, 
          id: String(s.id), 
          title: s.title || s.name, // 💡 title 컬럼 우선
          imageUrl: s.image_url && s.image_url.startsWith('http') 
            ? s.image_url 
            : FALLBACK_IMAGE // 💡 404 방지를 위한 기본 이미지
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
      setIsMobileListOpen(false); // 상세 보기 시 리스트는 닫음
    }
  }, [allStores]);

  const handleMapIdle = (bounds: any, center: {lat: number, lng: number}) => {
    setMapBounds(bounds);
    setMapCenter(center);
  };

  if (isAdminOpen) return <AdminDashboard allStores={allStores} onBack={() => setIsAdminOpen(false)} onRefresh={fetchStores} />;

  return (
    <div className="relative flex flex-col lg:flex-row h-screen w-full overflow-hidden bg-white text-gray-900 font-sans">
      
      {/* 1. PC 버전 사이드바 (데스크톱 전용) */}
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
          <PopupList stores={visibleStores} onStoreClick={(s) => handleStoreSelect(s.id)} userLocation={userCoords} />
        </div>
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      </aside>

      {/* 2. 메인 지도 영역 (공통) */}
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
        
        {/* 모바일 상단 오버레이 헤더 */}
        <div className="lg:hidden absolute top-0 left-0 right-0 z-20 bg-white/90 backdrop-blur-md shadow-sm">
          <Header location={currentLocationName} onSearchClick={() => setIsSearchOpen(true)} onLocationClick={() => setIsLocationSelectorOpen(true)} />
          <CategoryFilter selected={selectedFilter} onSelect={setSelectedFilter} />
        </div>

        {/* 💡 모바일용 "이 근처 팝업 보기" 버튼 (리스트가 닫혀있을 때만 노출) */}
        {!isMobileListOpen && (
          <div className="lg:hidden absolute bottom-28 left-1/2 -translate-x-1/2 z-30">
            <button 
              onClick={() => setIsMobileListOpen(true)} 
              className="bg-black text-white px-7 py-4 rounded-full shadow-[0_12px_40px_rgba(0,0,0,0.3)] font-bold text-sm flex items-center gap-2 active:scale-95 transition-all"
            >
              <Icons.List size={18} /> 목록보기
            </button>
          </div>
        )}

        {/* 💡 모바일 전용 바텀 시트 리스트 */}
        <div className="lg:hidden">
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: isMobileListOpen ? "8%" : "100%" }} // 💡 닫히면 완전히 아래로, 열리면 상단 끝까지
            transition={{ type: "spring", damping: 28, stiffness: 220 }}
            className="fixed inset-x-0 bottom-0 z-40 bg-white rounded-t-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.15)] flex flex-col h-[92vh]"
          >
            {/* 시트 헤더: 닫기 버튼 포함 */}
            <div className="flex items-center justify-between px-6 pt-7 pb-3">
              <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">주변 팝업 리스트</h2>
              <button 
                onClick={() => setIsMobileListOpen(false)}
                className="p-2.5 bg-gray-100 rounded-full text-gray-500 active:bg-gray-200 transition-colors"
              >
                <Icons.X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto pb-32">
              <PopupList stores={visibleStores} onStoreClick={(s) => handleStoreSelect(s.id)} userLocation={userCoords} />
            </div>
          </motion.div>
          
          <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
      </main>

      {/* 3. 공통 모달 레이어 */}
      <AnimatePresence>
        {detailStore && (
          <div className="fixed inset-0 z-[9999] flex items-end lg:items-center justify-center overflow-hidden">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { setDetailStore(null); setSelectedStoreId(null); }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full lg:max-w-xl bg-white rounded-t-[32px] lg:rounded-2xl overflow-hidden shadow-2xl"
            >
              <DetailModal store={detailStore} onClose={() => { setDetailStore(null); setSelectedStoreId(null); }} onShowSuccess={(t, m) => setSuccessConfig({ isOpen: true, title: t, message: m })} />
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
