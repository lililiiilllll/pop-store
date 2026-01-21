import React, { useEffect, useRef } from 'react';
import { PopupStore } from '../types';

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
  selectedStoreId,
  onMapClick,
  mapCenter,
  userLocation,
  onMapIdle
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // 카카오 지도 라이브러리 로드 확인
    const { kakao } = window as any;
    
    kakao.maps.load(() => {
      const options = {
        center: new kakao.maps.LatLng(
          mapCenter?.lat || 37.5665,
          mapCenter?.lng || 126.9780
        ),
        level: 3
      };

      // 지도 생성
      const map = new kakao.maps.Map(mapContainerRef.current, options);
      mapRef.current = map;

      // 지도 클릭 이벤트
      kakao.maps.event.addListener(map, 'click', () => {
        onMapClick();
      });

      // 지도 이동이 끝났을 때 (Idle)
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
  }, []); // 초기 1회 실행

  // 마커 업데이트 로직
  useEffect(() => {
    if (!mapRef.current) return;
    const { kakao } = window as any;

    // 기존 마커 삭제 로직 등이 필요할 수 있음 (생략 가능)
    stores.forEach((store) => {
      const markerPosition = new kakao.maps.LatLng(store.lat, store.lng);
      const marker = new kakao.maps.Marker({
        position: markerPosition,
        map: mapRef.current
      });

      kakao.maps.event.addListener(marker, 'click', () => {
        onMarkerClick(store.id);
      });
    });
  }, [stores]);

  // 외부에서 중심 좌표(mapCenter)가 바뀔 때 지도 이동
  useEffect(() => {
    if (!mapRef.current || !mapCenter) return;
    const { kakao } = window as any;
    const moveLatLon = new kakao.maps.LatLng(mapCenter.lat, mapCenter.lng);
    mapRef.current.panTo(moveLatLon);
  }, [mapCenter]);

  return (
    <div className="w-full h-full relative">
      <div 
        id="map" 
        ref={mapContainerRef} 
        className="w-full h-full" 
        style={{ minHeight: '100vh' }}
      />
    </div>
  );
};

export default MapArea;
