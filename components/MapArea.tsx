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
  
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedCoord, setSelectedCoord] = useState({ lat: 0, lng: 0 });
  const longPressTimer = useRef<any>(null);

  // [중요] 1. 앱 시작 시 내 위치를 감지하고 지도를 그 위치에서 생성
  useEffect(() => {
    const { kakao } = window as any;
    if (!kakao || !mapContainerRef.current) return;

    const startApp = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            // 상위 컴포넌트의 setUserLocation이 함수인지 확인 후 호출 (에러 방지)
            if (typeof setUserLocation === 'function') {
              setUserLocation(coords);
            }
            initMap(coords.lat, coords.lng);
          },
          () => initMap(37.5665, 126.9780) // 실패 시 서울시청
        );
      } else {
        initMap(37.5665, 126.9780);
      }
    };

    const initMap = (lat: number, lng: number) => {
      kakao.maps.load(() => {
        const options = { center: new kakao.maps.LatLng(lat, lng), level: 3 };
        const map = new kakao.maps.Map(mapContainerRef.current, options);
        mapRef.current = map;

        // 지도 이벤트 등록
        kakao.maps.event.addListener(map, 'click', () => {
          if (overlayRef.current) overlayRef.current.setMap(null);
          onMapClick();
        });

        // 롱프레스 (제보)
        const handleStart = (e: any) => {
          longPressTimer.current = setTimeout(() => {
            setSelectedCoord({ lat: e.latLng.getLat(), lng: e.latLng.getLng() });
            setIsReportModalOpen(true);
            if (navigator.vibrate) navigator.vibrate(50);
          }, 800);
        };
        const handleEnd = () => clearTimeout(longPressTimer.current);

        kakao.maps.event.addListener(map, 'mousedown', handleStart);
        kakao.maps.event.addListener(map, 'mouseup', handleEnd);
        kakao.maps.event.addListener(map, 'touchstart', handleStart);
        kakao.maps.event.addListener(map, 'touchend', handleEnd);

        // 지도 이동 완료 후 상위로 전달
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

    startApp();
  }, []);

  // 2. 내 위치 핀 (토글/핀 형식 강조)
  useEffect(() => {
    const { kakao } = window as any;
    if (!mapRef.current || !userLocation || !kakao) return;
    if (userMarkerRef.current) userMarkerRef.current.setMap(null);

    const content = document.createElement('div');
    content.innerHTML = `
      <div style="position: relative; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; width: 30px; height: 30px; background: #3182f6; border-radius: 50%; opacity: 0.2; animation: pulse 2s infinite;"></div>
        <div style="width: 14px; height: 14px; background: #3182f6; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>
      </div>
      <style> @keyframes pulse { 0% { transform: scale(0.5); opacity: 0.5; } 100% { transform: scale(2.2); opacity: 0; } } </style>
    `;

    userMarkerRef.current = new kakao.maps.CustomOverlay({
      position: new kakao.maps.LatLng(userLocation.lat, userLocation.lng),
      content: content, zIndex: 10
    });
    userMarkerRef.current.setMap(mapRef.current);
  }, [userLocation]);

  // 3. 마커 업데이트 (원본 기능 100% 유지)
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

  return (
    <div className="w-full h-full relative">
      <div ref={mapContainerRef} className="w-full h-full absolute inset-0" />
      
      {/* 내 위치 이동 버튼 */}
      <button
        onClick={() => {
          if (userLocation && mapRef.current) {
            mapRef.current.panTo(new (window as any).kakao.maps.LatLng(userLocation.lat, userLocation.lng));
          }
        }}
        className="absolute bottom-28 right-5 z-40 w-12 h-12 bg-white rounded-full shadow-2xl flex items-center justify-center border border-gray-100"
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
