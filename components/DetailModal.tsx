import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface DetailModalProps {
  store: any;
  onClose: () => void;
  onShowSuccess: (title: string, message: string) => void;
}

const DetailModal: React.FC<DetailModalProps> = ({ store, onClose, onShowSuccess }) => {
  const [isMapSelectOpen, setIsMapSelectOpen] = useState(false);

  if (!store) return null;

  // 길찾기 실행 함수
  const openMap = (type: 'naver' | 'kakao') => {
    const { lat, lng, name } = store;
    const url = type === 'naver' 
      ? `nmap://route/walk?dlat=${lat}&dlng=${lng}&dname=${encodeURIComponent(name)}&appname=your-app-name`
      : `kakaomap://route?ep=${lat},${lng}&by=PUBLICTRANSIT`;
    
    const webUrl = type === 'naver'
      ? `https://map.naver.com/v5/directions/-/,,${lat},${lng},${encodeURIComponent(name)},,,ADDRESS_POI/walk`
      : `https://map.kakao.com/link/to/${encodeURIComponent(name)},${lat},${lng}`;

    // 앱 실행 시도 후 실패하면 웹으로 연결 (모바일/PC 대응)
    const start = Date.now();
    setTimeout(() => {
      if (Date.now() - start < 2000) window.open(webUrl, '_blank');
    }, 500);
    window.location.href = url;
    setIsMapSelectOpen(false);
  };

  return (
    <div onClick={(e) => e.stopPropagation()} className="relative flex flex-col w-full h-[90vh] lg:h-auto max-h-[92vh] bg-white overflow-hidden rounded-t-[32px] lg:rounded-2xl shadow-2xl">
      
      {/* 1. 이미지 및 내용 생략 (기존 코드 유지) */}
      <div className="flex-1 overflow-y-auto p-6 text-left space-y-6">
         {/* ... (이전의 제목, 요약박스, 상세설명 코드들) ... */}
         <div className="h-20" /> {/* 하단 버튼 공간 확보 */}
      </div>

      {/* 2. 하단 고정 바 (정보수정 | 길찾기) */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-white flex items-center gap-3 z-50">
        <button 
          onClick={() => onShowSuccess('요청 접수', '정보 수정 요청이 전달되었습니다.')}
          className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold active:scale-95 transition-transform text-sm"
        >
          정보 수정 요청
        </button>
        <button 
          onClick={() => setIsMapSelectOpen(true)}
          className="flex-[2] py-4 bg-black text-white rounded-2xl font-bold active:scale-95 transition-transform flex items-center justify-center gap-2 shadow-lg"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
          길찾기
        </button>
      </div>

      {/* 3. 길찾기 앱 선택 모달 (추가 모달) */}
      <AnimatePresence>
        {isMapSelectOpen && (
          <div className="fixed inset-0 z-[10001] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsMapSelectOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-[300px] bg-white rounded-[24px] p-6 shadow-2xl overflow-hidden"
            >
              <h4 className="text-center font-bold text-gray-900 mb-6">사용하실 앱을 선택해주세요</h4>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => openMap('naver')} className="flex flex-col items-center gap-2 group">
                  <div className="w-14 h-14 bg-[#03C75A] rounded-2xl flex items-center justify-center shadow-md group-active:scale-90 transition-transform">
                    <span className="text-white font-black text-xl">N</span>
                  </div>
                  <span className="text-xs font-medium text-gray-600">네이버 지도</span>
                </button>
                <button onClick={() => openMap('kakao')} className="flex flex-col items-center gap-2 group">
                  <div className="w-14 h-14 bg-[#FEE500] rounded-2xl flex items-center justify-center shadow-md group-active:scale-90 transition-transform">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="#3C1E1E"><path d="M12 3C6.477 3 2 6.477 2 10.75c0 2.79 1.857 5.232 4.636 6.643l-1.176 4.314c-.06.22.194.402.383.27l5.085-3.535c.348.037.702.058 1.072.058 5.523 0 10-3.477 10-7.75S17.523 3 12 3z"/></svg>
                  </div>
                  <span className="text-xs font-medium text-gray-600">카카오맵</span>
                </button>
              </div>
              <button 
                onClick={() => setIsMapSelectOpen(false)}
                className="w-full mt-6 py-3 text-gray-400 text-sm font-medium"
              >
                닫기
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DetailModal;
