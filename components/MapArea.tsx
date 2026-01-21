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
  onLongPress?: (data: any) => void;
  onOverlayClick?: (id: string) => void;
  isSelectingLocation?: boolean;
  onSelectLocation?: (data: any) => void;
}

const MapArea: React.FC<MapAreaProps> = ({ 
  stores, 
  onMarkerClick, 
  onMapClick, 
  mapCenter, 
  onMapIdle,
  userLocation,
  selectedStoreId // 선택된 스토어 강조를 위해 추가
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);

  // 1. 지도 초기화 (최초 1회)
  useEffect(() => {
    const { kakao } = window as any;
    if (!kakao || !mapContainerRef.current) return;

    kakao.maps.load(() => {
      const options = {
        center: new kakao.maps.LatLng(mapCenter?.lat || 37.5665, mapCenter?.lng || 126.9780),
        level: 3,
        draggable: true,
        scrollwheel: true
      };
      
      const map = new kakao.maps.Map(mapContainerRef.current, options);
      mapRef.current = map;

      // 지도 클릭 이벤트
      kakao.maps.event.addListener(map, 'click', onMapClick);

      // 지도 이동/확대 종료 시 이벤트 (App.tsx의 필터링과 연동)
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

  // 2. 외부에서 mapCenter가 변경될 때 지도 중심 이동
  useEffect(() => {
    if (mapRef.current && mapCenter) {
      const { kakao } = window as any;
      const newPos = new kakao.maps.LatLng(mapCenter.lat, mapCenter.lng);
      mapRef.current.panTo(newPos); // 부드럽게 이동
    }
  }, [mapCenter]);

  // 3. 상점 마커 업데이트 및 선택된 마커 강조
  useEffect(() => {
    const { kakao } = window as any;
    if (!mapRef.current || !kakao) return;

    // 기존 마커 제거
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    stores.forEach((store) => {
      const isSelected = store.id === selectedStoreId;
      
      // 마커 이미지 설정 (선택된 경우 다른 이미지나 색상 적용 가능)
      // 기본 마커를 사용하되, 선택된 경우 zIndex를 높임
      const marker = new kakao.maps.Marker({
        position: new kakao.maps.LatLng(store.lat, store.lng),
        map: mapRef.current,
        zIndex: isSelected ? 10 : 1 // 선택된 마커를 맨 위로
      });

      kakao.maps.event.addListener(marker, 'click', () => onMarkerClick(store.id));
      markersRef.current.push(marker);
    });
  }, [stores, selectedStoreId]); // selectedStoreId가 바뀔 때마다 마커 레이어 업데이트

  // 4. 내 위치 마커 표시
  useEffect(() => {
    const { kakao } = window as any;
    if (!mapRef.current || !kakao || !userLocation) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.setMap(null);
    }

    // 내 위치 마커 (파란색 원 이미지 등으로 커스텀 권장)
    const imageSize = new kakao.maps.Size(24, 24);
    const markerImage = new kakao.maps.MarkerImage(
      'https://t1.daumcdn.net/localimg/localimages/07/2012/img/marker_p.png', // 예시 파란 마커
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
    /* 모바일에서 지도가 짤리지 않도록 h-full 및 touchAction 설정 */
    <div className="w-full h-full relative overflow-hidden bg-gray-100">
      <div 
        ref={mapContainerRef} 
        className="w-full h-full absolute inset-0"
        style={{ 
          touchAction: 'pan-x pan-y', // 모바일 브라우저 기본 제스처와 지도 조작 호환
          zIndex: 1 
        }}
      />
    </div>
  );
};

export default MapArea;
