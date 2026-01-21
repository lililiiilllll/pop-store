import React, { useEffect, useRef } from 'react';
import { PopupStore } from './types'; // 경로 수정

interface MapAreaProps {
  stores: PopupStore[];
  onMarkerClick: (id: string) => void;
  selectedStoreId: string | null;
  onMapClick: () => void;
  mapCenter?: { lat: number; lng: number };
  userLocation: { lat: number; lng: number } | null;
  onMapIdle?: (bounds: any, center: { lat: number; lng: number }) => void;
  // 나머지 props (에러 방지용)
  onLongPress?: (data: any) => void;
  onOverlayClick?: (id: string) => void;
  isSelectingLocation?: boolean;
  onSelectLocation?: (data: any) => void;
}

const MapArea: React.FC<MapAreaProps> = ({ stores, onMarkerClick, onMapClick, mapCenter, onMapIdle }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    const { kakao } = window as any;
    if (!kakao || !mapContainerRef.current) return;

    kakao.maps.load(() => {
      const options = {
        center: new kakao.maps.LatLng(mapCenter?.lat || 37.5665, mapCenter?.lng || 126.9780),
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

  useEffect(() => {
    const { kakao } = window as any;
    if (!mapRef.current || !kakao) return;
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

  return (
    <div className="w-full h-full relative" style={{ minHeight: '100vh' }}>
      <div 
        ref={mapContainerRef} 
        className="w-full h-full" 
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 }}
      />
    </div>
  );
};

export default MapArea;
