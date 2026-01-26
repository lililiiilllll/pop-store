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

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  useEffect(() => {
    const { kakao } = window as any;
    if (!kakao || !mapContainerRef.current) return;

    kakao.maps.load(() => {
      const initialCenter = new kakao.maps.LatLng(
        mapCenter?.lat || 37.5547, 
        mapCenter?.lng || 126.9706
      );
      
      const options = { center: initialCenter, level: 3 };
      const map = new kakao.maps.Map(mapContainerRef.current, options);
      mapRef.current = map;

      // --- [수정된 롱프레스: 기능은 같고 방식만 안전하게] ---
      const handleStart = (e: any) => {
        cancelLongPress();
        const latLng = e.latLng; 
        longPressTimer.current = setTimeout(() => {
          if (!latLng) return;
          setSelectedCoord({ lat: latLng.getLat(), lng: latLng.getLng() });
          setIsReportModalOpen(true);
          if (navigator.vibrate) navigator.vibrate(50);
        }, 1200); // 1.2초
      };

      kakao.maps.event.addListener(map, 'mousedown', handleStart);
      kakao.maps.event.addListener(map, 'touchstart', handleStart);
      kakao.maps.event.addListener(map, 'mouseup', cancelLongPress);
      kakao.maps.event.addListener(map, 'touchend', cancelLongPress);
      kakao.maps.event.addListener(map, 'dragstart', cancelLongPress);

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
    return () => cancelLongPress();
  }, []);

  // 중심 이동
  useEffect(() => {
    if (mapRef.current && mapCenter) {
      const { kakao } = window as any;
      mapRef.current.panTo(new kakao.maps.LatLng(mapCenter.lat, mapCenter.lng));
    }
  }, [mapCenter]);

  // 마커 생성
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

  // 오버레이 (상세 팝업)
  useEffect(() => {
    const { kakao } = window as any;
    if (!mapRef.current || !kakao) return;
    if (overlayRef.current) overlayRef.current.setMap(null);
    if (!selectedStoreId) return;

    const store = stores.find(s => s.id === selectedStoreId);
    if (!store) return;

    const content = document.createElement('div');
    content.style.cssText = 'margin-bottom: 50px; filter: drop-shadow(0 8px 20px rgba(0,0,0,0.15));';
    const validImageUrl = (store.image_url && store.image_url !== "-") ? store.image_url : "";
    
    content.innerHTML = `
      <div style="background: white; padding: 10px 14px; border-radius: 20px; border: 1px solid #f0f0f0; display: flex; align-items: center; gap: 12px; cursor: pointer; min-width: 220px; max-width: 260px;">
        ${validImageUrl ? `<div style="width: 48px; height: 48px; border-radius: 12px; overflow: hidden; flex-shrink: 0;"><img src="${validImageUrl}" style="width: 100%; height: 100%; object-fit: cover;" /></div>` : ''}
        <div style="display: flex; flex-direction: column; overflow: hidden; flex: 1;">
          <div style="display: flex; gap: 4px; margin-bottom: 2px;">
             <span style="font-size: 10px; color: #3182f6; font-weight: 800;">${store.category || '팝업'}</span>
          </div>
          <span style="font-size: 14px; font-weight: 700; color: #191f28; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${store.title}</span>
        </div>
      </div>
      <div style="position: absolute; bottom: -8px; left: 50%; transform: translateX(-50%) rotate(45deg); width: 16px; height: 16px; background: white; border-right: 1px solid #f0f0f0; border-bottom: 1px solid #f0f0f0; z-index: -1;"></div>
    `;
    
    content.onclick = (e) => { e.stopPropagation(); onDetailOpen(store); };
    overlayRef.current = new kakao.maps.CustomOverlay({
      content, position: new kakao.maps.LatLng(store.lat, store.lng), yAnchor: 1.1, zIndex: 30
    });
    overlayRef.current.setMap(mapRef.current);
  }, [selectedStoreId, stores, onDetailOpen]);

  // 내 위치
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
      <div ref={mapContainerRef} className="w-full h-full absolute inset-0" />
      {isReportModalOpen && (
        <div className="fixed inset-0" style={{ zIndex: 999999 }}>
          <ReportModal coord={selectedCoord} onClose={() => setIsReportModalOpen(false)} />
        </div>
      )}
    </div>
  );
};

export default MapArea;
