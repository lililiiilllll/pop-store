import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAnimation, useDragControls, PanInfo, motion } from 'framer-motion';
import { Icons, POPUP_STORES, DEFAULT_POPUP_IMAGE } from './constants';
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
import { PopupStore, UserProfile, AppNotification } from './types';
import { supabase, isSupabaseConfigured, getProfile, fetchNotifications, markNotificationAsRead } from './lib/supabase';

// 서울역 기본 좌표
const DEFAULT_LOCATION = { lat: 37.5547, lng: 126.9706 };

const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

const checkIsOpenNow = (store: PopupStore) => {
  if (!store?.openTime || !store?.closeTime) return false;
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  try {
    const [openH, openM] = store.openTime.split(':').map(Number);
    const [closeH, closeM] = store.closeTime.split(':').map(Number);
    return currentMinutes >= (openH * 60 + openM) && currentMinutes < (closeH * 60 + closeM);
  } catch (e) {
    return false;
  }
};

const checkIsEnded = (store: PopupStore) => {
  if (store?.isPermanent) return false;
  if (!store?.endDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(store.endDate);
  return end < today;
};

const safeDateFormat = (dateStr: string | null | undefined) => {
  if (!dateStr) return '';
  try {
    return dateStr.split('T')[0].replace(/-/g, '.');
  } catch (e) {
    return dateStr || '';
  }
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'home' | 'saved'>('home');
  const [selectedFilter, setSelectedFilter] = useState<string>('전체');
  const [allStores, setAllStores] = useState<PopupStore[]>([]);
  const [sheetOpen, setSheetOpen] = useState(true);
  const sheetControls = useAnimation();
  const dragControls = useDragControls();

  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [likedStoreIds, setLikedStoreIds] = useState<Set<string>>(new Set());
  const [notifiedStoreIds, setNotifiedStoreIds] = useState<Set<string>>(new Set());
  const [showLikedOnly, setShowLikedOnly] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isSelectingLocation, setIsSelectingLocation] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isLocationSelectorOpen, setIsLocationSelectorOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isAdminPinModalOpen, setIsAdminPinModalOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isNicknameModalOpen, setIsNicknameModalOpen] = useState(false);
  
  const [alertConfig, setAlertConfig] = useState({ isOpen: false, title: '', message: '' });
  const [successConfig, setSuccessConfig] = useState<{ isOpen: boolean, title: string, message: string, onConfirm?: () => void }>({ isOpen: false, title: '', message: '', onConfirm: undefined });

  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [detailStore, setDetailStore] = useState<PopupStore | null>(null);
  const [reportPrefill, setReportPrefill] = useState<{lat: number, lng: number, address: string} | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentLocationName, setCurrentLocationName] = useState('성수/서울숲');
  const [mapCenter, setMapCenter] = useState<{lat: number, lng: number} | undefined>(undefined);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [currentMapCenter, setCurrentMapCenter] = useState<{lat: number, lng: number} | null>(null);
  const [currentBounds, setCurrentBounds] = useState<{ minLat: number, maxLat: number, minLng: number, maxLng: number } | null>(null);

  const showToast = useCallback((msg: string) => { setToastMessage(msg); setTimeout(() => setToastMessage(null), 3000); }, []);
  const showAlert = useCallback((title: string, message: string) => { setAlertConfig({ isOpen: true, title, message }); }, []);
  
  const handleShowSuccess = useCallback((title: string, message: string, onConfirm?: () => void) => {
      setSuccessConfig({ isOpen: true, title, message, onConfirm });
  }, []);

  const handleSuccessClose = useCallback(() => {
      const callback = successConfig.onConfirm;
      setSuccessConfig(prev => ({ ...prev, isOpen: false }));
      if (callback) callback();
  }, [successConfig]);

  const fetchStores = async (retryCount = 0) => {
    if (!isSupabaseConfigured) {
        setAllStores(POPUP_STORES);
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('popup_stores').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      const processed = (data || []).map((item: any) => ({
        id: item?.id, title: item?.title || '제목 없음', description: item?.description || '', detailedContent: item?.detailed_content || '',
        period: (item?.start_date && item?.end_date) ? `${safeDateFormat(item.start_date)} ~ ${safeDateFormat(item.end_date)}` : (item?.period || '날짜 미정'),
        category: item?.category || '기타', location: item?.address || item?.location || '위치 정보 없음',
        lat: item?.lat ? Number(item.lat) : 0, lng: item?.lng ? Number(item.lng) : 0,
        imageUrl: item?.image_url || DEFAULT_POPUP_IMAGE, instagramUrl: item?.link_url || item?.instagram_url || '',
        is_verified: !!item?.is_verified, isHot: false, isPermanent: !item?.start_date, startDate: item?.start_date, endDate: item?.end_date,
        openTime: item?.open_time || '10:30', closeTime: item?.close_time || '20:00', operatingHours: `${item?.open_time || '10:30'} - ${item?.close_time || '20:00'}`,
        nearbyStation: item?.nearby_station || '정보 없음', walkingTime: item?.walking_time ? Number(item.walking_time) : 0, isFree: !!item?.is_free,
        isReservationRequired: !!(item?.is_reservation_required || item?.requires_reservation || false)
      }));
      setAllStores(processed);
      setIsLoading(false);
    } catch (err: any) {
        if (retryCount < 1) { setTimeout(() => { fetchStores(retryCount + 1); }, 3000); }
        else { setAllStores(POPUP_STORES); setIsLoading(false); showToast("데이터를 불러오지 못해 데모 데이터를 표시합니다."); }
    }
  };

  const fetchUserData = async (userId: string) => {
    try {
      const { data: favs } = await supabase.from('favorites').select('store_id').eq('user_id', userId);
      if (favs) setLikedStoreIds(new Set(favs.map(f => f.store_id)));
      const notifs = await fetchNotifications(userId);
      setNotifications(notifs);
      const { data: subs } = await supabase.from('notifications').select('store_id').eq('user_id', userId).eq('type', 'open_close');
      if (subs) setNotifiedStoreIds(new Set(subs.map(n => n.store_id)));
    } catch (e: any) { console.error("User data fetch failed:", e); }
  };

  const handleMyLocation = useCallback(async (isInitial = false) => {
    if (!navigator.geolocation) {
      if(!isInitial) showAlert('알림', '이 브라우저는 위치 서비스를 지원하지 않습니다.');
      setMapCenter(DEFAULT_LOCATION);
      return;
    }
    const options = { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 };
    const success = (pos: GeolocationPosition) => {
      const newLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setUserLocation(newLoc);
      setMapCenter(newLoc);
      if (!isInitial) showToast('현재 위치로 이동했습니다.');
    };
    const error = (err: GeolocationPositionError) => {
      console.warn(`Geolocation error(${err.code}): ${err.message}`);
      setMapCenter(DEFAULT_LOCATION);
      if (err.code !== 1 && !isInitial) {
          showAlert('알림', '위치 정보를 가져올 수 없습니다. 기본 위치로 이동합니다.');
      }
    };
    navigator.geolocation.getCurrentPosition(success, error, options);
  }, [showAlert, showToast]);

  useEffect(() => {
    const handleAuthChange = async (session: any) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        let profile = await getProfile(session.user.id);
        if (!profile || !profile.name) {
            setIsNicknameModalOpen(true);
            setUserProfile({ id: session.user.id, email: session.user.email!, role: 'user', name: '' });
        } else {
            setIsNicknameModalOpen(false);
            setUserProfile(profile as UserProfile);
            await fetchUserData(session.user.id);
        }
      } else {
        setUserProfile(null);
        setLikedStoreIds(new Set());
        setNotifiedStoreIds(new Set());
        setNotifications([]);
        setIsNicknameModalOpen(false);
      }
    };
    supabase.auth.getSession().then(({ data: { session } }) => { handleAuthChange(session); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => { handleAuthChange(session); });
    fetchStores();
    handleMyLocation(true);
    return () => subscription.unsubscribe();
  }, [handleMyLocation]);

  const handleNicknameSuccess = async () => {
      if (user) {
          const profile = await getProfile(user.id);
          setUserProfile(profile as UserProfile);
          setIsNicknameModalOpen(false);
          await fetchUserData(user.id);
      }
  };

  const handleAddStore = useCallback(async (formData: any) => {
    if (!user) { alert("로그인이 필요합니다."); setIsLoginModalOpen(true); return false; }
    const today = new Date().toISOString().split('T')[0];
    const payload = {
      title: formData.title || '제목 없음', address: formData.location || '위치 미지정', lat: formData.lat || DEFAULT_LOCATION.lat, lng: formData.lng || DEFAULT_LOCATION.lng,
      description: formData.description || '상세 내용 없음', detailed_content: formData.detailedContent || '내용이 없습니다.',
      start_date: formData.isPermanent ? null : (formData.startDate || today), end_date: formData.isPermanent ? null : (formData.endDate || today),
      category: formData.category || '기타', image_url: formData.imageUrl || DEFAULT_POPUP_IMAGE, link_url: formData.instagramUrl,
      is_verified: false, nearby_station: formData.nearbyStation, walking_time: Number(formData.walkingTime || 0), is_free: !!formData.isFree,
    };
    if(user.id) { (payload as any).reporter_id = user.id; }
    try {
      const { error } = await supabase.from('popup_stores').insert([payload]).select();
      if (error) throw error;
      await fetchStores();
      return true;
    } catch (err: any) { console.error(err); return false; }
  }, [user]);

  const toggleLike = useCallback(async (id: string) => {
    if (!user) { setIsLoginModalOpen(true); return; }
    const isLiked = likedStoreIds.has(id);
    const newSet = new Set(likedStoreIds);
    try {
      if (isLiked) {
        newSet.delete(id); showToast('찜 목록에서 삭제했습니다.');
        await supabase.from('favorites').delete().eq('user_id', user.id).eq('store_id', id);
      } else {
        newSet.add(id); showToast('찜 목록에 저장했습니다.');
        await supabase.from('favorites').insert({ user_id: user.id, store_id: id });
      }
      setLikedStoreIds(newSet);
    } catch (e) { console.error(e); }
  }, [user, likedStoreIds, showToast]);

  const toggleNotify = useCallback(async (id: string) => {
    if (!user) { setIsLoginModalOpen(true); return; }
    const isNotified = notifiedStoreIds.has(id);
    const newSet = new Set(notifiedStoreIds);
    try {
      if (isNotified) {
        newSet.delete(id); showToast('알림 예약을 취소했습니다.');
        await supabase.from('notifications').delete().eq('user_id', user.id).eq('store_id', id).eq('type', 'open_close');
      } else {
        newSet.add(id); showToast('알림이 예약되었습니다.');
        await supabase.from('notifications').insert({ user_id: user.id, store_id: id, type: 'open_close', message: '오픈/마감 알림 신청' });
      }
      setNotifiedStoreIds(newSet);
    } catch (e) { console.error(e); }
  }, [user, notifiedStoreIds, showToast]);

  const baseFilteredStores = useMemo(() => {
    return allStores?.filter(s => {
      if (!s || !s.id) return false;
      const likedMatch = !showLikedOnly || likedStoreIds.has(s.id);
      let statusMatch = true;
      switch (selectedFilter) {
        case '지금 오픈': statusMatch = checkIsOpenNow(s); break;
        case '무료 입장': statusMatch = !!s.isFree; break;
        case '현장 방문 가능': statusMatch = !s.isReservationRequired; break;
        case '오늘 종료':
          if(s.isPermanent || !s.endDate) { statusMatch = false; }
          else {
              const today = new Date().toISOString().split('T')[0];
              statusMatch = s.endDate === today;
          }
          break;
        default: statusMatch = true;
      }
      return likedMatch && statusMatch;
    }) || [];
  }, [allStores, selectedFilter, showLikedOnly, likedStoreIds]);

  const { displayStores, isFallback } = useMemo(() => {
    let storesToDisplay = baseFilteredStores;
    const centerLat = currentMapCenter?.lat || 37.5;
    const centerLng = currentMapCenter?.lng || 127.0;

    if (currentBounds) {
      const inBounds = baseFilteredStores.filter(s =>
        s.lat >= currentBounds.minLat && s.lat <= currentBounds.maxLat &&
        s.lng >= currentBounds.minLng && s.lng <= currentBounds.maxLng
      );
      if (inBounds.length > 0) {
        storesToDisplay = inBounds;
      } else {
        storesToDisplay = baseFilteredStores
           .map(s => ({ ...s, distance: getDistanceFromLatLonInKm(centerLat, centerLng, s.lat, s.lng) }))
           .sort((a, b) => (a.distance || 0) - (b.distance || 0))
           .slice(0, 5);
        return { displayStores: storesToDisplay, isFallback: true };
      }
    }

    const processed = storesToDisplay.map(s => ({
        ...s,
        distance: getDistanceFromLatLonInKm(centerLat, centerLng, s.lat, s.lng),
        isEnded: checkIsEnded(s),
        isOpenNow: checkIsOpenNow(s)
    }));

    processed.sort((a, b) => {
        if (a.isEnded !== b.isEnded) return a.isEnded ? 1 : -1;
        if (a.isEnded && b.isEnded) {
            return new Date(b.endDate || '').getTime() - new Date(a.endDate || '').getTime();
        }
        if (a.isPermanent !== b.isPermanent) return a.isPermanent ? 1 : -1;
        if (!a.isPermanent && !b.isPermanent && a.endDate && b.endDate && a.endDate !== b.endDate) {
            return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
        }
        if (a.isOpenNow !== b.isOpenNow) return a.isOpenNow ? -1 : 1;
        return (a.distance || 0) - (b.distance || 0);
    });

    return { displayStores: processed, isFallback: false };
  }, [baseFilteredStores, currentBounds, currentMapCenter]);

  const handleMapLongPress = useCallback((data: {lat: number, lng: number, address: string}) => {
      if (!user) { setIsLoginModalOpen(true); } else { setReportPrefill(data); setIsReportModalOpen(true); }
  }, [user]);

  const handleMapClick = useCallback(() => { setSelectedStoreId(null); setDetailStore(null); }, []);
  const handleMarkerClick = useCallback((id: string) => { setSelectedStoreId(id); }, []);
  const handleOverlayClick = useCallback((id: string) => {
      const s = allStores?.find(st => st.id === id);
      if (s) setDetailStore(s);
  }, [allStores]);

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (info.offset.y > 100) {
          setSheetOpen(false);
      } else if (info.offset.y < -100) {
          setSheetOpen(true);
      }
  };

  const handleStoreSelect = (id: string) => {
      const s = allStores?.find(st => st.id === id);
      if (s) {
          setMapCenter({lat: s.lat, lng: s.lng});
          setSelectedStoreId(id);
          setDetailStore(s);
      }
  };

  if (isAdminOpen) {
    return <AdminDashboard allStores={allStores} isAdmin={userProfile?.role === 'admin'} onApprove={async (id) => { try { await supabase.from('popup_stores').update({ is_verified: true }).eq('id', id); showToast('승인 완료'); await fetchStores(); } catch(e){ alert('오류'); } }} onReject={async (id) => { try { await supabase.from('popup_stores').delete().eq('id', id); showToast('삭제 완료'); await fetchStores(); } catch(e){ alert('오류'); } }} onBack={() => setIsAdminOpen(false)} onRefresh={fetchStores} onShowSuccess={handleShowSuccess} />;
  }

  return (
    <div className="flex flex-col lg:flex-row h-screen overflow-hidden bg-white relative">
      <div className="hidden lg:flex w-[400px] xl:w-[440px] flex-col z-20 bg-white border-r border-gray-200 h-full relative shadow-xl shrink-0">
        <Header location={currentLocationName} onAdminClick={() => setIsAdminOpen(true)} onLocationClick={() => setIsLocationSelectorOpen(true)} onSearchClick={() => setIsSearchOpen(true)} onReportClick={() => { if(!user) setIsLoginModalOpen(true); else setIsReportModalOpen(true); }} userProfile={userProfile} onProfileClick={() => !user ? setIsLoginModalOpen(true) : setIsProfileModalOpen(true)} onNotificationClick={() => setIsNotificationOpen(true)} hasUnreadNotifications={notifications?.some(n => !n.is_read)} />
        <div className="flex flex-col flex-1 overflow-hidden bg-white relative">
            <div className="border-b border-gray-100 pb-2 bg-white z-10"><CategoryFilter selected={selectedFilter} onSelect={setSelectedFilter} showLikedOnly={showLikedOnly} onToggleLiked={() => setShowLikedOnly(!showLikedOnly)} /></div>
            {activeTab === 'home' ? (
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-[#f2f4f6]">
                     {isFallback && <div className="px-1 pt-1 pb-4 shrink-0 z-10"><div className="bg-blue-50 text-[#3182f6] px-4 py-2.5 rounded-xl text-xs font-bold text-center shadow-sm border border-blue-100 flex items-center justify-center gap-1.5"><Icons.Info /><span>주변 팝업이 없어 추천 목록을 보여드려요</span></div></div>}
                     <PopupList stores={displayStores} selectedStoreId={selectedStoreId} onStoreSelect={handleStoreSelect} />
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto bg-white custom-scrollbar"><SavedView stores={allStores?.filter(s => likedStoreIds.has(s.id)) || []} onStoreClick={(s) => { setDetailStore(s); setMapCenter({lat: s.lat, lng: s.lng}); setActiveTab('home'); }} /></div>
            )}
            <BottomNav activeTab={activeTab} onTabChange={setActiveTab} className="relative border-t border-gray-100" />
        </div>
      </div>

      <div className="flex-1 flex flex-col h-full w-full relative min-h-0">
         <div className="lg:hidden z-30 bg-white">
             <Header location={currentLocationName} onAdminClick={() => setIsAdminOpen(true)} onLocationClick={() => setIsLocationSelectorOpen(true)} onSearchClick={() => setIsSearchOpen(true)} onReportClick={() => { if(!user) setIsLoginModalOpen(true); else setIsReportModalOpen(true); }} userProfile={userProfile} onProfileClick={() => !user ? setIsLoginModalOpen(true) : setIsProfileModalOpen(true)} onNotificationClick={() => setIsNotificationOpen(true)} hasUnreadNotifications={notifications?.some(n => !n.is_read)} />
         </div>
         
         <div className="lg:hidden absolute top-[114px] left-0 right-0 z-20 pointer-events-none">
            <div className="pointer-events-auto"><CategoryFilter selected={selectedFilter} onSelect={setSelectedFilter} showLikedOnly={showLikedOnly} onToggleLiked={() => setShowLikedOnly(!showLikedOnly)} /></div>
         </div>

         <div className="flex-1 relative w-full h-full min-h-0">
             <MapArea
                stores={baseFilteredStores}
                onMarkerClick={handleMarkerClick}
                selectedStoreId={selectedStoreId}
                onLongPress={handleMapLongPress}
                onMapClick={handleMapClick}
                onOverlayClick={handleOverlayClick}
                isSelectingLocation={isSelectingLocation}
                onSelectLocation={(data) => { setReportPrefill(data); setIsSelectingLocation(false); setIsReportModalOpen(true); }}
                mapCenter={mapCenter}
                onMapIdle={(b, c) => { setCurrentBounds(b); setCurrentMapCenter(c); }}
                userLocation={userLocation}
             />
             
             <div className="absolute top-20 right-4 lg:top-6 lg:right-6 z-10 flex flex-col gap-3">
                  <button onClick={() => handleMyLocation(false)} className="w-11 h-11 bg-white text-[#333d4b] rounded-full flex items-center justify-center shadow-lg border border-gray-100 active:scale-90 transition-transform"><Icons.Crosshair /></button>
                  <button onClick={() => setSheetOpen(!sheetOpen)} className="lg:hidden w-11 h-11 bg-[#3182f6] text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform"><Icons.List /></button>
             </div>
         </div>

         {activeTab === 'home' && (
             <motion.div
                initial={{ y: 'calc(100% - 130px)' }}
                animate={sheetControls}
                drag="y"
                dragListener={false}
                dragControls={dragControls}
                dragConstraints={{ top: 0 }}
                dragElastic={0.2}
                onDragEnd={handleDragEnd}
                className="lg:hidden absolute bottom-0 left-0 right-0 bg-white rounded-t-[24px] shadow-[0_-4px_20px_rgba(0,0,0,0.1)] z-30 flex flex-col h-[75vh] pointer-events-none"
             >
                <div className="w-full h-full flex flex-col pointer-events-auto">
                    <div className="w-full h-8 flex items-center justify-center shrink-0 cursor-grab active:cursor-grabbing touch-none" onPointerDown={(e) => dragControls.start(e)}>
                        <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
                    </div>
                    
                    <div className="px-5 pb-3 shrink-0 flex justify-between items-center border-b border-gray-50 touch-none" onPointerDown={(e) => dragControls.start(e)}>
                        <h2 className="text-[18px] font-bold text-[#191f28]">
                            {showLikedOnly ? '찜한 팝업' : (isFallback ? '가장 가까운 팝업' : '주변 팝업 리스트')}
                        </h2>
                        <span className="text-[12px] text-gray-400 font-medium">{displayStores?.length || 0}개</span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 bg-[#f9fafb] pb-safe custom-scrollbar">
                        {isFallback && <div className="mb-4 bg-blue-50 text-[#3182f6] px-4 py-3 rounded-[16px] text-[13px] font-bold flex items-center gap-2 shadow-sm"><Icons.Info /> 현재 지도 영역에 팝업이 없어 가까운 곳을 보여드려요.</div>}
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-10 gap-4">
                                <div className="w-8 h-8 border-4 border-blue-100 border-t-[#3182f6] rounded-full animate-spin"></div>
                                <p className="text-[#8b95a1] font-bold text-sm">로딩중...</p>
                            </div>
                        ) : displayStores?.length > 0 ? (
                            <PopupList stores={displayStores} selectedStoreId={selectedStoreId} onStoreSelect={handleStoreSelect} />
                        ) : (
                            <div className="text-center py-10 text-gray-400 font-medium">표시할 팝업이 없습니다.</div>
                        )}
                    </div>
                </div>
             </motion.div>
         )}

         {activeTab === 'saved' && (
            <div className="lg:hidden fixed inset-0 top-[114px] bg-white z-50 overflow-y-auto pb-20 animate-in slide-in-from-bottom-4 custom-scrollbar">
               <SavedView stores={allStores?.filter(s => likedStoreIds.has(s.id)) || []} onStoreClick={(s) => { setDetailStore(s); setMapCenter({lat: s.lat, lng: s.lng}); setActiveTab('home'); }} />
            </div>
         )}
         
         <div className="lg:hidden z-50 bg-white border-t border-gray-100 fixed bottom-0 left-0 right-0">
             <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
         </div>
      </div>

      {toastMessage && <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[200] bg-[#191f28] text-white px-6 py-4 rounded-2xl text-sm font-bold shadow-2xl animate-in slide-in-from-bottom-4 whitespace-nowrap">{toastMessage}</div>}
      
      <DetailModal store={detailStore} onClose={() => setDetailStore(null)} isLiked={detailStore ? likedStoreIds.has(detailStore.id) : false} onToggleLike={toggleLike} isNotified={detailStore ? notifiedStoreIds.has(detailStore.id) : false} onToggleNotify={toggleNotify} userProfile={userProfile} onLoginRequest={() => { if(!user) setIsLoginModalOpen(true); }} onShowSuccess={handleShowSuccess} />
      <ReportModal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} onAddStore={handleAddStore} prefillData={reportPrefill} onStartSelectLocation={() => { setIsReportModalOpen(false); setIsSelectingLocation(true); }} onShowSuccess={handleShowSuccess} />
      <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} stores={allStores || []} onSelectResult={(s) => { setSelectedStoreId(s.id); setDetailStore(s); setMapCenter({lat: s.lat, lng: s.lng}); setActiveTab('home'); }} />
      <LocationSelector isOpen={isLocationSelectorOpen} onClose={() => setIsLocationSelectorOpen(false)} selectedLocation={currentLocationName} onSelect={(r) => { setCurrentLocationName(r.name); setMapCenter({lat: r.lat, lng: r.lng}); setIsLocationSelectorOpen(false); }} />
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} onSuccess={() => setIsLoginModalOpen(false)} />
      <ProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} userProfile={userProfile} likedStores={allStores?.filter(s => likedStoreIds.has(s.id)) || []} />
      <NicknameModal isOpen={isNicknameModalOpen} userId={user?.id || ''} onSuccess={handleNicknameSuccess} />
      <AdminPinModal isOpen={isAdminPinModalOpen} onClose={() => setIsAdminPinModalOpen(false)} onSuccess={() => { if (userProfile) setUserProfile({ ...userProfile, role: 'admin' }); else { const mockId = 'admin-user-id'; setUser({ id: mockId, email: 'admin@test.com' }); setUserProfile({ id: mockId, email: 'admin@test.com', role: 'admin', name: '관리자' }); } showToast('관리자 모드로 전환되었습니다.'); }} />
      <AlertModal isOpen={alertConfig.isOpen} title={alertConfig.title} message={alertConfig.message} onClose={() => setAlertConfig(p => ({...p, isOpen: false}))} />
      <SuccessModal isOpen={successConfig.isOpen} title={successConfig.title} message={successConfig.message} onClose={handleSuccessClose} />
      <NotificationList isOpen={isNotificationOpen} onClose={() => setIsNotificationOpen(false)} notifications={notifications} onNotificationClick={async (n) => { if(!n.is_read) { await markNotificationAsRead(n.id); setNotifications(prev => prev.map(item => item.id === n.id ? {...item, is_read: true} : item)); } if(n.store_id) { const s = allStores?.find(st => st.id === n.store_id); if(s) { setDetailStore(s); setMapCenter({lat: s.lat, lng: s.lng}); setIsNotificationOpen(false); } } }} />
    </div>
  );
};

export default App;
