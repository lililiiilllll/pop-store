import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';

// --- 인터페이스 정의 ---
interface Review {
  id: number;
  popup_id: number;
  user_id: string;
  user_nickname: string;
  content: string;
  rating: number;
  likes: number;
  dislikes: number;
  is_blinded: boolean;
  created_at: string;
}

interface DetailModalProps {
  store: any;
  onClose: () => void;
  onShowSuccess: (title: string, message: string) => void;
  currentUser?: { id: string; name: string } | null;
  isAdmin?: boolean;
}

// --- [신규] 수정 요청 모달 컴포넌트 ---
const CorrectionModal: React.FC<{
  popupId: number;
  popupTitle: string;
  userId?: string;
  onClose: () => void;
  onSuccess: (title: string, message: string) => void;
}> = ({ popupId, popupTitle, userId, onClose, onSuccess }) => {
  const [titleFix, setTitleFix] = useState('');
  const [descriptionFix, setDescriptionFix] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) return alert('수정 요청 사유를 입력해주세요.');
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('correction_requests')
        .insert([{
          popup_id: popupId,
          user_id: userId || null,
          title_fix: titleFix || null,
          description_fix: descriptionFix || null,
          reason: reason,
          status: 'pending'
        }]);

      if (error) throw error;
      onSuccess('제보 완료', '수정 제보가 정상적으로 접수되었습니다.');
      onClose();
    } catch (err) {
      console.error(err);
      alert('접수 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10002] flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="relative w-full max-w-[400px] bg-white rounded-[32px] p-8 shadow-2xl overflow-hidden">
        <h3 className="text-[20px] font-bold text-[#191f28] mb-1">정보 수정 요청</h3>
        <p className="text-[13px] text-gray-400 mb-6">{popupTitle}</p>
        
        <div className="space-y-4">
          <div>
            <label className="text-[12px] font-bold text-gray-500 ml-1 mb-1 block">수정할 제목 (선택)</label>
            <input value={titleFix} onChange={(e) => setTitleFix(e.target.value)} placeholder="변경할 이름을 입력하세요" className="w-full bg-gray-50 border-none rounded-xl p-4 text-[14px] outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-[12px] font-bold text-gray-500 ml-1 mb-1 block">수정할 내용 (선택)</label>
            <textarea value={descriptionFix} onChange={(e) => setDescriptionFix(e.target.value)} placeholder="변경할 상세 정보를 입력하세요" className="w-full h-24 bg-gray-50 border-none rounded-xl p-4 text-[14px] outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
          <div>
            <label className="text-[12px] font-bold text-gray-500 ml-1 mb-1 block">제보 사유 (필수)</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="잘못된 정보를 알려주세요" className="w-full h-20 bg-gray-50 border-none rounded-xl p-4 text-[14px] outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <button onClick={onClose} className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl font-bold text-[14px]">취소</button>
          <button onClick={handleSubmit} disabled={isSubmitting} className="flex-[2] py-4 bg-[#3182f6] text-white rounded-2xl font-bold text-[14px] shadow-lg active:scale-95 transition-all">
            {isSubmitting ? '처리 중...' : '제출하기'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
// --- [신규] 리뷰 신고 모달 컴포넌트 (파일 내부 정의) ---
const ReportModal: React.FC<{
  reviewId: number;
  userId: string;
  onClose: () => void;
  onSuccess: (title: string, message: string) => void;
}> = ({ reviewId, userId, onClose, onSuccess }) => {
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reasons = ["스팸/부적절한 홍보", "욕설/비하 발언", "음란물/유해한 내용", "개인정보 노출", "기타 사유"];

  const handleReport = async () => {
    if (!selectedReason) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('review_reports') // 테이블명 일치 확인됨
        .insert([{
          review_id: reviewId,
          user_id: userId,
          reason: selectedReason
        }]);

      if (error) throw error;
      onSuccess('신고 완료', '신고가 정상적으로 접수되었습니다.');
      onClose();
    } catch (err) {
      console.error(err);
      alert('신고 접수 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

return (
    <div className="fixed inset-0 z-[10005] flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-[340px] bg-white rounded-[32px] p-7 shadow-2xl">
        <h3 className="text-[19px] font-bold text-[#191f28] mb-5">리뷰 신고</h3>
        <div className="space-y-2 mb-8">
          {reasons.map(r => (
            <button
              key={r}
              onClick={() => setSelectedReason(r)}
              className={`w-full p-4 rounded-xl text-left text-[14px] transition-all ${
                selectedReason === r ? 'bg-red-50 text-red-600 font-bold border border-red-100' : 'bg-gray-50 text-gray-500'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl font-bold">취소</button>
          <button 
            onClick={handleReport} 
            disabled={!selectedReason || isSubmitting}
            className={`flex-1 py-4 rounded-2xl font-bold text-white transition-all ${selectedReason ? 'bg-red-500 shadow-lg active:scale-95' : 'bg-gray-200'}`}
          >
            {isSubmitting ? '처리 중...' : '신고하기'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
// --- 메인 DetailModal 컴포넌트 ---
const DetailModal: React.FC<DetailModalProps> = ({ 
  store, 
  onClose, 
  onShowSuccess, 
  currentUser, 
  isAdmin = false 
}) => {
  const [isMapSelectOpen, setIsMapSelectOpen] = useState(false);
  const [isCorrectionOpen, setIsCorrectionOpen] = useState(false);
  const [reportingReviewId, setReportingReviewId] = useState<number | null>(null); // 신고할 리뷰 ID 상태
  
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [myReactions, setMyReactions] = useState<Record<number, 'like' | 'dislike' | null>>({});
  
  const [isWriting, setIsWriting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editRating, setEditRating] = useState(5);

  // --- 새로 추가되는 상태 ---
  const [averageRating, setAverageRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [likeCount, setLikeCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);

  useEffect(() => {
    const fetchStatsAndLikes = async () => {
      if (!store?.id) return;
      // 별점 데이터 가져오기
      const { data: revData } = await supabase.from('reviews').select('rating').eq('popup_id', store.id).eq('is_blinded', false);
      if (revData && revData.length > 0) {
        const total = revData.reduce((acc, curr) => acc + curr.rating, 0);
        setAverageRating(Number((total / revData.length).toFixed(1)));
        setReviewCount(revData.length);
      }
      // 찜 데이터 가져오기
      const { count } = await supabase.from('favorites').select('*', { count: 'exact', head: true }).eq('popup_id', store.id);
      setLikeCount(count || 0);
      if (currentUser?.id) {
        const { data } = await supabase.from('favorites').select('*').eq('popup_id', store.id).eq('user_id', currentUser.id).single();
        setIsLiked(!!data);
      }
    };
    fetchStatsAndLikes();
  }, [store?.id, currentUser?.id]);

// 찜 토글 핸들러 (비회원 대응)
  const handleLikeToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // 🔔 비회원 체크
    if (!currentUser) {
      alert("로그인이 필요한 기능입니다. 로그인 후 찜해보세요! 💖");
      return;
    }

    if (isLiked) {
      const { error } = await supabase.from('favorites').delete().eq('popup_id', store.id).eq('user_id', currentUser.id);
      if (!error) { setIsLiked(false); setLikeCount(prev => Math.max(0, prev - 1)); }
    } else {
      const { error } = await supabase.from('favorites').insert({ popup_id: store.id, user_id: currentUser.id });
      if (!error) { setIsLiked(true); setLikeCount(prev => prev + 1); }
    }
  };

  // 찜 개수 조회 로직
  useEffect(() => {
    const fetchLikeCount = async () => {
      if (!store?.id) return;
      const { count, error } = await supabase
        .from('favorites')
        .select('*')
        .eq('popup_id', store.id)
        .eq('user_id', currentUser.id)
        .maybeSingle(); // popupId 대신 store.id 사용

      if (!error) setLikeCount(count || 0);
    };
    fetchLikeCount();
  }, [store?.id]);
  
  const fetchReviews = useCallback(async () => {
    if (!store?.id) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('popup_id', store.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setReviews(data || []);
    } catch (err) {
      console.error('리뷰 로딩 에러:', err);
    } finally {
      setIsLoading(false);
    }
  }, [store?.id]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  if (!store) return null;

  const getAutoWalkTime = () => {
    if (store.nearby_station && store.walking_time) {
      return `${store.nearby_station} 도보 ${store.walking_time}분`;
    } else if (store.nearby_station) {
      return `${store.nearby_station} 인근`;
    }
    return "인근 지하철역 정보 없음";
  };

  const resetReviewState = () => {
    setIsWriting(false);
    setEditingId(null);
    setEditContent('');
    setEditRating(5);
  };

const handleAddReview = async () => {
    // 🔔 비회원 체크
    if (!currentUser) {
      alert("로그인 후 소중한 후기를 남겨주세요! 😊");
      return;
    }
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
    }
  };

  const handleUpdateReview = async (id: number) => {
    try {
      const { error } = await supabase
        .from('reviews')
        .update({ content: editContent, rating: editRating })
        .eq('id', id)
        .eq('user_id', currentUser?.id); 
      if (error) throw error;
      setReviews(reviews.map(r => r.id === id ? { ...r, content: editContent, rating: editRating } : r));
      resetReviewState();
      onShowSuccess('수정 완료', '후기가 수정되었습니다.');
    } catch (err) {
      alert('수정 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteReview = async (review: Review) => {
    if (review.user_id !== currentUser?.id && !isAdmin) return alert("삭제 권한이 없습니다.");
    if (window.confirm("이 후기를 삭제하시겠습니까?")) {
      try {
        const { error } = await supabase.from('reviews').delete().eq('id', review.id);
        if (error) throw error;
        setReviews(reviews.filter(r => r.id !== review.id));
        onShowSuccess('삭제 완료', '후기가 정상적으로 삭제되었습니다.');
      } catch (err) {
        alert('삭제 중 오류가 발생했습니다.');
      }
    }
  };

const handleReaction = async (reviewId: number, type: 'like' | 'dislike') => {
    if (!currentUser) return alert("로그인 후 이용 가능합니다.");
    
    const prevReaction = myReactions[reviewId];
    
    // UI 즉각 반영 (Optimistic Update)
    setReviews(reviews.map(r => {
      if (r.id === reviewId) {
        let { likes, dislikes } = r;
        if (prevReaction === type) {
          type === 'like' ? likes-- : dislikes--;
          setMyReactions({ ...myReactions, [reviewId]: null });
        } else {
          if (prevReaction === 'like') likes--;
          if (prevReaction === 'dislike') dislikes--;
          type === 'like' ? likes++ : dislikes++;
          setMyReactions({ ...myReactions, [reviewId]: type });
        }
        return { ...r, likes, dislikes };
      }
      return r;
    }));
    
    // DB 업데이트 로직 (필요시 추가)
    try {
      const field = type === 'like' ? 'likes' : 'dislikes';
      await supabase.rpc('increment_review_reaction', { 
        row_id: reviewId, 
        field_name: field 
      });
    } catch (err) {
      console.error("반응 업데이트 실패:", err);
    }
  }; // <--- 이 중괄호가 닫혀야 오류가 해결됩니다.

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
      
{/* 1. 이미지 영역 */}
      <div className="relative h-64 lg:h-80 w-full flex-shrink-0 bg-gray-100">
        <img src={store.image_url} alt={store.title} className="w-full h-full object-cover" />
        
        {/* ✅ 이미지 위 찜 버튼 */}
        <button 
          onClick={handleLikeToggle}
          className="absolute top-5 left-5 p-3 bg-white/90 backdrop-blur-md rounded-full shadow-lg z-20 transition-transform active:scale-90"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill={isLiked ? "#FF4B4B" : "none"} stroke={isLiked ? "#FF4B4B" : "#191f28"} strokeWidth="2.5">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </button>
        
        <button onClick={onClose} className="absolute top-5 right-5 p-2 bg-black/20 backdrop-blur-md rounded-full text-white z-10">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>
  

      {/* 별점 및 찜 표시 UI 위치 수정 (이미지 아래 컨텐츠 영역 시작점) */}
      <div className="px-6 pt-4 flex items-center gap-3 text-sm font-medium">
        <div className="flex items-center gap-1 text-orange-500">
          <span className="text-lg">★</span>
          <span className="text-[#191f28] text-base">{averageRating}</span>
          <span className="text-gray-400">({reviewCount})</span>
        </div>
        <div className="w-[1px] h-3 bg-gray-200" /> 
        <div className="flex items-center gap-1.5 text-red-500">
          <span className="text-base">♥</span>
          <span className="text-[#191f28]">{likeCount}명이 찜했어요</span>
        </div>
      </div>

{/* 2. 컨텐츠 영역 */}
<div className="flex-1 overflow-y-auto p-6 pt-5 pb-32 text-left custom-scrollbar">
  <div className="mb-6">
    <h2 className="text-[24px] font-extrabold text-[#191f28] mb-3">{store.title}</h2>
    
    <div className="flex flex-wrap gap-2 mb-4">
      {/* 기본 정보 배지들 */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 rounded-full text-[#3182f6] text-[12px] font-bold">
        🚇 {getAutoWalkTime()}
      </div>
      <div className={`px-3 py-1.5 rounded-full text-[12px] font-bold ${store.is_free ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
        {store.is_free ? '🎁 무료입장' : '유료입장'}
      </div>
      <div className="px-3 py-1.5 bg-purple-50 text-purple-600 rounded-full text-[12px] font-bold">
        {store.requires_reservation ? '📅 예약필수' : '✅ 현장입장'}
      </div>

      {/* ✅ 추가: 공식 홈페이지 이동 버튼 (link_url 셀 연동) */}
      {store.link_url && (
        <button 
          onClick={() => window.open(store.link_url, '_blank')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white rounded-full text-[12px] font-bold hover:bg-gray-700 transition-all active:scale-95 shadow-sm"
        >
          <span>공식 홈페이지</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
          </svg>
        </button>
      )}
    </div>

    {/* ✅ 간략 설명 (description) */}
    {store.description && (
      <p className="text-[#4e5968] text-[15px] leading-relaxed mb-6 whitespace-pre-line">
        {store.description}
      </p>
    )}
  </div>

  {/* 기본 정보 카드 */}
  <div className="space-y-4 mb-8 bg-gray-50 p-5 rounded-2xl">
    <div className="flex items-start gap-3">
      <span className="text-[14px] font-bold text-[#191f28] w-16 shrink-0">운영 기간</span>
      <span className="text-[14px] text-[#4e5968]">{store.start_date || '-'} ~ {store.end_date || '-'}</span>
    </div>
    <div className="flex items-start gap-3">
      <span className="text-[14px] font-bold text-[#191f28] w-16 shrink-0">상세 주소</span>
      <span className="text-[14px] text-[#4e5968]">{store.address || '정보 없음'}</span>
    </div>
    <div className="flex items-start gap-3">
      <span className="text-[14px] font-bold text-[#191f28] w-16 shrink-0">운영 시간</span>
      <span className="text-[14px] text-[#4e5968] whitespace-pre-line">{store.operating_hours || '정보 없음'}</span>
    </div>
  </div>

{/* 상세 정보 섹션 - 리뷰 섹션 바로 위에 배치 */}
<div className="mt-8 mb-10">
  <h3 className="text-[17px] font-bold text-[#191f28] mb-3 border-b pb-2">상세 정보</h3>
  
  {/* 여러 종류의 필드명을 모두 체크 (방어적 코드) */}
  {store.detailed_content || store.detail_content || store.description ? (
    <p className="text-[14px] text-[#4e5968] leading-[1.8] whitespace-pre-wrap">
      {store.detailed_content || store.detail_content || store.description}
    </p>
  ) : (
    <p className="text-[14px] text-gray-300 italic">등록된 상세 정보가 없습니다.</p>
  )}
</div>

        {/* 리뷰 섹션 */}
        <div className="pt-8 border-t border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-[#191f28]">방문자 후기</h3>
              <div className="flex items-center gap-1 px-2 py-0.5 bg-orange-50 rounded-lg text-orange-500 text-[14px] font-bold">
                <span>★</span><span>{averageRating}</span>
              </div>
              <span className="text-gray-400 text-[14px]">({reviews.length})</span>
            </div>
            <button onClick={() => setIsWriting(true)} className="text-[#3182f6] text-[13px] font-bold px-3 py-1.5 bg-blue-50 rounded-full">
              기록하기
            </button>
          </div>

          {/* 리뷰 작성/수정 폼 */}
          {(isWriting || editingId !== null) && (
            <div className="mb-8 p-5 bg-gray-50 rounded-[24px]">
              <div className="flex gap-1 mb-3">
                {[1, 2, 3, 4, 5].map(s => (
                  <button key={s} onClick={() => setEditRating(s)} className={`text-xl ${editRating >= s ? 'text-orange-500' : 'text-gray-300'}`}>★</button>
                ))}
              </div>
              <textarea 
                value={editContent} 
                onChange={(e) => setEditContent(e.target.value)} 
                placeholder={currentUser ? "방문 경험을 공유해주세요." : "로그인 후 후기를 남겨보세요!"}
                className="w-full h-24 bg-transparent border-none focus:ring-0 text-sm resize-none p-0" 
              />
              <div className="flex justify-end gap-2 mt-2">
                <button onClick={() => { setIsWriting(false); setEditingId(null); setEditContent(''); }} className="px-4 py-2 text-gray-400 text-sm">취소</button>
                <button 
                  onClick={() => editingId !== null ? handleUpdateReview(editingId) : handleAddReview()} 
                  className="px-5 py-2 bg-[#3182f6] text-white rounded-xl text-sm font-bold"
                >
                  {editingId !== null ? '수정완료' : '등록하기'}
                </button>
              </div>
            </div>
          )}

          {/* 리뷰 리스트 (블라인드 기능 포함) */}
          <div className="space-y-4">
            {isLoading ? (
              <div className="py-10 text-center text-gray-300 text-sm">불러오는 중...</div>
            ) : reviews.length > 0 ? (
              reviews.map(review => (
                <div key={review.id} className="p-5 bg-white border border-gray-100 rounded-[24px]">
                  <div className="flex justify-between mb-2">
                    <span className="font-bold text-sm">{review.user_nickname}</span>
                    <span className="text-xs text-gray-300">{new Date(review.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex text-orange-400 text-xs mb-2">{'★'.repeat(review.rating)}</div>

                  {/* 블라인드 판별 로직 */}
{review.is_blinded && !isAdmin ? (
  <p className="text-sm text-gray-300 italic py-2">관리자에 의해 블라인드 처리된 후기입니다.</p>
) : (
  <>
    {review.is_blinded && isAdmin && (
      <div className="mb-2 px-2 py-1 bg-red-50 text-red-500 text-[10px] font-bold rounded inline-block">관리자 확인: 블라인드 상태</div>
    )}
    <p className="text-[14px] text-[#4e5968] leading-relaxed mb-4 whitespace-pre-wrap">{review.content}</p>
    
    {/* ✅ 좋아요/싫어요 버튼 섹션 */}
    <div className="flex gap-2 mb-4">
      <button 
        onClick={() => handleReaction(review.id, 'like')} 
        className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-100 rounded-xl text-[12px] font-bold text-gray-500 bg-white hover:bg-blue-50 transition-all"
      >
        👍 {review.likes || 0}
      </button>
      <button 
        onClick={() => handleReaction(review.id, 'dislike')} 
        className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-100 rounded-xl text-[12px] font-bold text-gray-500 bg-white hover:bg-red-50 transition-all"
      >
        👎 {review.dislikes || 0}
      </button>
      {/* 기존 좋아요/싫어요 버튼 옆에 추가 */}
      <button 
        onClick={() => {
          if(!currentUser) return alert("로그인 후 이용 가능합니다.");
          setReportingReviewId(review.id);
        }}
        className="ml-auto text-[11px] text-gray-300 hover:text-red-400 underline underline-offset-2"
        >
        신고하기
        </button>
    </div>
  </>
)}

                  {/* 수정/삭제 버튼 (작성자/관리자 전용) */}
                  {(currentUser?.id === review.user_id || isAdmin) && (
                    <div className="flex gap-3 mt-2">
                      <button onClick={() => { setEditingId(review.id); setEditContent(review.content); setEditRating(review.rating); }} className="text-xs text-gray-400">수정</button>
                      <button onClick={() => handleDeleteReview(review)} className="text-xs text-red-300">삭제</button>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="py-20 text-center text-gray-300 text-sm">첫 번째 후기를 남겨보세요!</div>
            )}
          </div>
        </div>
      </div> {/* overflow-y-auto 영역 닫기 */}


{/* 3. 하단 고정 액션 바 */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-white/95 backdrop-blur-lg flex gap-3 z-30">
        <button 
          onClick={() => setIsCorrectionOpen(true)} 
          className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl font-bold text-[13px]"
        >
          수정 요청
        </button>
        <button 
          onClick={() => setIsMapSelectOpen(true)} 
          className="flex-[2.5] py-4 bg-black text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
          길찾기 시작
        </button>
      </div>

      {/* 모달 렌더링 영역 */}
      <AnimatePresence>
        {isCorrectionOpen && (
          <CorrectionModal 
            popupId={store.id}
            popupTitle={store.title}
            userId={currentUser?.id}
            onClose={() => setIsCorrectionOpen(false)}
            onSuccess={onShowSuccess}
          />
        )}

{isMapSelectOpen && (
          <div className="fixed inset-0 z-[10001] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setIsMapSelectOpen(false)} 
              className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }} 
              className="relative w-full max-w-[280px] bg-white rounded-[28px] p-6 shadow-2xl text-center"
            >
              <h4 className="font-bold text-gray-900 mb-6 text-[15px]">길찾기 앱 선택</h4>
              <div className="grid grid-cols-2 gap-6">
                <button onClick={() => openMap('naver')} className="flex flex-col items-center gap-2">
                  <div className="w-14 h-14 bg-[#03C75A] rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-md">N</div>
                  <span className="text-[11px] font-semibold text-gray-600">네이버</span>
                </button>
                <button onClick={() => openMap('kakao')} className="flex flex-col items-center gap-2">
                  <div className="w-14 h-14 bg-[#FEE500] rounded-2xl flex items-center justify-center shadow-md">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="#3C1E1E">
                      <path d="M12 3C6.477 3 2 6.477 2 10.75c0 2.79 1.857 5.232 4.636 6.643l-1.176 4.314c-.06.22.194.402.383.27l5.085-3.535c.348.037.702.058 1.072.058 5.523 0 10-3.477 10-7.75S17.523 3 12 3z"/>
                    </svg>
                  </div>
                  <span className="text-[11px] font-semibold text-gray-600">카카오</span>
                </button>
              </div>
              <button onClick={() => setIsMapSelectOpen(false)} className="mt-6 text-gray-400 text-[13px] font-medium">닫기</button>
            </motion.div>
          </div>
        )}

        {/* ✅ 신고하기 모달 추가 위치 (에러 발생 지점 수정) */}
        {reportingReviewId && (
          <ReportModal 
            reviewId={reportingReviewId} 
            userId={currentUser?.id || ''} 
            onClose={() => setReportingReviewId(null)} 
            onSuccess={onShowSuccess} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default DetailModal;
