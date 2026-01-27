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
  unverified: `data:image/svg+xml;base64,${btoa(`<svg width="34" height="42" viewBox="0 0 34 42" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17 0C7.61117 0 0 7.61117 0 17C0 27.2 17 42 17 42C17 42 34 27.2 34 17C34 7.61117 26.3888 0 17 0Z" fill="#ADB5BD"/><circle cx="17" cy="17" r="7" fill="white"/></svg>`)}`,
  selection: `data:image/svg+xml;base64,${btoa(`<svg width="34" height="42" viewBox="0 0 34 42" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17 0C7.61117 0 0 7.61117 0 17C0 27.2 17 42 17 42C17 42 34 27.2 34 17C34 7.61117 26.3888 0 17 0Z" fill="#F04452"/><circle cx="17" cy="17" r="7" fill="white"/></svg>`)}`
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
  const selectionMarkerRef = useRef<any>(null);

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedCoord, setSelectedCoord] = useState({ lat: 0, lng: 0 });
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  // 1. 지도 초기화 및 이벤트 등록 통합
  useEffect(() => {
    const { kakao } = window as any;
    if (!kakao || !mapContainerRef.current) return;

    kakao.maps.load(() => {
      // 시작 좌표 설정 (userLocation -> mapCenter -> 서울시청 순)
      const startLat = userLocation?.lat || mapCenter?.lat || 37.5665;
      const startLng = userLocation?.lng || mapCenter?.lng || 126.9780;

      const options = { center: new kakao.maps.LatLng(startLat, startLng), level: 3 };
      const map = new kakao.maps.Map(mapContainerRef.current, options);
      mapRef.current = map;

      // [이벤트] 지도 클릭 시
      kakao.maps.event.addListener(map, 'click', () => {
        if (overlayRef.current) overlayRef.current.setMap(null);
        onMapClick();
      });

      // [이벤트] 롱프레스 제보 (1.2초)
      const handleStart = (e: any) => {
        const latLng = e.latLng;
        longPressTimer.current = setTimeout(() => {
          if (!latLng) return;
          setSelectedCoord({ lat: latLng.getLat(), lng: latLng.getLng() });
          setIsReportModalOpen(true);
          if (navigator.vibrate) navigator.vibrate(50);
        }, 1200);
      };
      const handleEnd = () => { if (longPressTimer.current) clearTimeout(longPressTimer.current); };

      kakao.maps.event.addListener(map, 'mousedown', handleStart);
      kakao.maps.event.addListener(map, 'touchstart', handleStart);
      kakao.maps.event.addListener(map, 'mouseup', handleEnd);
      kakao.maps.event.addListener(map, 'touchend', handleEnd);

      // [이벤트] 지도 이동 완료
      kakao.maps.event.addListener(map, 'idle', () => {
        if (onMapIdle) {
          const bounds = map.getBounds();
          const center = map.getCenter();
          onMapIdle({
            minLat: bounds.getSouthWest().getLat(), maxLat: bounds.getNorthEast().getLat(),
            minLng: bounds.getSouthWest().getLng(), maxLng: bounds.getNorthEast().getLng(),
          }, { lat: center.getLat(), lng: center.getLng() });
        }
      });
    });
  }, []);

  // 2. 외부(상위)에서 내 위치 정보가 업데이트될 때 지도 중심 이동
  useEffect(() => {
    if (mapRef.current && userLocation) {
      const { kakao } = window as any;
      const moveLatLng = new kakao.maps.LatLng(userLocation.lat, userLocation.lng);
      mapRef.current.setCenter(moveLatLng); // 처음 한 번만 중심으로 이동
    }
  }, [userLocation === null]); // userLocation이 처음 잡혔을 때만 실행

  // 3. 내 위치 전용 핀 (파란 점 + 파동 애니메이션)
  useEffect(() => {
    const { kakao } = window as any;
    if (!mapRef.current || !kakao || !userLocation) return;
    if (userMarkerRef.current) userMarkerRef.current.setMap(null);

    const content = document.createElement('div');
    content.innerHTML = `
      <div style="position: relative; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; width: 24px; height: 24px; background: #3182f6; border-radius: 50%; opacity: 0.2; animation: pulse 2s infinite;"></div>
        <div style="width: 14px; height: 14px; background: #3182f6; border: 2.5px solid white; border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>
      </div>
      <style> @keyframes pulse { 0% { transform: scale(1); opacity: 0.4; } 100% { transform: scale(2.5); opacity: 0; } } </style>
    `;

    userMarkerRef.current = new kakao.maps.CustomOverlay({
      position: new kakao.maps.LatLng(userLocation.lat, userLocation.lng),
      content: content, zIndex: 10
    });
    userMarkerRef.current.setMap(mapRef.current);
  }, [userLocation]);

  // 4. 팝업 스토어 마커 & 상세 오버레이 연동
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
          alert("승인 대기 중인 장소입니다.");
          return;
        }
        onMarkerClick(store.id);
      });
      markersRef.current.set(store.id, marker);
    });
  }, [stores, onMarkerClick]);

  // 5. 선택된 마커 위에 상세 오버레이 표시 (기능 100% 보존)
  useEffect(() => {
    const { kakao } = window as any;
    if (!mapRef.current || !selectedStoreId) return;
    if (overlayRef.current) overlayRef.current.setMap(null);

    const store = stores.find(s => s.id === selectedStoreId);
    if (!store || !store.is_verified) return;

    const content = document.createElement('div');
    content.style.cssText = 'margin-bottom: 55px; filter: drop-shadow(0 4px 12px rgba(0,0,0,0.15));';
    content.innerHTML = `
      <div style="background: white; padding: 10px 14px; border-radius: 16px; display: flex; align-items: center; gap: 10px; border: 1px solid #f2f4f6;">
        ${store.image_url ? `<img src="${store.image_url}" style="width: 40px; height: 40px; border-radius: 8px; object-fit: cover;" />` : ''}
        <div style="display: flex; flex-direction: column; text-align: left;">
          <span style="font-size: 10px; color: #6b7684;">${store.category || '팝업'}</span>
          <span style="font-size: 14px; font-weight: 700; color: #191f28;">${store.title}</span>
        </div>
      </div>
      <div style="position: absolute; bottom: -6px; left: 50%; transform: translateX(-50%) rotate(45deg); width: 12px; height: 12px; background: white;"></div>
    `;
    content.onclick = () => onDetailOpen(store);

    overlayRef.current = new kakao.maps.CustomOverlay({
      position: new kakao.maps.LatLng(store.lat, store.lng), content, yAnchor: 1.1, zIndex: 30
    });
    overlayRef.current.setMap(mapRef.current);
  }, [selectedStoreId, stores]);

  return (
    <div className="w-full h-full relative">
      <div ref={mapContainerRef} className="w-full h-full" />
      
      {/* 내 위치 버튼 */}
      <button
        onClick={() => {
          if (userLocation && mapRef.current) {
            mapRef.current.panTo(new (window as any).kakao.maps.LatLng(userLocation.lat, userLocation.lng));
          }
        }}
        className="absolute bottom-24 right-5 z-40 p-3 bg-white rounded-full shadow-2xl border border-gray-50 active:scale-90 transition-all"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="8" stroke="#3182F6" strokeWidth="2"/><circle cx="12" cy="12" r="3" fill="#3182F6"/>
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
