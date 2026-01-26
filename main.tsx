import React, { useState, useMemo, useEffect } from 'react';
import Header from './components/Header';
import MapArea from './components/MapArea';
import SearchBar from './components/SearchBar'; // 검색창 컴포넌트 가정
import { PopupStore, UserProfile } from './types';

const Main: React.FC = () => {
  // --- 상태 관리 ---
  const [stores, setStores] = useState<PopupStore[]>([]); // DB에서 가져온 전체 데이터
  const [searchQuery, setSearchQuery] = useState(""); // 검색어 상태
  const [isSearchOpen, setIsSearchOpen] = useState(false); // 검색창 노출 여부
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null); // 로그인 정보
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [isDebugMode, setIsDebugMode] = useState(false);
  const [isMapSelectOpen, setIsMapSelectOpen] = useState(false); // 위치 선택 모달

  // --- 2. 검색 기능 활성화 (필터링 로직) ---
  const filteredStores = useMemo(() => {
    if (!searchQuery.trim()) return stores;
    return stores.filter(store => 
      (store.title || store.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (store.category || "").toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [stores, searchQuery]);

  // --- 3. 디버그 모드 및 화면 먹통 방지 로직 ---
  const handleModeSwitch = (toDebug: boolean) => {
    setIsDebugMode(toDebug);
    // 모드 전환 시 화면을 가리는 모든 레이어를 강제로 닫음
    setIsMapSelectOpen(false);
    setIsSearchOpen(false);
    setSelectedStoreId(null);
    // 흐림(Blur) 효과 제거를 위해 body 스타일 초기화
    document.body.style.overflow = "auto";
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-white">
      {/* 1. 로그인 복구된 헤더 */}
      <Header 
        location="성수동" 
        userProfile={userProfile}
        onSearchClick={() => setIsSearchOpen(true)}
        onProfileClick={() => {
          if (!userProfile) {
            console.log("로그인 페이지로 이동 또는 팝업");
            // setLoginModalOpen(true); 
          }
        }}
        onLocationClick={() => setIsMapSelectOpen(true)}
      />

      {/* 검색창 활성화 시 노출 */}
      {isSearchOpen && (
        <div className="absolute inset-0 z-[80] bg-white">
          <div className="p-4 flex items-center gap-2">
            <input 
              autoFocus
              className="flex-1 p-3 bg-gray-100 rounded-xl outline-none"
              placeholder="팝업스토어 이름이나 카테고리 검색"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button onClick={() => { setIsSearchOpen(false); setSearchQuery(""); }} className="font-bold text-gray-500">취소</button>
          </div>
          {/* 검색 결과 리스트 등 추가 가능 */}
        </div>
      )}

      {/* 메인 지도 영역 - 필터링된 데이터 전달 */}
      <main className="relative w-full h-full">
        <MapArea 
          stores={filteredStores} 
          selectedStoreId={selectedStoreId}
          onMarkerClick={(id) => setSelectedStoreId(id)}
          onMapClick={() => setSelectedStoreId(null)}
          onDetailOpen={(store) => console.log("상세페이지 오픈", store)}
          userLocation={{ lat: 37.544, lng: 127.056 }}
        />
      </main>

      {/* 디버그 모드 패널 (화면 먹통 방지 처리) */}
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100]">
        <button 
          onClick={() => handleModeSwitch(!isDebugMode)}
          className={`px-6 py-3 rounded-full font-bold shadow-lg transition-all ${
            isDebugMode ? 'bg-red-500 text-white' : 'bg-black text-white'
          }`}
        >
          {isDebugMode ? '🛠 디버그 모드 종료' : '👤 일반 유저 모드'}
        </button>
      </div>

      {/* 위치 선택 모달 (흐려짐 현상의 원인일 때 체크) */}
      {isMapSelectOpen && (
        <div 
          className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm flex items-end"
          onClick={() => setIsMapSelectOpen(false)}
        >
          <div className="w-full bg-white rounded-t-3xl p-6 h-1/2" onClick={e => e.stopPropagation()}>
             <h2 className="text-xl font-bold mb-4">지역 선택</h2>
             {/* 지역 리스트... */}
          </div>
        </div>
      )}
    </div>
  );
};

export default Main;
