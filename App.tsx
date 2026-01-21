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

const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
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

const getStatusInfo = (store: PopupStore) => {
  if (!store?.openTime || !store?.closeTime) return { isOpen: true, text: '정보없음' };
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [openH, openM] = store.openTime.split(':').map(Number);
  const [closeH, closeM] = store.closeTime.split(':').map(Number);
  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;
  const isOpen = currentMinutes >= openMinutes && currentMinutes < closeMinutes;
  return { isOpen, text: isOpen ? '영업 중' : '영업 종료' };
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

  // 초기 로드: 위치 및 데이터
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setUserCoords(DEFAULT_LOCATION)
      );
    }
    fetchStores();
  }, []);

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

  // 데이터 가공 (리스트용)
  const displayStores = useMemo(() => {
    let baseData = allStores.map(s => {
      const dist = userCoords ? getDistance(userCoords.lat, userCoords.lng, s.lat, s.lng) : 0;
      const status = getStatusInfo(s);
      return { ...s, distanceText: formatDistance(dist), distanceValue: dist, statusText: status.text, isOpenNow: status.isOpen };
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

  // --- [수정: 클릭 핸들러 - 상세 모달 활성화] ---
  const handleStoreSelect = useCallback((id: string) => {
    const store = displayStores.find(st => st.id === id) || allStores.find(st => st.id === id);
    if (store) {
      setSelectedStoreId(id);
      setDetailStore(store); // 이 값이 null이 아니어야 모달이 뜸
      setMapCenter({ lat: store.lat, lng: store.lng });
      if (window.innerWidth < 1024) setSheetOpen(false);
      console.log("Selected:", store.name); // 확인용 로그
    }
  }, [displayStores, allStores]);

  if (isAdminOpen) return <AdminDashboard allStores={allStores} onBack={() => setIsAdminOpen(false)} onRefresh={fetchStores} />;

  return (
    <div className="relative flex flex-col lg:flex-row h-screen w-full overflow-hidden bg-white font-sans text-gray-900">
      
      {/* 1. 데스크탑 사이드바 */}
      <aside className="hidden lg:flex w-[420px] flex-col z-10 bg-white border-r border-gray-100 shadow-xl">
        <Header location={currentLocationName} userProfile={userProfile} onSearchClick={() => setIsSearchOpen(true)} onAdminClick={() => setIsAdminOpen(true)} onProfileClick={() => !user ? setIsLoginModalOpen(true) : setIsProfileModalOpen(true)} onLocationClick={() => setIsLocationSelectorOpen(true)} />
        <CategoryFilter selected={selectedFilter} onSelect={setSelectedFilter} showLikedOnly={showLikedOnly} onToggleLiked={() => setShowLikedOnly(!showLikedOnly)} />
        <div className="flex-1 overflow-y-auto bg-gray-50/50 p-4 custom-scrollbar">
          <PopupList stores={displayStores} selectedStoreId={selectedStoreId} onStoreSelect={handleStoreSelect} />
        </div>
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      </aside>

      {/* 2. 지도 및 모바일 바텀시트 */}
      <main className="flex-1 relative z-0">
        <MapArea stores={allStores} selectedStoreId={selectedStoreId} onMarkerClick={handleStoreSelect} onMapIdle={(b) => setCurrentBounds(b)} mapCenter={mapCenter} onMapClick={() => setSelectedStoreId(null)} userLocation={userCoords} onDetailOpen={setDetailStore} />
        
        {/* 모바일 바텀시트 */}
        <div className="lg:hidden absolute inset-0 pointer-events-none z-20">
            <motion.div animate={{ y: sheetOpen ? 0 : 'calc(100% - 140px)' }} className="mt-auto w-full h-[70vh] bg-white rounded-t-[32px] shadow-2xl pointer-events-auto overflow-hidden flex flex-col">
              <div className="h-8 flex items-center justify-center cursor-pointer" onClick={() => setSheetOpen(!sheetOpen)}><div className="w-12 h-1.5 bg-gray-200 rounded-full" /></div>
              <div className="flex-1 overflow-y-auto px-4 pb-20"><PopupList stores={displayStores} selectedStoreId={selectedStoreId} onStoreSelect={handleStoreSelect} /></div>
            </motion.div>
        </div>
      </aside>

      {/* 3. 전역 상세 페이지 모달 (최상위 z-index) */}
      <AnimatePresence>
        {detailStore && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center">
            {/* 배경 어둡게 처리 */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDetailStore(null)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            {/* 모달 본체 */}
            <DetailModal 
              store={detailStore} 
              onClose={() => { setDetailStore(null); setSelectedStoreId(null); }} 
              onShowSuccess={handleShowSuccess} 
              isLiked={likedStoreIds.has(detailStore.id)} 
            />
          </div>
        )}
      </AnimatePresence>

      {/* 기타 모달 레이어 */}
      {isSearchOpen && <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} stores={allStores} onSelectResult={handleStoreSelect} />}
      {isLocationSelectorOpen && <LocationSelector isOpen={isLocationSelectorOpen} onClose={() => setIsLocationSelectorOpen(false)} onSelect={(loc) => { setCurrentLocationName(loc.name); setMapCenter({ lat: loc.lat, lng: loc.lng }); setIsLocationSelectorOpen(false); }} />}
      {isLoginModalOpen && <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />}
      {isProfileModalOpen && <ProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} userProfile={userProfile} />}
      {successConfig.isOpen && <SuccessModal isOpen={successConfig.isOpen} title={successConfig.title} message={successConfig.message} onClose={() => setSuccessConfig(prev => ({...prev, isOpen: false}))} />}
    </div>
  );
};

export default App;
