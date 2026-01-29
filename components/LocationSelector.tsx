import React from 'react';
import { REGIONS } from '../constants'; // 지역명, lat, lng가 정의된 상수

interface LocationSelectorProps {
  onSelect: (name: string, coords: { lat: number, lng: number }) => void;
  onClose: () => void;
}

const LocationSelector: React.FC<LocationSelectorProps> = ({ onSelect, onClose }) => {
  return (
    <div className="bg-white rounded-[32px] p-8 w-full max-w-md shadow-2xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">지역 선택</h2>
        <button onClick={onClose} className="text-gray-400">닫기</button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {REGIONS.map((region) => (
          <button
            key={region.name}
            onClick={() => onSelect(region.name, { lat: region.lat, lng: region.lng })}
            className="py-4 px-2 bg-[#f2f4f6] hover:bg-[#3182f6] hover:text-white rounded-2xl font-semibold transition-all text-[15px]"
          >
            {region.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default LocationSelector;
