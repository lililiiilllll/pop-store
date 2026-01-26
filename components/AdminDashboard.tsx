import React, { useState, useRef, useEffect } from 'react';
import { Icons } from '../constants';
import { PopupStore } from '../types';
import { supabase } from '../lib/supabase';

const CATEGORIES = ['패션', '푸드', '아트', '엔터', '라이프스타일', '기타'];

// --- 인터페이스 정의 ---
interface RecommendedKeyword {
  id: number;
  keyword: string;
  order_index: number;
}

interface SearchLog {
  id: number;
  keyword: string;
  search_count: number;
  updated_at: string;
}

interface Review {
  id: number;
  popup_id: number;
  user_id: string;
  user_nickname: string;
  rating: number;
  content: string;
  image_url?: string;
  created_at: string;
  is_blinded: boolean;
  likes: number;
  dislikes: number;
  report_count: number; // 신고 횟수
  popup_stores?: { title: string } | null;
}

interface EditRequest {
  id: number;
  store_id: number;
  user_id: string;
  requested_content: Partial<PopupStore>;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  popup_stores?: { title: string };
}

interface AdminDashboardProps {
  allStores: PopupStore[];
  onBack: () => void;
  onRefresh: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ allStores, onBack, onRefresh }) => {
  // 탭 상태
  const [activeTab, setActiveTab] = useState<'approval' | 'keywords' | 'edit_request' | 'reviews'>('approval');
  const [approvalSubTab, setApprovalSubTab] = useState<'pending' | 'verified'>('pending');
  
  // 수정 모달 및 입력 상태
  const [editingStore, setEditingStore] = useState<PopupStore | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [customCategory, setCustomCategory] = useState('');
  const [keywordInput, setKeywordInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 추천 키워드 & 통계 상태
  const [recKeywords, setRecKeywords] = useState<RecommendedKeyword[]>([]);
  const [newRecKeyword, setNewRecKeyword] = useState('');
  const [searchLogs, setSearchLogs] = useState<SearchLog[]>([]);
  
  // 리뷰 관리 상태
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [showOnlyReported, setShowOnlyReported] = useState(false); 
  const [reviewSortOrder, setReviewSortOrder] = useState<'latest' | 'reports'>('latest'); 
  const [editingReview, setEditingReview] = useState<Review | null>(null); 

  // 수정 요청 상태
  const [editRequests, setEditRequests] = useState<EditRequest[]>([]);

  // --- 데이터 페칭 효과 ---
  useEffect(() => {
    if (activeTab === 'keywords') fetchKeywordAdminData();
    if (activeTab === 'reviews') fetchReviews();
    if (activeTab === 'edit_request') fetchEditRequests();
  }, [activeTab, showOnlyReported, reviewSortOrder]);

  const fetchKeywordAdminData = async () => {
    const { data: recData } = await supabase.from('recommended_keywords').select('*').order('order_index', { ascending: true });
    if (recData) setRecKeywords(recData);
    const { data: logData } = await supabase.from('search_logs').select('*').order('search_count', { ascending: false });
    if (logData) setSearchLogs(logData);
  };

  const fetchReviews = async () => {
    setIsLoadingReviews(true);
    try {
      let query = supabase
        .from('reviews')
        .select(`
          id, popup_id, user_id, user_nickname, rating, content, 
          image_url, created_at, is_blinded, likes, dislikes, report_count,
          popup_stores:popup_id ( title )
        `);

      if (showOnlyReported) {
        query = query.gt('report_count', 0); // 신고가 1회 이상인 것만
      }

      query = query.order(reviewSortOrder === 'reports' ? 'report_count' : 'created_at', { ascending: false });
      
      const { data, error } = await query;
      if (error) throw error;
      setReviews(data as any || []);
    } catch (err) {
      console.error("리뷰 데이터 로드 실패:", err);
    } finally {
      setIsLoadingReviews(false);
    }
  };

  const fetchEditRequests = async () => {
    const { data } = await supabase.from('edit_requests').select(`*, popup_stores ( title )`).order('created_at', { ascending: false });
    if (data) setEditRequests(data);
  };

  // --- 엑셀(CSV) 다운로드 기능 ---
  const downloadReviewsExcel = () => {
    if (reviews.length === 0) return alert('다운로드할 데이터가 없습니다.');
    
    const headers = ['리뷰ID', '팝업명', '작성자', '별점', '내용', '신고횟수', '상태', '작성일'];
    const rows = reviews.map(r => [
      r.id,
      r.popup_stores?.title || r.popup_id,
      r.user_nickname || '익명',
      r.rating,
      r.content?.replace(/,/g, ' ').replace(/\n/g, ' '), // CSV 쉼표/줄바꿈 처리
      r.report_count,
      r.is_blinded ? '블라인드' : '정상',
      new Date(r.created_at).toLocaleDateString()
    ]);

    const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `리뷰현황_리포트_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // --- 카테고리 통계 데이터 계산 ---
  const getCategoryStats = () => {
    const stats: { [key: string]: number } = {};
    allStores.forEach(s => {
      stats[s.category] = (stats[s.category] || 0) + 1;
    });
    return Object.entries(stats).sort((a, b) => b[1] - a[1]);
  };

  // --- 리뷰 액션 핸들러 ---
  const handleToggleBlind = async (review: Review) => {
    const { error } = await supabase.from('reviews').update({ is_blinded: !review.is_blinded }).eq('id', review.id);
    if (!error) fetchReviews();
  };

  const handleUpdateReview = async () => {
    if (!editingReview) return;
    const { error } = await supabase.from('reviews').update({ 
      content: editingReview.content, 
      rating: editingReview.rating 
    }).eq('id', editingReview.id);
    
    if (!error) { 
      setEditingReview(null); 
      fetchReviews(); 
    }
  };

  // --- 팝업 수정 핸들러 ---
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingStore) return;
    const filePath = `popups/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage.from('popup-images').upload(filePath, file);
    if (!uploadError) {
      const { data: { publicUrl } } = supabase.storage.from('popup-images').getPublicUrl(filePath);
      setEditingStore({ ...editingStore, imageUrl: publicUrl });
    }
  };

  const addKeyword = () => {
    if (!keywordInput.trim() || !editingStore) return;
    const tag = keywordInput.trim().replace(/^#/, '');
    const currentKeywords = editingStore.keywords || [];
    if (currentKeywords.includes(tag)) return;
    setEditingStore({ ...editingStore, keywords: [...currentKeywords, tag] });
    setKeywordInput('');
  };

  const removeKeyword = (tagToRemove: string) => {
    if (!editingStore) return;
    setEditingStore({ ...editingStore, keywords: (editingStore.keywords || []).filter(tag => tag !== tagToRemove) });
  };

  const handleUpdateStore = async (statusOverride?: boolean) => {
    if (!editingStore) return;
    const finalCategory = (editingStore.category === '기타' && customCategory.trim() !== '') ? customCategory.trim() : editingStore.category;
    
    const { error } = await supabase.from('popup_stores').update({
      title: editingStore.title, address: editingStore.address, category: finalCategory, 
      description: editingStore.description, image_url: editingStore.imageUrl, 
      is_free: editingStore.is_free, is_reservation_required: editingStore.is_reservation_required,
      is_verified: statusOverride !== undefined ? statusOverride : editingStore.is_verified,
      keywords: editingStore.keywords || []
    }).eq('id', editingStore.id);
    
    if (!error) { setIsEditModalOpen(false); onRefresh(); }
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-[#f2f4f6] flex flex-col overflow-hidden font-sans text-[#191f28]">
      {/* HEADER */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="w-10 h-10 flex items-center justify-center bg-gray-50 hover:bg-gray-100 rounded-full">
             {Icons.X ? <Icons.X size={24} className="text-gray-600" /> : 'X'}
          </button>
          <h1 className="text-[20px] font-bold">관리자 콘솔</h1>
        </div>
      </header>

      {/* NAVIGATION */}
      <nav className="bg-white px-6 flex border-b border-gray-50 overflow-x-auto no-scrollbar">
        {[
          { id: 'approval', label: '승인 관리' },
          { id: 'keywords', label: '추천/통계' },
          { id: 'edit_request', label: '수정 요청' },
          { id: 'reviews', label: '리뷰 관리' }
        ].map((tab) => (
          <button 
            key={tab.id} 
            onClick={() => setActiveTab(tab.id as any)} 
            className={`px-5 py-4 text-[15px] font-bold transition-all relative flex-shrink-0 ${activeTab === tab.id ? 'text-[#3182f6]' : 'text-gray-400'}`}
          >
            {tab.label}
            {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#3182f6]" />}
          </button>
        ))}
      </nav>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto">
          
          {/* TAB 1: 승인 관리 */}
          {activeTab === 'approval' && (
            <>
              <div className="flex gap-2 mb-6">
                <button onClick={() => setApprovalSubTab('pending')} className={`px-6 py-2.5 rounded-2xl font-bold text-[14px] ${approvalSubTab === 'pending' ? 'bg-[#3182f6] text-white' : 'bg-white text-gray-400'}`}>대기중</button>
                <button onClick={() => setApprovalSubTab('verified')} className={`px-6 py-2.5 rounded-2xl font-bold text-[14px] ${approvalSubTab === 'verified' ? 'bg-[#3182f6] text-white' : 'bg-white text-gray-400'}`}>승인됨</button>
              </div>
              <div className="space-y-3">
                {allStores.filter(s => approvalSubTab === 'pending' ? !s.is_verified : s.is_verified).map(store => (
                  <div key={store.id} className="bg-white p-4 rounded-[24px] flex items-center justify-between shadow-sm border border-white hover:border-blue-50">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <img src={store.imageUrl} className="w-14 h-14 rounded-xl object-cover bg-gray-50 flex-shrink-0" alt="" />
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-bold text-[#3182f6] bg-blue-50 px-1.5 py-0.5 rounded-md uppercase">{store.category}</span>
                        <h3 className="text-[15px] font-bold truncate">{store.title}</h3>
                        <p className="text-[12px] text-gray-400 truncate">{store.address}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setEditingStore({...store}); setIsEditModalOpen(true); }} className="w-[54px] h-[36px] bg-gray-50 text-gray-600 rounded-xl font-bold text-[13px]">수정</button>
                      {approvalSubTab === 'pending' && <button onClick={() => supabase.from('popup_stores').update({ is_verified: true }).eq('id', store.id).then(() => onRefresh())} className="w-[54px] h-[36px] bg-[#3182f6] text-white rounded-xl font-bold text-[13px]">승인</button>}
                      <button onClick={() => { if(confirm('삭제하시겠습니까?')) supabase.from('popup_stores').delete().eq('id', store.id).then(() => onRefresh()) }} className="w-[54px] h-[36px] bg-red-50 text-red-500 rounded-xl font-bold text-[13px]">삭제</button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* TAB 2: 추천/통계 (그래프 추가됨) */}
          {activeTab === 'keywords' && (
            <div className="space-y-8">
              {/* 통계 섹션 */}
              <section className="bg-white rounded-[32px] p-8 shadow-sm">
                <h2 className="text-[18px] font-bold mb-6">카테고리별 팝업 분포</h2>
                <div className="space-y-5">
                  {getCategoryStats().map(([cat, count]) => (
                    <div key={cat} className="space-y-2">
                      <div className="flex justify-between text-[13px] font-bold">
                        <span>{cat}</span>
                        <span className="text-[#3182f6]">{count}개 ({(count / allStores.length * 100).toFixed(1)}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-[#3182f6] h-full transition-all duration-700 ease-out" 
                          style={{ width: `${(count / allStores.length) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* 추천 키워드 관리 */}
              <section className="bg-white rounded-[32px] p-8 shadow-sm">
                <h2 className="text-[18px] font-bold mb-6">추천 키워드 관리</h2>
                <div className="flex gap-3 mb-6">
                  <input className="flex-1 bg-gray-50 border-none rounded-2xl py-4 px-6 text-[15px] outline-none" value={newRecKeyword} onChange={(e) => setNewRecKeyword(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && supabase.from('recommended_keywords').insert({ keyword: newRecKeyword.replace('#',''), order_index: recKeywords.length + 1 }).then(fetchKeywordAdminData)} placeholder="새 추천 키워드" />
                  <button onClick={() => supabase.from('recommended_keywords').insert({ keyword: newRecKeyword.replace('#',''), order_index: recKeywords.length + 1 }).then(fetchKeywordAdminData)} className="px-8 bg-[#3182f6] text-white rounded-2xl font-bold">등록</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recKeywords.map((kw) => (
                    <div key={kw.id} className="flex items-center gap-2 bg-blue-50 text-[#3182f6] px-4 py-2.5 rounded-xl font-bold text-[14px]">#{kw.keyword}<button onClick={() => supabase.from('recommended_keywords').delete().eq('id', kw.id).then(fetchKeywordAdminData)}>{Icons.X ? <Icons.X size={14} /> : 'x'}</button></div>
                  ))}
                </div>
              </section>

              {/* 인기 검색어 통계 */}
              <section className="bg-white rounded-[32px] p-8 shadow-sm overflow-hidden">
                <h2 className="text-[18px] font-bold mb-6">인기 검색어 순위</h2>
                <table className="w-full text-left">
                  <thead className="bg-gray-50 text-[13px] font-bold text-gray-400">
                    <tr><th className="px-6 py-4">순위</th><th className="px-6 py-4">검색어</th><th className="px-6 py-4">횟수</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {searchLogs.map((log, index) => (
                      <tr key={log.id}><td className="px-6 py-4 font-bold text-gray-400">{index + 1}</td><td className="px-6 py-4 font-bold">{log.keyword}</td><td className="px-6 py-4 font-bold text-[#3182f6]">{log.search_count}회</td></tr>
                    ))}
                  </tbody>
                </table>
              </section>
            </div>
          )}

          {/* TAB 3: 수정 요청 */}
          {activeTab === 'edit_request' && (
             <div className="space-y-4">
               <h2 className="text-[18px] font-bold mb-6">사용자 제보 수정 요청 ({editRequests.length})</h2>
               {editRequests.length === 0 ? (
                 <div className="py-20 text-center text-gray-400 bg-white rounded-[32px] border border-dashed border-gray-200">등록된 요청이 없습니다.</div>
               ) : editRequests.map(req => (
                 <div key={req.id} className="bg-white p-6 rounded-[28px] shadow-sm border border-gray-50">
                   <div className="flex justify-between items-start mb-4">
                     <div>
                       <span className="text-[12px] font-bold text-[#3182f6] bg-blue-50 px-2 py-1 rounded-lg">대상: {req.popup_stores?.title}</span>
                       <p className="text-[13px] text-gray-400 mt-2">요청일: {new Date(req.created_at).toLocaleString()}</p>
                     </div>
                     <div className="flex gap-2">
                        <button className="px-4 py-2 bg-[#3182f6] text-white rounded-xl text-[12px] font-bold">변경 적용</button>
                        <button onClick={() => { supabase.from('edit_requests').delete().eq('id', req.id).then(fetchEditRequests) }} className="px-4 py-2 bg-red-50 text-red-500 rounded-xl text-[12px] font-bold">반려/삭제</button>
                     </div>
                   </div>
                   <div className="bg-gray-50 p-4 rounded-2xl text-[14px]">
                     <pre className="whitespace-pre-wrap text-gray-600 font-mono text-[12px]">{JSON.stringify(req.requested_content, null, 2)}</pre>
                   </div>
                 </div>
               ))}
             </div>
          )}

          {/* TAB 4: 리뷰 관리 (엑셀 & 신고 강화) */}
          {activeTab === 'reviews' && (
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <h2 className="text-[18px] font-bold">리뷰 통합 관리 ({reviews.length})</h2>
                  <button 
                    onClick={downloadReviewsExcel}
                    className="px-3 py-1.5 bg-[#e8f3ff] text-[#3182f6] rounded-xl text-[12px] font-bold hover:bg-[#d0e5ff] transition-colors"
                  >
                    📊 엑셀 다운로드
                  </button>
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-[13px] font-bold text-gray-600 cursor-pointer">
                    <input type="checkbox" checked={showOnlyReported} onChange={(e) => setShowOnlyReported(e.target.checked)} className="w-4 h-4 accent-[#3182f6] rounded" /> 신고된 리뷰만
                  </label>
                  <select value={reviewSortOrder} onChange={(e) => setReviewSortOrder(e.target.value as any)} className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-[12px] font-bold outline-none">
                    <option value="latest">최신순</option>
                    <option value="reports">신고순</option>
                  </select>
                </div>
              </div>

              {isLoadingReviews ? (
                <div className="py-20 text-center text-gray-400 bg-white rounded-[32px]">데이터를 불러오는 중...</div>
              ) : reviews.length === 0 ? (
                <div className="py-20 text-center text-gray-400 bg-white rounded-[32px]">조건에 맞는 리뷰가 없습니다.</div>
              ) : reviews.map((review) => (
                <div key={review.id} className={`bg-white p-6 rounded-[28px] shadow-sm border-2 transition-all ${review.report_count > 0 ? 'border-red-100' : 'border-transparent'} ${review.is_blinded ? 'opacity-60' : ''}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[11px] font-bold text-[#3182f6] bg-blue-50 px-2 py-1 rounded-lg">
                          {review.popup_stores?.title || `Popup ID: ${review.popup_id}`}
                        </span>
                        {review.is_blinded && <span className="text-[11px] font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-lg">블라인드 처리됨</span>}
                      </div>
                      <div className="flex items-center gap-2 text-[14px] font-bold">
                        <span className="text-yellow-400 text-lg">★</span> {review.rating}
                        <span className="text-gray-300 font-normal text-[12px] ml-2">{new Date(review.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setEditingReview(review)} className="px-3 py-1.5 bg-gray-50 text-gray-600 rounded-xl text-[12px] font-bold">수정</button>
                      <button onClick={() => handleToggleBlind(review)} className={`px-3 py-1.5 rounded-xl text-[12px] font-bold ${review.is_blinded ? 'bg-blue-50 text-[#3182f6]' : 'bg-orange-50 text-orange-600'}`}>{review.is_blinded ? '차단 해제' : '블라인드'}</button>
                      <button onClick={() => { if(confirm('리뷰를 영구 삭제하시겠습니까?')) supabase.from('reviews').delete().eq('id', review.id).then(fetchReviews) }} className="px-3 py-1.5 bg-red-50 text-red-500 rounded-xl text-[12px] font-bold">삭제</button>
                    </div>
                  </div>
                  <p className="text-[15px] text-gray-700 bg-gray-50 p-4 rounded-2xl mb-4 whitespace-pre-wrap leading-relaxed">
                    {review.content || <span className="text-gray-400 italic">내용 없음</span>}
                  </p>
                  {review.image_url && (
                    <img src={review.image_url} className="w-24 h-24 rounded-xl object-cover mb-4 border border-gray-100" alt="" />
                  )}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-4 text-[12px]">
                      <span className="font-bold text-gray-900">작성자: {review.user_nickname || '익명'}</span>
                      <span className="text-gray-400">👍 {review.likes || 0} / 👎 {review.dislikes || 0}</span>
                    </div>
                    {/* 신고 카운트 강조 노출 */}
                    <div className={`font-bold px-4 py-1.5 rounded-full text-[12px] flex items-center gap-1.5 ${review.report_count > 0 ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 text-gray-400'}`}>
                      🚨 신고 {review.report_count || 0}회
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* --- MODAL 1: 팝업 데이터 수정 --- */}
      {isEditModalOpen && editingStore && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
          <div className="relative bg-white w-full max-w-[520px] rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="p-7 border-b border-gray-50 flex justify-between items-center bg-white sticky top-0 z-10">
              <h2 className="text-[20px] font-bold">팝업 데이터 수정</h2>
              <button onClick={() => setIsEditModalOpen(false)}>{Icons.X ? <Icons.X size={22} className="text-gray-400"/> : 'X'}</button>
            </div>
            <div className="p-7 overflow-y-auto space-y-6 no-scrollbar">
              <div>
                <label className="text-[13px] font-bold text-gray-400 mb-2 block">대표 이미지</label>
                <div className="flex gap-4 items-center">
                  <img src={editingStore.imageUrl} className="w-24 h-24 rounded-2xl object-cover bg-gray-100 border" alt="" />
                  <div className="flex-1">
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                    <button onClick={() => fileInputRef.current?.click()} className="w-full py-3 bg-gray-50 text-[#3182f6] rounded-xl font-bold text-[13px] border border-blue-50">이미지 교체</button>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-[13px] font-bold text-gray-400 mb-2 block">카테고리</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(cat => (
                    <button key={cat} onClick={() => setEditingStore({...editingStore, category: cat})} className={`px-4 py-2 rounded-xl text-[13px] font-bold border ${editingStore.category === cat ? 'bg-[#3182f6] border-[#3182f6] text-white' : 'bg-white text-gray-400'}`}>{cat}</button>
                  ))}
                </div>
                {editingStore.category === '기타' && <input placeholder="카테고리명 직접 입력" className="w-full mt-2 bg-gray-50 border-none rounded-xl p-3 text-[14px] outline-none" value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} />}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[13px] font-bold text-gray-400 mb-2 block">입장료</label>
                  <div className="flex bg-gray-50 p-1 rounded-xl">
                    <button onClick={() => setEditingStore({...editingStore, is_free: true})} className={`flex-1 py-2 rounded-lg text-[13px] font-bold ${editingStore.is_free ? 'bg-white shadow-sm text-[#3182f6]' : 'text-gray-400'}`}>무료</button>
                    <button onClick={() => setEditingStore({...editingStore, is_free: false})} className={`flex-1 py-2 rounded-lg text-[13px] font-bold ${!editingStore.is_free ? 'bg-white shadow-sm text-[#3182f6]' : 'text-gray-400'}`}>유료</button>
                  </div>
                </div>
                <div>
                  <label className="text-[13px] font-bold text-gray-400 mb-2 block">예약 유무</label>
                  <div className="flex bg-gray-50 p-1 rounded-xl">
                    <button onClick={() => setEditingStore({...editingStore, is_reservation_required: false})} className={`flex-1 py-2 rounded-lg text-[13px] font-bold ${!editingStore.is_reservation_required ? 'bg-white shadow-sm text-[#3182f6]' : 'text-gray-400'}`}>현장입장</button>
                    <button onClick={() => setEditingStore({...editingStore, is_reservation_required: true})} className={`flex-1 py-2 rounded-lg text-[13px] font-bold ${editingStore.is_reservation_required ? 'bg-white shadow-sm text-[#3182f6]' : 'text-gray-400'}`}>예약필수</button>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-[13px] font-bold text-gray-400 mb-2 block">태그 (최대 5개)</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {(editingStore.keywords || []).map(tag => (
                    <span key={tag} className="px-3 py-1.5 bg-blue-50 text-[#3182f6] rounded-xl text-[13px] font-bold flex items-center gap-1.5">#{tag}<button onClick={() => removeKeyword(tag)}>{Icons.X ? <Icons.X size={14} /> : 'x'}</button></span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input placeholder="키워드" className="flex-1 bg-gray-50 border-none rounded-xl p-3 text-[14px] outline-none" value={keywordInput} onChange={(e) => setKeywordInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && addKeyword()} />
                  <button onClick={addKeyword} className="px-4 bg-[#3182f6] text-white rounded-xl font-bold text-[13px]">추가</button>
                </div>
              </div>
              <div className="space-y-4">
                <input value={editingStore.title} onChange={e => setEditingStore({...editingStore, title: e.target.value})} className="w-full bg-gray-50 border-none rounded-xl p-4 text-[15px] font-bold outline-none" placeholder="이름" />
                <input value={editingStore.address} onChange={e => setEditingStore({...editingStore, address: e.target.value})} className="w-full bg-gray-50 border-none rounded-xl p-4 text-[14px] outline-none" placeholder="주소" />
                <textarea rows={3} value={editingStore.description} onChange={e => setEditingStore({...editingStore, description: e.target.value})} className="w-full bg-gray-50 border-none rounded-2xl p-4 text-[14px] outline-none resize-none" placeholder="상세 내용" />
              </div>
            </div>
            <div className="p-7 border-t border-gray-50 grid grid-cols-3 gap-3">
              <button onClick={() => setIsEditModalOpen(false)} className="h-14 bg-gray-100 text-gray-500 rounded-2xl font-bold">취소</button>
              <button onClick={() => handleUpdateStore(false)} className="h-14 bg-orange-50 text-orange-600 rounded-2xl font-bold">대기전환</button>
              <button onClick={() => handleUpdateStore()} className="h-14 bg-[#3182f6] text-white rounded-2xl font-bold">최종저장</button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 2: 리뷰 수정 모달 --- */}
      {editingReview && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-[480px] rounded-[32px] p-8 shadow-2xl">
            <h2 className="text-[20px] font-bold mb-6">리뷰 강제 수정</h2>
            <div className="space-y-6">
              <label className="text-[13px] font-bold text-gray-400 block mb-2">별점 조정</label>
              <div className="flex gap-2">
                {[1,2,3,4,5].map(star => (
                  <button key={star} onClick={() => setEditingReview({...editingReview, rating: star})} className={`w-11 h-11 rounded-xl font-bold transition-colors ${editingReview.rating === star ? 'bg-[#3182f6] text-white' : 'bg-gray-50 text-gray-400'}`}>{star}</button>
                ))}
              </div>
              <label className="text-[13px] font-bold text-gray-400 block mb-2">내용 수정</label>
              <textarea value={editingReview.content} onChange={(e) => setEditingReview({...editingReview, content: e.target.value})} className="w-full bg-gray-50 border-none rounded-2xl p-4 text-[15px] outline-none min-h-[150px] resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3 mt-8">
              <button onClick={() => setEditingReview(null)} className="h-14 bg-gray-100 text-gray-500 rounded-2xl font-bold">취소</button>
              <button onClick={handleUpdateReview} className="h-14 bg-[#3182f6] text-white rounded-2xl font-bold">수정 완료</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
