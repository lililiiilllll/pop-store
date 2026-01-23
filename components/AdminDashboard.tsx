import React, { useState, useRef, useEffect } from 'react';
import { Icons } from '../constants';
import { PopupStore } from '../types';
import { supabase } from '../lib/supabase';

const CATEGORIES = ['패션', '푸드', '아트', '엔터', '라이프스타일', '기타'];

// --- [인터페이스 정의] ---
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

interface AdminDashboardProps {
  allStores: PopupStore[];
  onBack: () => void;
  onRefresh: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ allStores, onBack, onRefresh }) => {
  // --- [상태 관리] ---
  const [activeTab, setActiveTab] = useState<'approval' | 'keywords' | 'edit_request' | 'reviews'>('approval');
  const [approvalSubTab, setApprovalSubTab] = useState<'pending' | 'verified'>('pending');
  const [editingStore, setEditingStore] = useState<PopupStore | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDirectInput, setIsDirectInput] = useState(false);
  
  // 추천 키워드 및 검색 통계 상태
  const [recKeywords, setRecKeywords] = useState<RecommendedKeyword[]>([]);
  const [newRecKeyword, setNewRecKeyword] = useState('');
  const [searchLogs, setSearchLogs] = useState<SearchLog[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- [데이터 페칭] ---
  useEffect(() => {
    if (activeTab === 'keywords') {
      fetchKeywordAdminData();
    }
  }, [activeTab]);

  const fetchKeywordAdminData = async () => {
    try {
      // 1. 추천 키워드 리스트 (order_index 순)
      const { data: recData } = await supabase
        .from('recommended_keywords')
        .select('*')
        .order('order_index', { ascending: true });
      if (recData) setRecKeywords(recData);

      // 2. 검색 통계 리스트 (search_count 많은 순)
      const { data: logData } = await supabase
        .from('search_logs')
        .select('*')
        .order('search_count', { ascending: false });
      if (logData) setSearchLogs(logData);
    } catch (err) {
      console.error('Data loading error:', err);
    }
  };

  // --- [추천 키워드 제어 로직] ---
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

  // --- [기존 이미지/스토어 관리 로직 유지] ---
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
    const isVerified = statusOverride !== undefined ? statusOverride : editingStore.is_verified;
    const { error } = await supabase.from('popup_stores').update({
      title: editingStore.title, address: editingStore.address,
      category: editingStore.category, description: editingStore.description,
      image_url: editingStore.imageUrl, is_free: editingStore.is_free,
      is_reservation_required: editingStore.is_reservation_required,
      is_verified: isVerified, keywords: editingStore.keywords
    }).eq('id', editingStore.id);

    if (!error) {
      alert('저장되었습니다.');
      setIsEditModalOpen(false);
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
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="w-10 h-10 flex items-center justify-center bg-gray-50 hover:bg-gray-100 rounded-full">
             {Icons.X ? <Icons.X size={24} className="text-gray-600" /> : <span>X</span>}
          </button>
          <h1 className="text-[20px] font-bold">관리자 콘솔</h1>
        </div>
      </header>

      {/* 네비게이션 */}
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
        div className="max-w-5xl mx-auto">
          {activeTab === 'approval' && (
            <>
              {/* 서브탭 디자인 최적화 */}
              <div className="flex gap-2 mb-6">
                <button 
                  onClick={() => setApprovalSubTab('pending')} 
                  className={`px-6 py-2.5 rounded-2xl font-bold text-[14px] transition-all ${approvalSubTab === 'pending' ? 'bg-[#3182f6] text-white shadow-sm' : 'bg-white text-gray-400'}`}
                >
                  대기중 {allStores.filter(s => !s.is_verified).length}
                </button>
                <button 
                  onClick={() => setApprovalSubTab('verified')} 
                  className={`px-6 py-2.5 rounded-2xl font-bold text-[14px] transition-all ${approvalSubTab === 'verified' ? 'bg-[#3182f6] text-white shadow-sm' : 'bg-white text-gray-400'}`}
                >
                  승인됨
                </button>
              </div>

              <div className="space-y-3">
                {allStores
                  .filter(s => approvalSubTab === 'pending' ? !s.is_verified : s.is_verified)
                  .map(store => (
                    <div key={store.id} className="bg-white p-4 rounded-[24px] flex items-center justify-between shadow-sm border border-white hover:border-gray-100 transition-colors">
                      {/* [정보 최소화] 왼쪽 정보 영역 */}
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <img 
                          src={store.imageUrl} 
                          className="w-14 h-14 rounded-xl object-cover bg-gray-50 flex-shrink-0" 
                          alt="" 
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[10px] font-bold text-[#3182f6] bg-blue-50 px-1.5 py-0.5 rounded-md uppercase">
                              {store.category}
                            </span>
                          </div>
                          <h3 className="text-[15px] font-bold text-[#191f28] truncate pr-2">{store.title}</h3>
                          <p className="text-[12px] text-gray-400 truncate pr-2">{store.address}</p>
                        </div>
                      </div>

                      {/* [버튼 균일화] 오른쪽 액션 영역 */}
                      <div className="flex gap-2 flex-shrink-0">
                        <button 
                          onClick={() => { setEditingStore({...store}); setIsEditModalOpen(true); }} 
                          className="w-[54px] h-[36px] flex items-center justify-center bg-gray-50 text-gray-600 rounded-xl font-bold text-[13px] hover:bg-gray-100"
                        >
                          수정
                        </button>
                        
                        {approvalSubTab === 'pending' && (
                          <button 
                            onClick={() => handleApprove(store.id)} 
                            className="w-[54px] h-[36px] flex items-center justify-center bg-[#3182f6] text-white rounded-xl font-bold text-[13px] hover:bg-blue-600"
                          >
                            승인
                          </button>
                        )}

                        <button 
                          onClick={() => handleDelete(store.id)} 
                          className="w-[54px] h-[36px] flex items-center justify-center bg-red-50 text-red-500 rounded-xl font-bold text-[13px] hover:bg-red-100"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </>
          )}

          {/* --- [수정된 키워드/통계 관리 섹션] --- */}
          {activeTab === 'keywords' && (
            <div className="space-y-8">
              {/* 1. 추천 키워드 관리 */}
              <section className="bg-white rounded-[32px] p-8 shadow-sm">
                <h2 className="text-[18px] font-bold mb-2">추천 키워드 관리</h2>
                <p className="text-[14px] text-gray-400 mb-6">검색창 하단에 노출될 키워드를 입력하세요.</p>
                
                <div className="flex gap-3 mb-6">
                  <input 
                    className="flex-1 bg-gray-50 border-none rounded-2xl py-4 px-6 text-[15px] outline-none focus:ring-2 focus:ring-[#3182f6]"
                    placeholder="예: 성수 팝업스토어"
                    value={newRecKeyword}
                    onChange={(e) => setNewRecKeyword(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddRecKeyword()}
                  />
                  <button onClick={handleAddRecKeyword} className="px-8 bg-[#3182f6] text-white rounded-2xl font-bold">등록</button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {recKeywords.map((kw) => (
                    <div key={kw.id} className="flex items-center gap-2 bg-blue-50 text-[#3182f6] px-4 py-2.5 rounded-xl font-bold text-[14px]">
                      #{kw.keyword}
                      <button onClick={() => handleDeleteRecKeyword(kw.id)} className="opacity-50 hover:opacity-100 transition-opacity">
                        {Icons.X ? <Icons.X size={14} /> : 'x'}
                      </button>
                    </div>
                  ))}
                  {recKeywords.length === 0 && <p className="text-gray-300 py-4">등록된 추천 키워드가 없습니다.</p>}
                </div>
              </section>

              {/* 2. 실제 검색 통계 데이터 */}
              <section className="bg-white rounded-[32px] p-8 shadow-sm overflow-hidden">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-[18px] font-bold">인기 검색어 통계 (DB 실시간)</h2>
                  <button onClick={fetchKeywordAdminData} className="text-[#3182f6] text-[13px] font-bold flex items-center gap-1.5">
                    {Icons.Refresh ? <Icons.Refresh size={14} /> : null} 새로고침
                  </button>
                </div>
                
                <div className="border border-gray-50 rounded-2xl overflow-hidden">
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
                          <td className="px-6 py-4 text-gray-400 text-[12px]">
                            {new Date(log.updated_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {searchLogs.length === 0 && <div className="py-20 text-center text-gray-300">검색 로그가 비어있습니다.</div>}
                </div>
              </section>
            </div>
          )}

          {(activeTab === 'edit_request' || activeTab === 'reviews') && (
            <div className="py-20 text-center text-gray-400 font-medium bg-white rounded-[32px] border border-dashed border-gray-200">
              데이터를 불러오는 중입니다.
            </div>
          )}
        </div>
      </main>

      {/* --- [수정 에디터 모달] --- */}
      {isEditModalOpen && editingStore && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-md" onClick={() => setIsEditModalOpen(false)} />
          <div className="relative bg-white w-full max-w-[520px] rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="p-7 border-b border-gray-50 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-[20px] font-bold">팝업 상세 수정</h2>
              <button onClick={() => setIsEditModalOpen(false)}>
                {Icons.X ? <Icons.X size={22} className="text-gray-400"/> : 'X'}
              </button>
            </div>
            
            <div className="p-7 overflow-y-auto space-y-6">
              {/* 이미지 섹션 */}
              <div>
                <label className="text-[13px] font-bold text-gray-400 mb-2 block">대표 이미지</label>
                <div className="flex gap-4 items-center">
                  <img src={editingStore.imageUrl} className="w-24 h-24 rounded-2xl object-cover bg-gray-100 border" />
                  <div className="flex-1">
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                    <button onClick={() => fileInputRef.current?.click()} className="w-full py-3 bg-gray-50 text-[#3182f6] rounded-xl font-bold text-[13px] border border-blue-50">파일 선택</button>
                  </div>
                </div>
              </div>

              {/* 팝업별 키워드 관리 */}
              <div>
                <label className="text-[13px] font-bold text-gray-400 mb-2 block">검색 태그</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {editingStore.keywords?.map(tag => (
                    <span key={tag} className="px-3 py-1.5 bg-blue-50 text-[#3182f6] rounded-xl text-[13px] font-bold flex items-center gap-1.5">
                      #{tag}
                      <button onClick={() => removeKeyword(tag)} className="p-0.5"><Icons.X size={14} /></button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input placeholder="키워드 입력" className="flex-1 bg-gray-50 border-none rounded-xl p-3 text-[14px] outline-none" value={keywordInput} onChange={(e) => setKeywordInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && addKeyword()} />
                  <button onClick={addKeyword} className="px-4 bg-[#3182f6] text-white rounded-xl font-bold text-[13px]">추가</button>
                </div>
              </div>

              {/* 기본 정보들 */}
              <div className="space-y-4">
                <input value={editingStore.title} onChange={e => setEditingStore({...editingStore, title: e.target.value})} className="w-full bg-gray-50 border-none rounded-xl p-4 text-[15px] outline-none" placeholder="팝업명" />
                <input value={editingStore.address} onChange={e => setEditingStore({...editingStore, address: e.target.value})} className="w-full bg-gray-50 border-none rounded-xl p-4 text-[15px] outline-none" placeholder="주소" />
                <textarea rows={3} value={editingStore.description} onChange={e => setEditingStore({...editingStore, description: e.target.value})} className="w-full bg-gray-50 border-none rounded-2xl p-4 text-[14px] outline-none resize-none" placeholder="설명" />
              </div>
            </div>

            <div className="p-7 bg-white border-t border-gray-50 grid grid-cols-2 gap-3 sticky bottom-0">
              <button onClick={() => setIsEditModalOpen(false)} className="h-14 bg-gray-100 text-gray-500 rounded-2xl font-bold">취소</button>
              <button onClick={() => handleUpdateStore()} className="h-14 bg-[#3182f6] text-white rounded-2xl font-bold shadow-lg shadow-blue-100">저장하기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
