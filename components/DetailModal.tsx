import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface DetailModalProps {
  store: any;
  onClose: () => void;
  onShowSuccess: (title: string, message: string) => void;
}

const DetailModal: React.FC<DetailModalProps> = ({ store, onClose, onShowSuccess }) => {
  const [isMapSelectOpen, setIsMapSelectOpen] = useState(false);

  if (!store) return null;

  // 💡 [자동 계산] 근처역 정보 (실제 구현 시 좌표 계산 로직 삽입 위치)
  const subwayInfo = useMemo(() => {
    return store.subway_info || "성수역 도보 5분"; 
  }, [store]);

  const openMap = (type: 'naver' | 'kakao') => {
    const { lat, lng, name } = store;
    const url = type === 'naver' 
      ? `nmap://route/walk?dlat=${lat}&dlng=${lng}&dname=${encodeURIComponent(name)}&appname=popup_map`
      : `kakaomap://route?ep=${lat},${lng}&by=PUBLICTRANSIT`;
    
    const webUrl = type === 'naver'
      ? `https://map.naver.com/v5/directions/-/,,${lat},${lng},${encodeURIComponent(name)},,,ADDRESS_POI/walk`
      : `https://map.kakao.com/link/to/${encodeURIComponent(name)},${lat},${lng}`;

    const start = Date.now();
    setTimeout(() => {
      if (Date.now() - start < 2000) window.open(webUrl, '_blank');
    }, 500);
    window.location.href = url;
    setIsMapSelectOpen(false);
  };

  return (
    <div onClick={(e) => e.stopPropagation()} className="relative flex flex-col w-full h-[90vh] lg:h-auto lg:max-h-[85vh] bg-white overflow-hidden rounded-t-[32px] lg:rounded-2xl shadow-2xl transition-all duration-300">
      
      {/* 이미지 섹션 */}
      <div className="relative h-60 lg:h-72 w-full flex-shrink-0">
        <img src={store.imageUrl || "https://via.placeholder.com/600x400"} alt={store.name} className="w-full h-full object-cover" />
        <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/30 backdrop-blur-md rounded-full text-white z-10">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      {/* 컨텐츠 섹션 */}
      <div className="flex-1 overflow-y-auto p-6 pb-24 text-left space-y-6">
        <div>
          <div className="flex flex-wrap gap-2 mb-2">
            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold rounded uppercase">{store.category}</span>
            <span className="px-2 py-0.5 bg-green-50 text-green-600 text-[10px] font-bold rounded">{subwayInfo}</span>
            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold rounded">{store.is_free ? '무료입장' : '유료'}</span>
            <span className="px-2 py-0.5 bg-orange-50 text-orange-600 text-[10px] font-bold rounded">{store.entry_type || '예약 권장'}</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 leading-tight">{store.name}</h2>
          <p className="text-gray-500 text-sm mt-1">{store.simple_description || "팝업스토어에 대한 한 줄 설명입니다."}</p>
        </div>

        {/* 핵심 정보 박스 */}
        <div className="bg-gray-50 rounded-2xl p-4 space-y-3 text-sm">
          <div className="flex gap-3"><span className="text-gray-400 w-14">운영기간</span><span className="text-gray-800 font-medium">{store.period || '2026.01.20 - 2026.02.15'}</span></div>
          <div className="flex gap-3"><span className="text-gray-400 w-14">상세위치</span><span className="text-gray-800 font-medium leading-snug">{store.location}</span></div>
        </div>

        {/* 상세 설명 */}
        <div>
          <h3 className="font-bold text-gray-900 mb-2">상세 설명</h3>
          <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{store.description || "상세한 팝업스토어 정보가 여기에 노출됩니다."}</p>
        </div>

        {/* 후기 영역 (샘플) */}
        <div className="border-t pt-6">
          <h3 className="font-bold text-gray-900 mb-4">방문자 후기 <span className="text-blue-500 ml-1">12</span></h3>
          <div className="bg-gray-50 p-4 rounded-xl text-sm text-gray-600 italic">"인테리어가 너무 예쁘고 사진 찍기 좋아요!"</div>
        </div>
      </div>

      {/* 하단 고정 바: 정보 수정 | 길찾기 */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-white/80 backdrop-blur-md flex gap-3 z-20">
        <button 
          onClick={() => onShowSuccess('요청 완료', '정보 수정 제보가 정상적으로 접수되었습니다.')}
          className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold active:scale-95 transition-all text-sm"
        >
          정보 수정 요청
        </button>
        <button 
          onClick={() => setIsMapSelectOpen(true)}
          className="flex-[2.5] py-4 bg-black text-white rounded-2xl font-bold active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
          길찾기
        </button>
      </div>

      {/* 길찾기 앱 선택 모달 (Portal 대용 AnimatePresence) */}
      <AnimatePresence>
        {isMapSelectOpen && (
          <div className="fixed inset-0 z-[10001] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMapSelectOpen(false)} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative w-full max-w-[280px] bg-white rounded-[28px] p-6 shadow-2xl">
              <h4 className="text-center font-bold text-gray-900 mb-6">지도 앱 선택</h4>
              <div className="grid grid-cols-2 gap-6">
                <button onClick={() => openMap('naver')} className="flex flex-col items-center gap-2">
                  <div className="w-14 h-14 bg-[#03C75A] rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg">N</div>
                  <span className="text-xs font-semibold text-gray-600">네이버 지도</span>
                </button>
                <button onClick={() => openMap('kakao')} className="flex flex-col items-center gap-2">
                  <div className="w-14 h-14 bg-[#FEE500] rounded-2xl flex items-center justify-center shadow-lg">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="#3C1E1E"><path d="M12 3C6.477 3 2 6.477 2 10.75c0 2.79 1.857 5.232 4.636 6.643l-1.176 4.314c-.06.22.194.402.383.27l5.085-3.535c.348.037.702.058 1.072.058 5.523 0 10-3.477 10-7.75S17.523 3 12 3z"/></svg>
                  </div>
                  <span className="text-xs font-semibold text-gray-600">카카오맵</span>
                </button>
              </div>
              <button onClick={() => setIsMapSelectOpen(false)} className="w-full mt-6 py-2 text-gray-400 text-sm">닫기</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DetailModal;
