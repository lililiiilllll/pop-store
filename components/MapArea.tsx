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

// --- 토스 스타일의 SVG 핀 데이터 ---
const PIN_SVG = {
  // 토스 블루 포인트 핀
  verified: `data:image/svg+xml;base64,${btoa(`
    <svg width="34" height="42" viewBox="0 0 34 42" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17 0C7.61117 0 0 7.61117 0 17C0 27.2 17 42 17 42C17 42 34 27.2 34 17C34 7.61117 26.3888 0 17 0Z" fill="#3182F6"/>
      <circle cx="17" cy="17" r="7" fill="white"/>
    </svg>
  `)}`,
  // 차분한 회색 핀 (승인 전)
  unverified: `data:image/svg+xml;base64,${btoa(`
    <svg width="34" height="42" viewBox="0 0 34 42" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17 0C7.61117 0 0 7.61117 0 17C0 27.2 17 42 17 42C17 42 34 27.2 34 17C34 7.61117 26.3888 0 17 0Z" fill="#ADB5BD"/>
      <circle cx="17" cy="17" r="7" fill="white"/>
    </svg>
  `)}`,
  // 제보용 레드 핀
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
  const selectionMarkerRef = useRef<any>(null);
  const unverifiedOverlayRef = useRef<any>(null);

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

      const handleStart = (e: any) => {
        cancelLongPress();
        const latLng = e.latLng; 
        longPressTimer.current = setTimeout(() => {
          if (!latLng) return;
          setSelectedCoord({ lat: latLng.getLat(), lng: latLng.getLng() });
          setIsReportModalOpen(true);
          if (navigator.vibrate) navigator.vibrate(50);
        }, 1200); 
      };

      kakao.maps.event.addListener(map, 'mousedown', handleStart);
      kakao.maps.event.addListener(map, 'touchstart', handleStart);
      kakao.maps.event.addListener(map, 'mouseup', cancelLongPress);
      kakao.maps.event.addListener(map, 'touchend', cancelLongPress);
      kakao.maps.event.addListener(map, 'dragstart', cancelLongPress);

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
    return () => cancelLongPress();
  }, []);

  useEffect(() => {
    if (mapRef.current && mapCenter) {
      const { kakao } = window as any;
      mapRef.current.panTo(new kakao.maps.LatLng(mapCenter.lat, mapCenter.lng));
    }
  }, [mapCenter]);

  // 마커 생성 (토스 스타일 핀 적용)
  useEffect(() => {
    const { kakao } = window as any;
    if (!mapRef.current || !kakao) return;
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current.clear();

    stores.forEach((store) => {
      const isVerified = store.is_verified;
      
      const imageSize = new kakao.maps.Size(28, 35); // 적절한 핀 크기
      const imageOption = { offset: new kakao.maps.Point(14, 35) };
      
      const markerImage = new kakao.maps.MarkerImage(
        isVerified ? PIN_SVG.verified : PIN_SVG.unverified,
        imageSize,
        imageOption
      );

      const marker = new kakao.maps.Marker({
        position: new kakao.maps.LatLng(store.lat, store.lng),
        map: mapRef.current,
        title: store.title,
        image: markerImage
      });

      kakao.maps.event.addListener(marker, 'click', () => {
        if (unverifiedOverlayRef.current) unverifiedOverlayRef.current.setMap(null);

        if (!isVerified) {
          // 토스 스타일 '토스트 메시지' 느낌의 오버레이
          const content = document.createElement('div');
          content.innerHTML = `
            <div style="padding: 10px 16px; background: rgba(0, 0, 0, 0.8); color: #fff; font-size: 13px; font-weight: 500; border-radius: 12px; margin-bottom: 50px; text-align: center;">
              승인 전 팝업입니다
            </div>
          `;
          const unverifiedOverlay = new kakao.maps.CustomOverlay({
            position: marker.getPosition(),
            content: content,
            yAnchor: 1.0,
            zIndex: 40
          });
          unverifiedOverlay.setMap(mapRef.current);
          unverifiedOverlayRef.current = unverifiedOverlay;
          
          setTimeout(() => unverifiedOverlay.setMap(null), 2000);
          return;
        }

        onMarkerClick(store.id);
      });
      markersRef.current.set(store.id, marker);
    });
  }, [stores, onMarkerClick]);

  // 제보하기 시 선택된 지역에 빨간색 핀 표시
  useEffect(() => {
    const { kakao } = window as any;
    if (!mapRef.current || !kakao) return;

    if (isReportModalOpen) {
      const markerImage = new kakao.maps.MarkerImage(
        PIN_SVG.selection, 
        new kakao.maps.Size(32, 40),
        { offset: new kakao.maps.Point(16, 40) }
      );
      
      selectionMarkerRef.current = new kakao.maps.Marker({
        position: new kakao.maps.LatLng(selectedCoord.lat, selectedCoord.lng),
        map: mapRef.current,
        image: markerImage,
        zIndex: 50
      });
    } else {
      if (selectionMarkerRef.current) {
        selectionMarkerRef.current.setMap(null);
        selectionMarkerRef.current = null;
      }
    }
  }, [isReportModalOpen, selectedCoord]);

  // 상세 오버레이 (승인 완료된 경우만)
  useEffect(() => {
    const { kakao } = window as any;
    if (!mapRef.current || !kakao) return;
    if (overlayRef.current) overlayRef.current.setMap(null);
    if (!selectedStoreId) return;

    const store = stores.find(s => s.id === selectedStoreId);
    if (!store || !store.is_verified) return;

    const content = document.createElement('div');
    content.style.cssText = 'margin-bottom: 55px; filter: drop-shadow(0 4px 12px rgba(0,0,0,0.1));';
    const validImageUrl = (store.image_url && store.image_url !== "-") ? store.image_url : "";
    
    content.innerHTML = `
      <div style="background: white; padding: 12px; border-radius: 16px; display: flex; align-items: center; gap: 10px; cursor: pointer; min-width: 200px; border: 1px solid #f2f4f6;">
        ${validImageUrl ? `<div style="width: 44px; height: 44px; border-radius: 8px; overflow: hidden;"><img src="${validImageUrl}" style="width: 100%; height: 100%; object-fit: cover;" /></div>` : ''}
        <div style="display: flex; flex-direction: column;">
          <span style="font-size: 11px; color: #6b7684; font-weight: 500; margin-bottom: 2px;">${store.category || '팝업'}</span>
          <span style="font-size: 14px; font-weight: 600; color: #191f28;">${store.title}</span>
        </div>
      </div>
      <div style="position: absolute; bottom: -6px; left: 50%; transform: translateX(-50%) rotate(45deg); width: 12px; height: 12px; background: white; z-index: -1;"></div>
    `;
    
    content.onclick = (e) => { e.stopPropagation(); onDetailOpen(store); };
    overlayRef.current = new kakao.maps.CustomOverlay({
      content, position: new kakao.maps.LatLng(store.lat, store.lng), yAnchor: 1.1, zIndex: 30
    });
    overlayRef.current.setMap(mapRef.current);
  }, [selectedStoreId, stores, onDetailOpen]);

  // 내 위치 표시
  useEffect(() => {
    const { kakao } = window as any;
    if (!mapRef.current || !kakao || !userLocation) return;
    if (userMarkerRef.current) userMarkerRef.current.setMap(null);
    userMarkerRef.current = new kakao.maps.CustomOverlay({
      position: new kakao.maps.LatLng(userLocation.lat, userLocation.lng),
      content: `<div style="width: 14px; height: 14px; background: #3182f6; border: 2.5px solid white; border-radius: 50%; box-shadow: 0 0 10px rgba(49,130,246,0.5);"></div>`,
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
