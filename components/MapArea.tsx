import React, { useEffect, useRef, useState } from 'react';
import { PopupStore } from './types';
import ReportModal from './ReportModal'; // 제보 모달 컴포넌트 (앞서 제공해드린 파일)

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

  // --- 롱프레스 관련 상태 및 Ref ---
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedCoord, setSelectedCoord] = useState({ lat: 0, lng: 0 });
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  // 롱프레스 시작 함수
  const startLongPress = (lat: number, lng: number) => {
    longPressTimer.current = setTimeout(() => {
      setSelectedCoord({ lat, lng });
      setIsReportModalOpen(true);
      if (navigator.vibrate) navigator.vibrate(50); // 햅틱 피드백
    }, 1500); // 1.5초
  };

  // 롱프레스 취소 함수
  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  // 1. 지도 초기화 및 이벤트 등록
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

      // [기존] 지도 클릭 이벤트
      kakao.maps.event.addListener(map, 'click', () => {
        if (overlayRef.current) overlayRef.current.setMap(null);
        onMapClick();
      });

      // [신규] 롱프레스 구현: mousedown / touchstart 감지
      // 카카오맵 객체 자체에 이벤트를 걸어야 좌표(latLng)를 정확히 가져옵니다.
      kakao.maps.event.addListener(map, 'mousedown', (e: any) => {
        startLongPress(e.latLng.getLat(), e.latLng.getLng());
      });

      kakao.maps.event.addListener(map, 'mouseup', cancelLongPress);
      kakao.maps.event.addListener(map, 'dragstart', cancelLongPress); // 드래그 시 취소

      // 모바일 대응
      kakao.maps.event.addListener(map, 'touchstart', (e: any) => {
        startLongPress(e.latLng.getLat(), e.latLng.getLng());
      });
      kakao.maps.event.addListener(map, 'touchend', cancelLongPress);

      // [기존] idle 이벤트
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

    return () => cancelLongPress(); // 언마운트 시 타이머 정리
  }, []);

  // 2. 중심 좌표 변경 시 이동 (유지)
  useEffect(() => {
    if (mapRef.current && mapCenter) {
      const { kakao } = window as any;
      const newPos = new kakao.maps.LatLng(mapCenter.lat, mapCenter.lng);
      mapRef.current.panTo(newPos);
    }
  }, [mapCenter]);

  // 3. 마커 생성 및 관리 (유지)
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
        title: store.title || store.name
      });

      kakao.maps.event.addListener(marker, 'click', () => { 
        if(typeof onMarkerClick === 'function') onMarkerClick(store.id); 
      });

      markersRef.current.set(store.id, marker);
    });
  }, [stores, onMarkerClick]);

  // 4. 선택된 스토어 변경 시 오버레이 (유지)
  useEffect(() => {
    const { kakao } = window as any;
    if (!mapRef.current || !kakao) return;

    if (overlayRef.current) overlayRef.current.setMap(null);
    if (!selectedStoreId) return;

    const store = stores.find(s => s.id === selectedStoreId);
    if (!store) return;

    const latlng = new kakao.maps.LatLng(store.lat, store.lng);
    const validImageUrl = (store.image_url && store.image_url !== "-") ? store.image_url : "";

    const content = document.createElement('div');
    content.style.cssText = 'margin-bottom: 50px; filter: drop-shadow(0 8px 20px rgba(0,0,0,0.15));';
    
    content.innerHTML = `
      <div style="background: white; padding: 10px 14px; border-radius: 20px; border: 1px solid #f0f0f0; display: flex; align-items: center; gap: 12px; cursor: pointer; min-width: 220px; max-width: 260px;">
        ${validImageUrl ? `
          <div style="width: 48px; height: 48px; border-radius: 12px; overflow: hidden; flex-shrink: 0; background: #eee;">
            <img src="${validImageUrl}" style="width: 100%; height: 100%; object-fit: cover;" />
          </div>
        ` : ''}
        <div style="display: flex; flex-direction: column; text-align: left; overflow: hidden; flex: 1;">
          <div style="display: flex; gap: 4px; margin-bottom: 2px;">
             <span style="font-size: 10px; color: #3182f6; font-weight: 800;">${store.category || '팝업'}</span>
             ${store.is_free ? '<span style="font-size: 10px; color: #2ecc71; font-weight: 800;">· 무료</span>' : ''}
          </div>
          <span style="font-size: 14px; font-weight: 700; color: #191f28; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${store.title || store.name || '이름 없음'}
          </span>
          <span style="font-size: 11px; color: #8b95a1; margin-top: 1px;">
            ${store.start_date ? `${store.start_date.slice(5)} ~ ${store.end_date?.slice(5)}` : '기간 정보 없음'}
          </span>
        </div>
        <div style="display: flex; align-items: center; margin-left: 4px;">
           <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ced4da" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
        </div>
      </div>
      <div style="position: absolute; bottom: -8px; left: 50%; transform: translateX(-50%) rotate(45deg); width: 16px; height: 16px; background: white; border-right: 1px solid #f0f0f0; border-bottom: 1px solid #f0f0f0; z-index: -1;"></div>
    `;

    content.onclick = (e) => {
      e.stopPropagation();
      onDetailOpen(store);
    };

    const overlay = new kakao.maps.CustomOverlay({
      content: content,
      position: latlng,
      yAnchor: 1.1,
      zIndex: 30
    });

    overlay.setMap(mapRef.current);
    overlayRef.current = overlay;

  }, [selectedStoreId, stores, onDetailOpen]);

  // 5. 사용자 내 위치 마커 (유지)
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
      
      {/* 제보하기 모달 추가 */}
      {isReportModalOpen && (
        <ReportModal 
          coord={selectedCoord} 
          onClose={() => setIsReportModalOpen(false)} 
        />
      )}
    </div>
  );
};

export default MapArea;
