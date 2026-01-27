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

// --- 토스 스타일의 SVG 핀 데이터 ---
const PIN_SVG = {
  verified: `data:image/svg+xml;base64,${btoa(`
    <svg width="34" height="42" viewBox="0 0 34 42" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17 0C7.61117 0 0 7.61117 0 17C0 27.2 17 42 17 42C17 42 34 27.2 34 17C34 7.61117 26.3888 0 17 0Z" fill="#3182F6"/>
      <circle cx="17" cy="17" r="7" fill="white"/>
    </svg>
  `)}`,
  unverified: `data:image/svg+xml;base64,${btoa(`
    <svg width="34" height="42" viewBox="0 0 34 42" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17 0C7.61117 0 0 7.61117 0 17C0 27.2 17 42 17 42C17 42 34 27.2 34 17C34 7.61117 26.3888 0 17 0Z" fill="#ADB5BD"/>
      <circle cx="17" cy="17" r="7" fill="white"/>
    </svg>
  `)}`,
  selection: `data:image/svg+xml;base64,${btoa(`
    <svg width="34" height="42" viewBox="0 0 34 42" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17 0C7.61117 0 0 7.61117 0 17C0 27.2 17 42 17 42C17 42 34 27.2 34 17C34 7.61117 26.3888 0 17 0Z" fill="#F04452"/>
      <circle cx="17" cy="17" r="7" fill="white"/>
    </svg>
  `)}`
};

const MapArea: React.FC<MapAreaProps> = ({ 
  stores, 
  onMarkerClick, 
  selectedStoreId,
  onMapClick, 
  mapCenter, 
  userLocation,
  onMapIdle,
  onDetailOpen,
  setUserLocation
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const userMarkerRef = useRef<any>(null);
  const overlayRef = useRef<any>(null); 
  const selectionMarkerRef = useRef<any>(null);
  const unverifiedOverlayRef = useRef<any>(null);

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedCoord, setSelectedCoord] = useState({ lat: 0, lng: 0 });
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  // 1. 내 위치 가져오기 및 초기화
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
          setUserLocation(coords);
          if (mapRef.current) {
            const { kakao } = window as any;
            mapRef.current.setCenter(new kakao.maps.LatLng(coords.lat, coords.lng));
          }
        },
        (error) => console.error("위치 획득 실패", error)
      );
    }
  }, []);

  // 2. 지도 초기화 (흰 화면 방지 로직)
  useEffect(() => {
    const { kakao } = window as any;
    if (!kakao || !mapContainerRef.current) return;

    kakao.maps.load(() => {
      const options = {
        center: new kakao.maps.LatLng(mapCenter?.lat || 37.5665, mapCenter?.lng || 126.9780),
        level: 3
      };
      const map = new kakao.maps.Map(mapContainerRef.current, options);
      mapRef.current = map;

      // 롱프레스(제보) 이벤트
      const handleStart = (e: any) => {
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
        const latLng = e.latLng; 
        longPressTimer.current = setTimeout(() => {
          if (!latLng) return;
          setSelectedCoord({ lat: latLng.getLat(), lng: latLng.getLng() });
          setIsReportModalOpen(true);
          if (navigator.vibrate) navigator.vibrate(50);
        }, 800); 
      };

      const handleEnd = () => { if (longPressTimer.current) clearTimeout(longPressTimer.current); };

      kakao.maps.event.addListener(map, 'mousedown', handleStart);
      kakao.maps.event.addListener(map, 'touchstart', handleStart);
      kakao.maps.event.addListener(map, 'mouseup', handleEnd);
      kakao.maps.event.addListener(map, 'touchend', handleEnd);
      kakao.maps.event.addListener(map, 'dragstart', handleEnd);
      
      kakao.maps.event.addListener(map, 'click', () => {
        if (overlayRef.current) overlayRef.current.setMap(null);
        if (unverifiedOverlayRef.current) unverifiedOverlayRef.current.setMap(null);
        onMapClick();
      });

      kakao.maps.event.addListener(map, 'idle', () => {
        if (onMapIdle) {
          const bounds = map.getBounds();
          const center = map.getCenter();
          onMapIdle(
            {
              minLat: bounds.getSouthWest().getLat(),
              maxLat: bounds.getNorthEast().getLat(),
              minLng: bounds.getSouthWest().getLng(),
              maxLng: bounds.getNorthEast().getLng(),
            },
            { lat: center.getLat(), lng: center.getLng() }
          );
        }
      });
    });
  }, []);

  // 3. 내 위치로 이동 기능
  const handleMoveToUserLocation = () => {
    if (userLocation && mapRef.current) {
      const { kakao } = window as any;
      mapRef.current.panTo(new kakao.maps.LatLng(userLocation.lat, userLocation.lng));
    } else {
      alert("위치 정보를 불러오는 중입니다.");
    }
  };

  // 4. 마커 업데이트
  useEffect(() => {
    const { kakao } = window as any;
    if (!mapRef.current || !kakao) return;
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current.clear();

    stores.forEach((store) => {
      const markerImage = new kakao.maps.MarkerImage(
        store.is_verified ? PIN_SVG.verified : PIN_SVG.unverified,
        new kakao.maps.Size(28, 35),
        { offset: new kakao.maps.Point(14, 35) }
      );

      const marker = new kakao.maps.Marker({
        position: new kakao.maps.LatLng(store.lat, store.lng),
        map: mapRef.current,
        image: markerImage
      });

      kakao.maps.event.addListener(marker, 'click', () => {
        if (!store.is_verified) {
          const content = `<div style="padding: 10px 16px; background: rgba(0,0,0,0.8); color:#fff; font-size:13px; border-radius:12px; margin-bottom:50px;">승인 대기 중인 장소입니다</div>`;
          const toast = new kakao.maps.CustomOverlay({ position: marker.getPosition(), content, yAnchor: 1.0 });
          toast.setMap(mapRef.current);
          setTimeout(() => toast.setMap(null), 2000);
          return;
        }
        onMarkerClick(store.id);
      });
      markersRef.current.set(store.id, marker);
    });
  }, [stores]);

  // 5. 내 위치 마커 표시
  useEffect(() => {
    const { kakao } = window as any;
    if (!mapRef.current || !kakao || !userLocation) return;
    if (userMarkerRef.current) userMarkerRef.current.setMap(null);
    userMarkerRef.current = new kakao.maps.CustomOverlay({
      position: new kakao.maps.LatLng(userLocation.lat, userLocation.lng),
      content: `<div style="width: 16px; height: 16px; background: #3182f6; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 12px rgba(49,130,246,0.6);"></div>`,
      zIndex: 10
    });
    userMarkerRef.current.setMap(mapRef.current);
  }, [userLocation]);

  return (
    <div className="w-full h-full relative bg-gray-50">
      <div ref={mapContainerRef} className="w-full h-full absolute inset-0" />
      
      {/* 내 위치 바로가기 버튼 */}
      <button
        onClick={handleMoveToUserLocation}
        className="absolute bottom-28 right-5 z-40 p-3 bg-white rounded-full shadow-2xl border border-gray-100 active:scale-90 transition-all"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="8" fill="#3182F6" fillOpacity="0.2"/>
          <circle cx="12" cy="12" r="4" fill="#3182F6"/>
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
