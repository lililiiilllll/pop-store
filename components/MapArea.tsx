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
  onDetailOpen: (store: PopupStore) => void; // 상세 페이지 연결을 위한 프롭 추가
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
  const markersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);
  const overlayRef = useRef<any>(null); // 현재 열려있는 커스텀 오버레이 관리

  // 1. 지도 초기화
  useEffect(() => {
    const { kakao } = window as any;
    if (!kakao || !mapContainerRef.current) return;

    kakao.maps.load(() => {
      const options = {
        center: new kakao.maps.LatLng(mapCenter?.lat || 37.5665, mapCenter?.lng || 126.9780),
        level: 3,
      };
      
      const map = new kakao.maps.Map(mapContainerRef.current, options);
      map.setDraggable(true); 
      map.setZoomable(true);
      mapRef.current = map;

      setTimeout(() => map.relayout(), 100);

      kakao.maps.event.addListener(map, 'click', () => {
        if (overlayRef.current) overlayRef.current.setMap(null); // 지도 클릭 시 오버레이 닫기
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

  // 3. 마커 및 커스텀 오버레이 업데이트
  useEffect(() => {
    const { kakao } = window as any;
    if (!mapRef.current || !kakao) return;

    // 기존 마커 제거
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    stores.forEach((store) => {
      const latlng = new kakao.maps.LatLng(store.lat, store.lng);
      const isSelected = store.id === selectedStoreId;
      
      const marker = new kakao.maps.Marker({
        position: latlng,
        map: mapRef.current,
        zIndex: isSelected ? 10 : 1 
      });

      // [지도 핀 기능 1 & 2 구현]
      kakao.maps.event.addListener(marker, 'click', () => {
        onMarkerClick(store.id);

        // 기존 오버레이 제거
        if (overlayRef.current) overlayRef.current.setMap(null);

        // 커스텀 오버레이 생성 (HTML 문자열 방식)
        const content = document.createElement('div');
        content.className = "relative mb-10 group";
        content.innerHTML = `
          <div class="bg-white px-4 py-2 rounded-2xl shadow-xl border border-gray-100 flex items-center gap-2 min-w-[120px] active:scale-95 transition-transform cursor-pointer">
            <div class="flex flex-col">
              <span class="text-[11px] text-tossBlue font-bold leading-none mb-1">상세보기</span>
              <span class="text-sm font-bold text-gray-900 truncate max-w-[150px]">${store.name}</span>
            </div>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="text-gray-400"><path d="M9 18l6-6-6-6"/></svg>
          </div>
          <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rotate-45 border-r border-b border-gray-100"></div>
        `;

        // 안내 메시지 클릭 시 상세페이지 노출
        content.onclick = (e) => {
          e.stopPropagation();
          onDetailOpen(store); 
        };

        const overlay = new kakao.maps.CustomOverlay({
          content: content,
          position: latlng,
          yAnchor: 1.2,
          zIndex: 20
        });

        overlay.setMap(mapRef.current);
        overlayRef.current = overlay;
      });

      markersRef.current.push(marker);
    });
  }, [stores, selectedStoreId]);

  // 4. 내 위치 마커
  useEffect(() => {
    const { kakao } = window as any;
    if (!mapRef.current || !kakao || !userLocation) return;
    if (userMarkerRef.current) userMarkerRef.current.setMap(null);

    const imageSize = new kakao.maps.Size(24, 24);
    const markerImage = new kakao.maps.MarkerImage(
      'https://t1.daumcdn.net/localimg/localimages/07/2012/img/marker_p.png',
      imageSize
    );

    const marker = new kakao.maps.Marker({
      position: new kakao.maps.LatLng(userLocation.lat, userLocation.lng),
      map: mapRef.current,
      image: markerImage
    });
    userMarkerRef.current = marker;
  }, [userLocation]);

  return (
    <div className="w-full h-full relative overflow-hidden bg-gray-100">
      <div 
        ref={mapContainerRef} 
        className="w-full h-full absolute inset-0"
        style={{ touchAction: 'auto', zIndex: 0 }}
      />
    </div>
  );
};

export default MapArea;
