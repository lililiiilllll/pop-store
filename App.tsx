import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAnimation, useDragControls, PanInfo, motion } from 'framer-motion';

// 1. 설정 및 타입 파일
import { Icons, POPUP_STORES, DEFAULT_POPUP_IMAGE } from './constants';
import { PopupStore, UserProfile, AppNotification } from './types';
import { supabase, isSupabaseConfigured, getProfile, fetchNotifications, markNotificationAsRead } from './lib/supabase';

// 2. 컴포넌트
import Header from './components/Header';
import MapArea from './components/MapArea';
import PopupList from './components/PopupList';
import CategoryFilter from './components/CategoryFilter';
import ReportModal from './components/ReportModal';
import AdminDashboard from './components/AdminDashboard';
import DetailModal from './components/DetailModal';
import SearchOverlay from './components/SearchOverlay';
import LocationSelector from './components/LocationSelector';
import AlertModal from './components/AlertModal';
import SuccessModal from './components/SuccessModal';
import LoginModal from './components/LoginModal';
import ProfileModal from './components/ProfileModal';
import NicknameModal from './components/NicknameModal';
import BottomNav from './components/BottomNav';
import SavedView from './components/SavedView';
import NotificationList from './components/NotificationList';
import AdminPinModal from './components/AdminPinModal';

// --- 유틸리티 함수 ---
const DEFAULT_LOCATION = { lat: 37.5547, lng: 126.9706 };

// 거리 계산 (Haversine Formula)
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

const App: React.FC = () => {
  // --- 상태 관리 ---
  const [activeTab, setActiveTab] = useState<'home' | 'saved'>('home');
  const [selectedFilter, setSelectedFilter] = useState<string>('전체');
  const [allStores, setAllStores] = useState<PopupStore[]>([]);
  const [sheetOpen, setSheetOpen] = useState(true);
  const dragControls = useDragControls();

  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [likedStoreIds, setLikedStoreIds] = useState<Set<string>>(new Set());
  const [notifiedStoreIds, setNotifiedStoreIds] = useState<Set<string>>(new Set());
  const [showLikedOnly, setShowLikedOnly] = useState(false);
  
  // 모달 제어
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isLocationSelectorOpen, setIsLocationSelectorOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isNicknameModalOpen, setIsNicknameModalOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ isOpen: false, title: '', message: '' });
  const [successConfig, setSuccessConfig] = useState({ isOpen: false, title: '', message: '', onConfirm: undefined as any });

  // 지도 및 선택 데이터
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [detailStore, setDetailStore] = useState<PopupStore | null>(null);
  const [mapCenter, setMapCenter] = useState<{lat: number, lng: number} | undefined>(undefined);
  const [currentMapCenter, setCurrentMapCenter] = useState<{lat: number, lng: number}>(DEFAULT_LOCATION);
  const [currentBounds, setCurrentBounds] = useState<{ minLat: number, maxLat: number, minLng: number, maxLng: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentLocationName, setCurrentLocationName] = useState('지도 탐색');
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // --- 알림/토스트 핸들러 ---
  const showToast = useCallback((msg: string) => { setToastMessage(msg); setTimeout(() => setToastMessage(null), 3000); }, []);
  const showAlert = useCallback((title: string, message: string) => { setAlertConfig({ isOpen: true, title, message }); }, []);
  const handleShowSuccess = useCallback((title: string, message: string, onConfirm?: () => void) => {
      setSuccessConfig({ isOpen: true, title, message, onConfirm });
  }, []);

  // --- 데이터 패칭 (Supabase 연동) ---
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
      }));
      setAllStores(processed);
    } catch (err) {
      setAllStores(POPUP_STORES); // 에러 시 데모 데이터 사용
    } finally {
      setIsLoading(false);
    }
  };

  // --- [핵심 기능] 필터링 로직 복구 (지도 내 팝업 + Fallback) ---
  const { displayStores, isFallback } = useMemo(() => {
    // 1. 기본 필터 (카테고리, 찜하기 등)
    let filtered = allStores.filter(s => {
      const likedMatch = !showLikedOnly || likedStoreIds.has(s.id);
      // 여기에 '지금 오픈', '무료 입장' 등의 상세 필터 로직 추가 가능
      return likedMatch;
    });

    // 2. 지도 영역(Bounds) 필터링
    if (currentBounds) {
      const inBounds = filtered.filter(s => 
        s.lat >= currentBounds.minLat && s.lat <= currentBounds.maxLat &&
        s.lng >= currentBounds.minLng && s.lng <= currentBounds.maxLng
      );

      // 3. 만약 영역 내에 없다면 가까운 팝업 추천 (Fallback)
      if (inBounds.length === 0 && filtered.length > 0) {
        const withDist = filtered.map(s => ({
          ...s,
          distance: getDistance(currentMapCenter.lat, currentMapCenter.lng, s.lat, s.lng)
        })).sort((a, b) => a.distance - b.distance);
        
        return { displayStores: withDist.slice(0, 5), isFallback: true };
      }
      return { displayStores: inBounds, isFallback: false };
    }

    return { displayStores: filtered, isFallback: false };
  }, [allStores, currentBounds, currentMapCenter, showLikedOnly, likedStoreIds]);

  // --- 이벤트 핸들러 ---
  const handleStoreSelect = (id: string) => {
    const s = allStores.find(st => st.id === id);
    if (s) {
      setSelectedStoreId(id);
      setDetailStore(s); // 상세 페이지 노출
      setMapCenter({ lat: s.lat, lng: s.lng }); // 지도 이동
      if (window.innerWidth < 1024) setSheetOpen(false); // 모바일은 시트 닫기
    }
  };

  const handleMarkerClick = (id: string) => {
    setSelectedStoreId(id);
    const s = allStores.find(st => st.id === id);
    if (s) setDetailStore(s); // 핀 클릭 시 상세 노출
  };

  // --- 초기 로드 ---
  useEffect(() => {
    fetchStores();
    // 위치 권한 요청 및 초기 위치 설정
    navigator.geolocation.getCurrentPosition(
      (pos) => setMapCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setMapCenter(DEFAULT_LOCATION)
    );
  }, []);

  if (isAdminOpen) {
    return <AdminDashboard allStores={allStores} onBack={() => setIsAdminOpen(false)} onRefresh={fetchStores} />;
  }

  return (
    <div className="flex flex-col lg:flex-row h-screen w-full overflow-hidden bg-white">
      {/* 데스크탑 사이드바 */}
      <div className="hidden lg:flex w-[400px] flex-col z-40 bg-white border-r border-gray-200">
        <Header 
          userProfile={userProfile} 
          onSearchClick={() => setIsSearchOpen(true)}
          onAdminClick={() => setIsAdminOpen(true)}
          onProfileClick={() => !user ? setIsLoginModalOpen(true) : setIsProfileModalOpen(true)}
        />
        <CategoryFilter selected={selectedFilter} onSelect={setSelectedFilter} showLikedOnly={showLikedOnly} onToggleLiked={() => setShowLikedOnly(!showLikedOnly)} />
        <div className="flex-1 overflow-y-auto bg-[#f2f4f6] p-4">
          {isFallback && (
            <div className="mb-4 p-3 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold flex items-center gap-2">
              <Icons.Info size={14} /> 현재 지도 영역에 팝업이 없어 근처의 팝업을 추천해요.
            </div>
          )}
          <PopupList stores={displayStores} selectedStoreId={selectedStoreId} onStoreSelect={handleStoreSelect} />
        </div>
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* 메인 지도 영역 */}
      <div className="flex-1 relative overflow-hidden">
        {/* 모바일 헤더 */}
        <div className="lg:hidden absolute top-0 left-0 right-0 z-30 bg-white/90 backdrop-blur-md">
          <Header 
             userProfile={userProfile}
             onSearchClick={() => setIsSearchOpen(true)}
             onProfileClick={() => setIsLoginModalOpen(true)}
          />
          <CategoryFilter selected={selectedFilter} onSelect={setSelectedFilter} showLikedOnly={showLikedOnly} onToggleLiked={() => setShowLikedOnly(!showLikedOnly)} />
        </div>

        <MapArea
          stores={allStores}
          selectedStoreId={selectedStoreId}
          onMarkerClick={handleMarkerClick}
          onMapIdle={(bounds, center) => {
            setCurrentBounds(bounds);
            setCurrentMapCenter(center);
          }}
          mapCenter={mapCenter}
          onMapClick={() => { setSelectedStoreId(null); setDetailStore(null); }}
        />

        {/* 모바일 바텀 시트 */}
        <motion.div
          initial={false}
          animate={{ y: sheetOpen ? 0 : 'calc(100% - 100px)' }}
          className="lg:hidden absolute inset-x-0 bottom-0 z-40 bg-white rounded-t-[24px] shadow-2xl h-[70vh] flex flex-col"
        >
          <div className="h-10 w-full flex items-center justify-center cursor-pointer" onClick={() => setSheetOpen(!sheetOpen)}>
            <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
          </div>
          <div className="flex-1 overflow-y-auto p-4 bg-[#f9fafb]">
            <h3 className="font-bold mb-4">{isFallback ? "근처 추천 팝업" : "주변 팝업 리스트"}</h3>
            <PopupList stores={displayStores} selectedStoreId={selectedStoreId} onStoreSelect={handleStoreSelect} />
          </div>
          <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
        </motion.div>
      </div>

      {/* 모달 레이어 */}
      <DetailModal store={detailStore} onClose={() => setDetailStore(null)} onShowSuccess={handleShowSuccess} />
      {isSearchOpen && <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} stores={allStores} onSelectResult={handleStoreSelect} />}
      {isLoginModalOpen && <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />}
      <SuccessModal isOpen={successConfig.isOpen} title={successConfig.title} message={successConfig.message} onClose={() => setSuccessConfig({...successConfig, isOpen: false})} />
      {toastMessage && <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] bg-gray-900 text-white px-6 py-3 rounded-full text-sm shadow-xl">{toastMessage}</div>}
    </div>
  );
};

export default App;
