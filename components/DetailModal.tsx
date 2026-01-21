import React, { useMemo } from 'react';

interface DetailModalProps {
  store: any;
  onClose: () => void;
  onShowSuccess: (title: string, message: string) => void;
}

const DetailModal: React.FC<DetailModalProps> = ({ store, onClose, onShowSuccess }) => {
  if (!store) return null;

  // 💡 [자동 계산] 근처 역 정보 생성 로직 (예시 데이터 기반)
  const subwayInfo = useMemo(() => {
    // 실제로는 좌표 기반 API를 호출하거나 DB의 subway_stations 테이블과 거리 계산 알고리즘을 사용합니다.
    // 여기서는 장소명에 기반한 예시 텍스트를 생성합니다.
    if (store.subway_name) return `${store.subway_name}역 도보 ${store.walking_time || '5'}분`;
    return "성수역 도보 7분"; // 기본값
  }, [store]);

  // 💡 길찾기 연동 함수
  const openExternalMap = (type: 'naver' | 'kakao') => {
    const { lat, lng, name } = store;
    const url = type === 'naver' 
      ? `https://map.naver.com/v5/directions/-/,,${lat},${lng},${name},,,ADDRESS_POI/walk`
      : `https://map.kakao.com/link/to/${name},${lat},${lng}`;
    window.open(url, '_blank');
  };

  return (
    <div onClick={(e) => e.stopPropagation()} className="flex flex-col w-full h-[90vh] lg:h-auto max-h-[92vh] bg-white overflow-hidden rounded-t-[32px] lg:rounded-2xl shadow-2xl">
      {/* 1. 상단 이미지 & 닫기 */}
      <div className="relative h-64 lg:h-72 w-full flex-shrink-0">
        <img src={store.imageUrl} alt={store.name} className="w-full h-full object-cover" />
        <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/30 backdrop-blur-md rounded-full text-white z-50">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      {/* 2. 본문 영역 */}
      <div className="flex-1 overflow-y-auto p-6 bg-white space-y-6 custom-scrollbar text-left">
        {/* 타이틀 및 핵심 배지 */}
        <div>
          <div className="flex gap-2 mb-2">
            <span className="px-2 py-1 bg-blue-50 text-blue-600 text-[11px] font-bold rounded">{store.category}</span>
            <span className="px-2 py-1 bg-green-50 text-green-600 text-[11px] font-bold rounded">{subwayInfo}</span>
            <span className="px-2 py-1 bg-orange-50 text-orange-600 text-[11px] font-bold rounded">{store.is_free ? '무료입장' : '유료'}</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">{store.name}</h2>
          <p className="text-gray-500 text-sm mt-1">{store.simple_description || '팝업스토어 간단 설명입니다.'}</p>
        </div>

        {/* 상세 정보 리스트 (회색 박스) */}
        <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-gray-400 text-sm w-16 flex-shrink-0">운영기간</span>
            <span className="text-gray-800 text-sm font-medium">{store.period || '2026.01.15 ~ 2026.01.31'}</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-gray-400 text-sm w-16 flex-shrink-0">상세위치</span>
            <span className="text-gray-800 text-sm font-medium leading-tight">{store.location}</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-gray-400 text-sm w-16 flex-shrink-0">입장방식</span>
            <span className="text-gray-800 text-sm font-medium">{store.entry_type || '현장 대기 / 네이버 예약'}</span>
          </div>
        </div>

        {/* 상세 설명 */}
        <div>
          <h3 className="font-bold text-gray-900 mb-2">상세 설명</h3>
          <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{store.description}</p>
        </div>

        {/* 방문자 후기 섹션 (간단 요약) */}
        <div className="border-t pt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-900">방문자 후기 <span className="text-blue-500 text-sm ml-1">24</span></h3>
            <button className="text-xs text-gray-400 underline">전체보기</button>
          </div>
          <div className="space-y-4 text-left">
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-700">"공간이 너무 예쁘고 굿즈가 다양해요!"</p>
              <span className="text-[10px] text-gray-400">2026.01.20 | 방문자 A</span>
            </div>
          </div>
        </div>

        {/* 정보 수정 요청 */}
        <button className="w-full py-3 text-gray-400 text-xs hover:text-gray-600 underline transition-colors">
          정보가 틀렸나요? 수정 요청하기
        </button>
      </div>

      {/* 3. 하단 고정 버튼 (길찾기) */}
      <div className="p-4 border-t bg-white flex gap-3">
        <button onClick={() => openExternalMap('naver')} className="flex-1 py-4 bg-[#03C75A] text-white rounded-xl font-bold flex items-center justify-center gap-2">
          네이버 길찾기
        </button>
        <button onClick={() => openExternalMap('kakao')} className="flex-1 py-4 bg-[#FEE500] text-[#3C1E1E] rounded-xl font-bold flex items-center justify-center gap-2">
          카카오 길찾기
        </button>
      </div>
    </div>
  );
};

export default DetailModal;
