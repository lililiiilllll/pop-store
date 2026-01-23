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
  // 1. 상태 관리
  const [activeTab, setActiveTab] = useState('approval');
  const [loading, setLoading] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [searchLogs, setSearchLogs] = useState<any[]>([]);
  const [keywords, setKeywords] = useState<any[]>([]);
  const [newKeyword, setNewKeyword] = useState('');

  // 2. 아이콘 안전 렌더링 헬퍼 (React Error #130 방지)
  const renderIcon = (IconComponent: any, size = 20, className = "") => {
    if (!IconComponent || typeof IconComponent !== 'function') {
      return <div style={{ width: size, height: size }} className={`bg-gray-100 rounded-sm ${className}`} />;
    }
    return <IconComponent size={size} className={className} />;
  };

  // 3. 데이터 페칭 (스키마 기반)
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'reviews') {
        const { data } = await supabase.from('reviews').select('*').order('reports', { ascending: false });
        setReviews(data || []);
      } else if (activeTab === 'search') {
        const logs = await supabase.from('search_logs').select('*').order('search_count', { ascending: false });
        const recs = await supabase.from('recommended_keywords').select('*').eq('is_active', true);
        setSearchLogs(logs.data || []);
        setKeywords(recs.data || []);
      }
    } catch (e) {
      console.error("데이터 로드 실패:", e);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 4. 액션 핸들러 (실시간 수정 로직)
  const handleApprove = async (id: string | number) => {
    if (!confirm('해당 팝업 제보를 정식 게시물로 승인하시겠습니까?')) return;
    const { error } = await supabase.from('popup_stores').update({ is_verified: true }).eq('id', id);
    if (!error) {
      alert('승인 완료되었습니다.');
      onRefresh(); // 메인 앱 데이터 갱신
    }
  };

  const handleReviewStatus = async (id: number, action: 'blind' | 'delete' | 'reset') => {
    if (action === 'delete') {
      if (!confirm('리뷰를 영구 삭제하시겠습니까?')) return;
      await supabase.from('reviews').delete().eq('id', id);
    } else if (action === 'blind') {
      await supabase.from('reviews').update({ is_blinded: true }).eq('id', id);
    } else if (action === 'reset') {
      await supabase.from('reviews').update({ reports: 0 }).eq('id', id);
    }
    fetchData();
  };

  const addKeyword = async () => {
    if (!newKeyword.trim()) return;
    const { error } = await supabase.from('recommended_keywords').insert([{ keyword: newKeyword, is_active: true }]);
    if (!error) {
      setNewKeyword('');
      fetchData();
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-[#f2f4f6] flex flex-col overflow-hidden font-sans text-[#191f28]">
      {/* 상단 헤더 */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-all">
            {renderIcon(Icons.ChevronLeft, 24)}
          </button>
          <h1 className="text-[20px] font-bold">Admin Console</h1>
        </div>
        <div className="flex gap-2">
          {['approval', 'search', 'reviews'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-[14px] font-bold transition-all ${
                activeTab === tab ? 'bg-[#3182f6] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {tab === 'approval' ? '제보 승인' : tab === 'search' ? '검색/키워드' : '리뷰 관리'}
            </button>
          ))}
        </div>
      </header>

      {/* 메인 콘텐츠 영역 */}
      <main className="flex-1 overflow-y-auto p-6 bg-[#f9fafb]">
        <div className="max-w-5xl mx-auto">
          
          {/* [1] 제보 승인 관리 */}
          {activeTab === 'approval' && (
            <div className="grid gap-4">
              <h2 className="text-[14px] font-bold text-gray-400 mb-2 uppercase tracking-wider">Pending Approvals</h2>
              {allStores.filter(s => !s.is_verified).map(store => (
                <div key={store.id} className="bg-white p-6 rounded-[24px] flex items-center justify-between shadow-sm hover:shadow-md transition-shadow border border-white">
                  <div className="flex gap-5">
                    <img src={store.imageUrl} className="w-20 h-20 rounded-2xl object-cover bg-gray-50" />
                    <div className="flex flex-col justify-center">
                      <span className="text-[12px] font-bold text-[#3182f6] mb-1">{store.category}</span>
                      <h3 className="text-[17px] font-bold mb-1">{store.title}</h3>
                      <p className="text-[13px] text-gray-500">{store.address}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleApprove(store.id)} className="px-5 py-2.5 bg-[#3182f6] text-white rounded-xl font-bold text-[13px] hover:bg-[#1b64da]">승인하기</button>
                    <button className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                      {renderIcon(Icons.Trash, 20)}
                    </button>
                  </div>
                </div>
              ))}
              {allStores.filter(s => !s.is_verified).length === 0 && (
                <div className="text-center py-20 bg-white rounded-[32px] text-gray-400 font-medium border-2 border-dashed border-gray-100">모든 제보가 처리되었습니다. ✨</div>
              )}
            </div>
          )}

          {/* [2] 리뷰 및 신고 관리 */}
          {activeTab === 'reviews' && (
            <div className="grid gap-4">
              <h2 className="text-[14px] font-bold text-gray-400 mb-2 uppercase tracking-wider">Review Reports</h2>
              {reviews.map(review => (
                <div key={review.id} className={`bg-white p-6 rounded-[24px] shadow-sm border-2 transition-all ${review.reports > 0 ? 'border-red-100 bg-red-50/10' : 'border-white'}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-[16px]">{review.user_nickname}</span>
                        {review.reports > 0 && <span className="px-2 py-0.5 bg-red-500 text-white text-[10px] rounded-full font-bold">신고 {review.reports}건</span>}
                      </div>
                      <p className="text-[14px] text-gray-600 leading-relaxed">{review.content}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleReviewStatus(review.id, 'reset')} className="p-2 bg-gray-100 rounded-lg text-gray-500 hover:bg-gray-200" title="신고 초기화">
                         {renderIcon(Icons.RotateCw, 16)}
                      </button>
                      <button onClick={() => handleReviewStatus(review.id, 'blind')} className={`px-3 py-1 rounded-lg text-[12px] font-bold ${review.is_blinded ? 'bg-gray-800 text-white' : 'bg-orange-100 text-orange-600'}`}>
                        {review.is_blinded ? '숨김됨' : '블라인드'}
                      </button>
                      <button onClick={() => handleReviewStatus(review.id, 'delete')} className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100">
                        {renderIcon(Icons.Trash, 18)}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* [3] 키워드 및 검색 로그 */}
          {activeTab === 'search' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-8 rounded-[32px] shadow-sm">
                <h3 className="font-bold text-[17px] mb-6 flex items-center gap-2">
                  {renderIcon(Icons.Star, 20, "text-yellow-400")} 추천 키워드 설정
                </h3>
                <div className="flex gap-2 mb-6">
                  <input 
                    value={newKeyword} onChange={e => setNewKeyword(e.target.value)}
                    className="flex-1 bg-gray-50 border-none px-4 py-3 rounded-xl focus:ring-2 focus:ring-[#3182f6] transition-all outline-none" 
                    placeholder="새 키워드" 
                  />
                  <button onClick={addKeyword} className="bg-[#3182f6] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#1b64da] transition-all">추가</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {keywords.map(k => (
                    <span key={k.id} className="px-4 py-2 bg-blue-50 text-[#3182f6] rounded-full text-[13px] font-bold flex items-center gap-2 border border-blue-100">
                      #{k.keyword} <button className="text-blue-300 hover:text-blue-600">×</button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="bg-white p-8 rounded-[32px] shadow-sm overflow-hidden">
                <h3 className="font-bold text-[17px] mb-6 flex items-center gap-2">
                  {renderIcon(Icons.Search, 20, "text-gray-400")} 실시간 인기 검색어
                </h3>
                <div className="space-y-4">
                  {searchLogs.map((log, index) => (
                    <div key={log.keyword} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                      <div className="flex items-center gap-4">
                        <span className={`w-6 text-center font-bold ${index < 3 ? 'text-[#3182f6]' : 'text-gray-300'}`}>{index + 1}</span>
                        <span className="font-medium text-[15px]">{log.keyword}</span>
                      </div>
                      <span className="text-[12px] text-gray-400 font-mono">{log.search_count} hits</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
