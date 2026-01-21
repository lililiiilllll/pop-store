// ... (이전 임포트 및 유틸리티 함수 동일)

const App: React.FC = () => {
  // ... (이전 상태 관리 변수 동일)

  // --- [수정된 함수: handleStoreSelect] ---
  // 리스트에서 팝업 클릭 시 실행되는 핵심 로직
  const handleStoreSelect = useCallback((id: string) => {
    // 1. 현재 화면에 표시 중인(거리/영업상태 정보가 포함된) 데이터에서 찾습니다.
    const s = displayStores.find(st => st.id === id);
    
    if (s) {
      setSelectedStoreId(id);
      
      // 2. 상세 모달에 전달할 데이터 설정 (거리/영업정보 포함)
      setDetailStore(s);
      
      // 3. 지도 중심 이동
      setMapCenter({ lat: s.lat, lng: s.lng });
      
      // 4. 모바일 대응: 상세 페이지가 뜰 때 바텀 리스트 시트를 아래로 내립니다.
      if (window.innerWidth < 1024) {
        setSheetOpen(false);
      }
    } else {
      // 혹시 필터링된 리스트에 없다면 전체 데이터에서 찾음
      const fallbackStore = allStores.find(st => st.id === id);
      if (fallbackStore) {
        setSelectedStoreId(id);
        setDetailStore(fallbackStore);
        setMapCenter({ lat: fallbackStore.lat, lng: fallbackStore.lng });
      }
    }
  }, [displayStores, allStores]);

  if (isAdminOpen) return <AdminDashboard allStores={allStores} onBack={() => setIsAdminOpen(false)} onRefresh={fetchStores} />;

  return (
    <div className="flex flex-col lg:flex-row h-screen w-full overflow-hidden bg-white font-sans">
      {/* 1. 데스크탑 사이드바 */}
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
              {/* 리스트 컴포넌트에 handleStoreSelect 연결 */}
              <PopupList stores={displayStores} selectedStoreId={selectedStoreId} onStoreSelect={handleStoreSelect} />
            </>
          ) : (
            <SavedView stores={allStores.filter(s => likedStoreIds.has(s.id))} onStoreClick={handleStoreSelect} />
          )}
        </div>
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* 2. 메인 지도 영역 */}
      <div className="flex-1 relative bg-gray-100">
        {/* 모바일 상단 헤더 */}
        <div className="lg:hidden absolute top-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md">
            <Header location={currentLocationName} userProfile={userProfile} onSearchClick={() => setIsSearchOpen(true)} onProfileClick={() => !user ? setIsLoginModalOpen(true) : setIsProfileModalOpen(true)} onLocationClick={() => setIsLocationSelectorOpen(true)} />
            <CategoryFilter selected={selectedFilter} onSelect={setSelectedFilter} showLikedOnly={showLikedOnly} onToggleLiked={() => setShowLikedOnly(!showLikedOnly)} />
        </div>

        {/* 지도 컴포넌트 */}
        <div className="absolute inset-0 z-0">
          <MapArea 
            stores={allStores} 
            selectedStoreId={selectedStoreId} 
            onMarkerClick={handleStoreSelect} 
            onMapIdle={(b, c) => { setCurrentBounds(b); setCurrentMapCenter(c); }} 
            mapCenter={mapCenter} 
            onMapClick={() => {
                setSelectedStoreId(null);
                // 지도를 빈 곳 클릭하면 상세창도 닫고 싶다면 아래 주석 해제
                // setDetailStore(null); 
            }} 
            userLocation={userCoords} 
            onDetailOpen={setDetailStore} 
          />
        </div>

        {/* 3. 모바일 바텀 시트 (리스트) */}
        {activeTab === 'home' && (
          <motion.div 
            animate={{ y: sheetOpen ? 0 : 'calc(100% - 140px)' }} 
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="lg:hidden absolute inset-0 z-40 flex flex-col pointer-events-none"
          >
            <div className="mt-auto w-full h-[75vh] bg-white rounded-t-[32px] shadow-2xl flex flex-col pointer-events-auto border-t border-gray-100">
              <div className="h-8 w-full flex items-center justify-center cursor-pointer" onClick={() => setSheetOpen(!sheetOpen)}>
                <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
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

      {/* 4. 전역 모달 레이어 (상세 페이지) */}
      <AnimatePresence>
        {detailStore && (
          <DetailModal 
            store={detailStore} 
            onClose={() => {
                setDetailStore(null);
                setSelectedStoreId(null);
            }} 
            onShowSuccess={handleShowSuccess} 
            isLiked={likedStoreIds.has(detailStore.id)} 
          />
        )}
      </AnimatePresence>

      {/* 기타 설정 모달들 */}
      {isSearchOpen && <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} stores={allStores} onSelectResult={handleStoreSelect} />}
      {isLocationSelectorOpen && <LocationSelector isOpen={isLocationSelectorOpen} onClose={() => setIsLocationSelectorOpen(false)} onSelect={(loc) => { setCurrentLocationName(loc.name); setMapCenter({ lat: loc.lat, lng: loc.lng }); setIsLocationSelectorOpen(false); }} />}
      {isLoginModalOpen && <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />}
      {isProfileModalOpen && <ProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} userProfile={userProfile} />}
      {successConfig.isOpen && <SuccessModal isOpen={successConfig.isOpen} title={successConfig.title} message={successConfig.message} onClose={() => setSuccessConfig(prev => ({...prev, isOpen: false}))} />}
    </div>
  );
};

export default App;
