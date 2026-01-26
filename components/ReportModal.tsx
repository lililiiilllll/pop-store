import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabaseClient';

interface ReportModalProps {
  coord: { lat: number; lng: number };
  onClose: () => void;
}

const ReportModal: React.FC<ReportModalProps> = ({ coord, onClose }) => {
  // 상태 관리
  const [address, setAddress] = useState('주소를 불러오는 중...');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('패션'); // 기본값 설정
  const [customCategory, setCustomCategory] = useState(''); // 기타 입력용 상태
  const [description, setDescription] = useState('');
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

  // 1. 위경도를 주소로 변환 (역지오코딩)
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

  // 이미지 선택 핸들러
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // 2. 최종 제출 핸들러
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 기타 선택 시 customCategory 사용, 아니면 일반 category 사용
    const finalCategory = category === '기타' ? customCategory : category;

    if (!title.trim() || !description.trim() || (category === '기타' && !finalCategory.trim())) {
      alert('필수 항목(이름, 상세 내용, 카테고리)을 모두 입력해주세요.');
      return;
    }

    setIsSubmitting(true);

    try {
      let imageUrl = '';

      // 이미지 업로드 로직 (Storage 사용)
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

      // DB 저장 (popup_stores 테이블)
      const { error } = await supabase.from('popup_stores').insert([
        {
          title,
          category: finalCategory,
          description,
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
          is_verified: false,
          created_at: new Date().toISOString(),
        },
      ]);

      if (error) throw error;

      alert('제보가 완료되었습니다. 관리자 승인 후 지도에 표시됩니다!');
      onClose();
    } catch (err: any) {
      console.error(err);
      alert('등록 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 필수 입력 여부 확인
  const isValid = title.trim() && description.trim() && (category !== '기타' || customCategory.trim());

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm z-[999999]">
      {/* 모달 크기를 max-w-md로 축소하고 max-height 설정 */}
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        
        {/* 헤더 (높이 축소) */}
        <div className="px-5 py-3 border-b flex justify-between items-center sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-gray-900">새로운 장소 제보</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          {/* 주소 표시 영역 (컴팩트화) */}
          <div className="bg-blue-50 p-3 rounded-xl flex items-center gap-3">
            <div className="text-blue-600 flex-shrink-0">
              <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/></svg>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-blue-500 uppercase">선택된 위치 주소</p>
              <p className="text-xs font-semibold text-blue-900 truncate">{address}</p>
            </div>
          </div>

          {/* 대표 이미지 업로드 (크기 축소) */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2">대표 이미지</label>
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 bg-gray-100 rounded-xl overflow-hidden border border-dashed border-gray-300 flex items-center justify-center flex-shrink-0">
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                )}
              </div>
              <input type="file" ref={fileInputRef} onChange={handleImageChange} className="hidden" accept="image/*" />
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-lg border border-gray-200 text-xs font-bold hover:bg-gray-50 transition-all"
              >
                이미지 선택
              </button>
            </div>
          </div>

          {/* 카테고리 선택 (간격 조정) */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2">카테고리</label>
            <div className="flex flex-wrap gap-1.5">
              {['패션', '푸드', '아트', '엔터', '라이프', '기타'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    category === cat 
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            {/* '기타' 선택 시 입력창 노출 */}
            {category === '기타' && (
              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="카테고리를 직접 입력해주세요"
                className="w-full mt-2 px-3 py-2 text-xs rounded-lg border border-blue-200 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            )}
          </div>

          {/* 장소 이름 & 상세 설명 (필드 높이 조정) */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">장소 이름 <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="이름을 입력해주세요"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:ring-1 focus:ring-blue-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">상세 내용 <span className="text-red-500">*</span></label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="팝업스토어 상세 정보를 입력해주세요"
                rows={3}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                required
              />
            </div>
          </div>

          {/* 입장료 & 예약 여부 (그리드 유지) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">입장료</label>
              <div className="flex bg-gray-100 p-0.5 rounded-lg">
                <button type="button" onClick={() => setIsFree(true)} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${isFree ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}>무료</button>
                <button type="button" onClick={() => setIsFree(false)} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${!isFree ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}>유료</button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">예약 유무</label>
              <div className="flex bg-gray-100 p-0.5 rounded-lg">
                <button type="button" onClick={() => setRequiresReservation(false)} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${!requiresReservation ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}>현장입장</button>
                <button type="button" onClick={() => setRequiresReservation(true)} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${requiresReservation ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}>예약필수</button>
              </div>
            </div>
          </div>

          {/* 기간 & 시간 & 링크 (축소된 필드) */}
          <div className="space-y-3 border-t pt-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1">시작 날짜</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1">종료 날짜</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs outline-none focus:border-blue-500" />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <input 
                type="text" 
                value={operatingHours} 
                onChange={(e) => setOperatingHours(e.target.value)} 
                placeholder="운영 시간 (예: 11:00 - 20:00)" 
                className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 outline-none" 
              />
              <input 
                type="url" 
                value={linkUrl} 
                onChange={(e) => setLinkUrl(e.target.value)} 
                placeholder="공식 사이트 링크 (https://...)" 
                className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 outline-none" 
              />
            </div>
          </div>

          {/* 제출 버튼 (하단 고정 느낌을 위해 padding 조절) */}
          <button
            type="submit"
            disabled={isSubmitting || !isValid}
            className={`w-full py-3.5 rounded-xl font-bold text-white transition-all shadow-md mt-2 ${
              isSubmitting || !isValid
                ? 'bg-gray-300 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98]'
            }`}
          >
            {isSubmitting ? '등록 중...' : '제보 완료하기'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ReportModal;
