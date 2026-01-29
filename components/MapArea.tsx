import React, { useEffect, useRef, useState } from 'react';
import { PopupStore } from './types';
import ReportModal from './ReportModal'; 

interface MapAreaProps {
  stores: PopupStore[];
  onMarkerClick: (id: string) => void;
  selectedStoreId: string | null;
  onMapClick: () => void;
  mapCenter?: { lat: number; lng: number };
  userLocation: { lat: number; lng: number } | null;
  onMapIdle?: (bounds: any, center: { lat: number; lng: number }) => void;
  onDetailOpen: (store: PopupStore) => void;
  setUserLocation: (loc: { lat: number; lng: number }) => void; 
}

const PIN_SVG = {
  verified: `data:image/svg+xml;base64,${btoa(`<svg width="34" height="42" viewBox="0 0 34 42" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17 0C7.61117 0 0 7.61117 0 17C0 27.2 17 42 17 42C17 42 34 27.2 34 17C34 7.61117 26.3888 0 17 0Z" fill="#3182F6"/><circle cx="17" cy="17" r="7" fill="white"/></svg>`)}`,
  unverified: `data:image/svg+xml;base64,${btoa(`<svg width="34" height="42" viewBox="0 0 34 42" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17 0C7.61117 0 0 7.61117 0 17C0 27.2 17 42 17 42C17 42 34 27.2 34 17C34 7.61117 26.3888 0 17 0Z" fill="#ADB5BD"/><circle cx="17" cy="17" r="7" fill="white"/></svg>`)}`
};

const MapArea: React.FC<MapAreaProps> = ({ 
  stores, onMarkerClick, selectedStoreId, onMapClick, 
  mapCenter, userLocation, onMapIdle, onDetailOpen, setUserLocation 
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const userMarkerRef = useRef<any>(null);
  const infoOverlayRef = useRef<any>(null); 
  
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedCoord, setSelectedCoord] = useState({ lat: 0, lng: 0 });
  const longPressTimer = useRef<any>(null);

  // 1. [초기화] 지도 생성 및 최초 GPS 추적
  useEffect(() => {
    const { kakao } = window as any;
    if (!kakao || !mapContainerRef.current) return;

    const initMap = (lat: number, lng: number) => {
      kakao.maps.load(() => {
        const options = {
          center: new kakao.maps.LatLng(lat, lng),
          level: 3
        };
        const map = new kakao.maps.Map(mapContainerRef.current, options);
        mapRef.current = map;

        // 닫기 로직을 하나의 함수로 공통화
    const closeOverlay = () => {
      if (infoOverlayRef.current) {
        infoOverlayRef.current.setMap(null);
      }
      onMapClick(); // 부모 상태 초기화 (selectedStoreId -> null)
    };

    // ✅ 상황 1: 지도의 빈 곳을 '클릭'했을 때
    kakao.maps.event.addListener(map, 'click', () => {
      closeOverlay();
    });

    // ✅ 상황 2: 지도를 '드래그'하기 시작할 때
    kakao.maps.event.addListener(map, 'dragstart', () => {
      closeOverlay();
    });

        // 지도 클릭 시 정보창 닫기
        kakao.maps.event.addListener(map, 'click', () => {
          if (infoOverlayRef.current) infoOverlayRef.current.setMap(null);
          onMapClick();
        });

TypeScript
        // --- 롱프레스 제보 기능 완벽 수정 버전 ---
        let isDragging = false; // 드래그 상태 확인용 변수

        const handleStart = (e: any) => {
          isDragging = false; // 시작할 때는 드래그가 아님
          if (longPressTimer.current) clearTimeout(longPressTimer.current);

          longPressTimer.current = setTimeout(() => {
            // 800ms 동안 드래그가 발생하지 않았을 때만 실행
            if (!isDragging) {
              setSelectedCoord({ lat: e.latLng.getLat(), lng: e.latLng.getLng() });
              setIsReportModalOpen(true);
              if (navigator.vibrate) navigator.vibrate(50);
            }
            longPressTimer.current = null;
          }, 800);
        };

        const handleEnd = () => {
          if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
          }
        };

        // 1. PC 이벤트
        kakao.maps.event.addListener(map, 'mousedown', handleStart);
        kakao.maps.event.addListener(map, 'mouseup', handleEnd);

        // 2. 모바일 이벤트 (정확한 터치 이벤트 바인딩)
        kakao.maps.event.addListener(map, 'touchstart', handleStart);
        kakao.maps.event.addListener(map, 'touchend', handleEnd);

        // 3. ✅ 핵심: 드래그가 감지되면 즉시 타이머 무효화
        kakao.maps.event.addListener(map, 'dragstart', () => {
          isDragging = true; // 드래그 시작됨을 표시
          handleEnd(); // 타이머 즉시 종료
        });

        // 지도 이동 완료(Idle)
        kakao.maps.event.addListener(map, 'idle', () => {
          if (onMapIdle) {
            const b = map.getBounds();
            onMapIdle({
              minLat: b.getSouthWest().getLat(), maxLat: b.getNorthEast().getLat(),
              minLng: b.getSouthWest().getLng(), maxLng: b.getNorthEast().getLng(),
            }, { lat: map.getCenter().getLat(), lng: map.getCenter().getLng() });
          }
        });
      });
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          if (typeof setUserLocation === 'function') setUserLocation(coords);
          initMap(coords.lat, coords.lng);
        },
        () => initMap(37.5665, 126.9780) // 거부 시 서울시청
      );
    } else {
      initMap(37.5665, 126.9780);
    }
  }, []);

// 2. [내 위치 핀] 실시간 userLocation 동기화
useEffect(() => {
  const { kakao } = window as any;
  // mapRef.current가 없을 때 실행되는 것을 방지
  if (!mapRef.current || !userLocation || !kakao) return;

  if (userMarkerRef.current) userMarkerRef.current.setMap(null);

  const content = document.createElement('div');
  content.innerHTML = `
    <div style="position: relative; display: flex; align-items: center; justify-content: center;">
      <div style="position: absolute; width: 30px; height: 30px; background: #3182f6; border-radius: 50%; opacity: 0.2; animation: user-pulse 2s infinite;"></div>
      <div style="width: 14px; height: 14px; background: #3182f6; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>
    </div>
    <style>
      @keyframes user-pulse { 0% { transform: scale(0.5); opacity: 0.5; } 100% { transform: scale(2.2); opacity: 0; } }
    </style>
  `;

  userMarkerRef.current = new kakao.maps.CustomOverlay({
    position: new kakao.maps.LatLng(userLocation.lat, userLocation.lng),
    content: content,
    zIndex: 10,
    xAnchor: 0.5,
    yAnchor: 0.5
  });
  
  userMarkerRef.current.setMap(mapRef.current);
}, [userLocation, mapRef.current]); // mapRef.current가 준비되었을 때도 다시 체크하도록 추가

  // 3. [마커] 스토어 마커 렌더링 및 미승인 토스트
  useEffect(() => {
    const { kakao } = window as any;
    if (!mapRef.current || !kakao) return;

    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current.clear();

    stores.forEach((store) => {
      const marker = new kakao.maps.Marker({
        position: new kakao.maps.LatLng(store.lat, store.lng),
        map: mapRef.current,
        image: new kakao.maps.MarkerImage(
          store.is_verified ? PIN_SVG.verified : PIN_SVG.unverified,
          new kakao.maps.Size(28, 35), { offset: new kakao.maps.Point(14, 35) }
        )
      });

      kakao.maps.event.addListener(marker, 'click', () => {
        if (!store.is_verified) {
          const toastContent = `<div style="padding: 10px 16px; background: rgba(0,0,0,0.8); color:#fff; font-size:13px; border-radius:12px; margin-bottom:50px; white-space:nowrap;">승인 대기 중인 장소입니다</div>`;
          const toast = new kakao.maps.CustomOverlay({
            position: marker.getPosition(),
            content: toastContent,
            yAnchor: 1.0
          });
          toast.setMap(mapRef.current);
          setTimeout(() => toast.setMap(null), 2000);
          return;
        }
        onMarkerClick(store.id);
      });
      markersRef.current.set(store.id, marker);
    });
  }, [stores, onMarkerClick]);

// 4. [오버레이] 선택된 마커 상단 정보창 (에러 완벽 방지 버전)
useEffect(() => {
  const { kakao } = window as any;
  // mapRef.current나 kakao 객체가 없으면 실행 중단
  if (!mapRef.current || !selectedStoreId || !kakao) return;
  
  // 기존 오버레이가 있다면 제거
  if (infoOverlayRef.current) infoOverlayRef.current.setMap(null);

  const store = stores.find(s => s.id === selectedStoreId);
  if (!store) return;

  // ✅ 1. 변수 선언 (ReferenceError 방지)
  const currentImageUrl = store.image_url || 'https://placehold.co/400x400?text=No+Image'; 
  const overlayDiv = document.createElement('div'); 
  
  overlayDiv.style.cssText = 'margin-bottom: 48px; filter: drop-shadow(0 4px 12px rgba(0,0,0,0.15)); cursor: pointer;';
  
  // ✅ 2. HTML 삽입 (imageUrl 대신 위에서 선언한 currentImageUrl 사용)
  overlayDiv.innerHTML = `
    <div style="background: white; padding: 12px; border-radius: 20px; display: flex; align-items: center; gap: 12px; min-width: 220px; border: 1px solid #f2f4f6; position: relative; z-index: 10;">
      <img src="${currentImageUrl}" style="width: 48px; height: 48px; border-radius: 12px; object-fit: cover;" onerror="this.src='https://via.placeholder.com/150'"/>
      <div style="display: flex; flex-direction: column; text-align: left;">
        <div style="display: flex; gap: 4px; margin-bottom: 2px;">
          <span style="font-size: 10px; color: #3182f6; font-weight: bold;">${store.category || '팝업'}</span>
          <span style="font-size: 10px; color: #00d084; font-weight: bold; background: #e6f9f2; padding: 1px 4px; border-radius: 4px;">정보</span>
        </div>
        <span style="font-size: 14px; font-weight: 800; color: #191f28; line-height: 1.2;">${store.title || '제목 없음'}</span>
        <span style="font-size: 11px; color: #8b95a1; margin-top: 2px;">${(store.start_date || '').slice(5)} ~ ${(store.end_date || '').slice(5)}</span>
      </div>
    </div>
    <div style="position: absolute; bottom: -6px; left: 50%; transform: translateX(-50%) rotate(45deg); width: 14px; height: 14px; background: white; border-right: 1px solid #f2f4f6; border-bottom: 1px solid #f2f4f6; z-index: 5;"></div>
  `;
  
  // ✅ 3. 클릭 이벤트 바인딩
  overlayDiv.onclick = (e) => {
    e.stopPropagation();
    onDetailOpen(store);
  };

  // ✅ 4. 오버레이 객체 생성 및 지도 표시
  infoOverlayRef.current = new kakao.maps.CustomOverlay({
    position: new kakao.maps.LatLng(store.lat, store.lng),
    content: overlayDiv, 
    yAnchor: 1.0,
    zIndex: 50
  });
  
  infoOverlayRef.current.setMap(mapRef.current);
  mapRef.current.panTo(new kakao.maps.LatLng(store.lat, store.lng));

}, [selectedStoreId, stores, onDetailOpen]);

  return (
    <div className="w-full h-full relative" style={{ WebkitTouchCallout: 'none',WebkitUserSelect: 'none', userSelect: 'none', touchAction: 'pan-x pan-y'  }}>
      <div ref={mapContainerRef} className="w-full h-full absolute inset-0" />
      
      {/* 내 위치 이동 버튼 */}
      <button
        onClick={() => {
          if (userLocation && mapRef.current) {
            const { kakao } = window as any;
            mapRef.current.panTo(new kakao.maps.LatLng(userLocation.lat, userLocation.lng));
          }
        }}
        className="absolute bottom-28 right-5 z-40 w-12 h-12 bg-white rounded-full shadow-2xl flex items-center justify-center border border-gray-100 active:scale-95 transition-all"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="8" stroke="#3182F6" strokeWidth="2"/><circle cx="12" cy="12" r="3" fill="#3182F6"/>
          <path d="M12 2V5M12 19V22M2 12H5M19 12H22" stroke="#3182F6" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>

      {isReportModalOpen && selectedCoord && (
  <div className="fixed inset-0 z-[999999]">
    <ReportModal 
      coord={selectedCoord} 
      // 만약 ReportModal에서 currentUser.id를 쓴다면 아래처럼 안전하게 전달
      onClose={() => setIsReportModalOpen(false)} 
    />
  </div>
)}
    </div>
  );
};

export default MapArea;
