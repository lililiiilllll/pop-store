import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// 1. 외부 라이브러리 및 설정/타입 임포트
import { Icons } from './constants';
import { PopupStore, UserProfile } from './types';
import { supabase } from './lib/supabase';

// 2. 하위 컴포넌트 임포트 (기존 기능 100% 유지)
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

// [상수 설정] 기본 지도 좌표 및 이미지 로딩 실패 시 대체 이미지
const DEFAULT_LOCATION = { lat: 37.5547, lng: 126.9706 };
const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1531050171669-7df9b2089206?q=80&w=400&auto=format&fit=crop';

/**
 * [기능 플래그 (Feature Flag)]
 * 각 플랫폼의 검수 상태나 준비 상황에 따라 UI 노출 여부를 결정합니다.
 * - enabled: true면 버튼이 보이고, false면 UI에서 아예 렌더링되지 않습니다.
 */
const AUTH_CONFIG = {
  KAKAO: { enabled: true, provider: 'kakao' },
  NAVER: { enabled: false, provider: 'naver' }, // 검수 중일 때 false로 설정
  TOSS: { enabled: false, provider: 'toss' },   // 연동 준비 중일 때 false로 설정
};

const App: React.FC = () => {
  // --- [상태 관리: 관리자 및 테스트] ---
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false); // 관리자 권한 여부
  const [isTestPanelOpen, setIsTestPanelOpen] = useState(true); // 우측 디버그 패널 노출 여부
  const [isAdminOpen, setIsAdminOpen] = useState(false); // 관리자 대시보드 화면 전환 여부

  // --- [상태 관리: 유저 및 공통 데이터] ---
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null); // 실제 로그인한 유저의 프로필
  const [activeTab, setActiveTab] = useState<'home' | 'saved'>('home'); // 하단 탭 (홈/찜)
  const [selectedFilter, setSelectedFilter] = useState<string>('전체'); // 카테고리 필터링 상태
  const [allStores, setAllStores] = useState<PopupStore[]>([]); // DB에서 가져온 전체 팝업 데이터
  const [savedStoreIds, setSavedStoreIds] = useState<string[]>([]); // 유저가 '찜'한 스토어의 ID 목록
  const [userCoords, setUserCoords] = useState<{lat: number, lng: number} | null>(null); // 현재 유저의 GPS 좌표
  
  // --- [상태 관리: 지도 제어] ---
  const [mapBounds, setMapBounds] = useState<any>(null); // 현재 지도의 가시 범위 (minLat, maxLat 등)
  const [mapCenter, setMapCenter] = useState<{lat: number, lng: number} | undefined>(undefined); // 지도 중심점
  const [currentLocationName, setCurrentLocationName] = useState('성수/서울숲'); // 현재 표시 지역 이름
  const [isMobileListOpen, setIsMobileListOpen] = useState(false); // 모바일에서 '목록보기' 시트 열림 여부

  // --- [상태 관리: 모달 및 오버레이] ---
  const [isSearchOpen, setIsSearchOpen] = useState(false); // 검색창 노출 여부
  const [isLocationSelectorOpen, setIsLocationSelectorOpen] = useState(false); // 지역 선택창 노출 여부
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false); // 로그인 유도 모달 노출 여부
  const [successConfig, setSuccessConfig] = useState({ isOpen: false, title: '', message: '' }); // 성공 알림 팝업 설정
  const [detailStore, setDetailStore] = useState<PopupStore | null>(null); // 상세 모달에 표시할 데이터
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null); // 지도에서 선택된 마커 ID

  // [아이콘 설정] constants에서 가져온 아이콘이 없을 경우를 대비한 안전 장치
  const MapIcon = Icons.Map || 'span';
  const HeartIcon = Icons.Heart || 'span';
  const ListIcon = Icons.List || 'span';
  const XIcon = Icons.X || 'span';

  // --- [데이터 통신: Supabase 연동] ---
  // DB에서 팝업스토어 목록을 가져와서 앱 상태에 맞게 변환하여 저장합니다.
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

  // [초기화] 컴포넌트 마운트 시 데이터 로딩 및 사용자 위치 파악
  useEffect(() => {
    fetchStores();
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => setUserCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => setUserCoords(DEFAULT_LOCATION),
        { enableHighAccuracy: false, timeout: 5000 }
      );
    }
  }, []);

  // --- [핸들러: 인증 및 로그인 액션] ---
  
  // 프로필 버튼 클릭 시: 미로그인 시 로그인 모달을 띄우고, 로그인 시 프로필 로직 수행
  const handleProfileClick = useCallback(() => {
    if (!userProfile) {
      console.log("App: 로그인 모달 오픈");
      setIsProfileModalOpen(true);
    } else {
      console.log("App: 프로필 상세 정보 조회");
    }
  }, [userProfile]);

  // 통합 로그인 처리 함수 (카카오, 네이버, 토스 공통)
  const handleSocialLogin = async (provider: string) => {
    console.log(`${provider} 인증 시작`);
    try {
      // 실제 Supabase OAuth 연동 시 아래 주석 해제
      // await supabase.auth.signInWithOAuth({ provider: provider as any });
      
      // 테스트용 임시 로그인 성공 처리
      setUserProfile({ id: '1', name: '테스트 유저', avatarUrl: '', isAdmin: false });
      setIsProfileModalOpen(false);
      setSuccessConfig({ isOpen: true, title: '로그인 완료', message: `${provider}로 로그인이 되었습니다.` });
    } catch (e) {
      console.error(e);
    }
  };

  // 관리자 모드 강제 활성화 (테스트용)
  const handleAdminLogin = useCallback(() => {
    console.log("관리자 모드 활성화");
    setIsAdminLoggedIn(true);
    setIsAdminOpen(true); 
    setSuccessConfig({ isOpen: true, title: '관리자 인증 완료', message: '관리자 대시보드 기능을 사용할 수 있습니다.' });
  }, []);

  // 모든 상태를 초기화하고 일반 유저 화면으로 복귀
  const handleUserLogin = useCallback(() => {
    console.log("일반 유저 모드 전환: 모든 오버레이 초기화");
    setIsAdminLoggedIn(false);
    setIsAdminOpen(false);
    setIsMobileListOpen(false);
    setIsSearchOpen(false);
    setIsLocationSelectorOpen(false);
    setDetailStore(null);
    setSelectedStoreId(null);
    setSuccessConfig({ isOpen: true, title: '일반 모드 전환', message: '사용자 화면으로 전환되었습니다.' });
  }, []);

  // 리스트나 검색결과에서 스토어 선택 시 지도 이동 및 상세창 오픈
  const handleStoreSelect = useCallback((id: string) => {
    const store = allStores.find(st => st.id === id);
    if (store) {
      setDetailStore({ ...store }); 
      setSelectedStoreId(id);
      setMapCenter({ lat: store.lat, lng: store.lng });
      setIsSearchOpen(false); 
      if (activeTab === 'home') setIsMobileListOpen(false);
    }
  }, [allStores, activeTab]);

  // 찜하기 버튼 토글
  const toggleSaveStore = useCallback((id: string) => {
    setSavedStoreIds(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  }, []);

  // --- [연산: 필터링 로직] ---
  // 현재 탭, 카테고리 필터, 지도의 범위를 모두 고려하여 보여줄 스토어 계산
  const visibleStores = useMemo(() => {
    let filtered = allStores;
    if (activeTab === 'saved') {
      filtered = filtered.filter(s => savedStoreIds.includes(s.id));
    }
    if (selectedFilter !== '전체') {
      if (selectedFilter === '무료입장') {
        filtered = filtered.filter(s => s.is_free);
      } else {
        filtered = filtered.filter(s => s.category === selectedFilter);
      }
    }
    if (activeTab === 'home' && mapBounds) {
      filtered = filtered.filter(s => 
        s.lat >= mapBounds.minLat && s.lat <= mapBounds.maxLat && 
        s.lng >= mapBounds.minLng && s.lng <= mapBounds.maxLng
      );
    }
    return filtered;
  }, [allStores, selectedFilter, mapBounds, activeTab, savedStoreIds]);

  // --- [조건부 렌더링: 관리자 화면] ---
  if (isAdminOpen && isAdminLoggedIn) {
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
      
      {/* 🛠 개발용 디버그 패널 (화면 우측 상단 부유) */}
      <AnimatePresence>
        {isTestPanelOpen && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
            className="fixed top-24 right-6 z-[999] bg-white/95 backdrop-blur-xl p-5 rounded-[24px] shadow-2xl border border-[#f2f4f6] flex flex-col gap-3 min-w-[200px]"
          >
            <div className="flex justify-between items-center mb-1">
              <span className="text-[12px] font-bold text-[#3182f6]">DEBUG MODE</span>
              <button onClick={() => setIsTestPanelOpen(false)} className="text-[#8b95a1] hover:text-black p-1"><XIcon size={16} /></button>
            </div>
            <button onClick={handleAdminLogin} className={`w-full py-3 rounded-xl text-[14px] font-bold transition-all ${isAdminLoggedIn ? 'bg-[#3182f6] text-white shadow-md' : 'bg-[#f2f4f6] text-[#4e5968]'}`}>관리자 모드</button>
            <button onClick={handleUserLogin} className={`w-full py-3 rounded-xl text-[14px] font-bold transition-all ${!isAdminLoggedIn ? 'bg-[#3182f6] text-white shadow-md' : 'bg-[#f2f4f6] text-[#4e5968]'}`}>일반 유저 모드</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* [PC 레이아웃] 왼쪽 사이드바 */}
      <aside className="hidden lg:flex w-[400px] flex-col z-10 bg-white border-r border-[#f2f4f6] shadow-sm overflow-hidden">
        <Header 
          location={currentLocationName} 
          userProfile={userProfile}
          onSearchClick={() => setIsSearchOpen(true)} 
          onAdminClick={() => isAdminLoggedIn ? setIsAdminOpen(true) : alert("관리자 권한이 없습니다.")} 
          onProfileClick={handleProfileClick} 
          onLocationClick={() => setIsLocationSelectorOpen(true)} 
        />
        <div className="no-scrollbar overflow-x-auto bg-white"><CategoryFilter selected={selectedFilter} onSelect={setSelectedFilter} /></div>
        <div className="px-5 py-4 bg-white border-b border-[#f9fafb]">
          <div className="flex bg-[#f2f4f6] p-1 rounded-[14px]">
            <button onClick={() => setActiveTab('home')} className={`flex-1 flex items-center justify-center gap-2 py-2 text-[14px] font-bold rounded-[12px] transition-all ${activeTab === 'home' ? 'bg-white shadow-sm text-[#3182f6]' : 'text-[#8b95a1]'}`}><MapIcon size={16} /> 지도</button>
            <button onClick={() => setActiveTab('saved')} className={`flex-1 flex items-center justify-center gap-2 py-2 text-[14px] font-bold rounded-[12px] transition-all ${activeTab === 'saved' ? 'bg-white shadow-sm text-[#3182f6]' : 'text-[#8b95a1]'}`}><HeartIcon size={16} className={activeTab === 'saved' ? 'fill-[#3182f6]' : ''} /> 찜한 목록</button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto bg-white custom-scrollbar"><PopupList stores={visibleStores} onStoreClick={(s) => handleStoreSelect(s.id)} userLocation={userCoords} /></div>
      </aside>

      {/* [메인 영역] 지도 컨텐츠 */}
      <main className="flex-1 relative z-0">
        <MapArea 
          stores={activeTab === 'home' ? allStores : allStores.filter(s => savedStoreIds.includes(s.id))} 
          selectedStoreId={selectedStoreId} 
          onMarkerClick={handleStoreSelect} 
          mapCenter={mapCenter} 
          userLocation={userCoords} 
          onMapIdle={(bounds, center) => { setMapBounds(bounds); setMapCenter(center); }}
          onMapClick={() => { setIsMobileListOpen(false); setDetailStore(null); setSelectedStoreId(null); }}
        />
        
        {/* [모바일] 상단 헤더 및 카테고리 */}
        <div className="lg:hidden absolute top-0 left-0 right-0 z-20 bg-white/80 backdrop-blur-xl border-b border-[#f2f4f6]">
          <Header location={currentLocationName} userProfile={userProfile} onProfileClick={handleProfileClick} onSearchClick={() => setIsSearchOpen(true)} onLocationClick={() => setIsLocationSelectorOpen(true)} />
          <div className="no-scrollbar overflow-x-auto"><CategoryFilter selected={selectedFilter} onSelect={setSelectedFilter} /></div>
        </div>

        {/* [모바일] 하단 부유 버튼 및 바텀 시트 */}
        {!isMobileListOpen && (
          <div className="lg:hidden absolute bottom-28 left-1/2 -translate-x-1/2 z-30">
            <button onClick={() => setIsMobileListOpen(true)} className="bg-[#191f28] text-white px-8 py-4 rounded-full shadow-2xl font-bold text-[15px] flex items-center gap-2"><ListIcon size={18} /> {activeTab === 'home' ? '목록보기' : '찜한 목록'}</button>
          </div>
        )}

        <div className="lg:hidden">
          <motion.div initial={{ y: "100%" }} animate={{ y: isMobileListOpen ? "8%" : "100%" }} className="fixed inset-x-0 bottom-0 z-40 bg-white rounded-t-[24px] shadow-2xl flex flex-col h-[92vh]">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-50">
              <h2 className="text-[18px] font-bold">{activeTab === 'home' ? '주변 팝업' : '찜한 팝업'}</h2>
              <button onClick={() => setIsMobileListOpen(false)} className="p-2 bg-[#f2f4f6] rounded-full"><XIcon size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto pb-32"><PopupList stores={visibleStores} onStoreClick={(s) => handleStoreSelect(s.id)} userLocation={userCoords} /></div>
          </motion.div>
          <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
      </main>

      {/* --- [모달 및 오버레이 레이어] --- */}
      <AnimatePresence>
        {/* 1. 로그인 모달 (기능 플래그 포함) */}
        {isProfileModalOpen && !userProfile && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white p-8 rounded-[32px] shadow-2xl w-full max-w-sm text-center">
              <h2 className="text-2xl font-bold mb-6">시작하기</h2>
              <p className="text-[#4e5968] mb-8 text-sm">팝업스토어 제보와 찜 기능을<br/>로그인 후 이용해 보세요.</p>
              <div className="flex flex-col gap-3">
                {/* 카카오 로그인 (플래그 적용) */}
                {AUTH_CONFIG.KAKAO.enabled && (
                  <button onClick={() => handleSocialLogin(AUTH_CONFIG.KAKAO.provider)} className="w-full py-4 bg-[#FEE500] text-[#3c1e1e] font-bold rounded-2xl active:scale-95 transition-transform">카카오 로그인</button>
                )}
                {/* 토스 로그인 (플래그 적용) */}
                {AUTH_CONFIG.TOSS.enabled && (
                  <button onClick={() => handleSocialLogin(AUTH_CONFIG.TOSS.provider)} className="w-full py-4 bg-[#3182f6] text-white font-bold rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-transform">토스로 시작하기</button>
                )}
                {/* 네이버 로그인 (플래그 적용) */}
                {AUTH_CONFIG.NAVER.enabled && (
                  <button onClick={() => handleSocialLogin(AUTH_CONFIG.NAVER.provider)} className="w-full py-4 bg-[#03C75A] text-white font-bold rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-transform"><span className="font-extrabold text-lg">N</span> 네이버로 시작하기</button>
                )}
                <button className="w-full py-4 bg-[#f2f4f6] text-[#4e5968] font-bold rounded-2xl">이메일 로그인</button>
              </div>
              <button onClick={() => setIsProfileModalOpen(false)} className="mt-6 text-[#8b95a1] underline text-sm">나중에 하기</button>
            </motion.div>
          </div>
        )}

        {/* 2. 배경 블러 처리 (검색/위치 선택 시) */}
        {(isSearchOpen || isLocationSelectorOpen) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-[90]" onClick={() => { setIsSearchOpen(false); setIsLocationSelectorOpen(false); }} />
        )}
        
        {/* 3. 스토어 상세 모달 */}
        {detailStore && (
          <div className="fixed inset-0 z-[9999] flex items-end lg:items-center justify-center p-0 lg:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDetailStore(null)} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="relative w-full lg:max-w-[480px] bg-white rounded-t-[32px] lg:rounded-[32px] overflow-hidden shadow-2xl">
              <DetailModal store={detailStore} isSaved={savedStoreIds.includes(detailStore.id)} onToggleSave={() => toggleSaveStore(detailStore.id)} onClose={() => setDetailStore(null)} onShowSuccess={(t, m) => setSuccessConfig({ isOpen: true, title: t, message: m })} />
            </motion.div>
          </div>
        )}
        
        {/* 4. 검색 및 성공 알림 오버레이 */}
        {isSearchOpen && <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} stores={allStores} onSelectResult={handleStoreSelect} />}
        {successConfig.isOpen && <SuccessModal isOpen={successConfig.isOpen} title={successConfig.title} message={successConfig.message} onClose={() => setSuccessConfig(p => ({...p, isOpen: false}))} />}
      </AnimatePresence>
    </div>
  );
};

export default App;
