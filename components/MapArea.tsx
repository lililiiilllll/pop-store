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
  const overlayRef = useRef<any>(null); 
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedCoord, setSelectedCoord] = useState({ lat: 0, lng: 0 });

  // 1. [핵심] 앱 시작 시 내 위치를 감지하고 지도를 초기화
  useEffect(() => {
    const { kakao } = window as any;
    if (!kakao || !mapContainerRef.current) return;

    const initializeMap = (lat: number, lng: number) => {
      kakao.maps.load(() => {
        const options = {
          center: new kakao.maps.LatLng(lat, lng),
          level: 3
        };
        const map = new kakao.maps.Map(mapContainerRef.current, options);
        mapRef.current = map;

        // 지도 이동 완료 시 중심 좌표 전달
        kakao.maps.event.addListener(map, 'idle', () => {
          if (onMapIdle) {
            const bounds = map.getBounds();
            onMapIdle({
              minLat: bounds.getSouthWest().getLat(), maxLat: bounds.getNorthEast().getLat(),
              minLng: bounds.getSouthWest().getLng(), maxLng: bounds.getNorthEast().getLng(),
            }, { lat: map.getCenter().getLat(), lng: map.getCenter().getLng() });
          }
        });

        // 클릭 시 오버레이 닫기
        kakao.maps.event.addListener(map, 'click', onMapClick);
      });
    };

    // 브라우저 GPS로 위치 정보 가져오기
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setUserLocation({ lat: latitude, lng: longitude }); // 상위 상태 업데이트
          initializeMap(latitude, longitude); // 찾은 위치로 지도 시작
        },
        () => {
          console.error("위치 정보 접근 거부됨");
          initializeMap(37.5665, 126.9780); // 실패 시 서울시청 중심
        }
      );
    } else {
      initializeMap(37.5665, 126.9780);
    }
  }, []);

  // 2. [핵심] 내 위치 실시간 표시 (파란색 도트 + 파동 애니메이션)
  useEffect(() => {
    const { kakao } = window as any;
    if (!mapRef.current || !kakao || !userLocation) return;

    if (userMarkerRef.current) userMarkerRef.current.setMap(null);

    const content = document.createElement('div');
    content.innerHTML = `
      <div class="user-location-marker">
        <div class="pulse"></div>
        <div class="dot"></div>
      </div>
      <style>
        .user-location-marker { position: relative; width: 20px; height: 20px; }
        .dot { position: absolute; width: 14px; height: 14px; background: #3182f6; border: 3px solid white; border-radius: 50%; z-index: 2; box-shadow: 0 0 5px rgba(0,0,0,0.2); }
        .pulse { position: absolute; width: 14px; height: 14px; background: #3182f6; border-radius: 50%; z-index: 1; animation: pulse-animation 2s infinite; }
        @keyframes pulse-animation { 0% { transform: scale(1); opacity: 0.6; } 100% { transform: scale(3.5); opacity: 0; } }
      </style>
    `;

    userMarkerRef.current = new kakao.maps.CustomOverlay({
      position: new kakao.maps.LatLng(userLocation.lat, userLocation.lng),
      content: content,
      zIndex: 10
    });
    userMarkerRef.current.setMap(mapRef.current);
  }, [userLocation]);

  // 3. 내 위치로 이동 버튼 함수
  const handleMoveToUserLocation = () => {
    if (userLocation && mapRef.current) {
      const { kakao } = window as any;
      mapRef.current.panTo(new kakao.maps.LatLng(userLocation.lat, userLocation.lng));
    }
  };

  // 4. 팝업 스토어 마커들 표시 (생략 없이 이전 기능 동일)
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
      kakao.maps.event.addListener(marker, 'click', () => onMarkerClick(store.id));
      markersRef.current.set(store.id, marker);
    });
  }, [stores, onMarkerClick]);

  return (
    <div className="w-full h-full relative">
      <div ref={mapContainerRef} className="w-full h-full absolute inset-0" />
      
      {/* 내 위치 버튼 */}
      <button
        onClick={handleMoveToUserLocation}
        className="absolute bottom-28 right-5 z-40 w-12 h-12 bg-white rounded-full shadow-2xl flex items-center justify-center border border-gray-100 active:scale-90 transition-all"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="8" stroke="#3182F6" strokeWidth="2"/>
          <circle cx="12" cy="12" r="3" fill="#3182F6"/>
          <path d="M12 2V5M12 19V22M2 12H5M19 12H22" stroke="#3182F6" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>

      {isReportModalOpen && (
        <div className="fixed inset-0 z-[999999]">
          <ReportModal coord={selectedCoord} onClose={() => setIsReportModalOpen(false)} />
        </div>
      )}
    </div>
  );
};

export default MapArea;
