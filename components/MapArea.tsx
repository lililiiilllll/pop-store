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
  const markersRef = useRef<Map<string, any>>(new Map());
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

      kakao.maps.event.addListener(map, 'click', () => {
        if (overlayRef.current) overlayRef.current.setMap(null);
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

  // 2. 중심 좌표 변경 시 이동
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

    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current.clear();

    stores.forEach((store) => {
      const latlng = new kakao.maps.LatLng(store.lat, store.lng);
      
      const marker = new kakao.maps.Marker({
        position: latlng,
        map: mapRef.current,
      });

      kakao.maps.event.addListener(marker, 'click', () => { 
        if(typeof onMarkerClick === 'function') onMarkerClick(store.id); 
      });

      markersRef.current.set(store.id, marker);
    });
  }, [stores, onMarkerClick]);

  // 4. 선택된 스토어 변경 시 "정보 집약형" 오버레이 처리 (2번째 사진 스타일)
  useEffect(() => {
    const { kakao } = window as any;
    if (!mapRef.current || !kakao) return;

    if (overlayRef.current) overlayRef.current.setMap(null);
    if (!selectedStoreId) return;

    const store = stores.find(s => s.id === selectedStoreId);
    if (!store) return;

    const latlng = new kakao.maps.LatLng(store.lat, store.lng);

    // 커스텀 엘리먼트 생성
    const container = document.createElement('div');
    container.style.cssText = 'margin-bottom: 50px; position: relative; filter: drop-shadow(0 8px 24px rgba(0,0,0,0.15)); cursor: pointer;';
    
    // 두 번째 사진과 같은 레이아웃 HTML
    container.innerHTML = `
      <div style="background: white; padding: 12px; border-radius: 24px; border: 1px solid #f0f0f0; display: flex; align-items: center; gap: 12px; min-width: 240px; max-width: 280px;">
        <div style="width: 54px; height: 54px; border-radius: 18px; overflow: hidden; background: #f8f9fa; flex-shrink: 0;">
          <img src="${store.image_url || store.imageUrl || ''}" style="width: 100%; h-eight: 100%; object-fit: cover;" />
        </div>
        
        <div style="display: flex; flex-direction: column; overflow: hidden; flex: 1;">
          <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 2px;">
            <span style="font-size: 10px; color: #adb5bd; font-weight: 600;">${store.category || '팝업'}</span>
            ${store.is_free ? '<span style="font-size: 9px; color: #2ecc71; font-weight: 700;">• 무료</span>' : ''}
            ${store.is_reservation_required ? '<span style="font-size: 9px; color: #e67e22; font-weight: 700;">• 예약필수</span>' : ''}
          </div>
          <h4 style="font-size: 15px; font-weight: 800; color: #191f28; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${store.title || store.name}
          </h4>
          <span style="font-size: 11px; color: #8b95a1; margin-top: 2px;">
            ${store.start_date ? `${store.start_date} ~ ${store.end_date}` : '기간 정보 없음'}
          </span>
        </div>
        
        <div style="padding-left: 4px;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ced4da" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
        </div>
      </div>
      <div style="position: absolute; bottom: -8px; left: 50%; transform: translateX(-50%) rotate(45deg); width: 16px; height: 16px; background: white; border-right: 1px solid #f0f0f0; border-bottom: 1px solid #f0f0f0; z-index: -1;"></div>
    `;

    container.onclick = (e) => {
      e.stopPropagation();
      onDetailOpen(store);
    };

    const overlay = new kakao.maps.CustomOverlay({
      content: container,
      position: latlng,
      yAnchor: 1.1, // 마커보다 조금 더 위에 위치
      zIndex: 30
    });

    overlay.setMap(mapRef.current);
    overlayRef.current = overlay;

  }, [selectedStoreId, stores, onDetailOpen]);

  // 5. 사용자 내 위치 마커
  useEffect(() => {
    const { kakao } = window as any;
    if (!mapRef.current || !kakao || !userLocation) return;
    if (userMarkerRef.current) userMarkerRef.current.setMap(null);

    const circle = new kakao.maps.CustomOverlay({
      position: new kakao.maps.LatLng(userLocation.lat, userLocation.lng),
      content: `<div style="width: 20px; height: 20px; background: rgba(49,130,246,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                  <div style="width: 10px; height: 10px; background: #3182f6; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 8px rgba(0,0,0,0.2);"></div>
                </div>`,
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
