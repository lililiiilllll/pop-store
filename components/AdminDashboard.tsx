import React, { useState, useRef, useEffect } from 'react';
import { Icons } from '../constants';
import { PopupStore } from '../types';
import { supabase } from '../lib/supabase';

const CATEGORIES = ['패션', '푸드', '아트', '엔터', '라이프스타일', '기타'];

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

// 리뷰 데이터 타입 정의
interface Review {
  id: number;
  store_id: number;
  user_id: string;
  rating: number;
  comment: string;
  created_at: string;
  popup_stores?: { title: string }; // 팝업 정보 조인
}

interface AdminDashboardProps {
  allStores: PopupStore[];
  onBack: () => void;
  onRefresh: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ allStores, onBack, onRefresh }) => {
  const [activeTab, setActiveTab] = useState<'approval' | 'keywords' | 'edit_request' | 'reviews'>('approval');
  const [approvalSubTab, setApprovalSubTab] = useState<'pending' | 'verified'>('pending');
  const [editingStore, setEditingStore] = useState<PopupStore | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  const [customCategory, setCustomCategory] = useState('');
  const [recKeywords, setRecKeywords] = useState<RecommendedKeyword[]>([]);
  const [newRecKeyword, setNewRecKeyword] = useState('');
  const [searchLogs, setSearchLogs] = useState<SearchLog[]>([]);
  
  // 리뷰 상태 관리
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);

  const [keywordInput, setKeywordInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeTab === 'keywords') {
      fetchKeywordAdminData();
    } else if (activeTab === 'reviews') {
      fetchReviews();
    }
  }, [activeTab]);

  const fetchKeywordAdminData = async () => {
    try {
      const { data: recData } = await supabase
        .from('recommended_keywords')
        .select('*')
        .order('order_index', { ascending: true });
      if (recData) setRecKeywords(recData);

      const { data: logData } = await supabase
        .from('search_logs')
        .select('*')
        .order('search_count', { ascending: false });
      if (logData) setSearchLogs(logData);
    } catch (err) {
      console.error('Data loading error:', err);
    }
  };

  // 리뷰 불러오기 (Foreign Key 연동)
  const fetchReviews = async () => {
    setIsLoadingReviews(true);
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          popup_stores ( title )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      if (data) setReviews(data);
    } catch (err) {
      console.error('Review fetch error:', err);
    } finally {
      setIsLoadingReviews(false);
    }
  };

  // 리뷰 삭제 기능
  const handleDeleteReview = async (id: number) => {
    if (confirm('이 리뷰를 정말 삭제하시겠습니까?')) {
      const { error } = await supabase.from('reviews').delete().eq('id', id);
      if (!error) {
        fetchReviews();
      }
    }
  };

  const handleAddRecKeyword = async () => {
    if (!newRecKeyword.trim()) return;
    const { error } = await supabase.from('recommended_keywords').insert({
      keyword: newRecKeyword.trim().replace('#', ''),
      order_index: recKeywords.length + 1
    });
    if (!error) {
      setNewRecKeyword('');
      fetchKeywordAdminData();
    }
  };

  const handleDeleteRecKeyword = async (id: number) => {
    await supabase.from('recommended_keywords').delete().eq('id', id);
    fetchKeywordAdminData();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingStore) return;
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `popups/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('popup-images').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('popup-images').getPublicUrl(filePath);
      setEditingStore({ ...editingStore, imageUrl: publicUrl });
      alert('이미지가 업로드되었습니다.');
    } catch (error: any) {
      alert('이미지 업로드 실패: ' + error.message);
    }
  };

  const addKeyword = () => {
    if (!keywordInput.trim() || !editingStore) return;
    const cleanTag = keywordInput.trim().replace('#', '');
    if (editingStore.keywords?.includes(cleanTag)) {
      alert('이미 존재하는 키워드입니다.');
      return;
    }
    setEditingStore({ ...editingStore, keywords: [...(editingStore.keywords || []), cleanTag] });
    setKeywordInput('');
  };

  const removeKeyword = (tagToRemove: string) => {
    if (!editingStore) return;
    setEditingStore({
      ...editingStore,
      keywords: editingStore.keywords?.filter(tag => tag !== tagToRemove)
    });
  };

  const handleUpdateStore = async (statusOverride?: boolean) => {
    if (!editingStore) return;

    const finalCategory = (editingStore.category === '기타' && customCategory.trim() !== '') 
      ? customCategory.trim() 
      : editingStore.category;

    const isVerified = statusOverride !== undefined ? statusOverride : editingStore.is_verified;
    
    const { error } = await supabase.from('popup_stores').update({
      title: editingStore.title, 
      address: editingStore.address,
      category: finalCategory, 
      description: editingStore.description,
      image_url: editingStore.imageUrl, 
      is_free: editingStore.is_free,
      is_reservation_required: editingStore.is_reservation_required,
      is_verified: isVerified, 
      keywords: editingStore.keywords
    }).eq('id', editingStore.id);

    if (!error) {
      alert(statusOverride === false ? '승인 대기 상태로 변경되었습니다.' : '저장되었습니다.');
      setIsEditModalOpen(false);
      setCustomCategory('');
      onRefresh();
    }
  };

  const handleApprove = async (id: any) => {
    const { error } = await supabase.from('popup_stores').update({ is_verified: true }).eq('id', id);
    if (!error) onRefresh();
  };

  const handleDelete = async (id: any) => {
    if (confirm('정말 삭제하시겠습니까?')) {
      const { error } = await supabase.from('popup_stores').delete().eq('id', id);
      if (!error) onRefresh();
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-[#f2f4f6] flex flex-col overflow-hidden font-sans text-[#191f28]">
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="w-10 h-10 flex items-center justify-center bg-gray-50 hover:bg-gray-100 rounded-full">
             {Icons.X ? <Icons.X size={24} className="text-gray-600" /> : <span>X</span>}
          </button>
          <h1 className="text-[20px] font-bold">관리자 콘솔</h1>
        </div>
      </header>

      <nav className="bg-white px-6 flex border-b border-gray-50 overflow-x-auto no-scrollbar">
        {[
          { id: 'approval', label: '승인 관리' },
          { id: 'keywords', label: '추천/통계 관리' },
          { id: 'edit_request', label: '정보 수정 요청' },
          { id: 'reviews', label: '리뷰 관리' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-5 py-4 text-[15px] font-bold transition-all relative flex-shrink-0 ${
              activeTab === tab.id ? 'text-[#3182f6]' : 'text-gray-400'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#3182f6]" />}
          </button>
        ))}
      </nav>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto">
          {activeTab === 'approval' && (
            <>
              <div className="flex gap-2 mb-6">
                <button onClick={() => setApprovalSubTab('pending')} className={`px-6 py-2.5 rounded-2xl font-bold text-[14px] ${approvalSubTab === 'pending' ? 'bg-[#3182f6] text-white' : 'bg-white text-gray-400'}`}>대기중</button>
                <button onClick={() => setApprovalSubTab('verified')} className={`px-6 py-2.5 rounded-2xl font-bold text-[14px] ${approvalSubTab === 'verified' ? 'bg-[#3182f6] text-white' : 'bg-white text-gray-400'}`}>승인됨</button>
              </div>
              <div className="space-y-3">
                {allStores
                  .filter(s => approvalSubTab === 'pending' ? !s.is_verified : s.is_verified)
                  .map(store => (
                    <div key={store.id} className="bg-white p-4 rounded-[24px] flex items-center justify-between shadow-sm border border-white hover:border-blue-50">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <img src={store.imageUrl} className="w-14 h-14 rounded-xl object-cover bg-gray-50 flex-shrink-0" alt="" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[10px] font-bold text-[#3182f6] bg-blue-50 px-1.5 py-0.5 rounded-md uppercase">{store.category}</span>
                          </div>
                          <h3 className="text-[15px] font-bold truncate pr-2">{store.title}</h3>
                          <p className="text-[12px] text-gray-400 truncate pr-2">{store.address}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => { setEditingStore({...store}); setIsEditModalOpen(true); }} className="w-[54px] h-[36px] flex items-center justify-center bg-gray-50 text-gray-600 rounded-xl font-bold text-[13px]">수정</button>
                        {approvalSubTab === 'pending' && <button onClick={() => handleApprove(store.id)} className="w-[54px] h-[36px] flex items-center justify-center bg-[#3182f6] text-white rounded-xl font-bold text-[13px]">승인</button>}
                        <button onClick={() => handleDelete(store.id)} className="w-[54px] h-[36px] flex items-center justify-center bg-red-50 text-red-500 rounded-xl font-bold text-[13px]">삭제</button>
                      </div>
                    </div>
                  ))}
              </div>
            </>
          )}

          {activeTab === 'keywords' && (
            <div className="space-y-8">
              <section className="bg-white rounded-[32px] p-8 shadow-sm">
                <h2 className="text-[18px] font-bold mb-2">추천 키워드 관리</h2>
                <p className="text-[14px] text-gray-400 mb-6">검색창 하단에 노출될 키워드를 입력하세요.</p>
                <div className="flex gap-3 mb-6">
                  <input className="flex-1 bg-gray-50 border-none rounded-2xl py-4 px-6 text-[15px] outline-none" placeholder="예: 성수 팝업스토어" value={newRecKeyword} onChange={(e) => setNewRecKeyword(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleAddRecKeyword()} />
                  <button onClick={handleAddRecKeyword} className="px-8 bg-[#3182f6] text-white rounded-2xl font-bold">등록</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recKeywords.map((kw) => (
                    <div key={kw.id} className="flex items-center gap-2 bg-blue-50 text-[#3182f6] px-4 py-2.5 rounded-xl font-bold text-[14px]">
                      #{kw.keyword}
                      <button onClick={() => handleDeleteRecKeyword(kw.id)}>{Icons.X ? <Icons.X size={14} /> : 'x'}</button>
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-white rounded-[32px] p-8 shadow-sm overflow-hidden">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-[18px] font-bold">인기 검색어 통계</h2>
                  <button onClick={fetchKeywordAdminData} className="text-[#3182f6] text-[13px] font-bold flex items-center gap-1.5">새로고침</button>
                </div>
                <div className="border border-gray-50 rounded-2xl overflow-hidden overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 text-[13px] font-bold text-gray-400">
                      <tr>
                        <th className="px-6 py-4">순위</th>
                        <th className="px-6 py-4">검색어</th>
                        <th className="px-6 py-4">검색 횟수</th>
                        <th className="px-6 py-4">최근 업데이트</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {searchLogs.map((log, index) => (
                        <tr key={log.id} className="hover:bg-gray-50/50">
                          <td className="px-6 py-4 font-bold text-gray-400">{index + 1}</td>
                          <td className="px-6 py-4 font-bold text-[#191f28]">{log.keyword}</td>
                          <td className="px-6 py-4 font-bold text-[#3182f6]">{log.search_count.toLocaleString()}회</td>
                          <td className="px-6 py-4 text-gray-400 text-[12px]">{new Date(log.updated_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-[18px] font-bold">전체 리뷰 관리 ({reviews.length})</h2>
                <button onClick={fetchReviews} className="text-[#3182f6] text-[13px] font-bold">새로고침</button>
              </div>
              
              {isLoadingReviews ? (
                <div className="py-20 text-center text-gray-400 font-medium bg-white rounded-[32px] border border-dashed border-gray-200">
                  리뷰 데이터를 불러오는 중...
                </div>
              ) : reviews.length > 0 ? (
                <div className="grid gap-3">
                  {reviews.map((review) => (
                    <div key={review.id} className="bg-white p-5 rounded-[24px] shadow-sm border border-white hover:border-gray-50 transition-all">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="text-[11px] font-bold text-[#3182f6] bg-blue-50 px-2 py-1 rounded-lg">
                            {review.popup_stores?.title || '삭제된 팝업'}
                          </span>
                          <div className="flex items-center gap-1 mt-2">
                            <span className="text-yellow-400 text-[14px]">★</span>
                            <span className="font-bold text-[14px]">{review.rating}</span>
                            <span className="text-gray-300 text-[12px] ml-2">{new Date(review.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleDeleteReview(review.id)}
                          className="text-red-400 text-[12px] font-bold hover:bg-red-50 px-3 py-1.5 rounded-xl transition-colors"
                        >
                          삭제
                        </button>
                      </div>
                      <p className="text-[14px] text-gray-600 leading-relaxed bg-gray-50 p-4 rounded-2xl mt-2 whitespace-pre-wrap">
                        {review.comment}
                      </p>
                      <div className="text-[11px] text-gray-400 mt-3 pl-1">
                        유저 ID: {review.user_id}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-20 text-center text-gray-400 font-medium bg-white rounded-[32px] border border-dashed border-gray-200">
                  아직 등록된 리뷰가 없습니다.
                </div>
              )}
            </div>
          )}

          {activeTab === 'edit_request' && (
            <div className="py-20 text-center text-gray-400 font-medium bg-white rounded-[32px] border border-dashed border-gray-200">
              수정 요청 데이터를 불러오는 중입니다.
            </div>
          )}
        </div>
      </main>

      {/* 수정 모달 영역 (이전 대화에서 수정된 라벨 포함 버전 유지) */}
      {isEditModalOpen && editingStore && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-md" onClick={() => setIsEditModalOpen(false)} />
          <div className="relative bg-white w-full max-w-[520px] rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="p-7 border-b border-gray-50 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-[20px] font-bold">팝업 상세 수정</h2>
              <button onClick={() => setIsEditModalOpen(false)}>{Icons.X ? <Icons.X size={22} className="text-gray-400"/> : 'X'}</button>
            </div>
            <div className="p-7 overflow-y-auto space-y-6 no-scrollbar">
              
              {/* 이미지 관리 */}
              <div>
                <label className="text-[13px] font-bold text-gray-400 mb-2 block">대표 이미지</label>
                <div className="flex gap-4 items-center">
                  <img src={editingStore.imageUrl} className="w-24 h-24 rounded-2xl object-cover bg-gray-100 border" alt="" />
                  <div className="flex-1">
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                    <button onClick={() => fileInputRef.current?.click()} className="w-full py-3 bg-gray-50 text-[#3182f6] rounded-xl font-bold text-[13px] border border-blue-50">파일 선택</button>
                  </div>
                </div>
              </div>

              {/* 카테고리 선택 UI */}
              <div>
                <label className="text-[13px] font-bold text-gray-400 mb-2 block">카테고리 선택</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setEditingStore({...editingStore, category: cat})}
                      className={`px-4 py-2 rounded-xl text-[13px] font-bold border transition-all ${
                        editingStore.category === cat 
                        ? 'bg-[#3182f6] border-[#3182f6] text-white' 
                        : 'bg-white border-gray-100 text-gray-400 hover:bg-gray-50'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                {editingStore.category === '기타' && (
                  <input 
                    placeholder="카테고리를 직접 입력해주세요" 
                    className="w-full mt-2 bg-gray-50 border-none rounded-xl p-3 text-[14px] outline-none border border-blue-100"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                  />
                )}
              </div>

              {/* 무료/예약 토글 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[13px] font-bold text-gray-400 mb-2 block">입장료 유무</label>
                  <div className="flex bg-gray-50 p-1 rounded-xl">
                    <button 
                      onClick={() => setEditingStore({...editingStore, is_free: true})}
                      className={`flex-1 py-2 rounded-lg text-[13px] font-bold transition-all ${editingStore.is_free ? 'bg-white shadow-sm text-[#3182f6]' : 'text-gray-400'}`}
                    >무료</button>
                    <button 
                      onClick={() => setEditingStore({...editingStore, is_free: false})}
                      className={`flex-1 py-2 rounded-lg text-[13px] font-bold transition-all ${!editingStore.is_free ? 'bg-white shadow-sm text-[#3182f6]' : 'text-gray-400'}`}
                    >유료</button>
                  </div>
                </div>
                <div>
                  <label className="text-[13px] font-bold text-gray-400 mb-2 block">예약 필요성</label>
                  <div className="flex bg-gray-50 p-1 rounded-xl">
                    <button 
                      onClick={() => setEditingStore({...editingStore, is_reservation_required: false})}
                      className={`flex-1 py-2 rounded-lg text-[13px] font-bold transition-all ${!editingStore.is_reservation_required ? 'bg-white shadow-sm text-[#3182f6]' : 'text-gray-400'}`}
                    >상시입장</button>
                    <button 
                      onClick={() => setEditingStore({...editingStore, is_reservation_required: true})}
                      className={`flex-1 py-2 rounded-lg text-[13px] font-bold transition-all ${editingStore.is_reservation_required ? 'bg-white shadow-sm text-[#3182f6]' : 'text-gray-400'}`}
                    >예약필수</button>
                  </div>
                </div>
              </div>

              {/* 태그 관리 */}
              <div>
                <label className="text-[13px] font-bold text-gray-400 mb-2 block">검색 태그</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {editingStore.keywords?.map(tag => (
                    <span key={tag} className="px-3 py-1.5 bg-blue-50 text-[#3182f6] rounded-xl text-[13px] font-bold flex items-center gap-1.5">
                      #{tag}
                      <button onClick={() => removeKeyword(tag)}>{Icons.X ? <Icons.X size={14} /> : 'x'}</button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input placeholder="키워드 입력" className="flex-1 bg-gray-50 border-none rounded-xl p-3 text-[14px] outline-none" value={keywordInput} onChange={(e) => setKeywordInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && addKeyword()} />
                  <button onClick={addKeyword} className="px-4 bg-[#3182f6] text-white rounded-xl font-bold text-[13px]">추가</button>
                </div>
              </div>

              {/* 기본 정보 입력 (라벨 명시 버전) */}
              <div className="space-y-5">
                <div>
                  <label className="text-[13px] font-bold text-gray-400 mb-2 block">팝업 이름</label>
                  <input 
                    value={editingStore.title} 
                    onChange={e => setEditingStore({...editingStore, title: e.target.value})} 
                    className="w-full bg-gray-50 border-none rounded-xl p-4 text-[15px] outline-none" 
                    placeholder="팝업명" 
                  />
                </div>
                <div>
                  <label className="text-[13px] font-bold text-gray-400 mb-2 block">주소</label>
                  <input 
                    value={editingStore.address} 
                    onChange={e => setEditingStore({...editingStore, address: e.target.value})} 
                    className="w-full bg-gray-50 border-none rounded-xl p-4 text-[15px] outline-none" 
                    placeholder="주소" 
                  />
                </div>
                <div>
                  <label className="text-[13px] font-bold text-gray-400 mb-2 block">상세내용</label>
                  <textarea 
                    rows={3} 
                    value={editingStore.description} 
                    onChange={e => setEditingStore({...editingStore, description: e.target.value})} 
                    className="w-full bg-gray-50 border-none rounded-2xl p-4 text-[14px] outline-none resize-none" 
                    placeholder="설명" 
                  />
                </div>
              </div>
            </div>

            {/* 하단 버튼 */}
            <div className="p-7 bg-white border-t border-gray-50 grid grid-cols-3 gap-3 sticky bottom-0">
              <button onClick={() => setIsEditModalOpen(false)} className="h-14 bg-gray-100 text-gray-500 rounded-2xl font-bold hover:bg-gray-200 transition-colors">취소</button>
              <button onClick={() => handleUpdateStore(false)} className="h-14 bg-orange-50 text-orange-600 rounded-2xl font-bold hover:bg-orange-100 transition-colors">승인대기</button>
              <button onClick={() => handleUpdateStore()} className="h-14 bg-[#3182f6] text-white rounded-2xl font-bold shadow-lg shadow-blue-100 hover:bg-[#2a75e6] transition-colors">저장하기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
