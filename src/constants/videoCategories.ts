export interface VideoCategory {
  id: string;
  label: string;
  description: string;
}

export const ALL_VIDEO_CATEGORY_ID = '0';

export const ALL_VIDEO_CATEGORY: VideoCategory = {
  id: ALL_VIDEO_CATEGORY_ID,
  label: '전체',
  description: '카테고리 구분 없이 현재 국가 전체 인기 영상을 보여줍니다.',
};

interface VideoCategoryMetadata {
  label: string;
  description: string;
}

interface VideoCategorySnippetLike {
  title: string;
  assignable: boolean;
}

interface VideoCategoryLike {
  id: string;
  snippet: VideoCategorySnippetLike;
}

const CATEGORY_METADATA_BY_ID: Record<string, VideoCategoryMetadata> = {
  '1': {
    label: '영화/애니메이션',
    description: '영화 클립, 애니메이션, 관련 화제 영상을 모아볼 수 있습니다.',
  },
  '2': {
    label: '자동차/교통',
    description: '자동차 리뷰, 시승기, 모빌리티 이슈 영상을 확인할 수 있습니다.',
  },
  '10': {
    label: '음악',
    description: '현재 국가에서 많이 보는 음악 카테고리 인기 영상입니다.',
  },
  '15': {
    label: '반려동물/동물',
    description: '동물 영상과 반려동물 관련 인기 콘텐츠를 볼 수 있습니다.',
  },
  '17': {
    label: '스포츠',
    description: '경기 하이라이트와 스포츠 이슈 영상을 확인할 수 있습니다.',
  },
  '19': {
    label: '여행/이벤트',
    description: '여행 브이로그와 행사 관련 인기 영상을 모았습니다.',
  },
  '20': {
    label: '게임',
    description: '게임 방송, 리뷰, 신작 반응 등 게임 카테고리 인기 영상입니다.',
  },
  '22': {
    label: '인물/블로그',
    description: '일상 기록, 토크, 브이로그 중심의 인기 영상을 볼 수 있습니다.',
  },
  '23': {
    label: '코미디',
    description: '웃긴 영상, 스탠드업, 코미디 쇼 인기 영상을 모았습니다.',
  },
  '24': {
    label: '예능',
    description: '엔터테인먼트 중심의 인기 영상을 따로 모았습니다.',
  },
  '25': {
    label: '뉴스/정치',
    description: '시사 이슈와 정치 관련 인기 영상을 확인할 수 있습니다.',
  },
  '26': {
    label: '노하우/스타일',
    description: '팁, 튜토리얼, 패션과 라이프스타일 영상을 모았습니다.',
  },
  '27': {
    label: '교육',
    description: '학습, 강의, 설명형 콘텐츠의 인기 영상을 볼 수 있습니다.',
  },
  '28': {
    label: '과학/기술',
    description: '과학 이슈, 기술 리뷰, IT 트렌드 영상을 확인할 수 있습니다.',
  },
  '29': {
    label: '비영리/사회운동',
    description: '공익 활동과 사회적 메시지를 담은 영상을 모았습니다.',
  },
  '30': {
    label: '영화',
    description: '영화 카테고리에서 주목받는 영상을 확인할 수 있습니다.',
  },
  '31': {
    label: '애니/애니메이션',
    description: '애니메이션과 관련 인기 영상을 모아볼 수 있습니다.',
  },
  '32': {
    label: '액션/어드벤처',
    description: '액션과 모험 장르 중심의 영상을 확인할 수 있습니다.',
  },
  '33': {
    label: '클래식',
    description: '고전 장르와 아카이브 성격의 인기 영상을 모았습니다.',
  },
  '34': {
    label: '코미디 영화',
    description: '코미디 장르 기반의 영화/클립 영상을 볼 수 있습니다.',
  },
  '35': {
    label: '다큐멘터리',
    description: '다큐멘터리 장르의 주목받는 영상을 확인할 수 있습니다.',
  },
  '36': {
    label: '드라마',
    description: '드라마 장르의 인기 영상과 클립을 볼 수 있습니다.',
  },
  '37': {
    label: '가족',
    description: '가족 시청에 어울리는 인기 영상을 모았습니다.',
  },
  '38': {
    label: '해외',
    description: '해외 작품이나 해외 장르 중심의 영상을 확인할 수 있습니다.',
  },
  '39': {
    label: '호러',
    description: '공포 장르의 인기 영상과 클립을 모았습니다.',
  },
  '40': {
    label: 'SF/판타지',
    description: 'SF와 판타지 장르 관련 영상을 확인할 수 있습니다.',
  },
  '41': {
    label: '스릴러',
    description: '스릴러 장르 중심의 영상을 모아볼 수 있습니다.',
  },
  '42': {
    label: '쇼츠',
    description: '짧은 형식의 화제 영상을 빠르게 둘러볼 수 있습니다.',
  },
  '43': {
    label: '쇼',
    description: '프로그램형 쇼 콘텐츠의 인기 영상을 확인할 수 있습니다.',
  },
  '44': {
    label: '예고편',
    description: '신작 예고편과 티저 중심의 인기 영상을 모았습니다.',
  },
};

function buildFallbackDescription(label: string) {
  return `${label} 카테고리 인기 영상을 확인할 수 있습니다.`;
}

export function toVideoCategory(category: VideoCategoryLike): VideoCategory | null {
  if (!category.snippet.assignable) {
    return null;
  }

  const metadata = CATEGORY_METADATA_BY_ID[category.id];
  const label = metadata?.label ?? category.snippet.title;

  return {
    id: category.id,
    label,
    description: metadata?.description ?? buildFallbackDescription(label),
  };
}
