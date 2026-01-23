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
  store_id: number;
  user_id: string;
  rating: number;
  comment: string;
  created_at: string;
  is_blinded: boolean;    
  likes_count: number;    
  dislikes_count: number; 
  reports_count: number;  
  profiles?: { name: string };     
  popup_stores?: { title: string }; 
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
  // 탭 및 기본 상태
  const [activeTab, setActiveTab] = useState<'approval' | 'keywords' | 'edit_request' | 'reviews'>('approval');
  const [approvalSubTab, setApprovalSubTab] = useState<'pending' | 'verified'>('pending');
  
  // 수정 모달 상태
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

  // --- 데이터 페칭 ---
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
    let query = supabase.from('reviews').select(`*, profiles ( name ), popup_stores ( title )`);
    if (showOnlyReported) query = query.gt('reports_count', 0);
    query = query.order(reviewSortOrder === 'reports' ? 'reports_count' : 'created_at', { ascending: false });
    const { data } = await query;
    if (data) setReviews(data);
    setIsLoadingReviews(false);
  };

  const fetchEditRequests = async () => {
    const { data } = await supabase.from('edit_requests').select(`*, popup_stores ( title )`).order('created_at', { ascending: false });
    if (data) setEditRequests(data);
  };

  // --- 리뷰 액션 ---
  const handleToggleBlind = async (review: Review) => {
    const { error } = await supabase.from('reviews').update({ is_blinded: !review.is_blinded }).eq('id', review.id);
    if (!error) fetchReviews();
  };

  const handleUpdateReview = async () => {
    if (!editingReview) return;
    const { error } = await supabase.from('reviews').update({ comment: editingReview.comment, rating: editingReview.rating }).eq('id', editingReview.id);
    if (!error) { setEditingReview(null); fetchReviews(); }
  };

  // --- 팝업 수정/이미지 액션 ---
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingStore) return;
    const filePath = `popups/${Math.random()}.${file.name.split('.').pop()}`;
    const { error: uploadError } = await supabase.storage.from('popup-images').upload(filePath, file);
    if (!uploadError) {
      const { data: { publicUrl } } = supabase.storage.from('popup-images').getPublicUrl(filePath);
      setEditingStore({ ...editingStore, imageUrl: publicUrl });
    }
  };

  const addKeyword = () => {
    if (!keywordInput.trim() || !editingStore) return;
    const tag = keywordInput.trim().replace('#', '');
    if (editingStore.keywords?.includes(tag)) return;
    setEditingStore({ ...editingStore, keywords: [...(editingStore.keywords || []), tag] });
    setKeywordInput('');
  };

  const removeKeyword = (tagToRemove: string) => {
    if (!editingStore) return;
    setEditingStore({ ...editingStore, keywords: editingStore.keywords?.filter(tag => tag !== tagToRemove) });
  };

  const handleUpdateStore = async (statusOverride?: boolean) => {
    if (!editingStore) return;
    const finalCategory = (editingStore.category === '기타' && customCategory.trim() !== '') ? customCategory.trim() : editingStore.category;
    const { error } = await supabase.from('popup_stores').update({
      title: editingStore.title, address: editingStore.address, category: finalCategory, 
      description: editingStore.description, image_url: editingStore.imageUrl, 
      is_free: editingStore.is_free, is_reservation_required: editingStore.is_reservation_required,
      is_verified: statusOverride !== undefined ? statusOverride : editingStore.is_verified,
      keywords: editingStore.keywords
    }).eq('id', editingStore.id);
    if (!error) { setIsEditModalOpen(false); onRefresh(); }
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-[#f2f4f6] flex flex-col overflow-hidden font-sans text-[#191f28]">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="w-10 h-10 flex items-center justify-center bg-gray-50 hover:bg-gray-100 rounded-full">
             {Icons.X ? <Icons.X size={24} className="text-gray-600" /> : 'X'}
          </button>
          <h1 className="text-[20px] font-bold">관리자 콘솔</h1>
        </div>
      </header>

      {/* 네비게이션 */}
      <nav className="bg-white px-6 flex border-b border-gray-50 overflow-x-auto no-scrollbar">
        {[
          { id: 'approval', label: '승인 관리' },
          { id: 'keywords', label: '추천/통계' },
          { id: 'edit_request', label: '수정 요청' },
          { id: 'reviews', label: '리뷰 관리' }
        ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`px-5 py-4 text-[15px] font-bold transition-all relative flex-shrink-0 ${activeTab === tab.id ? 'text-[#3182f6]' : 'text-gray-400'}`}>
            {tab.label}
            {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#3182f6]" />}
          </button>
        ))}
      </nav>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto">
          
          {/* 1. 승인 관리 탭 */}
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

          {/* 2. 키워드 & 통계 탭 */}
          {activeTab === 'keywords' && (
            <div className="space-y-8">
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
              <section className="bg-white rounded-[32px] p-8 shadow-sm overflow-hidden">
                <h2 className="text-[18px] font-bold mb-6">인기 검색어 통계</h2>
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

          {/* 3. 정보 수정 요청 탭 */}
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
                        <button onClick={() => { /* 승인 로직: 실제 데이터에 덮어쓰기 */ }} className="px-4 py-2 bg-[#3182f6] text-white rounded-xl text-[12px] font-bold">변경 적용</button>
                        <button onClick={() => { supabase.from('edit_requests').delete().eq('id', req.id).then(fetchEditRequests) }} className="px-4 py-2 bg-red-50 text-red-500 rounded-xl text-[12px] font-bold">반려/삭제</button>
                     </div>
                   </div>
                   <div className="bg-gray-50 p-4 rounded-2xl text-[14px]">
                     <pre className="whitespace-pre-wrap text-gray-600">{JSON.stringify(req.requested_content, null, 2)}</pre>
                   </div>
                 </div>
               ))}
             </div>
          )}

          {/* 4. 리뷰 관리 탭 (핵심 기능 대거 보강) */}
          {activeTab === 'reviews' && (
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <h2 className="text-[18px] font-bold">리뷰 통합 관리 ({reviews.length})</h2>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-[13px] font-medium text-gray-600 cursor-pointer">
                    <input type="checkbox" checked={showOnlyReported} onChange={(e) => setShowOnlyReported(e.target.checked)} className="w-4 h-4 accent-[#3182f6] rounded" /> 신고된 리뷰만
                  </label>
                  <select value={reviewSortOrder} onChange={(e) => setReviewSortOrder(e.target.value as any)} className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-[12px] font-bold outline-none">
                    <option value="latest">최신순</option>
                    <option value="reports">신고순</option>
                  </select>
                </div>
              </div>
              {isLoadingReviews ? ( <div className="py-20 text-center text-gray-400 bg-white rounded-[32px]">로딩 중...</div> ) : reviews.map((review) => (
                <div key={review.id} className={`bg-white p-6 rounded-[28px] shadow-sm border-2 transition-all ${review.is_blinded ? 'border-orange-100 opacity-80' : 'border-transparent'}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[11px] font-bold text-[#3182f6] bg-blue-50 px-2 py-1 rounded-lg">{review.popup_stores?.title}</span>
                        {review.is_blinded && <span className="text-[11px] font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-lg">블라인드 상태</span>}
                      </div>
                      <div className="flex items-center gap-2 text-[14px] font-bold">
                        <span className="text-yellow-400">★</span> {review.rating}
                        <span className="text-gray-300 font-normal text-[12px] ml-2">{new Date(review.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setEditingReview(review)} className="px-3 py-1.5 bg-gray-50 text-gray-600 rounded-xl text-[12px] font-bold">수정</button>
                      <button onClick={() => handleToggleBlind(review)} className={`px-3 py-1.5 rounded-xl text-[12px] font-bold ${review.is_blinded ? 'bg-blue-50 text-[#3182f6]' : 'bg-orange-50 text-orange-600'}`}>{review.is_blinded ? '차단 해제' : '블라인드'}</button>
                      <button onClick={() => { if(confirm('영구 삭제?')) supabase.from('reviews').delete().eq('id', review.id).then(fetchReviews) }} className="px-3 py-1.5 bg-red-50 text-red-500 rounded-xl text-[12px] font-bold">삭제</button>
                    </div>
                  </div>
                  <p className="text-[15px] text-gray-700 bg-gray-50 p-4 rounded-2xl mb-4 whitespace-pre-wrap">{review.comment}</p>
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-gray-900">작성자: {review.profiles?.name || '익명'}</span>
                      <span className="text-gray-400">좋아요 {review.likes_count} / 싫어요 {review.dislikes_count}</span>
                    </div>
                    <div className={`font-bold px-3 py-1 rounded-full ${review.reports_count > 0 ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-400'}`}>신고 누적: {review.reports_count}회</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* --- 팝업 수정 모달 (UI 디테일 복구) --- */}
      {isEditModalOpen && editingStore && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
          <div className="relative bg-white w-full max-w-[520px] rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="p-7 border-b border-gray-50 flex justify-between items-center bg-white sticky top-0 z-10">
              <h2 className="text-[20px] font-bold">팝업 데이터 수정</h2>
              <button onClick={() => setIsEditModalOpen(false)}>{Icons.X ? <Icons.X size={22} className="text-gray-400"/> : 'X'}</button>
            </div>
            <div className="p-7 overflow-y-auto space-y-6 no-scrollbar">
              {/* 이미지 섹션 */}
              <div>
                <label className="text-[13px] font-bold text-gray-400 mb-2 block">대표 이미지</label>
                <div className="flex gap-4 items-center">
                  <img src={editingStore.imageUrl} className="w-24 h-24 rounded-2xl object-cover bg-gray-100 border" alt="" />
                  <div className="flex-1">
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                    <button onClick={() => fileInputRef.current?.click()} className="w-full py-3 bg-gray-50 text-[#3182f6] rounded-xl font-bold text-[13px] border border-blue-50">새 이미지 업로드</button>
                  </div>
                </div>
              </div>
              {/* 카테고리 섹션 */}
              <div>
                <label className="text-[13px] font-bold text-gray-400 mb-2 block">카테고리</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(cat => (
                    <button key={cat} onClick={() => setEditingStore({...editingStore, category: cat})} className={`px-4 py-2 rounded-xl text-[13px] font-bold border ${editingStore.category === cat ? 'bg-[#3182f6] border-[#3182f6] text-white' : 'bg-white text-gray-400'}`}>{cat}</button>
                  ))}
                </div>
                {editingStore.category === '기타' && <input placeholder="직접 입력" className="w-full mt-2 bg-gray-50 border-none rounded-xl p-3 text-[14px] outline-none" value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} />}
              </div>
              {/* 토글 섹션 */}
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
              {/* 태그 섹션 */}
              <div>
                <label className="text-[13px] font-bold text-gray-400 mb-2 block">검색 태그</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {editingStore.keywords?.map(tag => (
                    <span key={tag} className="px-3 py-1.5 bg-blue-50 text-[#3182f6] rounded-xl text-[13px] font-bold flex items-center gap-1.5">#{tag}<button onClick={() => removeKeyword(tag)}>{Icons.X ? <Icons.X size={14} /> : 'x'}</button></span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input placeholder="키워드 입력" className="flex-1 bg-gray-50 border-none rounded-xl p-3 text-[14px] outline-none" value={keywordInput} onChange={(e) => setKeywordInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && addKeyword()} />
                  <button onClick={addKeyword} className="px-4 bg-[#3182f6] text-white rounded-xl font-bold text-[13px]">추가</button>
                </div>
              </div>
              {/* 정보 섹션 */}
              <div className="space-y-4">
                <input value={editingStore.title} onChange={e => setEditingStore({...editingStore, title: e.target.value})} className="w-full bg-gray-50 border-none rounded-xl p-4 text-[15px] outline-none" placeholder="팝업 이름" />
                <input value={editingStore.address} onChange={e => setEditingStore({...editingStore, address: e.target.value})} className="w-full bg-gray-50 border-none rounded-xl p-4 text-[15px] outline-none" placeholder="주소" />
                <textarea rows={3} value={editingStore.description} onChange={e => setEditingStore({...editingStore, description: e.target.value})} className="w-full bg-gray-50 border-none rounded-2xl p-4 text-[14px] outline-none resize-none" placeholder="상세 설명" />
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

      {/* --- 리뷰 수정 전용 모달 --- */}
      {editingReview && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-[480px] rounded-[32px] p-8 shadow-2xl">
            <h2 className="text-[20px] font-bold mb-6">리뷰 강제 수정</h2>
            <div className="space-y-6">
              <div className="flex gap-2">
                {[1,2,3,4,5].map(star => (
                  <button key={star} onClick={() => setEditingReview({...editingReview, rating: star})} className={`w-11 h-11 rounded-xl font-bold ${editingReview.rating === star ? 'bg-[#3182f6] text-white' : 'bg-gray-50 text-gray-400'}`}>{star}</button>
                ))}
              </div>
              <textarea value={editingReview.comment} onChange={(e) => setEditingReview({...editingReview, comment: e.target.value})} className="w-full bg-gray-50 border-none rounded-2xl p-4 text-[15px] outline-none min-h-[150px] resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3 mt-8">
              <button onClick={() => setEditingReview(null)} className="h-14 bg-gray-100 text-gray-500 rounded-2xl font-bold">취소</button>
              <button onClick={handleUpdateReview} className="h-14 bg-[#3182f6] text-white rounded-2xl font-bold">저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
