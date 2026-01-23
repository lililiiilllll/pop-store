import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  const [loading, setLoading] = useState(false);
  
  // 에러 방지: 아이콘이 없을 경우 빈 div나 span을 사용하도록 기본값 설정
  const ChevronLeft = Icons.ChevronLeft || 'span';
  const Trash = Icons.Trash || 'span';
  const Edit = Icons.Edit || 'span';
  const Check = Icons.Check || 'span';
  const EyeOff = Icons.EyeOff || 'span';
  const AlertCircle = Icons.AlertCircle || 'span';
  const Search = Icons.Search || 'span';
  const Heart = Icons.Heart || 'span';
  const RotateCw = Icons.RotateCw || 'span';
  const Star = Icons.Star || 'span';
  const MessageSquare = Icons.MessageSquare || 'span';

  const { ChevronLeft, Trash, Edit, Check, EyeOff, AlertCircle, Search, Heart, RotateCw } = Icons;

  // --- [데이터 페칭] 탭 전환 시 데이터 로드 ---
  useEffect(() => {
    if (activeTab === 'reviews') fetchReviews();
    if (activeTab === 'search') fetchSearchData();
  }, [activeTab]);

  const fetchReviews = async () => {
    const { data } = await supabase.from('reviews').select('*').order('reports', { ascending: false });
    if (data) setReviews(data);
  };

  const fetchSearchData = async () => {
    const stats = await supabase.from('search_stats').select('*').order('count', { ascending: false });
    const recs = await supabase.from('recommended_keywords').select('*');
    if (stats.data) setSearchStats(stats.data);
    if (recs.data) setKeywords(recs.data);
  };

  // --- [액션 1] 팝업 승인 처리 ---
  const handleApprove = async (id: string) => {
    if (!confirm('이 제보를 승인하고 정식 게시하시겠습니까?')) return;
    setLoading(true);
    // [제보] 말머리 삭제 및 상태 변경 (실제 DB 구조에 따라 column 조정 필요)
    const store = allStores.find(s => s.id === id);
    const updatedTitle = store?.title.replace('[제보] ', '');
    
    const { error } = await supabase
      .from('popup_stores')
      .update({ title: updatedTitle, is_verified: true }) // 승인 필드 업데이트
      .eq('id', id);

    if (!error) {
      alert('승인 완료되었습니다.');
      onRefresh();
    }
    setLoading(false);
  };

  // --- [액션 2] 리뷰 블라인드/삭제 ---
  const handleReviewAction = async (id: string, action: 'blind' | 'delete') => {
    if (action === 'delete') {
      if (!confirm('리뷰를 영구 삭제하시겠습니까?')) return;
      await supabase.from('reviews').delete().eq('id', id);
    } else {
      await supabase.from('reviews').update({ is_blinded: true }).eq('id', id);
    }
    fetchReviews();
  };

  // --- [액션 3] 추천 키워드 추가 ---
  const addKeyword = async () => {
    if (!newKeyword.trim()) return;
    await supabase.from('recommended_keywords').insert([{ keyword: newKeyword }]);
    setNewKeyword('');
    fetchSearchData();
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-[#f2f4f6] flex flex-col overflow-hidden">
      {/* 상단바 생략 (이전 UI와 동일) */}
      
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto">
          
          {/* 팝업 관리 탭 */}
          {activeTab === 'approval' && (
            <div className="grid gap-4">
              {allStores.map(store => (
                <div key={store.id} className="bg-white p-5 rounded-[24px] flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-4">
                    <img src={store.imageUrl} className="w-16 h-16 rounded-xl object-cover" />
                    <div>
                      <h3 className="font-bold">{store.title}</h3>
                      <p className="text-[13px] text-gray-500">{store.address}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {store.title.includes('[제보]') && (
                      <button 
                        onClick={() => handleApprove(store.id)}
                        disabled={loading}
                        className="px-4 py-2 bg-[#3182f6] text-white rounded-xl font-bold text-[13px]"
                      >
                        승인
                      </button>
                    )}
                    <button onClick={() => handleReviewAction(store.id, 'delete')} className="p-2 text-red-500"><Trash size={18}/></button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 리뷰 관리 탭 */}
          {activeTab === 'reviews' && (
            <div className="grid gap-4">
              {reviews.map(review => (
                <div key={review.id} className={`bg-white p-6 rounded-[24px] border-2 ${review.reports > 0 ? 'border-red-100' : 'border-white'}`}>
                  <div className="flex justify-between mb-2">
                    <span className="font-bold">{review.user_name}</span>
                    <span className="text-red-500 text-[12px] font-bold">신고 {review.reports}건</span>
                  </div>
                  <p className="text-[#4e5968] mb-4">{review.content}</p>
                  <div className="flex justify-end gap-2">
                    <button onClick={() => handleReviewAction(review.id, 'blind')} className="px-3 py-1 bg-orange-50 text-orange-600 rounded-lg text-[12px] font-bold">블라인드</button>
                    <button onClick={() => handleReviewAction(review.id, 'delete')} className="px-3 py-1 bg-red-50 text-red-600 rounded-lg text-[12px] font-bold">삭제</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 검색어 관리 탭 */}
          {activeTab === 'search' && (
            <div className="space-y-6">
               <section className="bg-white p-6 rounded-[24px]">
                 <h3 className="font-bold mb-4">추천 키워드 등록</h3>
                 <div className="flex gap-2">
                   <input 
                    value={newKeyword} onChange={e => setNewKeyword(e.target.value)}
                    className="flex-1 bg-[#f2f4f6] px-4 py-2 rounded-xl" placeholder="키워드 입력" 
                   />
                   <button onClick={addKeyword} className="bg-[#3182f6] text-white px-4 py-2 rounded-xl font-bold">추가</button>
                 </div>
                 <div className="flex flex-wrap gap-2 mt-4">
                   {keywords.map(k => (
                     <span key={k.id} className="px-3 py-1 bg-gray-100 rounded-full text-[13px]">
                       {k.keyword} <button className="ml-1 text-gray-400">×</button>
                     </span>
                   ))}
                 </div>
               </section>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
