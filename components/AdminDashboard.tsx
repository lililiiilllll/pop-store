import React, { useState, useEffect, useCallback } from 'react';
import { Icons } from '../constants';
import { PopupStore } from '../types';
import { supabase } from '../lib/supabase';

interface AdminDashboardProps {
  allStores: PopupStore[];
  onBack: () => void;
  onRefresh: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ allStores, onBack, onRefresh }) => {
  const [activeTab, setActiveTab] = useState('approval');
  const [approvalSubTab, setApprovalSubTab] = useState<'pending' | 'verified'>('pending');
  
  // 데이터 상태
  const [reviews, setReviews] = useState<any[]>([]);
  const [searchLogs, setSearchLogs] = useState<any[]>([]);
  const [keywords, setKeywords] = useState<any[]>([]);
  const [correctionRequests, setCorrectionRequests] = useState<any[]>([]);
  
  // 수정 모달 상태
  const [editingStore, setEditingStore] = useState<PopupStore | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // 아이콘 안전 렌더링
  const renderIcon = (IconComponent: any, size = 20, className = "") => {
    if (!IconComponent || typeof IconComponent !== 'function') return null;
    return <IconComponent size={size} className={className} />;
  };

  // --- [데이터 로드 로직] ---
  const fetchData = useCallback(async () => {
    try {
      if (activeTab === 'reviews') {
        const { data } = await supabase.from('reviews').select('*').order('reports', { ascending: false });
        setReviews(data || []);
      } else if (activeTab === 'search') {
        const logs = await supabase.from('search_logs').select('*').order('search_count', { ascending: false });
        const recs = await supabase.from('recommended_keywords').select('*').eq('is_active', true);
        setSearchLogs(logs.data || []);
        setKeywords(recs.data || []);
      } else if (activeTab === 'correction') {
        const { data } = await supabase.from('correction_requests').select('*').eq('status', 'pending').order('created_at', { ascending: false });
        setCorrectionRequests(data || []);
      }
    } catch (e) { console.error("데이터 로드 실패:", e); }
  }, [activeTab]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // --- [액션 핸들러: 팝업 관리] ---
  const handleApprove = async (id: any) => {
    if (!confirm('해당 제보를 정식 팝업으로 승인하시겠습니까?')) return;
    const { error } = await supabase.from('popup_stores').update({ is_verified: true }).eq('id', id);
    if (!error) { alert('승인되었습니다.'); onRefresh(); }
  };

  const handleDeleteStore = async (id: any) => {
    if (!confirm('정말로 삭제하시겠습니까? 데이터가 영구 삭제됩니다.')) return;
    const { error } = await supabase.from('popup_stores').delete().eq('id', id);
    if (!error) { alert('삭제되었습니다.'); onRefresh(); }
  };

  // 수정 모달 열기
  const openEditModal = (store: PopupStore) => {
    setEditingStore({ ...store });
    setIsEditModalOpen(true);
  };

  // 수정 내용 저장 (DB 반영)
  const handleUpdateStore = async () => {
    if (!editingStore) return;
    const { error } = await supabase.from('popup_stores').update({
      title: editingStore.title,
      address: editingStore.address,
      category: editingStore.category,
      description: editingStore.description,
      start_date: editingStore.start_date,
      end_date: editingStore.end_date
    }).eq('id', editingStore.id);

    if (!error) {
      alert('정보가 수정되었습니다.');
      setIsEditModalOpen(false);
      onRefresh();
    }
  };

  // --- [액션 핸들러: 정보수정 요청] ---
  const handleApproveCorrection = async (request: any) => {
    if (!confirm('요청된 수정 내용을 실제 데이터에 반영하시겠습니까?')) return;
    
    // 1. 실제 팝업 정보 업데이트
    const { error: updateError } = await supabase.from('popup_stores').update({
      title: request.title_fix || undefined,
      description: request.description_fix || undefined
    }).eq('id', request.popup_id);

    if (!updateError) {
      // 2. 요청 상태 완료 처리
      await supabase.from('correction_requests').update({ status: 'completed' }).eq('id', request.id);
      alert('반영 완료되었습니다.');
      fetchData();
      onRefresh();
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-[#f2f4f6] flex flex-col overflow-hidden font-sans text-[#191f28]">
      {/* 헤더 영역 */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="w-10 h-10 flex items-center justify-center bg-gray-50 hover:bg-gray-100 rounded-full transition-all">
            {renderIcon(Icons.X, 24)}
          </button>
          <h1 className="text-[20px] font-bold">Admin Console</h1>
        </div>
        
        <div className="flex bg-gray-50 p-1 rounded-2xl gap-1">
          {[
            { id: 'approval', label: '제보/승인' },
            { id: 'correction', label: '수정 요청' },
            { id: 'search', label: '검색어/키워드' },
            { id: 'reviews', label: '리뷰 관리' }
          ].map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2.5 rounded-xl text-[14px] font-bold transition-all ${activeTab === tab.id ? 'bg-white text-[#3182f6] shadow-sm' : 'text-gray-400'}`}>
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto">
          
          {/* [1] 제보 승인 및 승인됨 관리 */}
          {activeTab === 'approval' && (
            <div className="space-y-4">
              <div className="flex gap-2 mb-4">
                <button onClick={() => setApprovalSubTab('pending')} className={`px-4 py-2 rounded-lg font-bold text-[13px] ${approvalSubTab === 'pending' ? 'bg-[#3182f6] text-white' : 'bg-white text-gray-400'}`}>대기중</button>
                <button onClick={() => setApprovalSubTab('verified')} className={`px-4 py-2 rounded-lg font-bold text-[13px] ${approvalSubTab === 'verified' ? 'bg-[#3182f6] text-white' : 'bg-white text-gray-400'}`}>승인됨</button>
              </div>

              {allStores.filter(s => approvalSubTab === 'pending' ? !s.is_verified : s.is_verified).map(store => (
                <div key={store.id} className="bg-white p-5 rounded-[24px] flex items-center justify-between shadow-sm mb-3">
                  <div className="flex items-center gap-4">
                    <img src={store.imageUrl} className="w-16 h-16 rounded-xl object-cover bg-gray-50" />
                    <div>
                      <span className="text-[11px] font-bold text-[#3182f6]">{store.category}</span>
                      <h3 className="text-[16px] font-bold">{store.title}</h3>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {approvalSubTab === 'pending' ? (
                      <button onClick={() => handleApprove(store.id)} className="w-24 py-2.5 bg-[#3182f6] text-white rounded-xl font-bold text-[13px]">승인하기</button>
                    ) : (
                      <button onClick={() => openEditModal(store)} className="w-24 py-2.5 bg-gray-100 text-gray-600 rounded-xl font-bold text-[13px]">수정하기</button>
                    )}
                    <button onClick={() => handleDeleteStore(store.id)} className="w-24 py-2.5 bg-red-50 text-red-500 rounded-xl font-bold text-[13px]">삭제하기</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* [2] 정보 수정 요청 관리 */}
          {activeTab === 'correction' && (
            <div className="space-y-4">
              {correctionRequests.map(req => (
                <div key={req.id} className="bg-white p-6 rounded-[24px] shadow-sm border border-white">
                  <div className="flex justify-between items-start">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-blue-50 text-[#3182f6] text-[11px] font-bold rounded">대상 ID: {req.popup_id}</span>
                        <span className="text-[13px] text-gray-400">{new Date(req.created_at).toLocaleDateString()} 제보</span>
                      </div>
                      <h4 className="font-bold text-[16px]">수정 요청 사유: {req.reason}</h4>
                      <div className="p-4 bg-gray-50 rounded-xl space-y-2">
                        <div className="grid grid-cols-2 text-[13px]">
                          <span className="text-gray-400">수정 요청 타이틀:</span>
                          <span className="font-bold text-[#3182f6]">{req.title_fix || '(변경없음)'}</span>
                        </div>
                        <div className="grid grid-cols-2 text-[13px]">
                          <span className="text-gray-400">수정 요청 내용:</span>
                          <span className="font-bold text-[#3182f6]">{req.description_fix || '(변경없음)'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 ml-6">
                      <button onClick={() => handleApproveCorrection(req)} className="w-24 py-2.5 bg-[#3182f6] text-white rounded-xl font-bold text-[13px]">반영하기</button>
                      <button className="w-24 py-2.5 bg-gray-100 text-gray-400 rounded-xl font-bold text-[13px]">무시하기</button>
                    </div>
                  </div>
                </div>
              ))}
              {correctionRequests.length === 0 && <div className="text-center py-20 bg-white rounded-[32px] text-gray-400">진행 중인 수정 요청이 없습니다.</div>}
            </div>
          )}

          {/* [3] 리뷰 및 [4] 검색어 탭은 이전 로직 유지 (생략) */}
        </div>
      </main>

      {/* --- [수정 에디터 모달] --- */}
      {isEditModalOpen && editingStore && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsEditModalOpen(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0">
              <h2 className="text-[18px] font-bold">팝업 정보 수정 (ID: {editingStore.id})</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">{renderIcon(Icons.X, 20)}</button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-4">
              <div>
                <label className="text-[12px] font-bold text-gray-400 ml-1">팝업명</label>
                <input value={editingStore.title} onChange={e => setEditingStore({...editingStore, title: e.target.value})} className="w-full mt-1 bg-gray-50 border-none rounded-xl p-4 outline-none focus:ring-2 focus:ring-[#3182f6]" />
              </div>
              <div>
                <label className="text-[12px] font-bold text-gray-400 ml-1">주소</label>
                <input value={editingStore.address} onChange={e => setEditingStore({...editingStore, address: e.target.value})} className="w-full mt-1 bg-gray-50 border-none rounded-xl p-4 outline-none focus:ring-2 focus:ring-[#3182f6]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[12px] font-bold text-gray-400 ml-1">카테고리</label>
                  <input value={editingStore.category} onChange={e => setEditingStore({...editingStore, category: e.target.value})} className="w-full mt-1 bg-gray-50 border-none rounded-xl p-4 outline-none focus:ring-2 focus:ring-[#3182f6]" />
                </div>
                <div>
                  <label className="text-[12px] font-bold text-gray-400 ml-1">무료입장 (true/false)</label>
                  <input value={String(editingStore.is_free)} onChange={e => setEditingStore({...editingStore, is_free: e.target.value === 'true'})} className="w-full mt-1 bg-gray-50 border-none rounded-xl p-4 outline-none focus:ring-2 focus:ring-[#3182f6]" />
                </div>
              </div>
              <div>
                <label className="text-[12px] font-bold text-gray-400 ml-1">설명</label>
                <textarea rows={4} value={editingStore.description} onChange={e => setEditingStore({...editingStore, description: e.target.value})} className="w-full mt-1 bg-gray-50 border-none rounded-xl p-4 outline-none focus:ring-2 focus:ring-[#3182f6] resize-none" />
              </div>
            </div>

            <div className="p-6 bg-white border-t border-gray-100 flex gap-3">
              <button onClick={() => setIsEditModalOpen(false)} className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl font-bold">취소</button>
              <button onClick={handleUpdateStore} className="flex-[2] py-4 bg-[#3182f6] text-white rounded-2xl font-bold">저장하기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
