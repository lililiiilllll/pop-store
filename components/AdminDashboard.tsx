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
  // 1. 상태 관리 정의
  const [activeTab, setActiveTab] = useState('approval');
  const [loading, setLoading] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [keywords, setKeywords] = useState<any[]>([]);
  const [searchStats, setSearchStats] = useState<any[]>([]);
  const [newKeyword, setNewKeyword] = useState('');

  // 2. 아이콘 중복 선언 해결 (안전한 할당 방식 하나만 사용)
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

  // 3. 데이터 페칭 로직
  useEffect(() => {
    if (activeTab === 'reviews') fetchReviews();
    if (activeTab === 'search') fetchSearchData();
  }, [activeTab]);

  const fetchReviews = async () => {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .order('reports', { ascending: false });
    if (!error && data) setReviews(data);
  };

  const fetchSearchData = async () => {
    const stats = await supabase.from('search_stats').select('*').order('count', { ascending: false });
    const recs = await supabase.from('recommended_keywords').select('*');
    if (stats.data) setSearchStats(stats.data);
    if (recs.data) setKeywords(recs.data);
  };

  // 4. 액션 핸들러
  const handleApprove = async (id: string) => {
    if (!confirm('이 제보를 승인하고 정식 게시하시겠습니까?')) return;
    setLoading(true);
    const store = allStores.find(s => s.id === id);
    const updatedTitle = store?.title.replace('[제보] ', '');
    
    const { error } = await supabase
      .from('popup_stores')
      .update({ title: updatedTitle, is_verified: true })
      .eq('id', id);

    if (!error) {
      alert('승인 완료되었습니다.');
      onRefresh();
    }
    setLoading(false);
  };

  const handleReviewAction = async (id: string, action: 'blind' | 'delete') => {
    if (action === 'delete') {
      if (!confirm('리뷰를 영구 삭제하시겠습니까?')) return;
      await supabase.from('reviews').delete().eq('id', id);
    } else {
      await supabase.from('reviews').update({ is_blinded: true }).eq('id', id);
    }
    fetchReviews();
  };

  const addKeyword = async () => {
    if (!newKeyword.trim()) return;
    const { error } = await supabase.from('recommended_keywords').insert([{ keyword: newKeyword }]);
    if (!error) {
      setNewKeyword('');
      fetchSearchData();
    }
  };

  const deleteKeyword = async (id: string) => {
    await supabase.from('recommended_keywords').delete().eq('id', id);
    fetchSearchData();
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-[#f2f4f6] flex flex-col overflow-hidden">
      {/* 상단 네비게이션 */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm z-20">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-all">
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-[20px] font-bold text-[#191f28]">관리자 대시보드</h1>
        </div>
        
        <div className="flex bg-[#f2f4f6] p-1 rounded-xl">
          {['approval', 'search', 'reviews'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-[13px] font-bold transition-all ${
                activeTab === tab ? 'bg-white shadow-sm text-[#3182f6]' : 'text-[#8b95a1]'
              }`}
            >
              {tab === 'approval' ? '팝업 승인' : tab === 'search' ? '검색어' : '리뷰 관리'}
            </button>
          ))}
        </div>
        <div className="w-10" /> {/* 밸런스 유지용 빈 공간 */}
      </nav>
      
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto">
          
          {/* 팝업 관리 탭 */}
          {activeTab === 'approval' && (
            <div className="grid gap-4">
              <h2 className="text-[15px] font-bold text-[#8b95a1] mb-2">승인 대기 및 운영 중 ({allStores.length})</h2>
              {allStores.map(store => (
                <div key={store.id} className="bg-white p-5 rounded-[24px] flex items-center justify-between shadow-sm border border-white hover:border-blue-50 transition-all">
                  <div className="flex items-center gap-4">
                    <img src={store.imageUrl} className="w-16 h-16 rounded-xl object-cover bg-gray-100" />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-[#191f28]">{store.title}</h3>
                        {store.title.includes('[제보]') && (
                          <span className="text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded font-bold">제보</span>
                        )}
                      </div>
                      <p className="text-[13px] text-gray-500">{store.address}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 text-gray-400">
                    {store.title.includes('[제보]') && (
                      <button 
                        onClick={() => handleApprove(store.id)}
                        disabled={loading}
                        className="px-4 py-2 bg-[#3182f6] text-white rounded-xl font-bold text-[13px] toss-active-scale"
                      >
                        승인
                      </button>
                    )}
                    <button onClick={() => handleReviewAction(store.id, 'delete')} className="p-3 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all">
                      <Trash size={18}/>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 리뷰 관리 탭 */}
          {activeTab === 'reviews' && (
            <div className="grid gap-4">
              <h2 className="text-[15px] font-bold text-[#8b95a1] mb-2">전체 리뷰 관리 ({reviews.length})</h2>
              {reviews.length === 0 && <div className="text-center py-20 bg-white rounded-[24px] text-gray-400">등록된 리뷰가 없습니다.</div>}
              {reviews.map(review => (
                <div key={review.id} className={`bg-white p-6 rounded-[24px] shadow-sm border-2 ${review.reports > 0 ? 'border-red-100' : 'border-white'}`}>
                  <div className="flex justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#191f28]">{review.user_name}</span>
                      {review.reports > 0 && (
                        <span className="text-red-500 text-[11px] font-bold bg-red-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <AlertCircle size={12} /> 신고 {review.reports}건
                        </span>
                      )}
                    </div>
                    <span className="text-gray-400 text-[12px]">{new Date(review.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-[#4e5968] mb-5 leading-relaxed">{review.content}</p>
                  <div className="flex justify-end gap-2">
                    <button onClick={() => handleReviewAction(review.id, 'blind')} className="px-4 py-2 bg-[#f2f4f6] text-[#4e5968] rounded-xl text-[12px] font-bold hover:bg-gray-200">
                      {review.is_blinded ? '숨김 해제' : '블라인드'}
                    </button>
                    <button onClick={() => handleReviewAction(review.id, 'delete')} className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-[12px] font-bold hover:bg-red-100">삭제</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 검색어 관리 탭 */}
          {activeTab === 'search' && (
            <div className="space-y-6">
              <section className="bg-white p-6 rounded-[24px] shadow-sm">
                <h3 className="font-bold text-[#191f28] mb-4 flex items-center gap-2">
                  <Star className="text-yellow-400" size={18} /> 추천 키워드 등록
                </h3>
                <div className="flex gap-2 mb-6">
                  <input 
                    value={newKeyword} 
                    onChange={e => setNewKeyword(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && addKeyword()}
                    className="flex-1 bg-[#f2f4f6] px-5 py-3 rounded-xl outline-none focus:ring-2 focus:ring-[#3182f6] transition-all" 
                    placeholder="사용자에게 보여줄 추천 키워드 입력" 
                  />
                  <button onClick={addKeyword} className="bg-[#3182f6] text-white px-6 py-3 rounded-xl font-bold toss-active-scale">추가</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {keywords.map(k => (
                    <span key={k.id} className="group px-4 py-2 bg-gray-50 border border-gray-100 rounded-full text-[13px] text-[#4e5968] font-medium flex items-center gap-2">
                      #{k.keyword}
                      <button onClick={() => deleteKeyword(k.id)} className="text-gray-300 group-hover:text-red-400 transition-colors">×</button>
                    </span>
                  ))}
                </div>
              </section>

              <section className="bg-white p-6 rounded-[24px] shadow-sm">
                <h3 className="font-bold text-[#191f28] mb-4 flex items-center gap-2">
                  <RotateCw className="text-blue-500" size={18} /> 실시간 검색 통계
                </h3>
                <div className="divide-y divide-gray-50">
                  {searchStats.map((stat, index) => (
                    <div key={stat.id} className="py-3 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <span className={`w-5 text-center font-bold ${index < 3 ? 'text-[#3182f6]' : 'text-gray-300'}`}>{index + 1}</span>
                        <span className="text-[14px] text-[#4e5968] font-medium">{stat.keyword}</span>
                      </div>
                      <span className="text-[13px] text-gray-400">{stat.count}회 검색</span>
                    </div>
                  ))}
                  {searchStats.length === 0 && <p className="text-center py-10 text-gray-400 text-[14px]">검색 데이터가 없습니다.</p>}
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
