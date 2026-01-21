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

// [추가] 거리 계산 및 포맷팅 (m/km 단위 변경)
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // 지구 반지름 (km)
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const d = R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  return d;
};

const formatDistance = (km: number) => {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
};

// [추가] 영업 상태 체크
const getStatusInfo = (store: PopupStore) => {
  if (!store?.openTime || !store?.closeTime) return { isOpen: true, text: '정보없음' };
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [openH, openM] = store.openTime.split(':').map(Number);
  const [closeH, closeM] = store.closeTime.split(':').map(Number);
  
  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;
  
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

  // 사용자 위치 (거리 계산용)
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
  const [currentMapCenter, setCurrentMapCenter] = useState<{lat: number, lng: number}>(DEFAULT_LOCATION);
  const [currentBounds, setCurrentBounds] = useState<{ minLat: number, maxLat: number, minLng: number, maxLng: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentLocationName, setCurrentLocationName] = useState('성수/서울숲');
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleShowSuccess = useCallback((title: string, message: string, onConfirm?: () => void) => {
      setSuccessConfig({ isOpen: true, title, message, onConfirm });
  }, []);

  // [기능: 사용자 현재 위치 파악]
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setUserCoords(DEFAULT_LOCATION)
      );
    }
  }, []);

  // [기능: 데이터 로드]
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
        openTime: item.open_time || '10:30',
        closeTime: item.close_time || '20:00',
        isFree: !!(item.is_free || item.isFree),
        isReservationRequired: !!(item.requires_reservation || item.is_reservation_required),
        startDate: item.start_date,
        endDate: item.end_date
      }));
      setAllStores(processed);
    } catch (err) {
      setAllStores(POPUP_STORES);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
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
    fetchStores();
    return () => subscription.unsubscribe();
  }, []);

  // --- [핵심 로직: 리스트 필터링 및 거리/상태 추가] ---
  const { displayStores, isFallback } = useMemo(() => {
    // 1. 기본 정보 추가 (거리, 영업상태)
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

    // 2. 필터링 로직
    let filtered = baseData.filter(s => {
      const likedMatch = !showLikedOnly || likedStoreIds.has(s.id);
      let statusMatch = true;
      if (selectedFilter === '지금 오픈') statusMatch = s.isOpenNow;
      else if (selectedFilter === '무료 입장') statusMatch = s.isFree;
      else if (selectedFilter === '예약 필수') statusMatch = s.isReservationRequired;
      return likedMatch && statusMatch;
    });

    // 3. 거리순 정렬
    filtered.sort((a, b) => a.distanceValue - b.distanceValue);

    if (currentBounds) {
      const inBounds = filtered.filter(s => 
        s.lat >= currentBounds.minLat && s.lat <= currentBounds.maxLat &&
        s.lng >= currentBounds.minLng && s.lng <= currentBounds.maxLng
      );
      if (inBounds.length === 0 && filtered.length > 0) {
        return { displayStores: filtered.slice(0, 5), isFallback: true };
      }
      return { displayStores: inBounds, isFallback: false };
    }
    return { displayStores: filtered, isFallback: false };
  }, [allStores, currentBounds, userCoords, showLikedOnly, likedStoreIds, selectedFilter]);

  const handleStoreSelect = useCallback((id: string) => {
    const s = allStores.find(st => st.id === id);
    if (s) {
      setSelectedStoreId(id);
      setDetailStore(s);
      setMapCenter({ lat: s.lat, lng: s.lng });
      if (window.innerWidth < 1024) setSheetOpen(false);
    }
  }, [allStores]);

  if (isAdminOpen) return <AdminDashboard allStores={allStores} onBack={() => setIsAdminOpen(false)} onRefresh={fetchStores} />;

  return (
    <div className="flex flex-col lg:flex-row h-screen w-full overflow-hidden bg-white font-sans">
      {/* 데스크탑 사이드바 */}
      <div className="hidden lg:flex w-[420px] flex-col z-40 bg-white border-r border-gray-100 shadow-xl">
        <Header 
          location={currentLocationName} 
          userProfile={userProfile} 
          onSearchClick={() => setIsSearchOpen(true)}
          onAdminClick={() => setIsAdminOpen(true)}
          onProfileClick={() => !user ? setIsLoginModalOpen(true) : setIsProfileModalOpen(true)}
          onLocationClick={() => setIsLocationSelectorOpen(true)}
        />
        <CategoryFilter selected={selectedFilter} onSelect={setSelectedFilter} showLikedOnly={showLikedOnly} onToggleLiked={() => setShowLikedOnly(!showLikedOnly)} />
        <div className="flex-1 overflow-y-auto bg-gray-50/50 p-4 custom-scrollbar">
          {activeTab === 'home' ? (
            <>
              <div className="flex justify-between items-center mb-4 px-1">
                <h3 className="font-bold text-gray-900 text-lg">{isFallback ? "근처 추천 팝업" : "현재 위치 팝업"}</h3>
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">{displayStores.length}개</span>
              </div>
              <PopupList stores={displayStores} selectedStoreId={selectedStoreId} onStoreSelect={handleStoreSelect} />
            </>
          ) : (
            <SavedView stores={allStores.filter(s => likedStoreIds.has(s.id))} onStoreClick={handleStoreSelect} />
          )}
        </div>
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* 메인 지도 영역 */}
      <div className="flex-1 relative bg-gray-100">
        <div className="lg:hidden absolute top-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md">
            <Header location={currentLocationName} userProfile={userProfile} onSearchClick={() => setIsSearchOpen(true)} onProfileClick={() => !user ? setIsLoginModalOpen(true) : setIsProfileModalOpen(true)} onLocationClick={() => setIsLocationSelectorOpen(true)} />
            <CategoryFilter selected={selectedFilter} onSelect={setSelectedFilter} showLikedOnly={showLikedOnly} onToggleLiked={() => setShowLikedOnly(!showLikedOnly)} />
        </div>

        <div className="absolute inset-0 z-0">
          <MapArea stores={allStores} selectedStoreId={selectedStoreId} onMarkerClick={handleStoreSelect} onMapIdle={(b, c) => { setCurrentBounds(b); setCurrentMapCenter(c); }} mapCenter={mapCenter} onMapClick={() => setSelectedStoreId(null)} userLocation={userCoords} onDetailOpen={setDetailStore} />
        </div>

        {/* 모바일 바텀 시트 */}
        {activeTab === 'home' && (
          <motion.div animate={{ y: sheetOpen ? 0 : 'calc(100% - 140px)' }} className="lg:hidden absolute inset-0 z-40 flex flex-col pointer-events-none">
            <div className="mt-auto w-full h-[75vh] bg-white rounded-t-[32px] shadow-2xl flex flex-col pointer-events-auto">
              <div className="h-8 w-full flex items-center justify-center" onClick={() => setSheetOpen(!sheetOpen)}>
                <div className="w-10 h-1.5 bg-gray-200 rounded-full" />
              </div>
              <div className="flex-1 overflow-y-auto px-4 pb-32">
                <div className="flex justify-between items-center mb-5 px-1 pt-2">
                  <h3 className="font-bold text-gray-900 text-xl">{isFallback ? "근처 추천 팝업" : "주변 팝업 리스트"}</h3>
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">{displayStores.length}개</span>
                </div>
                <PopupList stores={displayStores} selectedStoreId={selectedStoreId} onStoreSelect={handleStoreSelect} />
              </div>
            </div>
          </motion.div>
        )}

        <div className="lg:hidden absolute bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100">
          <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
      </div>

      {/* 모달 레이어 */}
      <AnimatePresence>
        {detailStore && <DetailModal store={detailStore} onClose={() => setDetailStore(null)} onShowSuccess={handleShowSuccess} isLiked={likedStoreIds.has(detailStore.id)} />}
      </AnimatePresence>
      {isSearchOpen && <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} stores={allStores} onSelectResult={handleStoreSelect} />}
      {isLocationSelectorOpen && <LocationSelector isOpen={isLocationSelectorOpen} onClose={() => setIsLocationSelectorOpen(false)} onSelect={(loc) => { setCurrentLocationName(loc.name); setMapCenter({ lat: loc.lat, lng: loc.lng }); setIsLocationSelectorOpen(false); }} />}
      {isLoginModalOpen && <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />}
      {isProfileModalOpen && <ProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} userProfile={userProfile} />}
      {successConfig.isOpen && <SuccessModal isOpen={successConfig.isOpen} title={successConfig.title} message={successConfig.message} onClose={() => setSuccessConfig(prev => ({...prev, isOpen: false}))} />}
    </div>
  );
};

export default App;
