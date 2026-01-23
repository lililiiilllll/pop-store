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

  // 1. 주소 복사 함수
  const handleCopyAddress = (text: string) => {
    navigator.clipboard.writeText(text);
    onShowSuccess('복사 완료', '주소가 클립보드에 복사되었습니다.');
  };

  // 2. 길찾기 실행 함수 (대상 명칭을 store.title로 수정)
  const openMap = (type: 'naver' | 'kakao') => {
    const { lat, lng, title, location, address } = store;
    const targetName = title || "팝업스토어"; // 💡 name 대신 title 사용
    
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
        <img src={store.imageUrl} alt={store.title} className="w-full h-full object-cover" />
        <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/30 backdrop-blur-md rounded-full text-white z-10">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      {/* 컨텐츠 섹션 */}
      <div className="flex-1 overflow-y-auto p-6 pb-28 text-left space-y-7 custom-scrollbar">
        {/* 타이틀 및 배지 */}
        <div>
          {/* 팝업 제목 및 배지 영역 */}
<div className="px-5 py-4 bg-white">
  <div className="flex flex-col gap-3">
    <h2 className="text-[22px] font-bold text-[#191f28]">{store.title}</h2>
    
    <div className="flex flex-wrap gap-2">
      {/* 🚇 가까운 역 정보 */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 rounded-full">
        <span className="text-[12px] font-bold text-[#3182f6]">🚇 {store.station || '정보 없음'} 도보 {store.walk_time || '0'}분</span>
      </div>

      {/* 💰 입장료 정보 */}
      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${store.is_free ? 'bg-green-50' : 'bg-gray-100'}`}>
        <span className={`text-[12px] font-bold ${store.is_free ? 'text-green-600' : 'text-gray-500'}`}>
          {store.is_free ? '🎁 무료입장' : '유료입장'}
        </span>
      </div>

      {/* 📅 예약 정보 */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 rounded-full">
        <span className="text-[12px] font-bold text-purple-600">
          {store.is_reservation_required ? '📅 예약필수' : '✅ 상시입장'}
        </span>
      </div>

      {/* 🌐 공식 링크 (배지 형태) */}
      {store.official_url && (
        <a 
          href={store.official_url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 rounded-full hover:bg-black transition-colors"
        >
          <span className="text-[12px] font-bold text-white">🌐 공식 홈페이지</span>
        </a>
      )}
    </div>
  </div>
</div>
          
          {/* 💡 [수정] 팝업 이름 출력 (DB의 title 컬럼 사용) */}
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">
            {store.title}
          </h2>
          
          <p className="text-gray-500 text-sm mt-1.5 leading-relaxed">
            {store.simple_description || "특별한 경험을 제공하는 팝업스토어입니다."}
          </p>
        </div>

        {/* 핵심 정보 */}
        <div className="bg-gray-50 rounded-2xl p-5 space-y-4">
          <div className="flex items-start gap-4">
            <span className="text-gray-400 text-sm w-12 flex-shrink-0 mt-0.5">운영기간</span>
            <span className="text-gray-800 text-[14px] font-semibold">{store.period || '상시 운영'}</span>
          </div>
          
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

        {/* 상세 설명 섹션 */}
        <div>
          <h3 className="font-bold text-gray-900 mb-2 text-base">상세 설명</h3>
          <p className="text-gray-600 text-[14px] leading-relaxed whitespace-pre-line tracking-tight">
            {store.description || "등록된 상세 설명이 없습니다."}
          </p>
        </div>
      </div>

      {/* 모달 하단 리뷰 섹션 */}
<div className="mt-6 border-t-[8px] border-gray-50 bg-white pb-20">
  <div className="p-5 flex justify-between items-center border-b border-gray-50">
    <h3 className="text-[18px] font-bold">방문자 후기 <span className="text-[#3182f6] ml-1">{reviews.length}</span></h3>
    <button 
      onClick={handleOpenReviewWrite} // 리뷰 작성 팝업 연결
      className="text-[#3182f6] text-[14px] font-bold px-3 py-1.5 bg-blue-50 rounded-lg"
    >
      후기 작성
    </button>
  </div>

  <div className="divide-y divide-gray-50">
    {reviews.map((review) => {
      const isMyReview = currentUser?.id === review.user_id;
      const canSee = !review.is_blinded || isMyReview || isAdmin;

      // 블라인드된 리뷰인데 볼 권한이 없다면 안내 문구만 노출
      if (!canSee) {
        return (
          <div key={review.id} className="p-5 text-gray-400 text-[14px] italic bg-gray-25">
            관리자에 의해 블라인드 처리된 후기입니다.
          </div>
        );
      }

      return (
        <div key={review.id} className={`p-5 flex flex-col ${review.is_blinded ? 'bg-red-50/30' : 'bg-white'}`}>
          <div className="flex justify-between items-start mb-3">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[15px] text-[#191f28]">{review.user_name}</span>
                {review.is_blinded && (
                  <span className="text-[10px] font-bold text-red-500 border border-red-200 px-1.5 py-0.5 rounded">BLIND</span>
                )}
              </div>
              <div className="flex text-yellow-400 text-[13px]">
                {"★".repeat(review.rating)}
                <span className="text-gray-300 ml-2 font-normal">{new Date(review.created_at).toLocaleDateString()}</span>
              </div>
            </div>
            
            {/* 본인만 수정/삭제 버튼 노출 */}
            {isMyReview && (
              <div className="flex gap-3 text-[13px] font-medium text-gray-400">
                <button onClick={() => onEdit(review)} className="hover:text-gray-600">수정</button>
                <button onClick={() => onDelete(review.id)} className="hover:text-red-500">삭제</button>
              </div>
            )}
          </div>

          <p className="text-[15px] text-[#4e5968] leading-relaxed mb-4 whitespace-pre-wrap">
            {review.comment}
          </p>

          {/* 반응 버튼 (좋아요/싫어요) */}
          <div className="flex gap-2">
            <button 
              onClick={() => handleReaction(review.id, 'like')}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-100 rounded-2xl text-[13px] font-bold text-gray-600 hover:bg-gray-50 active:scale-95 transition-all"
            >
              👍 {review.likes_count}
            </button>
            <button 
              onClick={() => handleReaction(review.id, 'dislike')}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-100 rounded-2xl text-[13px] font-bold text-gray-600 hover:bg-gray-50 active:scale-95 transition-all"
            >
              👎 {review.dislikes_count}
            </button>
          </div>
        </div>
      );
    })}
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
