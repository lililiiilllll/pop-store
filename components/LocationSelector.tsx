import React from 'react';

interface LocationSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLocation: string;
  onSelect: (location: { name: string; lat: number; lng: number }) => void;
}

const LocationSelector: React.FC<LocationSelectorProps> = (props) => {
  if (!props.isOpen) return null;
  return <div className="fixed inset-0 bg-white z-50">Location Selector</div>;
};

export default LocationSelector;