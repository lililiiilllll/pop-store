import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// 1. 외부 라이브러리 및 설정/타입 임포트
import { Icons } from './constants';
import { PopupStore, UserProfile } from './types';
import { supabase, signInWithSocial, getProfile } from './lib/supabase';

// 2. 하위 컴포넌트 임포트
import Header from './components/Header';
import MapArea from './components/MapArea';
import PopupList from './components/PopupList';
import CategoryFilter from './components/CategoryFilter';
import AdminDashboard from './components/AdminDashboard';
import DetailModal from './components/DetailModal';
import SearchOverlay from './components/SearchOverlay';
import LocationSelector from './components/LocationSelector';
import SuccessModal from './components/SuccessModal';
import BottomNav from './components/BottomNav';

const getDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const R = 6371; // 지구 반지름
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; 
};

// [상수 설정]
const DEFAULT_LOCATION = { lat: 37.5547, lng: 126.9706 };
const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1531050171669-7df9b2089206?q=80&w=400&auto=format&fit=crop';

/**
 * [기능 플래그 (Feature Flag)]
 * 네이버, 카카오 연동 준비가 되면 enabled를 true로 바꾸세요.
 */
const AUTH_CONFIG = {
  KAKAO: { enabled: false, provider: 'kakao' as const },
  NAVER: { enabled: false, provider: 'naver' as const },
  TOSS: { enabled: true, provider: 'toss' as const },
};

const App: React.FC = () => {
  // --- [상태 관리: 관리자 및 테스트] ---
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [isTestPanelOpen, setIsTestPanelOpen] = useState(true); // [DELETE-ON-PRODUCTION]
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  // --- [상태 관리: 유저 및 공통 데이터] ---
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'home' | 'saved'>('home');
  const [selectedFilter, setSelectedFilter] = useState<string>('전체');
  const [allStores, setAllStores] = useState<PopupStore[]>([]);
  const [savedStoreIds, setSavedStoreIds] = useState<string[]>([]);
  const [userCoords, setUserCoords] = useState<{lat: number, lng: number} | null>(null);
  
  // --- [상태 관리: 지도 및 검색] ---
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState(""); 
  const [mapBounds, setMapBounds] = useState<any>(null);
  const [mapCenter, setMapCenter] = useState<{lat: number, lng: number} | undefined>(undefined);
  const [currentLocationName, setCurrentLocationName] = useState('성수/서울숲');
  const [isMobileListOpen, setIsMobileListOpen] = useState(false);

  // --- [상태 관리: 모달 및 오버레이] ---
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isLocationSelectorOpen, setIsLocationSelectorOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [successConfig, setSuccessConfig] = useState({ isOpen: false, title: '', message: '' });
  const [detailStore, setDetailStore] = useState<PopupStore | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);

  // 아이콘 안전 장치
  const ListIcon = Icons.List || 'span';
  const XIcon = Icons.X || 'span';

  // --- [데이터 통신 및 세션 관리] ---
  const fetchStores = async () => {
    try {
      const { data, error } = await supabase
        .from('popup_stores')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      if (data) {
        setAllStores(data.map((s: any) => ({ 
          ...s, 
          id: String(s.id), 
          title: s.title || s.name, 
          is_free: Boolean(s.is_free),
          imageUrl: s.image_url?.startsWith('http') ? s.image_url : FALLBACK_IMAGE 
        })));
      }
    } catch (e) { 
      console.error("데이터 로딩 실패:", e); 
    }
  };

  const fetchAndSetProfile = async (uid: string) => {
    const profile = await getProfile(uid);
    if (profile) {
      setUserProfile(profile);
      // 실제 DB의 role 컬럼이 admin인 경우에만 관리자 로그인 상태로 간주
      if (profile.role === 'admin') {
        setIsAdminLoggedIn(true);
      } else {
        setIsAdminLoggedIn(false);
      }
    }
  };

  useEffect(() => {
    fetchStores();
    
    // 초기 세션 체크
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) fetchAndSetProfile(session.user.id);
    });

    // 인증 상태 변경 리스너
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        fetchAndSetProfile(session.user.id);
      } else {
        setUserProfile(null);
        setIsAdminLoggedIn(false);
        setIsAdminOpen(false);
      }
    });

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => setUserCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => setUserCoords(DEFAULT_LOCATION),
        { enableHighAccuracy: false, timeout: 5000 }
      );
    }

    return () => subscription.unsubscribe();
  }, []);

// --- [핸들러: 인증 및 로그인 액션] ---

const handleProfileClick = useCallback(() => {
    console.log("Profile Clicked, Current User:", currentUser);
    
    if (!currentUser) {
      // 로그인 안 된 경우 로그인 모달 오픈
      setIsLoginModalOpen(true); 
    } else {
      // 로그인 된 경우 관리자 패널 또는 마이페이지 오픈
      setIsTestPanelOpen(true); 
    }
  }, [currentUser]); // ⭐ currentUser가 바뀔 때마다 함수를 새로 정의해야 에러가 안 남

  const handleSocialLogin = async (provider: 'kakao' | 'naver' | 'toss') => {
    try {
      await signInWithSocial(provider);
      setIsLoginModalOpen(false); // 로그인 시도 시 모달 닫기
    } catch (e: any) {
      console.error("로그인 에러:", e.message);
    }
  };

  // [DELETE-ON-PRODUCTION] 디버그용 통합 테스트 로그인 핸들러 (비밀번호 인자 추가)
  const loginAsTestAccount = async (email: string, password: string, roleName: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        const profile = await getProfile(data.user.id);
        if (profile) {
          if (profile.role === 'admin') {
            setIsAdminLoggedIn(true);
            setIsAdminOpen(true);
          }
          setSuccessConfig({ 
            isOpen: true, 
            title: `${roleName} 로그인 성공`, 
            message: `${profile.name}님으로 접속되었습니다.` 
          });
        }
      }
    } catch (e: any) {
      alert(`${roleName} 로그인 실패: ` + e.message);
    }
  };

  // 관리자 로그인 핸들러 (비밀번호를 다르게 설정 가능)
  const handleAdminLogin = useCallback(async () => {
    const ADMIN_PW = "password1234"; // 실제 관리자 계정 비밀번호로 수정하세요.
    await loginAsTestAccount('admin@test.com', 'rmfjskqk12!A', '관리자');
  }, []);

  // 일반 유저 로그인 핸들러 (비밀번호를 다르게 설정 가능)
  const handleUserDebugLogin = useCallback(async () => {
    const USER_PW = "user1234"; // 실제 일반 유저 계정 비밀번호로 수정하세요.
    await loginAsTestAccount('user@test.com', '1234', '일반 유저');
  }, []);

  // 로그아웃 핸들러
  const handleLogoutAction = useCallback(async () => {
    await supabase.auth.signOut();
    
    // 모든 상태 초기화 (흐림 현상 해결)
    setIsAdminLoggedIn(false);
    setIsAdminOpen(false);
    setIsMobileListOpen(false);
    setIsSearchOpen(false);
    setIsProfileModalOpen(false);
    setIsLocationSelectorOpen(false);
    setSearchQuery(""); 
    setDetailStore(null);
    
    // 바디 잠금 강제 해제
    document.body.style.overflow = "unset";
    
    setSuccessConfig({ 
      isOpen: true, 
      title: '로그아웃 완료', 
      message: '세션이 종료되었습니다.' 
    });
  }, []);

  const handleStoreSelect = useCallback((id: string) => {
    const store = allStores.find(st => st.id === id);
    if (store) {
      setDetailStore({ ...store }); 
      setSelectedStoreId(id);
      setMapCenter({ lat: store.lat, lng: store.lng });
      setIsSearchOpen(false); 
      setSearchQuery(""); // 검색 결과 선택 시 검색어 초기화
      if (activeTab === 'home') setIsMobileListOpen(false);
    }
  }, [allStores, activeTab]);

  const toggleSaveStore = useCallback((id: string) => {
    setSavedStoreIds(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  }, []);

  const handleLocationSelect = (name: string, coords: { lat: number; lng: number }) => {
    setMapCenter(coords);           // 지도의 중심 좌표를 선택한 지역으로 변경
    setCurrentLocationName(name);   // 헤더에 표시되는 지역 이름을 변경 (예: "성수", "강남")
    setIsLocationSelectorOpen(false); // 지역 선택 모달 닫기
  };

  // --- [연산: 검색 및 필터링 통합 로직] ---
const visibleStores = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let filtered = allStores;

    // 1. 검색어 필터링 (생략 - 기존과 동일)
     if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(s => 
        (s.title || "").toLowerCase().includes(q) || 
        (s.category && s.category.toLowerCase().includes(q)) ||
        (s.description && s.description.toLowerCase().includes(q)) ||
        (s.address && s.address.toLowerCase().includes(q)) ||
        (s.nearby_station && s.nearby_station.toLowerCase().includes(q)) ||
        (Array.isArray(s.keywords) && s.keywords.some((k: string) => k.toLowerCase().includes(q)))
      );
      return filtered;
    }

    // 2. 탭 필터링 (찜한 목록)
    if (activeTab === 'saved') {
    // 로그인 안 된 경우 빈 배열 반환 (UI에서 문구 노출용)
    if (!userProfile) return []; 
    filtered = filtered.filter(s => savedStoreIds.includes(s.id));
  }

    // 3. 카테고리 필터링
    if (selectedFilter !== '전체') {
      if (selectedFilter === '무료입장') {
        filtered = filtered.filter(s => s.is_free);
      } else {
        filtered = filtered.filter(s => s.category === selectedFilter);
      }
    }

    // 4.🌟 [추가] 날짜 필터링 및 상태 부여 로직 🌟
filtered = filtered.filter(s => {
    const dateStr = s.end_date || s.endDate; // 둘 중 존재하는 값 사용
    if (!dateStr) return true; 

    const endDateObj = new Date(dateStr);
    endDateObj.setHours(0, 0, 0, 0);

    const diffTime = today.getTime() - endDateObj.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    // D+4일부터는 완전히 제외
    return diffDays < 4;
  }).map(s => {
    const dateStr = s.end_date || s.endDate;
    const endDateObj = dateStr ? new Date(dateStr) : null;
    if (endDateObj) endDateObj.setHours(0, 0, 0, 0);
    return {
      ...s,
      // 오늘 날짜가 종료일보다 크면 종료된 것으로 간주
      isEnded: endDateObj ? today > endDateObj : false 
    };
  });

    // 5. 지도 중심 기준 "가장 가까운 곳 추천" 로직
    if (activeTab === 'home' && mapBounds) {
      const inBounds = filtered.filter(s => 
        s.lat >= mapBounds.minLat && s.lat <= mapBounds.maxLat && 
        s.lng >= mapBounds.minLng && s.lng <= mapBounds.maxLng
      );

      // 지도 범위 안에 데이터가 있으면 그대로 반환
      if (inBounds.length > 0) {
        return inBounds;
      }

      // [핵심 변경] 지도 안에 결과가 0개일 때: "현재 보고 있는 지도의 중심"에서 가장 가까운 2개 추출
      // userCoords를 무시하고 mapCenter(지도 중심)를 최우선으로 사용합니다.
      const referencePoint = mapCenter || DEFAULT_LOCATION;
      
      return [...filtered]
        .map(store => ({
          ...store,
          // 내 위치가 아닌 '지도 중심'과의 거리를 계산
          distance: getDistance(referencePoint.lat, referencePoint.lng, store.lat, store.lng)
        }))
        .sort((a, b) => (a.distance || 0) - (b.distance || 0))
        .slice(0, 2)
        .map(store => ({ ...store, isRecommendation: true })); 
    }

    return filtered;
  }, [allStores, selectedFilter, mapBounds, activeTab, savedStoreIds, searchQuery, mapCenter]); // userCoords 의존성 제거 가능

  // 관리자 대시보드 렌더링 (보안 강화)
  if (isAdminOpen && userProfile?.role === 'admin') {
    return (
      <AdminDashboard 
        allStores={allStores} 
        onBack={() => setIsAdminOpen(false)} 
        onRefresh={fetchStores} 
      />
    );
  }

return (
    <div className="relative flex flex-col lg:flex-row h-screen w-full overflow-hidden bg-white text-[#191f28]">
      
      {/* [1] 테스트 패널 (디버그용) */}
      <AnimatePresence>
        {isTestPanelOpen && (
          <div className="fixed top-24 right-6 z-[20001]">
            <motion.div 
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
              className="bg-white/95 backdrop-blur-xl p-5 rounded-[24px] shadow-2xl border border-[#f2f4f6] flex flex-col gap-3 min-w-[200px]"
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-[12px] font-bold text-[#3182f6]">DEBUG MODE</span>
                <button onClick={() => setIsTestPanelOpen(false)} className="text-[#8b95a1] p-1">
                  <Icons.X size={16} />
                </button>
              </div>
              <button 
                onClick={() => loginAsTestAccount('admin@test.com', 'rmfjskqk12!A', '관리자')}
                className="w-full py-3 bg-[#f2f4f6] rounded-xl text-[14px] font-bold text-[#4e5968] hover:bg-gray-200 transition-colors"
              >
                관리자 강제 로그인
              </button>
              <button 
                onClick={() => loginAsTestAccount('user@test.com', '1234', '일반유저')}
                className="w-full py-3 bg-[#f2f4f6] rounded-xl text-[14px] font-bold text-[#4e5968] hover:bg-gray-200 transition-colors"
              >
                일반유저 강제 로그인
              </button>
              {userProfile && (
                <button onClick={handleLogoutAction} className="w-full py-2 text-[12px] text-red-500 font-medium mt-1">
                  로그아웃
                </button>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* [2] 사이드바 영역 (PC) */}
      <aside className="hidden lg:flex w-[400px] flex-col z-10 bg-white border-r border-[#f2f4f6] shadow-sm">
        <Header 
          userProfile={currentUser} // App의 currentUser를 Header의 userProfile로 전달
          onSearchClick={() => setIsSearchOpen(true)}
            // Header 내부에서는 onProfileClick을 사용하므로 아래와 같이 연결합니다.
          onProfileClick={handleProfileClick} 
          location={currentLocationName} // currentLocationName을 Header의 location으로 전달
          onLocationClick={() => setIsLocationSelectorOpen(true)}
          onAdminClick={() => setIsAdminOpen(true)}
        />
        
        <div className="no-scrollbar overflow-x-auto border-b border-[#f9fafb]">
          <CategoryFilter selected={selectedFilter} onSelect={setSelectedFilter} />
        </div>

        <div className="px-5 py-4 border-b border-[#f9fafb]">
          <div className="flex bg-[#f2f4f6] p-1 rounded-xl">
            <button 
              onClick={() => setActiveTab('home')}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'home' ? 'bg-white text-[#3182f6] shadow-sm' : 'text-[#8b95a1]'}`}
            >
              주변
            </button>
            <button 
              onClick={() => setActiveTab('saved')}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'saved' ? 'bg-white text-[#3182f6] shadow-sm' : 'text-[#8b95a1]'}`}
            >
              찜한 목록
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <PopupList 
            stores={visibleStores} 
            onStoreClick={(s) => handleStoreSelect(s.id)} 
            userLocation={userCoords}
            activeTab={activeTab}
            userProfile={userProfile}    
            onLoginClick={() => setIsLoginModalOpen(true)}
          />
        </div>
      </aside>

      {/* [3] 메인 콘텐츠 영역 (지도 & 모바일 UI) */}
      <main className="flex-1 relative">
        <MapArea 
          stores={visibleStores} 
          selectedStoreId={selectedStoreId} 
          onMarkerClick={handleStoreSelect} 
          mapCenter={mapCenter} 
          userLocation={userCoords} 
          onMapIdle={(bounds, center) => {
            setMapBounds(bounds);
            setMapCenter(center);
          }}
          onMapClick={() => {
            setIsMobileListOpen(false);
            setDetailStore(null);
            setSelectedStoreId(null);
          }}
          onDetailOpen={(store) => setDetailStore(store)}
          setUserLocation={setUserCoords}
        />
        
        {/* 모바일 상단 바 */}
        <div className="lg:hidden absolute top-0 left-0 right-0 z-20 bg-white/80 backdrop-blur-xl border-b border-[#f2f4f6]">
        <Header 
          userProfile={currentUser} // App의 currentUser를 Header의 userProfile로 전달
          onSearchClick={() => setIsSearchOpen(true)}
          // Header 내부에서는 onProfileClick을 사용하므로 아래와 같이 연결합니다.
          onProfileClick={handleProfileClick} 
          location={currentLocationName} // currentLocationName을 Header의 location으로 전달
          onLocationClick={() => setIsLocationSelectorOpen(true)}
          onAdminClick={() => setIsAdminOpen(true)}
        />
          <div className="no-scrollbar overflow-x-auto">
            <CategoryFilter selected={selectedFilter} onSelect={setSelectedFilter} />
          </div>
        </div>

        {/* 모바일 목록보기 플로팅 버튼 */}
        {!isMobileListOpen && activeTab === 'home' && (
          <div className="lg:hidden absolute bottom-28 left-1/2 -translate-x-1/2 z-30">
            <button 
              onClick={() => setIsMobileListOpen(true)}
              className="bg-[#191f28] text-white px-8 py-4 rounded-full shadow-2xl font-bold flex items-center gap-2 active:scale-95 transition-transform"
            >
              <Icons.List size={18} /> 목록보기
            </button>
          </div>
        )}

        {/* 모바일 바텀 리스트 시트 */}
        <AnimatePresence>
          {isMobileListOpen && (
            <motion.div 
              initial={{ y: "100%" }} animate={{ y: "0%" }} exit={{ y: "100%" }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="lg:hidden fixed inset-x-0 bottom-0 z-40 bg-white rounded-t-[24px] h-[92vh] flex flex-col shadow-2xl"
            >
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-3 mb-1" />
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
                <h2 className="text-lg font-bold">
                  {activeTab === 'home' ? '주변 팝업' : '찜한 팝업'} ({visibleStores.length})
                </h2>
                <button onClick={() => setIsMobileListOpen(false)} className="p-2 bg-gray-100 rounded-full">
                  <Icons.X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto pb-32">
                <PopupList 
                  stores={visibleStores} 
                  onStoreClick={(s) => handleStoreSelect(s.id)} 
                  userLocation={userCoords}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 모바일 하단 네비게이션 */}
        <div className="lg:hidden">
          <BottomNav 
            activeTab={activeTab} 
            onTabChange={(tab) => {
              setActiveTab(tab);
              if (tab === 'saved') setIsMobileListOpen(true);
            }} 
          />
        </div>
      </main>

      {/* [4] 전역 모달 시스템 */}
      
      {/* 배경 딤드 (통합 관리) */}
      <AnimatePresence>
        {(isSearchOpen || isLocationSelectorOpen || isLoginModalOpen || isProfileModalOpen || isAdminOpen) && (
          <motion.div 
            key="global-dimmer"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[90]"
            onClick={() => {
              setIsSearchOpen(false);
              setIsLocationSelectorOpen(false);
              setIsLoginModalOpen(false);
              setIsProfileModalOpen(false);
              setIsAdminOpen(false);
            }}
          />
        )}
      </AnimatePresence>

      {/* 관리자 대시보드 */}
      <AnimatePresence>
        {isAdminOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="w-full h-full max-w-6xl bg-white rounded-[32px] overflow-hidden shadow-2xl"
            >
              <AdminDashboard onClose={() => setIsAdminOpen(false)} stores={allStores} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 위치 선택 모달 */}
      <AnimatePresence>
        {isLocationSelectorOpen && (
          <div key="location-selector-root" className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="pointer-events-auto w-full max-w-md"
            >
              <LocationSelector onSelect={handleLocationSelect} onClose={() => setIsLocationSelectorOpen(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 검색 오버레이 */}
      <AnimatePresence>
        {isSearchOpen && (
          <SearchOverlay 
            isOpen={isSearchOpen} 
            onClose={() => setIsSearchOpen(false)} 
            stores={allStores} 
            onStoreSelect={handleStoreSelect} 
          />
        )}
      </AnimatePresence>

      {/* 상세 정보 모달 */}
      <AnimatePresence>
        {detailStore && (
          <div key="detail-modal-root" className="fixed inset-0 z-[110] flex items-end lg:items-center justify-center pointer-events-none">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDetailStore(null)} className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto" />
            <motion.div 
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="relative w-full lg:max-w-[480px] bg-white rounded-t-[32px] lg:rounded-[32px] overflow-hidden max-h-[95vh] overflow-y-auto pointer-events-auto"
            >
              <DetailModal 
                store={detailStore} 
                isSaved={savedStoreIds.includes(detailStore.id)}
                userProfile={userProfile}
                onToggleSave={() => toggleSaveStore(detailStore.id)} 
                onClose={() => setDetailStore(null)} 
                onShowSuccess={(t, m) => setSuccessConfig({ isOpen: true, title: t, message: m })} 
                currentUser={userProfile} 
                isAdmin={userProfile?.role === 'admin'}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 로그인 모달 */}
      <AnimatePresence>
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsLoginModalOpen(false)}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            className="relative w-full max-w-sm bg-white rounded-t-[32px] sm:rounded-[32px] p-8 pointer-events-auto text-center"
          >
            <div className="w-16 h-16 bg-[#f2f4f6] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Icons.User className="w-8 h-8 text-[#3182f6]" />
            </div>
            <h2 className="text-2xl font-bold text-[#191f28]">로그인이 필요해요</h2>
            <p className="text-[#8b95a1] mt-2 mb-8 leading-relaxed">
              팝업 스토어 정보를 저장하고<br/>나만의 리스트를 만들어보세요!
            </p>
            
            <div className="space-y-3">
              {/* [로그인 버튼 활성화 설정] 
                false로 바꾸면 해당 버튼이 화면에서 사라집니다.
              */}
              {(() => {
                const loginConfig = {
                  kakao: false,
                  naver: false,
                  toss: true
                };
    
                return (
                  <>
                    {/* 1. 카카오 로그인 */}
                    {loginConfig.kakao && (
                      <button 
                        onClick={() => handleSocialLogin('kakao')}
                        className="w-full py-4 bg-[#FEE500] text-[#191f28] rounded-2xl font-bold flex items-center justify-center gap-3 active:scale-95 transition-transform"
                      >
                        <span className="w-5 h-5 flex items-center justify-center bg-black rounded-full text-[10px] text-[#FEE500]">K</span>
                        카카오 로그인
                      </button>
                    )}
    
                    {/* 2. 네이버 로그인 */}
                    {loginConfig.naver && (
                      <button 
                        onClick={() => handleSocialLogin('naver')}
                        className="w-full py-4 bg-[#03C75A] text-white rounded-2xl font-bold flex items-center justify-center gap-3 active:scale-95 transition-transform"
                      >
                        <span className="w-5 h-5 flex items-center justify-center font-black">N</span>
                        네이버 로그인
                      </button>
                    )}
    
                    {/* 3. 토스 로그인 */}
                    {loginConfig.toss && (
                      <button 
                        onClick={() => handleSocialLogin('toss')}
                        className="w-full py-4 bg-[#3182F6] text-white rounded-2xl font-bold flex items-center justify-center gap-3 active:scale-95 transition-transform"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M13 10V3L4 14H11V21L20 10H13Z" fill="white" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        토스 로그인
                      </button>
                    )}
                  </>
                );
              })()}
    
              <button 
                onClick={() => setIsLoginModalOpen(false)} 
                className="w-full py-3 text-[#8b95a1] font-medium mt-2"
              >
                다음에 할게요
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>

      {/* 성공 알림 모달 */}
      <AnimatePresence>
        {successConfig.isOpen && (
          <SuccessModal 
            key="success-root"
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
