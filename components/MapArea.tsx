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

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedCoord, setSelectedCoord] = useState({ lat: 0, lng: 0 });
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isDragging = useRef(false);

  // 1. 지도 초기화 (최초 1회만 실행)
  useEffect(() => {
    const { kakao } = window as any;
    if (!kakao || !mapContainerRef.current) return;

    kakao.maps.load(() => {
      const initialCenter = new kakao.maps.LatLng(mapCenter?.lat || 37.5547, mapCenter?.lng || 126.9706);
      const options = { center: initialCenter, level: 3 };
      const map = new kakao.maps.Map(mapContainerRef.current, options);
      mapRef.current = map;

      // [기존] 클릭 및 아이들 이벤트 유지
      kakao.maps.event.addListener(map, 'click', () => {
        if (overlayRef.current) overlayRef.current.setMap(null);
        onMapClick();
      });

      kakao.maps.event.addListener(map, 'dragstart', () => { isDragging.current = true; cancelLongPress(); });
      kakao.maps.event.addListener(map, 'dragend', () => { isDragging.current = false; });

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

  // --- [핵심] 롱프레스 로직: 카카오맵 API가 아닌 DOM 레벨에서 직접 관리 ---
  const startLongPress = (e: React.MouseEvent | React.TouchEvent) => {
    cancelLongPress();
    isDragging.current = false;

    longPressTimer.current = setTimeout(() => {
      if (isDragging.current || !mapRef.current) return;

      // 롱프레스 시점의 지점 좌표를 카카오맵 좌표로 변환
      const proj = mapRef.current.getProjection();
      
      // 마우스/터치 위치 계산
      let clientX, clientY;
      if ('touches' in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      const rect = mapContainerRef.current?.getBoundingClientRect();
      if (rect) {
        const point = new (window as any).kakao.maps.Point(clientX - rect.left, clientY - rect.top);
        const latlng = proj.fromContainerPointToLatLng(point);
        
        setSelectedCoord({ lat: latlng.getLat(), lng: latlng.getLng() });
        setIsReportModalOpen(true);
        if (navigator.vibrate) navigator.vibrate(50);
      }
    }, 1500);
  };

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // 2. 나머지 기능들 (중심이동, 마커, 오버레이, 내위치) - 기존 코드와 동일하게 유지
  useEffect(() => {
    if (mapRef.current && mapCenter) {
      const { kakao } = window as any;
      mapRef.current.panTo(new kakao.maps.LatLng(mapCenter.lat, mapCenter.lng));
    }
  }, [mapCenter]);

  useEffect(() => {
    const { kakao } = window as any;
    if (!mapRef.current || !kakao) return;
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current.clear();
    stores.forEach((store) => {
      const marker = new kakao.maps.Marker({
        position: new kakao.maps.LatLng(store.lat, store.lng),
        map: mapRef.current,
        title: store.title
      });
      kakao.maps.event.addListener(marker, 'click', () => onMarkerClick(store.id));
      markersRef.current.set(store.id, marker);
    });
  }, [stores, onMarkerClick]);

  useEffect(() => {
    const { kakao } = window as any;
    if (!mapRef.current || !kakao) return;
    if (overlayRef.current) overlayRef.current.setMap(null);
    if (!selectedStoreId) return;
    const store = stores.find(s => s.id === selectedStoreId);
    if (!store) return;

    const content = document.createElement('div');
    content.style.cssText = 'margin-bottom: 50px; filter: drop-shadow(0 8px 20px rgba(0,0,0,0.15)); pointer-events: auto;';
    const validImageUrl = (store.image_url && store.image_url !== "-") ? store.image_url : "";
    content.innerHTML = `
      <div style="background: white; padding: 10px 14px; border-radius: 20px; border: 1px solid #f0f0f0; display: flex; align-items: center; gap: 12px; cursor: pointer; min-width: 220px;">
        ${validImageUrl ? `<div style="width: 48px; height: 48px; border-radius: 12px; overflow: hidden; flex-shrink: 0;"><img src="${validImageUrl}" style="width: 100%; height: 100%; object-fit: cover;" /></div>` : ''}
        <div style="display: flex; flex-direction: column; overflow: hidden; flex: 1;">
          <div style="display: flex; gap: 4px;"><span style="font-size: 10px; color: #3182f6; font-weight: 800;">${store.category}</span></div>
          <span style="font-size: 14px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${store.title}</span>
        </div>
      </div>
    `;
    content.onclick = (e) => { e.stopPropagation(); onDetailOpen(store); };
    overlayRef.current = new kakao.maps.CustomOverlay({ content, position: new kakao.maps.LatLng(store.lat, store.lng), yAnchor: 1.1, zIndex: 30 });
    overlayRef.current.setMap(mapRef.current);
  }, [selectedStoreId, stores, onDetailOpen]);

  useEffect(() => {
    const { kakao } = window as any;
    if (!mapRef.current || !kakao || !userLocation) return;
    if (userMarkerRef.current) userMarkerRef.current.setMap(null);
    userMarkerRef.current = new kakao.maps.CustomOverlay({
      position: new kakao.maps.LatLng(userLocation.lat, userLocation.lng),
      content: `<div style="width: 16px; height: 16px; background: #3182f6; border: 3px solid white; border-radius: 50%;"></div>`,
      zIndex: 10
    });
    userMarkerRef.current.setMap(mapRef.current);
  }, [userLocation]);

  return (
    <div className="w-full h-full relative overflow-hidden bg-gray-50">
      <div 
        ref={mapContainerRef} 
        className="w-full h-full absolute inset-0"
        onMouseDown={startLongPress}
        onMouseUp={cancelLongPress}
        onMouseLeave={cancelLongPress}
        onTouchStart={startLongPress}
        onTouchEnd={cancelLongPress}
        style={{ cursor: 'crosshair' }}
      />
      
      {/* z-index를 최상위로 올리고 고정 위치로 표시 */}
      {isReportModalOpen && (
        <div className="fixed inset-0" style={{ zIndex: 999999 }}>
          <ReportModal 
            coord={selectedCoord} 
            onClose={() => setIsReportModalOpen(false)} 
          />
        </div>
      )}
    </div>
  );
};

export default MapArea;
