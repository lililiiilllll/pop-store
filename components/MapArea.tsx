import React from 'react';
import { PopupStore } from '../types';

interface MapAreaProps {
  stores: PopupStore[];
  onMarkerClick: (id: string) => void;
  selectedStoreId: string | null;
  onLongPress: (data: { lat: number; lng: number; address: string }) => void;
  onMapClick: () => void;
  onOverlayClick: (id: string) => void;
  isSelectingLocation: boolean;
  onSelectLocation: (data: { lat: number; lng: number; address: string }) => void;
  mapCenter?: { lat: number; lng: number };
  onMapIdle?: (
    bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number },
    center: { lat: number; lng: number }
  ) => void;
  userLocation: { lat: number; lng: number } | null;
}

const MapArea: React.FC<MapAreaProps> = (props) => {
  return <div className="w-full h-full bg-slate-100 flex items-center justify-center">Map Area</div>;
};

export default MapArea;