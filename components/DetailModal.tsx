import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Review {
  id: number;
  user_id: string;
  user_name: string;
  rating: number;
  comment: string;
  likes_count: number;
  dislikes_count: number;
  is_blinded: boolean;
  created_at: string;
}

interface DetailModalProps {
  store: any;
  onClose: () => void;
  onShowSuccess: (title: string, message: string) => void;
  currentUser?: { id: string; name: string };
  isAdmin?: boolean;
}

const DetailModal: React.FC<DetailModalProps> = ({
  store,
  onClose,
  onShowSuccess,
  currentUser = { id: 'user123', name: '나' },
  isAdmin = false
}) => {
  const [isMapSelectOpen, setIsMapSelectOpen] = useState(false);
  
  // 리뷰 관련 상태
  const [reviews, setReviews] = useState<Review[]>([
    { id: 1, user_id: 'user123', user_name: '김철수', rating: 5, comment: '정말 멋진 팝업이었어요!', likes_count: 12, dislikes_count: 0, is_blinded: false, created_at: new Date().toISOString() },
    { id: 2, user_id: 'other', user_name: '관리자봇', rating: 3, comment: '블라인드 테스트용 리뷰입니다.', likes_count: 0, dislikes_count: 1, is_blinded: true, created_at: new Date().toISOString() }
  ]);
  
  // 리뷰 작성/수정 상태
  const [isWriting, setIsWriting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editRating, setEditRating] = useState(5);

  if (!store) return null;

  // --- 1. 자동 도보 계산 로직 (임시 시뮬레이션) ---
  // 실제 서비스에선 Kakao/Naver Search API를 호출하여 store.address로 역 정보를 가져와야 합니다.
  const getAutoWalkTime = () => {
    if (store.station && store.walk_time) return `${store.station} 도보 ${store.walk_time}분`;
    return "정보 확인 중...";
  };

  // --- 2. 리뷰 핸들러 ---
  const handleAddReview = () => {
    if (!editContent.trim()) return alert("내용을 입력해주세요.");
    const newReview: Review = {
      id: Date.now(),
      user_id: currentUser.id,
      user_name: currentUser.name,
      rating: editRating,
      comment: editContent,
      likes_count: 0,
      dislikes_count: 0,
      is_blinded: false,
      created_at: new Date().toISOString(),
    };
    setReviews([newReview, ...reviews]);
    resetReviewState();
    onShowSuccess('등록 완료', '후기가 성공적으로 등록되었습니다.');
  };

  const handleUpdateReview = (id: number) => {
    setReviews(reviews.map(r => r.id === id ? { ...r, comment: editContent, rating: editRating } : r));
    resetReviewState();
    onShowSuccess('수정 완료', '후기가 수정되었습니다.');
  };

  const resetReviewState = () => {
    setIsWriting(false);
    setEditingId(null);
    setEditContent('');
    setEditRating(5);
  };

  const handleReaction = (id: number, type: 'like' | 'dislike') => {
    // 실제로는 reaction_history 테이블을 조회하여 1회 제한 로직을 체크해야 합니다.
    setReviews(reviews.map(r => {
      if (r.id === id) {
        return {
          ...r,
          likes_count: type === 'like' ? r.likes_count + 1 : r.likes_count,
          dislikes_count: type === 'dislike' ? r.dislikes_count + 1 : r.dislikes_count
        };
      }
      return r;
    }));
  };

  // --- 3. 길찾기 핸들러 ---
  const openMap = (type: 'naver' | 'kakao') => {
    const { lat, lng, title } = store;
    const targetName = title || "팝업스토어";
    const url = type === 'naver' 
      ? `nmap://route/walk?dlat=${lat}&dlng=${lng}&dname=${encodeURIComponent(targetName)}&appname=popup_now`
      : `kakaomap://route?ep=${lat},${lng}&by=PUBLICTRANSIT`;
    const webUrl = type === 'naver'
      ? `https://map.naver.com/v5/directions/-/,,${lat},${lng},${encodeURIComponent(targetName)},,,ADDRESS_POI/walk`
      : `https://map.kakao.com/link/to/${encodeURIComponent(targetName)},${lat},${lng}`;

    const start = Date.now();
    setTimeout(() => { if (Date.now() - start < 2000) window.open(webUrl, '_blank'); }, 500);
    window.location.href = url;
    setIsMapSelectOpen(false);
  };

  return (
    <div onClick={(e) => e.stopPropagation()} className="relative flex flex-col w-full h-[90vh] lg:h-auto lg:max-h-[85vh] bg-white overflow-hidden rounded-t-[32px] lg:rounded-2xl shadow-2xl">
      
      {/* 상단 이미지 */}
      <div className="relative h-60 lg:h-72 w-full flex-shrink-0 bg-gray-100">
        <img src={store.imageUrl} alt={store.title} className="w-full h-full object-cover" />
        <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/30 backdrop-blur-md rounded-full text-white z-10">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      {/* 컨텐츠 (스크롤) */}
      <div className="flex-1 overflow-y-auto p-6 pb-28 text-left custom-scrollbar">
        {/* 타이틀 및 배지 */}
        <div className="mb-6">
          <h2 className="text-[24px] font-extrabold text-[#191f28] mb-3">{store.title}</h2>
          <div className="flex flex-wrap gap-2 mb-4">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 rounded-full text-[#3182f6] text-[12px] font-bold">
              🚇 {getAutoWalkTime()}
            </div>
            <div className={`px-3 py-1.5 rounded-full text-[12px] font-bold ${store.is_free ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
              {store.is_free ? '🎁 무료입장' : '유료입장'}
            </div>
            <div className="px-3 py-1.5 bg-purple-50 text-purple-600 rounded-full text-[12px] font-bold">
              {store.is_reservation_required ? '📅 예약필수' : '✅ 상시입장'}
            </div>
            {store.official_url && (
              <a href={store.official_url} target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-gray-900 text-white rounded-full text-[12px] font-bold">🌐 공식 홈페이지</a>
            )}
          </div>
        </div>

        {/* 상세 설명 */}
        <div className="mb-10">
          <h3 className="font-bold text-gray-900 mb-2 text-base">상세 설명</h3>
          <p className="text-gray-600 text-[14px] leading-relaxed whitespace-pre-line">{store.description}</p>
        </div>

        {/* --- 리뷰 섹션 --- */}
        <div className="pt-8 border-t-[8px] border-gray-50 -mx-6 px-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-[18px] font-bold">방문자 후기 <span className="text-[#3182f6] ml-1">{reviews.length}</span></h3>
            {!isWriting && (
              <button 
                onClick={() => { setIsWriting(true); setEditingId(null); setEditContent(''); }}
                className="text-[#3182f6] text-[14px] font-bold px-4 py-2 bg-blue-50 rounded-full active:scale-95 transition-all"
              >
                후기 작성하기
              </button>
            )}
          </div>

          {/* 리뷰 작성/수정 폼 (Inline) */}
          {(isWriting || editingId !== null) && (
            <div className="mb-8 p-5 bg-gray-50 rounded-2xl border border-blue-100 shadow-inner">
              <div className="flex gap-1.5 mb-3">
                {[1, 2, 3, 4, 5].map(num => (
                  <button key={num} onClick={() => setEditRating(num)} className={`text-2xl ${editRating >= num ? 'text-yellow-400' : 'text-gray-200'}`}>★</button>
                ))}
              </div>
              <textarea 
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="이곳에서의 경험은 어떠셨나요?"
                className="w-full h-28 p-4 bg-white rounded-xl border-none text-[14px] focus:ring-2 focus:ring-blue-500 shadow-sm"
              />
              <div className="flex gap-2 mt-3">
                <button onClick={resetReviewState} className="flex-1 py-3 bg-white text-gray-500 rounded-xl font-bold text-[13px]">취소</button>
                <button 
                  onClick={() => editingId ? handleUpdateReview(editingId) : handleAddReview()}
                  className="flex-[2] py-3 bg-[#3182f6] text-white rounded-xl font-bold text-[13px]"
                >
                  {editingId ? "수정 완료" : "후기 등록하기"}
                </button>
              </div>
            </div>
          )}

          {/* 리뷰 리스트 */}
          <div className="divide-y divide-gray-100">
            {reviews.map((review) => {
              const isMyReview = currentUser?.id === review.user_id;
              const canSee = !review.is_blinded || isMyReview || isAdmin;

              if (!canSee) return (
                <div key={review.id} className="py-5 text-gray-400 text-[13px] italic">비공개 처리된 리뷰입니다.</div>
              );

              return (
                <div key={review.id} className={`py-6 flex flex-col ${review.is_blinded ? 'bg-red-50/20 px-4 rounded-xl my-2' : ''}`}>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[15px]">{review.user_name}</span>
                        {review.is_blinded && <span className="text-[10px] font-bold text-red-500 border border-red-200 px-1.5 py-0.5 rounded">BLIND</span>}
                      </div>
                      <div className="flex text-yellow-400 text-[12px]">
                        {"★".repeat(review.rating)}
                        <span className="text-gray-300 ml-2 font-normal">{new Date(review.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    {isMyReview && editingId !== review.id && (
                      <div className="flex gap-3 text-[12px] font-medium text-gray-400">
                        <button onClick={() => { setEditingId(review.id); setEditContent(review.comment); setEditRating(review.rating); }}>수정</button>
                        <button onClick={() => setReviews(reviews.filter(r => r.id !== review.id))} className="text-red-400">삭제</button>
                      </div>
                    )}
                  </div>
                  <p className="text-[14px] text-[#4e5968] leading-relaxed mb-4 whitespace-pre-wrap">{review.comment}</p>
                  <div className="flex gap-2">
                    <button onClick={() => handleReaction(review.id, 'like')} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-100 rounded-xl text-[12px] font-bold text-gray-600 hover:bg-gray-50">👍 {review.likes_count}</button>
                    <button onClick={() => handleReaction(review.id, 'dislike')} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-100 rounded-xl text-[12px] font-bold text-gray-600 hover:bg-gray-50">👎 {review.dislikes_count}</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 하단 버튼 */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-white/95 backdrop-blur-lg flex gap-3 z-20">
        <button onClick={() => onShowSuccess('제보 완료', '정보 수정 제보가 접수되었습니다.')} className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl font-bold text-[13px]">정보 수정 요청</button>
        <button onClick={() => setIsMapSelectOpen(true)} className="flex-[2.5] py-4 bg-black text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
          길찾기 시작
        </button>
      </div>

      {/* 길찾기 선택 모달 */}
      <AnimatePresence>
        {isMapSelectOpen && (
          <div className="fixed inset-0 z-[10001] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMapSelectOpen(false)} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-[280px] bg-white rounded-[28px] p-6 shadow-2xl text-center">
              <h4 className="font-bold text-gray-900 mb-6 text-[15px]">어떤 지도로 안내할까요?</h4>
              <div className="grid grid-cols-2 gap-6 mb-2">
                <button onClick={() => openMap('naver')} className="flex flex-col items-center gap-2">
                  <div className="w-14 h-14 bg-[#03C75A] rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-md">N</div>
                  <span className="text-[11px] font-semibold text-gray-600">네이버 지도</span>
                </button>
                <button onClick={() => openMap('kakao')} className="flex flex-col items-center gap-2">
                  <div className="w-14 h-14 bg-[#FEE500] rounded-2xl flex items-center justify-center shadow-md">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="#3C1E1E"><path d="M12 3C6.477 3 2 6.477 2 10.75c0 2.79 1.857 5.232 4.636 6.643l-1.176 4.314c-.06.22.194.402.383.27l5.085-3.535c.348.037.702.058 1.072.058 5.523 0 10-3.477 10-7.75S17.523 3 12 3z"/></svg>
                  </div>
                  <span className="text-[11px] font-semibold text-gray-600">카카오맵</span>
                </button>
              </div>
              <button onClick={() => setIsMapSelectOpen(false)} className="mt-4 text-gray-400 text-[13px] font-medium underline">닫기</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DetailModal;
