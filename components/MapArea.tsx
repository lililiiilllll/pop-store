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
}

const MapArea: React.FC<MapAreaProps> = ({ 
  stores, 
  onMarkerClick, 
  onMapClick, 
  mapCenter, 
  onMapIdle,
  userLocation,
  selectedStoreId 
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
      };
      
      const map = new kakao.maps.Map(mapContainerRef.current, options);
      
      // 모바일 드래그 및 확대 축소 명시적 활성화
      map.setDraggable(true); 
      map.setZoomable(true);
      
      mapRef.current = map;

      // [추가] 모바일에서 지도가 잘리거나 안 움직이는 현상 방지
      setTimeout(() => {
        map.relayout();
      }, 100);

      kakao.maps.event.addListener(map, 'click', onMapClick);

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
  }, []); // 초기화는 1회만

  // 2. 중심 좌표 변경 시 부드럽게 이동
  useEffect(() => {
    if (mapRef.current && mapCenter) {
      const { kakao } = window as any;
      const newPos = new kakao.maps.LatLng(mapCenter.lat, mapCenter.lng);
      mapRef.current.panTo(newPos);
    }
  }, [mapCenter]);

  // 3. 마커 업데이트 (stores가 바뀔 때만 실행)
  useEffect(() => {
    const { kakao } = window as any;
    if (!mapRef.current || !kakao) return;

    // 기존 마커 삭제
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    stores.forEach((store) => {
      const isSelected = store.id === selectedStoreId;
      const marker = new kakao.maps.Marker({
        position: new kakao.maps.LatLng(store.lat, store.lng),
        map: mapRef.current,
        zIndex: isSelected ? 10 : 1 
      });

      kakao.maps.event.addListener(marker, 'click', () => onMarkerClick(store.id));
      markersRef.current.push(marker);
    });
  }, [stores, selectedStoreId]);

  // 4. 내 위치 마커 업데이트
  useEffect(() => {
    const { kakao } = window as any;
    if (!mapRef.current || !kakao || !userLocation) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.setMap(null);
    }

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
        style={{ 
          /* pointer-events를 auto로 명시하여 터치 이벤트를 지도가 가로채도록 함 */
          touchAction: 'auto', 
          zIndex: 0 
        }}
      />
    </div>
  );
};

export default MapArea;
