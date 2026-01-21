import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// 1. 설정 및 타입 파일
import { Icons, POPUP_STORES, DEFAULT_POPUP_IMAGE } from './constants';
import { PopupStore, UserProfile, AppNotification } from './types';
import { supabase, getProfile, fetchNotifications } from './lib/supabase';

// 2. 컴포넌트
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
import SavedView from './components/SavedView';

// --- 유틸리티 함수 ---
const DEFAULT_LOCATION = { lat: 37.5547, lng: 126.9706 };

// [거리 계산] Haversine 공식 사용
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // 지구 반지름 (km)
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) + 
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const d = R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  return d;
};

const formatDistance = (km: number) => {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
};

// [영업 상태 판단] 현재 시간 기준
const getStatusInfo = (store: PopupStore) => {
  if (!store?.openTime || !store?.closeTime) return { isOpen: true, text: '정보없음' };
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  const parseTime = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  const openMinutes = parseTime(store.openTime);
  const closeMinutes = parseTime(store.closeTime);
  
  const isOpen = currentMinutes >= openMinutes && currentMinutes < closeMinutes;
  return {
    isOpen,
    text: isOpen ? '영업 중' : '영업 종료'
  };
};

const App: React.FC = () => {
  // --- 상태 관리 ---
  const [activeTab, setActiveTab] = useState<'home' | 'saved'>('home');
  const [selectedFilter, setSelectedFilter] = useState<string>('전체');
  const [allStores, setAllStores] = useState<PopupStore[]>([]);
  const [sheetOpen, setSheetOpen] = useState(true);
  const [userCoords, setUserCoords] = useState<{lat: number, lng: number} | null>(null);

  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [likedStoreIds, setLikedStoreIds] = useState<Set<string>>(new Set());
  const [showLikedOnly, setShowLikedOnly] = useState(false);
  
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isLocationSelectorOpen, setIsLocationSelectorOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [successConfig, setSuccessConfig] = useState({ isOpen: false, title: '', message: '', onConfirm: undefined as any });

  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [detailStore, setDetailStore] = useState<PopupStore | null>(null);
  const [mapCenter, setMapCenter] = useState<{lat: number, lng: number} | undefined>(undefined);
  const [currentBounds, setCurrentBounds] = useState<{ minLat: number, maxLat: number, minLng: number, maxLng: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentLocationName, setCurrentLocationName] = useState('성수/서울숲');

  const handleShowSuccess = useCallback((title: string, message: string, onConfirm?: () => void) => {
      setSuccessConfig({ isOpen: true, title, message, onConfirm });
  }, []);

  // 1. 사용자 위치 초기화
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setUserCoords(DEFAULT_LOCATION)
      );
    }
  }, []);

  // 2. Supabase 데이터 로드
  const fetchStores = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('popup_stores').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      
      const processed = (data || []).map((item: any) => ({
        ...item,
        id: item.id.toString(),
        name: item.name || item.title || '이름 없음',
        location: item.location || item.address || '위치 정보 없음',
        imageUrl: item.image_url || item.imageUrl || DEFAULT_POPUP_IMAGE,
        lat: Number(item.lat),
        lng: Number(item.lng),
        openTime: item.open_time || '10:00',
        closeTime: item.close_time || '20:00',
        isFree: !!(item.is_free || item.isFree),
        isReservationRequired: !!(item.requires_reservation || item.is_reservation_required)
      }));
      setAllStores(processed);
    } catch (err) {
      setAllStores(POPUP_STORES);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStores();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const profile = await getProfile(session.user.id);
        setUserProfile(profile as UserProfile);
        const { data: favs } = await supabase.from('favorites').select('store_id').eq('user_id', session.user.id);
        if (favs) setLikedStoreIds(new Set(favs.map(f => f.store_id.toString())));
        setIsLoginModalOpen(false); 
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // 3. 필터링 및 거리 정보 데이터 가공
  const displayStores = useMemo(() => {
    let baseData = allStores.map(s => {
      const dist = userCoords ? getDistance(userCoords.lat, userCoords.lng, s.lat, s.lng) : 0;
      const status = getStatusInfo(s);
      return {
        ...s,
        distanceText: formatDistance(dist),
        distanceValue: dist,
        statusText: status.text,
        isOpenNow: status.isOpen
      };
    });

    let filtered = baseData.filter(s => {
      const likedMatch = !showLikedOnly || likedStoreIds.has(s.id);
      let statusMatch = true;
      if (selectedFilter === '지금 오픈') statusMatch = s.isOpenNow;
      else if (selectedFilter === '무료 입장') statusMatch = s.isFree;
      else if (selectedFilter === '예약 필수') statusMatch = s.isReservationRequired;
      return likedMatch && statusMatch;
    });

    filtered.sort((a, b) => a.distanceValue - b.distanceValue);

    if (currentBounds) {
      return filtered.filter(s => 
        s.lat >= currentBounds.minLat && s.lat <= currentBounds.maxLat &&
        s.lng >= currentBounds.minLng && s.lng <= currentBounds.maxLng
      );
    }
    return filtered;
  }, [allStores, currentBounds, userCoords, showLikedOnly, likedStoreIds, selectedFilter]);

  // --- [핵심: 상세 모달 노출 로직] ---
  const handleStoreSelect = useCallback((id: string) => {
    // 1. 전체 데이터에서 원본 찾기
    const rawStore = allStores.find(st => st.id === id);
    if (!rawStore) return;

    // 2. 거리/영업 정보 병합
    const enrichedStore = displayStores.find(st => st.id === id) || {
      ...rawStore,
      distanceText: userCoords ? formatDistance(getDistance(userCoords.lat, userCoords.lng, rawStore.lat, rawStore.lng)) : '거리 정보 없음',
      statusText: getStatusInfo(rawStore).text,
      isOpenNow: getStatusInfo(rawStore).isOpen
    };

    setSelectedStoreId(id);
    setDetailStore(enrichedStore); // 상세 모달 데이터 주입
    setMapCenter({ lat: rawStore.lat, lng: rawStore.lng });
    
    // 모바일 바텀 시트 내리기
    if (window.innerWidth < 1024) {
      setSheetOpen(false);
    }
  }, [allStores, displayStores, userCoords]);

  if (isAdminOpen) return <AdminDashboard allStores={allStores} onBack={() => setIsAdminOpen(false)} onRefresh={fetchStores} />;

  return (
    <div className="relative flex flex-col lg:flex-row h-screen w-full overflow-hidden bg-white font-sans text-gray-900">
      
      {/* 데스크탑 사이드바 (z-10) */}
      <aside className="hidden lg:flex w-[420px] flex-col z-10 bg-white border-r border-gray-100 shadow-xl">
        <Header location={currentLocationName} userProfile={userProfile} onSearchClick={() => setIsSearchOpen(true)} onAdminClick={() => setIsAdminOpen(true)} onProfileClick={() => !user ? setIsLoginModalOpen(true) : setIsProfileModalOpen(true)} onLocationClick={() => setIsLocationSelectorOpen(true)} />
        <CategoryFilter selected={selectedFilter} onSelect={setSelectedFilter} showLikedOnly={showLikedOnly} onToggleLiked={() => setShowLikedOnly(!showLikedOnly)} />
        <div className="flex-1 overflow-y-auto bg-gray-50/50 p-4 custom-scrollbar">
          {activeTab === 'home' ? (
            <div className="pb-10">
              <PopupList stores={displayStores} selectedStoreId={selectedStoreId} onStoreSelect={handleStoreSelect} />
            </div>
          ) : (
            <SavedView stores={allStores.filter(s => likedStoreIds.has(s.id))} onStoreClick={handleStoreSelect} />
          )}
        </div>
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      </aside>

      {/* 지도 및 모바일 UI 영역 (z-0) */}
      <main className="flex-1 relative z-0 bg-gray-100">
        <div className="lg:hidden absolute top-0 left-0 right-0 z-20 bg-white/95 backdrop-blur-md">
            <Header location={currentLocationName} userProfile={userProfile} onSearchClick={() => setIsSearchOpen(true)} onProfileClick={() => !user ? setIsLoginModalOpen(true) : setIsProfileModalOpen(true)} onLocationClick={() => setIsLocationSelectorOpen(true)} />
            <CategoryFilter selected={selectedFilter} onSelect={setSelectedFilter} showLikedOnly={showLikedOnly} onToggleLiked={() => setShowLikedOnly(!showLikedOnly)} />
        </div>

        <MapArea stores={allStores} selectedStoreId={selectedStoreId} onMarkerClick={handleStoreSelect} onMapIdle={(b) => setCurrentBounds(b)} mapCenter={mapCenter} onMapClick={() => setSelectedStoreId(null)} userLocation={userCoords} onDetailOpen={setDetailStore} />

        {activeTab === 'home' && (
          <motion.div animate={{ y: sheetOpen ? 0 : 'calc(100% - 140px)' }} className="lg:hidden absolute inset-0 z-30 flex flex-col pointer-events-none">
            <div className="mt-auto w-full h-[75vh] bg-white rounded-t-[32px] shadow-2xl flex flex-col pointer-events-auto border-t border-gray-100">
              <div className="h-8 w-full flex items-center justify-center cursor-pointer" onClick={() => setSheetOpen(!sheetOpen)}>
                <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
              </div>
              <div className="flex-1 overflow-y-auto px-4 pb-32">
                <PopupList stores={displayStores} selectedStoreId={selectedStoreId} onStoreSelect={handleStoreSelect} />
              </div>
            </div>
          </motion.div>
        )}
      </main>

      {/* 상세 모달 레이어 (z-50으로 최상단 보장) */}
      <AnimatePresence>
        {detailStore && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            <DetailModal 
              store={detailStore} 
              onClose={() => {
                setDetailStore(null);
                setSelectedStoreId(null);
              }} 
              onShowSuccess={handleShowSuccess} 
              isLiked={likedStoreIds.has(detailStore.id)} 
            />
          </div>
        )}
      </AnimatePresence>

      {/* 기타 오버레이 모달들 */}
      {isSearchOpen && <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} stores={allStores} onSelectResult={handleStoreSelect} />}
      {isLocationSelectorOpen && <LocationSelector isOpen={isLocationSelectorOpen} onClose={() => setIsLocationSelectorOpen(false)} onSelect={(loc) => { setCurrentLocationName(loc.name); setMapCenter({ lat: loc.lat, lng: loc.lng }); setIsLocationSelectorOpen(false); }} />}
      {isLoginModalOpen && <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />}
      {isProfileModalOpen && <ProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} userProfile={userProfile} />}
      {successConfig.isOpen && <SuccessModal isOpen={successConfig.isOpen} title={successConfig.title} message={successConfig.message} onClose={() => setSuccessConfig(prev => ({...prev, isOpen: false}))} />}
    </div>
  );
};

export default App;
