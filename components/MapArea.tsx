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
  
  // --- [추가] 기능 구현을 위한 새로운 Ref ---
  const selectionMarkerRef = useRef<any>(null); // 제보 시 위치 표시용 핀
  const unverifiedOverlayRef = useRef<any>(null); // "승인 전" 안내창 전용

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedCoord, setSelectedCoord] = useState({ lat: 0, lng: 0 });
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  // --- [추가] 마커 이미지 경로 설정 (어두운 색 핀 등) ---
  const MARKER_IMAGES = {
    verified: 'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png', // 승인됨
    unverified: 'https://cdn-icons-png.flaticon.com/512/3595/3595490.png', // 승인 전 (어두운 색/회색 핀)
    selection: 'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/marker_red.png' // 제보 선택 위치
  };

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
        // [추가] 지도 클릭 시 승인 전 안내 오버레이도 닫기
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

  // --- [수정] 마커 생성 로직 (어두운 핀 & 승인 전 처리 반영) ---
  useEffect(() => {
    const { kakao } = window as any;
    if (!mapRef.current || !kakao) return;
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current.clear();

    stores.forEach((store) => {
      // 1. 승인 여부에 따른 마커 이미지 설정
      const imageSize = store.is_verified ? new kakao.maps.Size(24, 35) : new kakao.maps.Size(30, 30);
      const markerImage = new kakao.maps.MarkerImage(
        store.is_verified ? MARKER_IMAGES.verified : MARKER_IMAGES.unverified,
        imageSize
      );

      const marker = new kakao.maps.Marker({
        position: new kakao.maps.LatLng(store.lat, store.lng),
        map: mapRef.current,
        title: store.title,
        image: markerImage // 이미지 적용
      });

      // 2. 마커 클릭 이벤트 분기
      kakao.maps.event.addListener(marker, 'click', () => {
        if (!store.is_verified) {
          // 승인 전: 안내 메시지만 표시하고 상세 페이지 차단
          if (unverifiedOverlayRef.current) unverifiedOverlayRef.current.setMap(null);
          
          const content = document.createElement('div');
          content.innerHTML = `
            <div style="padding: 8px 12px; background: #222; color: #fff; font-size: 12px; font-weight: bold; border-radius: 10px; margin-bottom: 40px; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">
              승인 전 팝업입니다
            </div>
          `;
          
          const unvOverlay = new kakao.maps.CustomOverlay({
            position: marker.getPosition(),
            content: content,
            yAnchor: 1.0,
            zIndex: 40
          });
          unvOverlay.setMap(mapRef.current);
          unverifiedOverlayRef.current = unvOverlay;
          
          // 2초 후 안내 메시지 자동 삭제
          setTimeout(() => unvOverlay.setMap(null), 2000);
          return; // 여기서 함수를 끝내서 onMarkerClick이 호출되지 않게 함
        }

        // 승인 완료: 기존 상세 페이지 열기 로직
        onMarkerClick(store.id);
      });
      markersRef.current.set(store.id, marker);
    });
  }, [stores, onMarkerClick]);

  // --- [추가] 제보 모달이 열릴 때 선택한 위치에 핀 표시 ---
  useEffect(() => {
    const { kakao } = window as any;
    if (!mapRef.current || !kakao) return;

    if (isReportModalOpen) {
      // 제보 중일 때만 핀 생성
      selectionMarkerRef.current = new kakao.maps.Marker({
        position: new kakao.maps.LatLng(selectedCoord.lat, selectedCoord.lng),
        map: mapRef.current,
        image: new kakao.maps.MarkerImage(MARKER_IMAGES.selection, new kakao.maps.Size(32, 34)),
        zIndex: 50
      });
    } else {
      // 모달 닫히면 핀 제거
      if (selectionMarkerRef.current) {
        selectionMarkerRef.current.setMap(null);
        selectionMarkerRef.current = null;
      }
    }
  }, [isReportModalOpen, selectedCoord]);

  // 오버레이 (상세 팝업 - 승인된 것만 표시)
  useEffect(() => {
    const { kakao } = window as any;
    if (!mapRef.current || !kakao) return;
    if (overlayRef.current) overlayRef.current.setMap(null);
    if (!selectedStoreId) return;

    const store = stores.find(s => s.id === selectedStoreId);
    // [보안] 승인되지 않은 스토어라면 상세 오버레이를 생성하지 않음
    if (!store || !store.is_verified) return;

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

  // 내 위치 (기존 유지)
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
