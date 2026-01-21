// 상단 import 부분 경로 수정 (./components/ 제거하고 동일 폴더에서 가져오기)
import Header from './Header'; 
import MapArea from './MapArea';
// ... 나머지 컴포넌트들도 파일 위치에 맞춰 경로 수정 필요 (예: ./PopupList)

// (기존 App.tsx 로직 유지...)

  return (
    <div className="flex flex-col lg:flex-row h-screen w-full overflow-hidden bg-white relative">
      {/* 사이드바 영역: z-index를 높여서 지도보다 위에 보이게 함 */}
      <div className="hidden lg:flex w-[400px] flex-col z-20 bg-white border-r border-gray-200 h-full shadow-xl">
        <Header ... />
        <div className="flex-1 overflow-hidden relative">
            <PopupList ... />
        </div>
      </div>

      {/* 지도 영역: flex-1로 남은 공간 꽉 채움 */}
      <div className="flex-1 relative h-full w-full min-h-0 z-0">
          <MapArea 
            stores={baseFilteredStores}
            onMarkerClick={handleMarkerClick}
            mapCenter={mapCenter}
            // ... props 전달
          />
      </div>
      
      {/* 모바일용 헤더 및 바텀시트도 z-index 30 이상으로 설정됨 */}
    </div>
  );
