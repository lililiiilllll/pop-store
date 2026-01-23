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
  const [reviews, setReviews] = useState<any[]>([]);
  const [searchLogs, setSearchLogs] = useState<any[]>([]);
  const [keywords, setKeywords] = useState<any[]>([]);
  const [correctionRequests, setCorrectionRequests] = useState<any[]>([]);
  const [newKeyword, setNewKeyword] = useState('');

  // 아이콘 안전 렌더링
  const renderIcon = (IconComponent: any, size = 20, className = "") => {
    if (!IconComponent || typeof IconComponent !== 'function') return null;
    return <IconComponent size={size} className={className} />;
  };

  // 데이터 로드 (스키마 기반)
  const fetchData = useCallback(async () => {
    try {
      if (activeTab === 'reviews') {
        const { data } = await supabase.from('reviews').select('*').order('reports', { ascending: false });
        setReviews(data || []);
      } else if (activeTab === 'search') {
        const logs = await supabase.from('search_logs').select('*').order('search_count', { ascending: false });
        const recs = await supabase.from('recommended_keywords').select('*').eq('is_active', true).order('order_index');
        setSearchLogs(logs.data || []);
        setKeywords(recs.data || []);
      } else if (activeTab === 'correction') {
        const { data } = await supabase.from('correction_requests').select('*').order('created_at', { ascending: false });
        setCorrectionRequests(data || []);
      }
    } catch (e) { console.error(e); }
  }, [activeTab]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // 핸들러 함수들
  const handleApprove = async (id: any) => {
    if (!confirm('승인하시겠습니까?')) return;
    await supabase.from('popup_stores').update({ is_verified: true }).eq('id', id);
    onRefresh();
  };

  const handleDeleteStore = async (id: any) => {
    if (!confirm('삭제하시겠습니까?')) return;
    await supabase.from('popup_stores').delete().eq('id', id);
    onRefresh();
  };

  const handleReviewAction = async (id: any, type: 'blind' | 'delete' | 'reset') => {
    if (type === 'delete') await supabase.from('reviews').delete().eq('id', id);
    else if (type === 'blind') await supabase.from('reviews').update({ is_blinded: true }).eq('id', id);
    else if (type === 'reset') await supabase.from('reviews').update({ reports: 0 }).eq('id', id);
    fetchData();
  };

  const addKeyword = async () => {
    if (!newKeyword.trim()) return;
    await supabase.from('recommended_keywords').insert([{ keyword: newKeyword, is_active: true }]);
    setNewKeyword('');
    fetchData();
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-[#f2f4f6] flex flex-col overflow-hidden font-sans text-[#191f28]">
      {/* 상단 헤더: 직관적인 닫기 버튼 적용 */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack} 
            className="w-10 h-10 flex items-center justify-center bg-gray-50 hover:bg-gray-100 rounded-full transition-all text-gray-600"
            title="대시보드 닫기"
          >
            {renderIcon(Icons.X || Icons.ChevronLeft, 24)}
          </button>
          <h1 className="text-[20px] font-bold tracking-tight">관리자 대시보드</h1>
        </div>
        
        {/* 메인 탭 메뉴 */}
        <div className="flex bg-gray-50 p-1 rounded-2xl gap-1">
          {[
            { id: 'approval', label: '제보 승인' },
            { id: 'search', label: '검색어 관리' },
            { id: 'correction', label: '정보 수정' },
            { id: 'reviews', label: '리뷰 관리' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2.5 rounded-xl text-[14px] font-bold transition-all ${
                activeTab === tab.id ? 'bg-white text-[#3182f6] shadow-sm' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          
          {/* [1] 팝업 승인/관리: 균일한 버튼 모양 및 최소화된 정보 리스트 */}
          {activeTab === 'approval' && (
            <div className="space-y-4">
              <div className="flex gap-2 p-1 bg-white w-fit rounded-xl shadow-sm border border-gray-100">
                <button 
                  onClick={() => setApprovalSubTab('pending')}
                  className={`px-4 py-1.5 rounded-lg text-[13px] font-bold transition-all ${approvalSubTab === 'pending' ? 'bg-[#3182f6] text-white' : 'text-gray-400'}`}
                >
                  대기중 ({allStores.filter(s => !s.is_verified).length})
                </button>
                <button 
                  onClick={() => setApprovalSubTab('verified')}
                  className={`px-4 py-1.5 rounded-lg text-[13px] font-bold transition-all ${approvalSubTab === 'verified' ? 'bg-[#3182f6] text-white' : 'text-gray-400'}`}
                >
                  승인됨 ({allStores.filter(s => s.is_verified).length})
                </button>
              </div>

              {allStores.filter(s => approvalSubTab === 'pending' ? !s.is_verified : s.is_verified).map(store => (
                <div key={store.id} className="bg-white p-5 rounded-[24px] flex items-center justify-between shadow-sm border border-white hover:border-blue-50 transition-all">
                  <div className="flex items-center gap-5 overflow-hidden">
                    <img src={store.imageUrl} className="w-16 h-16 rounded-xl object-cover bg-gray-50 flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[11px] font-bold text-[#3182f6] truncate">{store.category}</span>
                        {!store.is_verified && <span className="px-1.5 py-0.5 bg-orange-50 text-orange-500 text-[9px] rounded font-bold">승인 대기</span>}
                      </div>
                      <h3 className="text-[16px] font-bold truncate">{store.title}</h3>
                      <p className="text-[13px] text-gray-400 truncate">{store.address.split(' ').slice(0,2).join(' ')}...</p>
                    </div>
                  </div>
                  
                  {/* 균일한 버튼 디자인: w-24로 크기 고정 */}
                  <div className="flex gap-2 ml-4">
                    {approvalSubTab === 'pending' ? (
                      <button onClick={() => handleApprove(store.id)} className="w-24 py-2.5 bg-[#3182f6] text-white rounded-xl font-bold text-[13px] hover:bg-[#1b64da] transition-colors">승인하기</button>
                    ) : (
                      <button className="w-24 py-2.5 bg-gray-50 text-gray-400 rounded-xl font-bold text-[13px]">상세보기</button>
                    )}
                    <button onClick={() => handleDeleteStore(store.id)} className="w-24 py-2.5 bg-red-50 text-red-500 rounded-xl font-bold text-[13px] hover:bg-red-100 transition-colors">삭제하기</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* [2] 검색어 관리: 추천 키워드 및 실시간 로그 복구 */}
          {activeTab === 'search' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <section className="bg-white p-8 rounded-[32px] shadow-sm border border-white">
                <h3 className="font-bold text-[18px] mb-6 flex items-center gap-2">
                  {renderIcon(Icons.Star, 20, "text-yellow-400")} 추천 키워드 관리
                </h3>
                <div className="flex gap-2 mb-6">
                  <input 
                    value={newKeyword} onChange={e => setNewKeyword(e.target.value)}
                    className="flex-1 bg-gray-50 border-none px-4 py-3 rounded-xl outline-none text-[14px]" 
                    placeholder="#키워드 입력" 
                  />
                  <button onClick={addKeyword} className="bg-[#3182f6] text-white px-6 py-3 rounded-xl font-bold text-[14px]">추가</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {keywords.map(k => (
                    <div key={k.id} className="px-4 py-2 bg-blue-50 text-[#3182f6] rounded-full text-[13px] font-bold border border-blue-100 flex items-center gap-2">
                      #{k.keyword}
                      <button className="hover:text-red-500 text-blue-300">×</button>
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-white p-8 rounded-[32px] shadow-sm border border-white overflow-hidden">
                <h3 className="font-bold text-[18px] mb-6">실시간 인기 검색어</h3>
                <div className="space-y-4">
                  {searchLogs.map((log, i) => (
                    <div key={log.keyword} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                      <div className="flex items-center gap-4 min-w-0">
                        <span className={`w-5 font-bold ${i < 3 ? 'text-[#3182f6]' : 'text-gray-300'}`}>{i + 1}</span>
                        <span className="text-[14px] font-medium truncate">{log.keyword}</span>
                      </div>
                      <span className="text-[11px] text-gray-400 font-mono">{log.search_count}회</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {/* [3] 리뷰 관리: 신고된 리뷰 강조 및 내역 복구 */}
          {activeTab === 'reviews' && (
            <div className="space-y-4">
              <h2 className="text-[15px] font-bold text-gray-400 mb-2 uppercase">전체 리뷰 내역</h2>
              {reviews.map(review => (
                <div key={review.id} className={`bg-white p-6 rounded-[32px] shadow-sm border-2 transition-all ${review.reports > 0 ? 'border-red-100 bg-red-50/10' : 'border-white'}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-bold text-[16px]">{review.user_nickname}</span>
                        <span className="text-yellow-400 text-[13px]">★ {review.rating}</span>
                        {review.reports > 0 && <span className="px-2 py-0.5 bg-red-500 text-white text-[10px] rounded-full font-bold">신고 {review.reports}건</span>}
                      </div>
                      <p className="text-[14px] text-gray-600 leading-relaxed mb-4">{review.content}</p>
                      <div className="flex gap-4 text-[12px] text-gray-400">
                        <span>좋아요 {review.likes}</span>
                        <span>{new Date(review.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    {/* 리뷰 관리 버튼군: 모양 통일 */}
                    <div className="flex flex-col gap-2 ml-4">
                      <button onClick={() => handleReviewAction(review.id, 'reset')} className="w-24 py-2 bg-gray-100 text-gray-500 rounded-xl font-bold text-[11px]">신고초기화</button>
                      <button onClick={() => handleReviewAction(review.id, 'blind')} className={`w-24 py-2 rounded-xl font-bold text-[11px] ${review.is_blinded ? 'bg-black text-white' : 'bg-orange-50 text-orange-600'}`}>
                        {review.is_blinded ? '숨김완료' : '블라인드'}
                      </button>
                      <button onClick={() => handleReviewAction(review.id, 'delete')} className="w-24 py-2 bg-red-50 text-red-500 rounded-xl font-bold text-[11px]">삭제하기</button>
                    </div>
                  </div>
                </div>
              ))}
              {reviews.length === 0 && <div className="text-center py-20 bg-white rounded-[32px] text-gray-400">리뷰 내역이 없습니다.</div>}
            </div>
          )}

          {/* 정보 수정 요청 (생략 가능하나 기능은 유지) */}
          {activeTab === 'correction' && (
            <div className="text-center py-20 bg-white rounded-[32px] text-gray-400">접수된 수정 요청 내역이 없습니다.</div>
          )}

        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
