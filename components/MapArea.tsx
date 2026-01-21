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
  // App.tsx에서 전달하지만 현재 사용하지 않는 props들도 에러 방지를 위해 추가
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
  onMapIdle
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]); // 마커 관리용

  useEffect(() => {
    const { kakao } = window as any;
    if (!kakao || !mapContainerRef.current) return;

    // autoload=false 대응을 위한 load 콜백 사용
    kakao.maps.load(() => {
      const options = {
        center: new kakao.maps.LatLng(
          mapCenter?.lat || 37.5665,
          mapCenter?.lng || 126.9780
        ),
        level: 3
      };

      const map = new kakao.maps.Map(mapContainerRef.current, options);
      mapRef.current = map;

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
  }, []);

  // 마커 업데이트 (데이터 변경 시)
  useEffect(() => {
    const { kakao } = window as any;
    if (!mapRef.current || !kakao) return;

    // 기존 마커 지우기
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    stores.forEach((store) => {
      const marker = new kakao.maps.Marker({
        position: new kakao.maps.LatLng(store.lat, store.lng),
        map: mapRef.current
      });

      kakao.maps.event.addListener(marker, 'click', () => {
        onMarkerClick(store.id);
      });

      markersRef.current.push(marker);
    });
  }, [stores]);

  // 지도 중심 이동
  useEffect(() => {
    const { kakao } = window as any;
    if (!mapRef.current || !mapCenter || !kakao) return;
    const moveLatLon = new kakao.maps.LatLng(mapCenter.lat, mapCenter.lng);
    mapRef.current.panTo(moveLatLon);
  }, [mapCenter]);

  return (
    <div className="w-full h-full relative" style={{ minHeight: '400px' }}>
      <div 
        ref={mapContainerRef} 
        className="w-full h-full" 
        style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}
      />
    </div>
  );
};

export default MapArea;
