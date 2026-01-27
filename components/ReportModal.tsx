import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

interface ReportModalProps {
  coord: { lat: number; lng: number };
  onClose: () => void;
}

const ReportModal: React.FC<ReportModalProps> = ({ coord, onClose }) => {
  // --- 상태 관리 ---
  const [address, setAddress] = useState('주소를 불러오는 중...');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('패션');
  const [customCategory, setCustomCategory] = useState('');
  
  // ✅ 설명 필드 이원화 (기능 100% 활용)
  const [description, setDescription] = useState(''); // 간략 설명 셀 (description)
  const [detailedContent, setDetailedContent] = useState(''); // 상세 설명 셀 (detailed_content)
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [operatingHours, setOperatingHours] = useState('');
  const [isFree, setIsFree] = useState(true);
  const [requiresReservation, setRequiresReservation] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. 카카오 API를 이용한 좌표 -> 주소 변환
  useEffect(() => {
    const { kakao } = window as any;
    if (kakao && kakao.maps.services) {
      const geocoder = new kakao.maps.services.Geocoder();
      geocoder.coord2Address(coord.lng, coord.lat, (result: any, status: any) => {
        if (status === kakao.maps.services.Status.OK) {
          setAddress(result[0].address.address_name);
        }
      });
    }
  }, [coord]);

  // 이미지 선택 처리
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // 2. 제출 핸들러 (데이터베이스 저장)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalCategory = category === '기타' ? customCategory : category;

    // 유효성 검사 (필수 항목 100% 체크)
    if (!title.trim() || !description.trim() || !detailedContent.trim() || (category === '기타' && !finalCategory.trim())) {
      alert('필수 항목(이름, 간략 설명, 상세 내용, 카테고리)을 모두 확인해주세요.');
      return;
    }

    setIsSubmitting(true);

    try {
      let imageUrl = '';

      // 이미지 업로드 로직
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `reports/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('popup-images')
          .upload(filePath, imageFile);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('popup-images')
          .getPublicUrl(filePath);
        
        imageUrl = publicUrlData.publicUrl;
      }

      // ✅ Supabase 테이블에 1:1 매칭 저장
      const { error } = await supabase.from('popup_stores').insert([
        {
          title,
          category: finalCategory,
          description,            // 간략 설명 필드
          detailed_content: detailedContent, // 상세 설명 필드
          address,
          lat: coord.lat,
          lng: coord.lng,
          start_date: startDate || null,
          end_date: endDate || null,
          operating_hours: operatingHours,
          is_free: isFree,
          requires_reservation: requiresReservation,
          image_url: imageUrl,
          link_url: linkUrl,
          is_verified: false, // 관리자 검토 대기 상태
          created_at: new Date().toISOString(),
        },
      ]);

      if (error) throw error;

      alert('제보가 성공적으로 접수되었습니다!');
      onClose();
    } catch (err: any) {
      console.error('제보 중 오류:', err);
      alert('등록 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid = title.trim() && description.trim() && detailedContent.trim();

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm z-[999999]">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        
        {/* 헤더 */}
        <div className="px-5 py-4 border-b flex justify-between items-center bg-white sticky top-0 z-10">
          <h2 className="text-lg font-bold text-gray-900">새로운 장소 제보</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5 overflow-y-auto custom-scrollbar">
          {/* 위치 정보 */}
          <div className="bg-blue-50 p-3.5 rounded-xl flex items-center gap-3">
            <div className="text-blue-600 shrink-0">
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/></svg>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-blue-500 uppercase tracking-tight">선택된 위치</p>
              <p className="text-xs font-semibold text-blue-900 truncate">{address}</p>
            </div>
          </div>

          {/* 이미지 섹션 */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2">대표 이미지</label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-gray-50 rounded-2xl overflow-hidden border border-dashed border-gray-300 flex items-center justify-center shrink-0">
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                )}
              </div>
              <input type="file" ref={fileInputRef} onChange={handleImageChange} className="hidden" accept="image/*" />
              <button type="button" onClick={() => fileInputRef.current?.click()} className="px-5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold hover:bg-gray-50 transition-all shadow-sm">
                파일 선택
              </button>
            </div>
          </div>

          {/* 정보 입력 섹션 */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">장소 이름 <span className="text-red-500">*</span></label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="팝업스토어 이름을 입력해주세요" className="w-full px-4 py-3 text-sm rounded-xl border border-gray-100 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" required />
            </div>

            {/* ✅ 간략 설명 (description) */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">간략 설명 <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                placeholder="리스트에 노출될 한 줄 요약 (최대 50자)" 
                className="w-full px-4 py-3 text-sm rounded-xl border border-gray-100 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                required 
              />
            </div>

            {/* ✅ 상세 내용 (detailed_content) */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">상세 내용 <span className="text-red-500">*</span></label>
              <textarea
                value={detailedContent}
                onChange={(e) => setDetailedContent(e.target.value)}
                placeholder="팝업스토어의 특징, 상세 운영 정보 등을 자세히 적어주세요"
                rows={5}
                className="w-full px-4 py-3 text-sm rounded-xl border border-gray-100 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                required
              />
            </div>
          </div>

          {/* 카테고리 (중요 기능 보존) */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2">카테고리</label>
            <div className="flex flex-wrap gap-2">
              {['패션', '푸드', '아트', '엔터', '라이프', '기타'].map((cat) => (
                <button key={cat} type="button" onClick={() => setCategory(cat)} className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${category === cat ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-gray-500 border-gray-100 hover:border-gray-200'}`}>
                  {cat}
                </button>
              ))}
            </div>
            {category === '기타' && (
              <input type="text" value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} placeholder="카테고리 직접 입력" className="w-full mt-2.5 px-4 py-3 text-sm rounded-xl border border-blue-100 outline-none focus:ring-2 focus:ring-blue-500" />
            )}
          </div>

          {/* 입장 및 예약 정보 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700">입장료</label>
              <div className="flex bg-gray-100 p-1 rounded-xl">
                <button type="button" onClick={() => setIsFree(true)} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${isFree ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}>무료</button>
                <button type="button" onClick={() => setIsFree(false)} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${!isFree ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}>유료</button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700">예약 방식</label>
              <div className="flex bg-gray-100 p-1 rounded-xl">
                <button type="button" onClick={() => setRequiresReservation(false)} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${!requiresReservation ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}>현장입장</button>
                <button type="button" onClick={() => setRequiresReservation(true)} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${requiresReservation ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}>예약필수</button>
              </div>
            </div>
          </div>

          {/* 추가 정보 섹션 */}
          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-gray-100 bg-gray-50 text-xs outline-none" placeholder="시작일" />
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-gray-100 bg-gray-50 text-xs outline-none" placeholder="종료일" />
            </div>
            <input type="text" value={operatingHours} onChange={(e) => setOperatingHours(e.target.value)} placeholder="운영 시간 (예: 10:00 - 21:00)" className="w-full px-4 py-3 text-xs rounded-xl border border-gray-100 bg-gray-50 outline-none" />
            <input type="url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="관련 링크 (공식 SNS 등)" className="w-full px-4 py-3 text-xs rounded-xl border border-gray-100 bg-gray-50 outline-none" />
          </div>

          {/* 하단 버튼 */}
          <div className="pt-4 sticky bottom-0 bg-white">
            <button
              type="submit"
              disabled={isSubmitting || !isValid}
              className={`w-full py-4 rounded-2xl font-bold text-white transition-all shadow-lg ${
                isSubmitting || !isValid
                  ? 'bg-gray-300 cursor-not-allowed' 
                  : 'bg-[#3182f6] hover:bg-[#1b64da] active:scale-[0.98]'
              }`}
            >
              {isSubmitting ? '장소 등록 중...' : '제보 완료하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReportModal;
