import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Icons } from '../constants';
import { PopupStore } from '../types';
import { supabase } from '../lib/supabase';

interface AdminDashboardProps {
  allStores: PopupStore[];
  onBack: () => void;
  onRefresh: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ allStores, onBack, onRefresh }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(false);

  // 새 팝업 입력을 위한 로컬 상태
  const [formData, setFormData] = useState({
    title: '',
    category: '패션',
    description: '',
    address: '',
    lat: 37.54,
    lng: 127.04,
    is_free: true,
    image_url: ''
  });

  const ChevronLeft = Icons.ChevronLeft || 'span';
  const Plus = Icons.Plus || 'span';
  const Trash = Icons.Trash || 'span';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from('popup_stores').insert([formData]);
      if (error) throw error;
      
      alert('새 팝업이 등록되었습니다! 🎉');
      setIsAdding(false);
      onRefresh(); // 리스트 갱신
    } catch (error: any) {
      alert('등록 실패: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말로 이 팝업을 삭제하시겠습니까?')) return;
    try {
      const { error } = await supabase.from('popup_stores').delete().eq('id', id);
      if (error) throw error;
      onRefresh();
    } catch (error: any) {
      alert('삭제 실패: ' + error.message);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-[#f2f4f6] overflow-y-auto">
      {/* 상단 네비게이션 바 */}
      <nav className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-200 px-5 py-4 flex items-center justify-between z-10">
        <button onClick={onBack} className="flex items-center gap-1 text-[#4e5968] font-medium toss-active-scale">
          <ChevronLeft size={20} /> 뒤로
        </button>
        <h1 className="text-[17px] font-bold text-[#191f28]">관리자 콘솔</h1>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="bg-[#3182f6] text-white px-4 py-2 rounded-xl text-[13px] font-bold shadow-sm toss-active-scale"
        >
          {isAdding ? '취소' : '신규 등록'}
        </button>
      </nav>

      <main className="max-w-3xl mx-auto p-5 pb-20">
        {isAdding ? (
          /* 등록 폼 섹션 */
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100">
            <h2 className="text-[20px] font-bold mb-6">새로운 팝업 등록</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div>
                <label className="block text-[13px] font-bold text-[#4e5968] mb-2">팝업 스토어 이름</label>
                <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full bg-[#f2f4f6] border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#3182f6] outline-none transition-all" placeholder="예: 무신사 팝업" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-bold text-[#4e5968] mb-2">카테고리</label>
                  <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}
                    className="w-full bg-[#f2f4f6] border-none rounded-xl px-4 py-3 outline-none">
                    <option>패션</option><option>음식</option><option>예술</option><option>라이프스타일</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-bold text-[#4e5968] mb-2">무료입장 여부</label>
                  <button type="button" onClick={() => setFormData({...formData, is_free: !formData.is_free})}
                    className={`w-full py-3 rounded-xl font-bold transition-all ${formData.is_free ? 'bg-blue-50 text-[#3182f6]' : 'bg-gray-100 text-gray-500'}`}>
                    {formData.is_free ? '무료 입장' : '유료/예약제'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-bold text-[#4e5968] mb-2">이미지 URL</label>
                <input value={formData.image_url} onChange={e => setFormData({...formData, image_url: e.target.value})}
                  className="w-full bg-[#f2f4f6] border-none rounded-xl px-4 py-3 outline-none" placeholder="https://..." />
              </div>

              <button disabled={loading} type="submit" className="w-full bg-[#3182f6] text-white py-4 rounded-2xl font-bold text-[16px] mt-4 shadow-lg shadow-blue-200 toss-active-scale disabled:opacity-50">
                {loading ? '등록 중...' : '등록하기'}
              </button>
            </form>
          </motion.div>
        ) : (
          /* 리스트 섹션 */
          <div className="flex flex-col gap-4">
            <h2 className="text-[15px] font-bold text-[#8b95a1] ml-1">현재 등록된 팝업 ({allStores.length})</h2>
            {allStores.map(store => (
              <div key={store.id} className="bg-white p-4 rounded-[20px] flex items-center justify-between shadow-sm border border-gray-50">
                <div className="flex items-center gap-4">
                  <img src={store.imageUrl} className="w-12 h-12 rounded-xl object-cover" alt="" />
                  <div>
                    <h3 className="font-bold text-[15px] text-[#191f28]">{store.title}</h3>
                    <p className="text-[12px] text-[#8b95a1]">{store.category} · {store.is_free ? '무료' : '유료'}</p>
                  </div>
                </div>
                <button onClick={() => handleDelete(store.id)} className="p-2 text-[#f04452] hover:bg-red-50 rounded-lg transition-colors">
                  <Trash size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
