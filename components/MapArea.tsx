import React, { useEffect, useRef } from 'react';
import { PopupStore } from './types';

interface MapAreaProps {
  stores: PopupStore[];
  onMarkerClick: (id: string) => void;
  selectedStoreId: string | null;
  onMapClick: () => void;
  mapCenter?: { lat: number; lng: number };
  userLocation: { lat: number; lng: number } | null;
  onMapIdle?: (bounds: any, center: { lat: number; lng: number }) => void;
  onDetailOpen: (store: PopupStore) => void;
}

const MapArea: React.FC<MapAreaProps> = ({ 
  stores, 
  onMarkerClick, 
  onMapClick, 
  mapCenter, 
  onMapIdle,
  userLocation,
  selectedStoreId,
  onDetailOpen
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map()); // 마커 관리를 Map 객체로 변경
  const userMarkerRef = useRef<any>(null);
  const overlayRef = useRef<any>(null); 

  // 1. 지도 초기화
  useEffect(() => {
    const { kakao } = window as any;
    if (!kakao || !mapContainerRef.current) return;

    kakao.maps.load(() => {
      const initialCenter = new kakao.maps.LatLng(
        mapCenter?.lat || 37.5547, 
        mapCenter?.lng || 126.9706
      );
      
      const options = {
        center: initialCenter,
        level: 3,
      };
      
      const map = new kakao.maps.Map(mapContainerRef.current, options);
      mapRef.current = map;

      // 지도 클릭 이벤트
      kakao.maps.event.addListener(map, 'click', () => {
        if (overlayRef.current) overlayRef.current.setMap(null);
        onMapClick();
      });

      // 지도 이동 완료(idle) 이벤트
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

  // 2. 중심 좌표 변경 시 부드러운 이동 (검색 결과 반영)
  useEffect(() => {
    if (mapRef.current && mapCenter) {
      const { kakao } = window as any;
      const newPos = new kakao.maps.LatLng(mapCenter.lat, mapCenter.lng);
      mapRef.current.panTo(newPos);
    }
  }, [mapCenter]);

  // 3. 마커 생성 및 관리
  useEffect(() => {
    const { kakao } = window as any;
    if (!mapRef.current || !kakao) return;

    // 기존 마커 전체 제거
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current.clear();

    stores.forEach((store) => {
      const latlng = new kakao.maps.LatLng(store.lat, store.lng);
      
      const marker = new kakao.maps.Marker({
        position: latlng,
        map: mapRef.current,
        title: store.name
      });

      kakao.maps.event.addListener(marker, 'click', () => { if(typeof onMarkerClick === 'function') onMarkerClick(store.id); });
      });

      markersRef.current.set(store.id, marker);
    });
  }, [stores]);

  // 4. 선택된 스토어 변경 시 오버레이 처리 (중요: 검색 결과 클릭 시 호출됨)
  useEffect(() => {
    const { kakao } = window as any;
    if (!mapRef.current || !kakao || !selectedStoreId) {
      if (overlayRef.current) overlayRef.current.setMap(null);
      return;
    }

    const store = stores.find(s => s.id === selectedStoreId);
    if (!store) return;

    // 기존 오버레이 제거
    if (overlayRef.current) overlayRef.current.setMap(null);

    const latlng = new kakao.maps.LatLng(store.lat, store.lng);

    // 커스텀 오버레이 엘리먼트 생성
    const content = document.createElement('div');
    content.className = "custom-overlay-container";
    content.innerHTML = `
      <div style="margin-bottom: 45px; filter: drop-shadow(0 4px 12px rgba(0,0,0,0.15));">
        <div style="background: white; padding: 12px 16px; border-radius: 20px; border: 1px solid #f0f0f0; display: flex; items-center; gap: 10px; cursor: pointer; min-width: 140px;">
          <div style="display: flex; flex-direction: column;">
            <span style="font-size: 10px; color: #3182f6; font-weight: 800; margin-bottom: 2px;">상세보기</span>
            <span style="font-size: 14px; font-weight: 700; color: #191f28; white-space: nowrap;">${store.name}</span>
          </div>
          <div style="display: flex; align-items: center; margin-left: auto;">
             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#adb5bd" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          </div>
        </div>
        <div style="position: absolute; bottom: -6px; left: 50%; transform: translateX(-50%) rotate(45deg); width: 12px; height: 12px; background: white; border-right: 1px solid #f0f0f0; border-bottom: 1px solid #f0f0f0;"></div>
      </div>
    `;

    content.onclick = (e) => {
      e.stopPropagation();
      onDetailOpen(store);
    };

    const overlay = new kakao.maps.CustomOverlay({
      content: content,
      position: latlng,
      yAnchor: 1,
      zIndex: 30
    });

    overlay.setMap(mapRef.current);
    overlayRef.current = overlay;

  }, [selectedStoreId, stores]);

  // 5. 사용자 내 위치 마커
  useEffect(() => {
    const { kakao } = window as any;
    if (!mapRef.current || !kakao || !userLocation) return;
    if (userMarkerRef.current) userMarkerRef.current.setMap(null);

    const circle = new kakao.maps.CustomOverlay({
      position: new kakao.maps.LatLng(userLocation.lat, userLocation.lng),
      content: `<div style="width: 16px; height: 16px; background: #3182f6; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 10px rgba(49,130,246,0.5);"></div>`,
      zIndex: 10
    });

    circle.setMap(mapRef.current);
    userMarkerRef.current = circle;
  }, [userLocation]);

  return (
    <div className="w-full h-full relative bg-gray-50">
      <div 
        ref={mapContainerRef} 
        className="w-full h-full absolute inset-0"
        style={{ touchAction: 'pan-x pan-y' }}
      />
    </div>
  );
};

export default MapArea;
