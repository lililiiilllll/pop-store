import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// 1. 설정 및 타입 파일
import { Icons, POPUP_STORES, DEFAULT_POPUP_IMAGE } from './constants';
import { PopupStore, UserProfile, AppNotification } from './types';
import { supabase, getProfile, fetchNotifications } from './lib/supabase';

// 2. 컴포넌트 (절대 경로 및 파일 존재 여부 확인 필수)
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
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

const checkIsOpenNow = (store: PopupStore) => {
  if (!store?.openTime || !store?.closeTime) return true;
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  try {
    const [openH, openM] = store.openTime.split(':').map(Number);
    const [closeH, closeM] = store.closeTime.split(':').map(Number);
    return currentMinutes >= (openH * 60 + openM) && currentMinutes < (closeH * 60 + closeM);
  } catch (e) { return true; }
};

const App: React.FC = () => {
  // --- 상태 관리 ---
  const [activeTab, setActiveTab] = useState<'home' | 'saved'>('home');
  const [selectedFilter, setSelectedFilter] = useState<string>('전체');
  const [allStores, setAllStores] = useState<PopupStore[]>([]);
  const [sheetOpen, setSheetOpen] = useState(true);

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

  const showToast = useCallback((msg: string) => { setToastMessage(msg); setTimeout(() => setToastMessage(null), 3000); }, []);
  const handleShowSuccess = useCallback((title: string, message: string, onConfirm?: () => void) => {
      setSuccessConfig({ isOpen: true, title, message, onConfirm });
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
        lat: Number(item.lat),
        lng: Number(item.lng),
        imageUrl: item.image_url || DEFAULT_POPUP_IMAGE,
        openTime: item.open_time || '10:30',
        closeTime: item.close_time || '20:00',
        isFree: !!item.is_free,
        isReservationRequired: !!item.requires_reservation
      }));
      setAllStores(processed);
    } catch (err) {
      console.error("Supabase 로드 실패, 로컬 데이터를 사용합니다:", err);
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
        const notifs = await fetchNotifications(session.user.id);
        setNotifications(notifs);
        setIsLoginModalOpen(false); // 로그인 성공 시 모달 닫기
      } else {
        setUserProfile(null);
        setLikedStoreIds(new Set());
      }
    });
    fetchStores();
    return () => subscription.unsubscribe();
  }, []);

  const { displayStores, isFallback } = useMemo(() => {
    let filtered = allStores.filter(s => {
      const likedMatch = !showLikedOnly || likedStoreIds.has(s.id);
      let statusMatch = true;
      if (selectedFilter === '지금 오픈') statusMatch = checkIsOpenNow(s);
      else if (selectedFilter === '무료 입장') statusMatch = s.isFree;
      else if (selectedFilter === '예약 필수') statusMatch = s.isReservationRequired;
      return likedMatch && statusMatch;
    });

    if (currentBounds) {
      const inBounds = filtered.filter(s => 
        s.lat >= currentBounds.minLat && s.lat <= currentBounds.maxLat &&
        s.lng >= currentBounds.minLng && s.lng <= currentBounds.maxLng
      );
      if (inBounds.length === 0 && filtered.length > 0) {
        const withDist = filtered.map(s => ({
          ...s,
          distance: getDistance(currentMapCenter.lat, currentMapCenter.lng, s.lat, s.lng)
        })).sort((a, b) => (a.distance || 0) - (b.distance || 0));
        return { displayStores: withDist.slice(0, 5), isFallback: true };
      }
      return { displayStores: inBounds, isFallback: false };
    }
    return { displayStores: filtered, isFallback: false };
  }, [allStores, currentBounds, currentMapCenter, showLikedOnly, likedStoreIds, selectedFilter]);

  const handleStoreSelect = useCallback((id: string) => {
    const s = allStores.find(st => st.id === id);
    if (s) {
      setSelectedStoreId(id);
      setDetailStore(s);
      setMapCenter({ lat: s.lat, lng: s.lng });
      setIsSearchOpen(false);
      if (window.innerWidth < 1024) setSheetOpen(false);
    }
  }, [allStores]);

  if (isAdminOpen) {
    return <AdminDashboard allStores={allStores} onBack={() => setIsAdminOpen(false)} onRefresh={fetchStores} />;
  }

  return (
    <div className="flex flex-col lg:flex-row h-screen w-full overflow-hidden bg-white">
      {/* 1. 데스크탑 사이드바 */}
      <div className="hidden lg:flex w-[400px] xl:w-[440px] flex-col z-40 bg-white border-r border-gray-200">
        <Header 
          location={currentLocationName}
          userProfile={userProfile} 
          onSearchClick={() => setIsSearchOpen(true)}
          onAdminClick={() => setIsAdminOpen(true)}
          onProfileClick={() => !user ? setIsLoginModalOpen(true) : setIsProfileModalOpen(true)}
          onLocationClick={() => setIsLocationSelectorOpen(true)}
        />
        <CategoryFilter selected={selectedFilter} onSelect={setSelectedFilter} showLikedOnly={showLikedOnly} onToggleLiked={() => setShowLikedOnly(!showLikedOnly)} />
        <div className="flex-1 overflow-y-auto bg-[#f2f4f6] p-4 custom-scrollbar">
          {activeTab === 'home' ? (
            <>
              {isFallback && (
                <div className="mb-4 p-3 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold flex items-center gap-2 border border-blue-100">
                  <Icons.Info size={14} /> 현재 지도 영역에 팝업이 없어 근처를 추천해요.
                </div>
              )}
              <PopupList stores={displayStores} selectedStoreId={selectedStoreId} onStoreSelect={handleStoreSelect} />
            </>
          ) : (
            <SavedView stores={allStores.filter(s => likedStoreIds.has(s.id))} onStoreClick={handleStoreSelect} />
          )}
        </div>
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* 2. 메인 지도 영역 */}
      <div className="flex-1 relative bg-gray-50 h-full overflow-hidden">
        <div className="lg:hidden absolute top-0 left-0 right-0 z-30 pointer-events-none p-0">
          <div className="pointer-events-auto bg-white/95 backdrop-blur-md shadow-sm">
            <Header 
                location={currentLocationName}
                userProfile={userProfile}
                onSearchClick={() => setIsSearchOpen(true)}
                onProfileClick={() => !user ? setIsLoginModalOpen(true) : setIsProfileModalOpen(true)}
                onLocationClick={() => setIsLocationSelectorOpen(true)}
            />
            <CategoryFilter selected={selectedFilter} onSelect={setSelectedFilter} showLikedOnly={showLikedOnly} onToggleLiked={() => setShowLikedOnly(!showLikedOnly)} />
          </div>
        </div>

        <div className="absolute inset-0 z-0 h-full w-full">
            <MapArea
              stores={allStores}
              selectedStoreId={selectedStoreId}
              onMarkerClick={(id) => setSelectedStoreId(id)}
              onMapIdle={(bounds, center) => {
                setCurrentBounds(bounds);
                setCurrentMapCenter(center);
              }}
              mapCenter={mapCenter}
              onMapClick={() => { setSelectedStoreId(null); }}
              userLocation={null}
              onDetailOpen={(store) => setDetailStore(store)}
            />
        </div>

        {activeTab === 'home' && (
          <motion.div
            initial={false}
            animate={{ y: sheetOpen ? 0 : 'calc(100% - 130px)' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="lg:hidden absolute inset-0 z-40 flex flex-col pointer-events-none"
          >
            <div className="mt-auto w-full h-[70vh] bg-white rounded-t-[28px] shadow-[0_-8px_30px_rgba(0,0,0,0.12)] flex flex-col pointer-events-auto border-t border-gray-100">
              <div className="h-10 w-full flex items-center justify-center cursor-pointer touch-none" onClick={() => setSheetOpen(!sheetOpen)}>
                <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
              </div>
              <div className="flex-1 overflow-y-auto p-4 bg-[#f9fafb] pb-36">
                <div onClick={() => setIsSearchOpen(true)} className="mb-6 flex items-center gap-3 bg-white border border-gray-200 px-4 py-3 rounded-2xl shadow-sm cursor-pointer">
                  <Icons.Search size={18} className="text-gray-400" />
                  <span className="text-gray-400 text-[15px]">팝업스토어를 검색해보세요</span>
                </div>
                <div className="flex justify-between items-center mb-5 px-1">
                  <h3 className="font-bold text-gray-900 text-lg">{isFallback ? "근처 추천 팝업" : "주변 팝업 리스트"}</h3>
                  <span className="text-[11px] font-semibold text-tossBlue bg-blue-50 px-2 py-1 rounded-full">{displayStores.length}개 발견</span>
                </div>
                <PopupList stores={displayStores} selectedStoreId={selectedStoreId} onStoreSelect={handleStoreSelect} />
              </div>
            </div>
          </motion.div>
        )}

        <div className="lg:hidden absolute bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-gray-100 pointer-events-auto">
            <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
      </div>

      {/* 3. 오버레이 및 모달 (안정적인 렌더링을 위해 조건부 렌더링 최적화) */}
      <AnimatePresence>
        {detailStore && (
          <DetailModal 
            store={detailStore} 
            onClose={() => setDetailStore(null)} 
            onShowSuccess={handleShowSuccess} 
            isLiked={likedStoreIds.has(detailStore.id)}
          />
        )}
      </AnimatePresence>
      
      {isSearchOpen && (
        <SearchOverlay 
          isOpen={isSearchOpen} 
          onClose={() => setIsSearchOpen(false)} 
          stores={allStores} 
          onSelectResult={handleStoreSelect} 
        />
      )}
      
      {isLocationSelectorOpen && (
        <LocationSelector 
          isOpen={isLocationSelectorOpen} 
          onClose={() => setIsLocationSelectorOpen(false)} 
          onSelect={(loc) => {
            setCurrentLocationName(loc.name);
            setMapCenter({ lat: loc.lat, lng: loc.lng });
            setIsLocationSelectorOpen(false);
          }}
        />
      )}

      {isLoginModalOpen && (
        <LoginModal 
          isOpen={isLoginModalOpen} 
          onClose={() => setIsLoginModalOpen(false)} 
        />
      )}
      
      {isProfileModalOpen && (
        <ProfileModal 
          isOpen={isProfileModalOpen} 
          onClose={() => setIsProfileModalOpen(false)} 
          userProfile={userProfile}
        />
      )}

      {successConfig.isOpen && (
        <SuccessModal 
          isOpen={successConfig.isOpen} 
          title={successConfig.title} 
          message={successConfig.message} 
          onClose={() => {
            setSuccessConfig(prev => ({...prev, isOpen: false}));
            if (successConfig.onConfirm) successConfig.onConfirm();
          }} 
        />
      )}
      
      {toastMessage && (
        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[100] bg-gray-900/90 text-white px-6 py-3 rounded-full text-sm font-medium shadow-xl">
          {toastMessage}
        </div>
      )}
    </div>
  );
};

export default App;
