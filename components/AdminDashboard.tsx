import React, { useState, useRef } from 'react';
import { Icons } from '../constants';
import { PopupStore } from '../types';
import { supabase } from '../lib/supabase';

const CATEGORIES = ['패션', '푸드', '아트', '엔터', '라이프스타일', '기타'];

interface AdminDashboardProps {
  allStores: PopupStore[];
  onBack: () => void;
  onRefresh: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ allStores, onBack, onRefresh }) => {
  // --- [상태 관리] ---
  const [activeTab, setActiveTab] = useState<'approval' | 'edit_request' | 'reviews'>('approval');
  const [approvalSubTab, setApprovalSubTab] = useState<'pending' | 'verified'>('pending');
  const [editingStore, setEditingStore] = useState<PopupStore | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDirectInput, setIsDirectInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- [이미지 업로드 핸들러] ---
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingStore) return;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `popups/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('popup-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('popup-images')
        .getPublicUrl(filePath);

      setEditingStore({ ...editingStore, imageUrl: publicUrl });
      alert('이미지가 성공적으로 업로드되었습니다.');
    } catch (error: any) {
      alert('이미지 업로드 실패: ' + error.message);
    }
  };

  // --- [저장 및 승인대기 핸들러] ---
  const handleUpdateStore = async (statusOverride?: boolean) => {
    if (!editingStore) return;
    
    // statusOverride가 false면 '승인대기(is_verified: false)', 없으면 현재 상태 유지
    const isVerified = statusOverride !== undefined ? statusOverride : editingStore.is_verified;

    const { error } = await supabase.from('popup_stores').update({
      title: editingStore.title,
      address: editingStore.address,
      category: editingStore.category,
      description: editingStore.description,
      image_url: editingStore.imageUrl, // DB 컬럼명 매핑 확인
      is_free: editingStore.is_free,
      is_reservation_required: editingStore.is_reservation_required,
      is_verified: isVerified
    }).eq('id', editingStore.id);

    if (!error) {
      alert(statusOverride === false ? '승인 대기 상태로 변경되었습니다.' : '저장되었습니다.');
      setIsEditModalOpen(false);
      onRefresh();
    } else {
      alert('데이터 저장 중 오류가 발생했습니다: ' + error.message);
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
          <button onClick={onBack} className="w-10 h-10 flex items-center justify-center bg-gray-50 hover:bg-gray-100 rounded-full transition-all">
             <Icons.X size={24} className="text-gray-600" />
          </button>
          <h1 className="text-[20px] font-bold">관리자 콘솔</h1>
        </div>
      </header>

      {/* 탭 네비게이션 */}
      <nav className="bg-white px-6 flex border-b border-gray-50">
        {[
          { id: 'approval', label: '승인 관리' },
          { id: 'edit_request', label: '정보 수정 요청' },
          { id: 'reviews', label: '리뷰 관리' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-5 py-4 text-[15px] font-bold transition-all relative ${
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
          {/* 탭 내용 분기 */}
          {activeTab === 'approval' ? (
            <>
              <div className="flex gap-2 mb-6">
                <button onClick={() => setApprovalSubTab('pending')} className={`px-6 py-2.5 rounded-2xl font-bold text-[14px] transition-all ${approvalSubTab === 'pending' ? 'bg-[#3182f6] text-white shadow-md' : 'bg-white text-gray-400 shadow-sm'}`}>대기중</button>
                <button onClick={() => setApprovalSubTab('verified')} className={`px-6 py-2.5 rounded-2xl font-bold text-[14px] transition-all ${approvalSubTab === 'verified' ? 'bg-[#3182f6] text-white shadow-md' : 'bg-white text-gray-400 shadow-sm'}`}>승인됨</button>
              </div>

              <div className="space-y-3">
                {allStores.filter(s => approvalSubTab === 'pending' ? !s.is_verified : s.is_verified).map(store => (
                  <div key={store.id} className="bg-white p-5 rounded-[28px] flex items-center justify-between shadow-sm border border-white hover:border-blue-50 transition-colors">
                    <div className="flex items-center gap-5">
                      <img src={store.imageUrl} className="w-16 h-16 rounded-2xl object-cover bg-gray-50 flex-shrink-0" alt="" />
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[11px] font-bold text-[#3182f6]">{store.category}</span>
                          {store.is_reservation_required && <span className="px-1.5 py-0.5 bg-red-50 text-red-500 text-[9px] rounded font-bold uppercase">예약필수</span>}
                        </div>
                        <h3 className="text-[16px] font-bold">{store.title}</h3>
                        <p className="text-[13px] text-gray-400">{store.address}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setEditingStore({...store}); setIsEditModalOpen(true); setIsDirectInput(false); }} className="px-5 py-2.5 bg-gray-50 text-gray-600 rounded-xl font-bold text-[13px] hover:bg-gray-100 transition-colors">수정</button>
                      {approvalSubTab === 'pending' && (
                        <button onClick={() => handleApprove(store.id)} className="px-5 py-2.5 bg-[#3182f6] text-white rounded-xl font-bold text-[13px] hover:bg-blue-600 transition-colors">승인</button>
                      )}
                      <button onClick={() => handleDelete(store.id)} className="px-5 py-2.5 bg-red-50 text-red-500 rounded-xl font-bold text-[13px] hover:bg-red-100 transition-colors">삭제</button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="py-20 text-center text-gray-400 font-medium bg-white rounded-[32px] border border-dashed border-gray-200">
              {activeTab === 'edit_request' ? '정보 수정 요청 건이 없습니다.' : '관리할 리뷰 데이터가 없습니다.'}
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
              <h2 className="text-[20px] font-bold">팝업 정보 수정</h2>
              <button onClick={() => setIsEditModalOpen(false)}><Icons.X size={22} className="text-gray-400"/></button>
            </div>
            
            <div className="p-7 overflow-y-auto space-y-6">
              {/* 이미지 섹션 */}
              <div>
                <label className="text-[13px] font-bold text-gray-400 mb-2 block">대표 이미지</label>
                <div className="flex gap-4 items-center">
                  <img src={editingStore.imageUrl} className="w-24 h-24 rounded-2xl object-cover bg-gray-100 border" />
                  <div className="flex-1">
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                    <button onClick={() => fileInputRef.current?.click()} className="w-full py-3 bg-gray-50 text-[#3182f6] rounded-xl font-bold text-[13px] border border-blue-50">파일 선택 및 업로드</button>
                    <p className="text-[11px] text-gray-400 mt-2 italic break-all">{editingStore.imageUrl}</p>
                  </div>
                </div>
              </div>

              {/* 카테고리 섹션 */}
              <div>
                <label className="text-[13px] font-bold text-gray-400 mb-2 block">카테고리</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {CATEGORIES.map(cat => (
                    <button key={cat} onClick={() => { setEditingStore({...editingStore, category: cat}); setIsDirectInput(false); }} className={`px-4 py-2 rounded-xl text-[13px] font-bold border transition-all ${editingStore.category === cat && !isDirectInput ? 'bg-[#3182f6] text-white border-[#3182f6]' : 'bg-white text-gray-400 border-gray-100'}`}>{cat}</button>
                  ))}
                  <button onClick={() => setIsDirectInput(true)} className={`px-4 py-2 rounded-xl text-[13px] font-bold border transition-all ${isDirectInput ? 'bg-[#3182f6] text-white border-[#3182f6]' : 'bg-white text-gray-400 border-gray-100'}`}>직접 입력</button>
                </div>
                {isDirectInput && (
                  <input placeholder="카테고리를 직접 입력하세요" className="w-full bg-gray-50 border-none rounded-xl p-4 text-[14px] outline-none focus:ring-2 focus:ring-[#3182f6]" value={editingStore.category} onChange={e => setEditingStore({...editingStore, category: e.target.value})} />
                )}
              </div>

              {/* 기본 정보 */}
              <div className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-bold text-gray-400">팝업명</label>
                  <input value={editingStore.title} onChange={e => setEditingStore({...editingStore, title: e.target.value})} className="bg-gray-50 border-none rounded-xl p-4 text-[15px] outline-none focus:ring-2 focus:ring-[#3182f6]" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-bold text-gray-400">주소</label>
                  <input value={editingStore.address} onChange={e => setEditingStore({...editingStore, address: e.target.value})} className="bg-gray-50 border-none rounded-xl p-4 text-[15px] outline-none focus:ring-2 focus:ring-[#3182f6]" />
                </div>
              </div>

              {/* 옵션 토글 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-bold text-gray-400">입장료 유무</label>
                  <div className="flex bg-gray-50 p-1 rounded-xl">
                    <button onClick={() => setEditingStore({...editingStore, is_free: true})} className={`flex-1 py-2.5 rounded-lg text-[13px] font-bold ${editingStore.is_free ? 'bg-white text-[#3182f6] shadow-sm' : 'text-gray-400'}`}>무료</button>
                    <button onClick={() => setEditingStore({...editingStore, is_free: false})} className={`flex-1 py-2.5 rounded-lg text-[13px] font-bold ${!editingStore.is_free ? 'bg-white text-red-500 shadow-sm' : 'text-gray-400'}`}>유료</button>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-bold text-gray-400">예약 필요</label>
                  <div className="flex bg-gray-50 p-1 rounded-xl">
                    <button onClick={() => setEditingStore({...editingStore, is_reservation_required: false})} className={`flex-1 py-2.5 rounded-lg text-[13px] font-bold ${!editingStore.is_reservation_required ? 'bg-white text-green-600 shadow-sm' : 'text-gray-400'}`}>상시</button>
                    <button onClick={() => setEditingStore({...editingStore, is_reservation_required: true})} className={`flex-1 py-2.5 rounded-lg text-[13px] font-bold ${editingStore.is_reservation_required ? 'bg-white text-[#3182f6] shadow-sm' : 'text-gray-400'}`}>예약필수</button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 pb-4">
                <label className="text-[13px] font-bold text-gray-400">설명</label>
                <textarea rows={3} value={editingStore.description} onChange={e => setEditingStore({...editingStore, description: e.target.value})} className="bg-gray-50 border-none rounded-2xl p-4 text-[14px] outline-none resize-none focus:ring-2 focus:ring-[#3182f6]" />
              </div>
            </div>

            {/* 버튼 바 */}
            <div className="p-7 bg-white border-t border-gray-50 grid grid-cols-3 gap-3 sticky bottom-0">
              <button onClick={() => setIsEditModalOpen(false)} className="h-14 bg-gray-100 text-gray-500 rounded-2xl font-bold">취소</button>
              <button onClick={() => handleUpdateStore(false)} className="h-14 bg-orange-50 text-orange-600 rounded-2xl font-bold">승인 대기</button>
              <button onClick={() => handleUpdateStore()} className="h-14 bg-[#3182f6] text-white rounded-2xl font-bold shadow-lg shadow-blue-100">저장하기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
