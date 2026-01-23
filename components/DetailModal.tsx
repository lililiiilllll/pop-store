import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase'; // Supabase 클라이언트 경로를 프로젝트에 맞게 수정하세요.

// DB 테이블 구조에 맞춘 인터페이스 정의
interface Review {
  id: number;
  popup_id: number;
  user_id: string; // UUID
  user_nickname: string;
  content: string; // comment -> content
  rating: number;
  likes: number; // likes_count -> likes
  dislikes: number; // dislikes_count -> dislikes
  is_blinded: boolean;
  created_at: string;
}

interface DetailModalProps {
  store: any; // popup_stores 테이블 데이터
  onClose: () => void;
  onShowSuccess: (title: string, message: string) => void;
  currentUser?: { id: string; name: string } | null; // 로그인 정보 (없으면 null)
  isAdmin?: boolean;
}

const DetailModal: React.FC<DetailModalProps> = ({
  store,
  onClose,
  onShowSuccess,
  currentUser,
  isAdmin = false
}) => {
  const [isMapSelectOpen, setIsMapSelectOpen] = useState(false);
  
  // 리뷰 리스트 상태 및 로딩 상태
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 내 반응 상태 (중복 방지용: 리뷰ID별로 'like', 'dislike', null 저장)
  const [myReactions, setMyReactions] = useState<Record<number, 'like' | 'dislike' | null>>({});
  
  // 리뷰 입력/수정 상태
  const [isWriting, setIsWriting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editRating, setEditRating] = useState(5);

  // --- [신규] 실시간 리뷰 데이터 페칭 로직 ---
  const fetchReviews = useCallback(async () => {
    if (!store?.id) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('popup_id', store.id) // 현재 팝업스토어의 리뷰만 필터링
        .order('created_at', { ascending: false }); // 최신순 정렬

      if (error) throw error;
      setReviews(data || []);
    } catch (err) {
      console.error('리뷰 로딩 에러:', err);
    } finally {
      setIsLoading(false);
    }
  }, [store?.id]);

  // 모달이 열릴 때 데이터를 가져옴
  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  if (!store) return null;

  // --- 1. 자동 도보 계산 텍스트 로직 수정 (nearby_station만 있어도 노출되도록 범위 확장) ---
  const getAutoWalkTime = () => {
    if (store.nearby_station && store.walking_time) {
      return `${store.nearby_station} 도보 ${store.walking_time}분`;
    } else if (store.nearby_station) {
      // 도보 분수 정보가 없더라도 역 정보가 있다면 표시
      return `${store.nearby_station} 인근`;
    }
    return "인근 지하철역 정보 없음";
  };

  // --- 2. 리뷰 핸들러 (작성, 수정, 삭제) ---
  const resetReviewState = () => {
    setIsWriting(false);
    setEditingId(null);
    setEditContent('');
    setEditRating(5);
  };

  const handleAddReview = async () => {
    if (!currentUser) return alert("로그인이 필요한 서비스입니다.");
    if (!editContent.trim()) return alert("내용을 입력해주세요.");

    try {
      const { data, error } = await supabase
        .from('reviews')
        .insert([{
          popup_id: store.id,
          user_id: currentUser.id,
          user_nickname: currentUser.name,
          content: editContent,
          rating: editRating,
          likes: 0,
          dislikes: 0,
          is_blinded: false
        }])
        .select();

      if (error) throw error;

      if (data) {
        setReviews([data[0], ...reviews]);
        resetReviewState();
        onShowSuccess('등록 완료', '후기가 성공적으로 등록되었습니다.');
      }
    } catch (err) {
      alert('등록 중 오류가 발생했습니다.');
      console.error(err);
    }
  };

  const handleUpdateReview = async (id: number) => {
    try {
      const { error } = await supabase
        .from('reviews')
        .update({ content: editContent, rating: editRating })
        .eq('id', id)
        .eq('user_id', currentUser?.id); // 본인 확인용 보안 조건 추가

      if (error) throw error;

      setReviews(reviews.map(r => r.id === id ? { ...r, content: editContent, rating: editRating } : r));
      resetReviewState();
      onShowSuccess('수정 완료', '후기가 수정되었습니다.');
    } catch (err) {
      alert('수정 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteReview = async (review: Review) => {
    // 본인이거나 관리자일 때만 삭제 가능
    if (review.user_id !== currentUser?.id && !isAdmin) return alert("삭제 권한이 없습니다.");
    
    if (window.confirm("이 후기를 삭제하시겠습니까?")) {
      try {
        const { error } = await supabase
          .from('reviews')
          .delete()
          .eq('id', review.id);

        if (error) throw error;

        setReviews(reviews.filter(r => r.id !== review.id));
        onShowSuccess('삭제 완료', '후기가 정상적으로 삭제되었습니다.');
      } catch (err) {
        alert('삭제 중 오류가 발생했습니다.');
      }
    }
  };

  // --- 3. 좋아요/싫어요 로직 (중복 방지 및 토글) ---
  const handleReaction = (reviewId: number, type: 'like' | 'dislike') => {
    if (!currentUser) return alert("로그인 후 이용 가능합니다.");
    
    const prevReaction = myReactions[reviewId];

    setReviews(reviews.map(r => {
      if (r.id === reviewId) {
        let { likes, dislikes } = r;

        // 1. 이미 같은 걸 눌렀을 때: 취소
        if (prevReaction === type) {
          type === 'like' ? likes-- : dislikes--;
          setMyReactions({ ...myReactions, [reviewId]: null });
        } 
        // 2. 다른 걸 눌렀을 때: 기존 것 취소 후 새로운 것 반영
        else {
          if (prevReaction === 'like') likes--;
          if (prevReaction === 'dislike') dislikes--;
          type === 'like' ? likes++ : dislikes++;
          setMyReactions({ ...myReactions, [reviewId]: type });
        }

        return { ...r, likes, dislikes };
      }
      return r;
    }));
  };

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
      
      {/* 1. 이미지 영역 (image_url 필드 사용) */}
      <div className="relative h-60 lg:h-72 w-full flex-shrink-0 bg-gray-100">
        <img src={store.image_url || store.imageUrl} alt={store.title} className="w-full h-full object-cover" />
        <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/30 backdrop-blur-md rounded-full text-white z-10">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      {/* 2. 컨텐츠 영역 (스크롤 가능) */}
      <div className="flex-1 overflow-y-auto p-6 pb-32 text-left custom-scrollbar">
        {/* 헤더 정보 */}
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
            {/* 공식 홈페이지 링크: popup_stores 테이블의 link_url 셀을 참조하도록 수정 */}
            {store.link_url && (
              <a href={store.link_url} target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-gray-900 text-white rounded-full text-[12px] font-bold transition-transform active:scale-95">🌐 공식 홈페이지</a>
            )}
          </div>
          <p className="text-gray-600 text-[14px] leading-relaxed whitespace-pre-line">{store.description}</p>
        </div>

        {/* --- 리뷰 섹션 --- */}
        <div className="pt-8 border-t-[8px] border-gray-50 -mx-6 px-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-[18px] font-bold text-[#191f28]">방문자 후기 <span className="text-[#3182f6] ml-1">{reviews.length}</span></h3>
            {/* 로그인 한 상태에서만 작성 버튼 노출 */}
            {currentUser && !isWriting && editingId === null && (
              <button 
                onClick={() => setIsWriting(true)}
                className="text-[#3182f6] text-[14px] font-bold px-4 py-2 bg-blue-50 rounded-full active:scale-95 transition-all"
              >
                후기 작성하기
              </button>
            )}
          </div>

          {/* 로딩 표시 */}
          {isLoading ? (
            <div className="py-10 text-center text-gray-400 text-[14px]">후기를 불러오는 중...</div>
          ) : (
            <>
              {/* 인라인 입력창 (작성 및 수정 공용) */}
              {(isWriting || editingId !== null) && (
                <div className="mb-8 p-5 bg-gray-50 rounded-2xl border border-blue-100 shadow-sm animate-in fade-in slide-in-from-top-2">
                  <div className="flex gap-2 mb-3">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button key={star} onClick={() => setEditRating(star)} className={`text-2xl ${editRating >= star ? 'text-yellow-400' : 'text-gray-200'}`}>★</button>
                    ))}
                  </div>
                  <textarea 
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    placeholder="솔직한 후기를 남겨주세요."
                    className="w-full h-28 p-4 bg-white rounded-xl border-none text-[14px] focus:ring-2 focus:ring-blue-500 shadow-inner resize-none"
                  />
                  <div className="flex gap-2 mt-3">
                    <button onClick={resetReviewState} className="flex-1 py-3 bg-white text-gray-400 rounded-xl font-bold text-[13px]">취소</button>
                    <button 
                      onClick={() => editingId !== null ? handleUpdateReview(editingId) : handleAddReview()}
                      className="flex-[2] py-3 bg-[#3182f6] text-white rounded-xl font-bold text-[13px] shadow-lg active:scale-[0.98]"
                    >
                      {editingId !== null ? "수정 완료" : "등록하기"}
                    </button>
                  </div>
                </div>
              )}

              {/* 리뷰 리스트 */}
              <div className="divide-y divide-gray-100">
                {reviews.length === 0 ? (
                  <div className="py-10 text-center text-gray-400 text-[14px]">아직 작성된 후기가 없습니다.</div>
                ) : (
                  reviews.map((review) => {
                    const isMyReview = currentUser?.id === review.user_id;
                    const reaction = myReactions[review.id];

                    return (
                      <div key={review.id} className="py-6 flex flex-col">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[15px] text-[#333d4b]">{review.user_nickname} {isMyReview && <span className="text-[11px] text-blue-500 font-medium">(나)</span>}</span>
                            </div>
                            <div className="flex text-yellow-400 text-[11px]">
                              {"★".repeat(review.rating)}
                              <span className="text-gray-300 ml-2 font-normal">{new Date(review.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                          {/* 본인 또는 관리자만 제어 가능한 버튼 */}
                          {(isMyReview || isAdmin) && editingId !== review.id && (
                            <div className="flex gap-3 text-[12px] font-medium text-gray-400">
                              <button onClick={() => { setEditingId(review.id); setEditContent(review.content); setEditRating(review.rating); }}>수정</button>
                              <button onClick={() => handleDeleteReview(review)} className="text-red-400 hover:text-red-600">삭제</button>
                            </div>
                          )}
                        </div>
                        <p className="text-[14px] text-[#4e5968] leading-relaxed mb-4 whitespace-pre-wrap">{review.content}</p>
                        
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleReaction(review.id, 'like')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-xl text-[12px] font-bold transition-all ${
                              reaction === 'like' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-gray-100 text-gray-500'
                            }`}
                          >
                            👍 {review.likes}
                          </button>
                          <button 
                            onClick={() => handleReaction(review.id, 'dislike')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-xl text-[12px] font-bold transition-all ${
                              reaction === 'dislike' ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white border-gray-100 text-gray-500'
                            }`}
                          >
                            👎 {review.dislikes}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 3. 하단 고정 액션 바 */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-white/95 backdrop-blur-lg flex gap-3 z-30">
        <button onClick={() => onShowSuccess('제보 완료', '수정 제보가 정상적으로 접수되었습니다.')} className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl font-bold text-[13px]">수정 요청</button>
        <button onClick={() => setIsMapSelectOpen(true)} className="flex-[2.5] py-4 bg-black text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
          길찾기 시작
        </button>
      </div>

      {/* 길찾기 앱 선택 모달 */}
      <AnimatePresence>
        {isMapSelectOpen && (
          <div className="fixed inset-0 z-[10001] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMapSelectOpen(false)} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-[280px] bg-white rounded-[28px] p-6 shadow-2xl text-center">
              <h4 className="font-bold text-gray-900 mb-6 text-[15px]">길찾기 앱 선택</h4>
              <div className="grid grid-cols-2 gap-6">
                <button onClick={() => openMap('naver')} className="flex flex-col items-center gap-2">
                  <div className="w-14 h-14 bg-[#03C75A] rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-md">N</div>
                  <span className="text-[11px] font-semibold text-gray-600">네이버</span>
                </button>
                <button onClick={() => openMap('kakao')} className="flex flex-col items-center gap-2">
                  <div className="w-14 h-14 bg-[#FEE500] rounded-2xl flex items-center justify-center shadow-md">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="#3C1E1E"><path d="M12 3C6.477 3 2 6.477 2 10.75c0 2.79 1.857 5.232 4.636 6.643l-1.176 4.314c-.06.22.194.402.383.27l5.085-3.535c.348.037.702.058 1.072.058 5.523 0 10-3.477 10-7.75S17.523 3 12 3z"/></svg>
                  </div>
                  <span className="text-[11px] font-semibold text-gray-600">카카오</span>
                </button>
              </div>
              <button onClick={() => setIsMapSelectOpen(false)} className="mt-6 text-gray-400 text-[13px] font-medium">닫기</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DetailModal;
