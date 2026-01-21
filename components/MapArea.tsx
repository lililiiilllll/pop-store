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
  userLocation 
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
        draggable: true, // 명시적으로 이동 가능 설정
        scrollwheel: true // 확대/축소 가능 설정
      };
      
      const map = new kakao.maps.Map(mapContainerRef.current, options);
      mapRef.current = map;

      // 지도 클릭 이벤트
      kakao.maps.event.addListener(map, 'click', onMapClick);

      // 지도 이동/확대 종료 시 이벤트
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

  // 3. 상점 마커 업데이트
  useEffect(() => {
    const { kakao } = window as any;
    if (!mapRef.current || !kakao) return;

    // 기존 마커 제거
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    stores.forEach((store) => {
      const marker = new kakao.maps.Marker({
        position: new kakao.maps.LatLng(store.lat, store.lng),
        map: mapRef.current
      });

      kakao.maps.event.addListener(marker, 'click', () => onMarkerClick(store.id));
      markersRef.current.push(marker);
    });
  }, [stores]);

  // 4. 내 위치 마커 표시
  useEffect(() => {
    const { kakao } = window as any;
    if (!mapRef.current || !kakao || !userLocation) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.setMap(null);
    }

    // 내 위치는 별도의 파란색 마커나 커스텀 오버레이로 표현 가능 (여기선 기본 마커)
    const marker = new kakao.maps.Marker({
      position: new kakao.maps.LatLng(userLocation.lat, userLocation.lng),
      map: mapRef.current,
      // 내 위치용 별도 이미지가 있다면 여기에 추가
    });
    userMarkerRef.current = marker;
  }, [userLocation]);

  return (
    /* 터치 이벤트가 자식 요소인 지도에 잘 전달되도록 h-full 사용 */
    <div className="w-full h-full relative overflow-hidden bg-gray-100">
      <div 
        ref={mapContainerRef} 
        className="w-full h-full"
        style={{ touchAction: 'auto' }} // 모바일 터치 조작 허용
      />
    </div>
  );
};

export default MapArea;
