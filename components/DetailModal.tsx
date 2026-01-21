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

  // 1. 주소 복사 함수
  const handleCopyAddress = (text: string) => {
    navigator.clipboard.writeText(text);
    onShowSuccess('복사 완료', '주소가 클립보드에 복사되었습니다.');
  };

  // 2. 길찾기 실행 함수
  const openMap = (type: 'naver' | 'kakao') => {
    const { lat, lng, name, location, address } = store;
    const targetName = name || "팝업스토어";
    const addr = location || address || "";

    const url = type === 'naver' 
      ? `nmap://route/walk?dlat=${lat}&dlng=${lng}&dname=${encodeURIComponent(targetName)}&appname=popup_now`
      : `kakaomap://route?ep=${lat},${lng}&by=PUBLICTRANSIT`;
    
    const webUrl = type === 'naver'
      ? `https://map.naver.com/v5/directions/-/,,${lat},${lng},${encodeURIComponent(targetName)},,,ADDRESS_POI/walk`
      : `https://map.kakao.com/link/to/${encodeURIComponent(targetName)},${lat},${lng}`;

    const start = Date.now();
    setTimeout(() => {
      if (Date.now() - start < 2000) window.open(webUrl, '_blank');
    }, 500);
    window.location.href = url;
    setIsMapSelectOpen(false);
  };

  return (
    <div onClick={(e) => e.stopPropagation()} className="relative flex flex-col w-full h-[90vh] lg:h-auto lg:max-h-[85vh] bg-white overflow-hidden rounded-t-[32px] lg:rounded-2xl shadow-2xl">
      
      {/* 이미지 섹션 */}
      <div className="relative h-60 lg:h-72 w-full flex-shrink-0 bg-gray-100">
        <img src={store.imageUrl} alt={store.name} className="w-full h-full object-cover" />
        <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/30 backdrop-blur-md rounded-full text-white z-10">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      {/* 컨텐츠 섹션 */}
      <div className="flex-1 overflow-y-auto p-6 pb-28 text-left space-y-7 custom-scrollbar">
        {/* 타이틀 및 배지 */}
        <div>
          <div className="flex flex-wrap gap-2 mb-3">
            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold rounded uppercase">{store.category || 'EVENT'}</span>
            <span className="px-2 py-0.5 bg-green-50 text-green-600 text-[10px] font-bold rounded">{store.subway_info || '주변역 정보 없음'}</span>
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">{store.name}</h2>
          <p className="text-gray-500 text-sm mt-1.5 leading-relaxed">{store.simple_description || "특별한 경험을 제공하는 팝업스토어입니다."}</p>
        </div>

        {/* 핵심 정보 (주소 포함) */}
        <div className="bg-gray-50 rounded-2xl p-5 space-y-4">
          <div className="flex items-start gap-4">
            <span className="text-gray-400 text-sm w-12 flex-shrink-0 mt-0.5">운영기간</span>
            <span className="text-gray-800 text-[14px] font-semibold">{store.period || '상시 운영'}</span>
          </div>
          
          {/* 💡 주소 섹션 보강 */}
          <div className="flex items-start gap-4 border-t border-gray-100 pt-4">
            <span className="text-gray-400 text-sm w-12 flex-shrink-0 mt-0.5">상세위치</span>
            <div className="flex flex-col gap-1.5 flex-1">
              <span className="text-gray-800 text-[14px] font-semibold leading-snug">
                {store.location || store.address || "등록된 주소 정보가 없습니다."}
              </span>
              {(store.location || store.address) && (
                <button 
                  onClick={() => handleCopyAddress(store.location || store.address)}
                  className="flex items-center gap-1 text-[#3182f6] text-[12px] font-bold w-fit hover:opacity-70 transition-opacity"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                  주소 복사
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 상세 설명 */}
        <div>
          <h3 className="font-bold text-gray-900 mb-2 text-base">상세 설명</h3>
          <p className="text-gray-600 text-[14px] leading-relaxed whitespace-pre-line tracking-tight">
            {store.description}
          </p>
        </div>
      </div>

      {/* 하단 고정 바 */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-white/90 backdrop-blur-lg flex gap-3 z-20">
        <button 
          onClick={() => onShowSuccess('요청 완료', '정보 수정 제보가 접수되었습니다.')}
          className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl font-bold active:scale-95 transition-all text-[13px]"
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

      {/* 길찾기 선택 모달 */}
      <AnimatePresence>
        {isMapSelectOpen && (
          <div className="fixed inset-0 z-[10001] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMapSelectOpen(false)} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-[280px] bg-white rounded-[28px] p-6 shadow-2xl">
              <h4 className="text-center font-bold text-gray-900 mb-6">사용하실 앱을 선택해주세요</h4>
              <div className="grid grid-cols-2 gap-6">
                <button onClick={() => openMap('naver')} className="flex flex-col items-center gap-2">
                  <div className="w-14 h-14 bg-[#03C75A] rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg">N</div>
                  <span className="text-xs font-semibold text-gray-600 tracking-tight">네이버 지도</span>
                </button>
                <button onClick={() => openMap('kakao')} className="flex flex-col items-center gap-2">
                  <div className="w-14 h-14 bg-[#FEE500] rounded-2xl flex items-center justify-center shadow-lg">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="#3C1E1E"><path d="M12 3C6.477 3 2 6.477 2 10.75c0 2.79 1.857 5.232 4.636 6.643l-1.176 4.314c-.06.22.194.402.383.27l5.085-3.535c.348.037.702.058 1.072.058 5.523 0 10-3.477 10-7.75S17.523 3 12 3z"/></svg>
                  </div>
                  <span className="text-xs font-semibold text-gray-600 tracking-tight">카카오맵</span>
                </button>
              </div>
              <button onClick={() => setIsMapSelectOpen(false)} className="w-full mt-6 py-2 text-gray-400 text-sm font-medium">취소</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DetailModal;
