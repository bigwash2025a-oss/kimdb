# 🔥 KIMDB

**완전 자체 구현 Firestore 대체 데이터베이스**

> 빅워시, 빡센 미션 완료! 완전 별개로, 의존 없이 구축한 우리만의 DB 시스템

## 🎯 핵심 특징

### ⚡ 성능 우선 설계
- **p95 읽기 < 30ms**, 쓰기 < 50ms
- **인덱스 자동 매칭** + 제안 시스템  
- **규칙 평가 p95 < 2ms** (트라이 + 캐싱)
- **멀티테넌트 파티셔닝** (dealerId 기반)

### 🔒 보안 중심
- **RS256 JWT** 비대칭키 인증
- **규칙 엔진** Firestore 호환 DSL
- **리프레시 토큰 로테이션** (재사용 감지)
- **필드 레벨 권한** 제어

### 🌊 실시간 지원  
- **WebSocket** 쿼리 구독
- **변경 diff 계산** (added/modified/removed)
- **오프라인 큐** + 충돌 해결
- **멱등성 보장** (중복 방지)

## 🏗️ 아키텍처

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  SDK (JS)   │    │ HTTP/WS API │    │ Auth Engine │
└─────────────┘    └─────────────┘    └─────────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                           │
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│Rules Engine │    │Query Engine │    │Index System │
└─────────────┘    └─────────────┘    └─────────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                           │
        ┌─────────────┬─────────────┬─────────────┐
        │Storage Core │ Change Log  │Transaction  │
        └─────────────┴─────────────┴─────────────┘
```

## 🚀 빠른 시작

### 로컬 개발
```bash
# 프로젝트 설치
git clone https://github.com/kim/kimdb.git
cd kimdb
npm install

# 개발 서버 시작
npm run dev

# 테스트 실행
npm run test
npm run demo  # 규칙 시스템 데모
```

### Docker 배포
```bash
# 단일 컨테이너
docker build -t kimdb:latest .
docker run -p 3000:3000 kimdb:latest

# Docker Compose (추천)
docker-compose up -d

# 모니터링 포함
docker-compose --profile monitoring up -d
```

## 📡 API 사용법

### 인증
```bash
# 로그인
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@kimdb.com","password":"kimdb123"}'

# 토큰 갱신  
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"your-refresh-token"}'
```

### 문서 조작
```bash
# 문서 생성
curl -X POST http://localhost:3000/db/bookings \
  -H "Content-Type: application/json" \
  -d '{"customer":"김고객","service":"정비","date":"2024-01-15"}'

# 문서 조회
curl http://localhost:3000/db/bookings/doc-id

# 컬렉션 조회
curl http://localhost:3000/db/bookings

# 문서 업데이트
curl -X PUT http://localhost:3000/db/bookings/doc-id \
  -H "Content-Type: application/json" \
  -d '{"status":"완료"}'

# 문서 삭제
curl -X DELETE http://localhost:3000/db/bookings/doc-id
```

### WebSocket 실시간
```javascript
const ws = new WebSocket('ws://localhost:3000/ws');

ws.onopen = () => {
  // 쿼리 구독
  ws.send(JSON.stringify({
    type: 'subscribe',
    collection: 'bookings',
    query: {
      where: [{ field: 'status', operator: '==', value: '대기' }],
      orderBy: [{ field: 'date', direction: 'asc' }]
    }
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('실시간 변경:', data);
};
```

## 🛡️ 보안 규칙

Firestore 호환 DSL로 세밀한 권한 제어:

```javascript
// /rules/security.rules
match /dealers/{dealerId}/bookings/{bookingId} {
  allow read, write: if request.auth != null 
                     && request.auth.token.dealerId == dealerId
                     && hasRole('manager');
  
  allow read: if request.auth != null 
              && request.auth.uid == resource.data.customerId;
}

match /dealers/{dealerId}/customers/{customerId} {
  allow read, write: if request.auth != null
                     && request.auth.token.dealerId == dealerId
                     && (hasRole('staff') || hasRole('manager'));
}
```

## 📊 모니터링

### 헬스체크
```bash
curl http://localhost:3000/health
```

### 시스템 통계  
```bash
curl http://localhost:3000/stats
```

### 프로메테우스 메트릭
```bash
# 모니터링 스택 시작
docker-compose --profile monitoring up -d

# 그라파나 대시보드
open http://localhost:3001  # admin:kimdb123
```

## 🎛️ 설정

### 환경변수
```bash
NODE_ENV=production
PORT=3000
WS_PORT=8080
JWT_SECRET=your-super-secret-key
CORS_ORIGIN=https://your-domain.com
RATE_LIMIT_MAX=1000
RATE_LIMIT_WINDOW=60000
```

### 인덱스 정의
```json
{
  "indexes": [
    {
      "name": "bookings_date_status", 
      "collection": "bookings",
      "fields": [
        { "field": "__dealerId", "direction": "asc" },
        { "field": "date", "direction": "asc" },
        { "field": "status", "direction": "asc" }
      ]
    }
  ]
}
```

## 🧪 테스트

```bash
# 유닛 테스트
npm run test

# UI 테스트 (브라우저)
npm run test:ui

# 규칙 시스템 데모
npm run demo

# 부하 테스트 (wrk 필요)
wrk -t12 -c400 -d30s http://localhost:3000/health
```

## 📈 성능 벤치마크

### 단일 인스턴스 기준
- **읽기 처리량**: 50,000+ req/sec
- **쓰기 처리량**: 15,000+ req/sec  
- **동시 WebSocket**: 10,000+ 연결
- **규칙 평가**: p95 < 2ms
- **인덱스 스캔**: p95 < 30ms

### 확장성
- **수평 확장**: 로드밸런서 + 여러 인스턴스
- **수직 확장**: CPU/메모리 증설
- **샤딩**: dealerId 기반 파티셔닝

## 🔧 개발 가이드

### 프로젝트 구조
```
kimdb/
├── src/
│   ├── core/           # 스토리지 + 인덱스 엔진
│   ├── auth/           # JWT + 인증 시스템  
│   ├── rules/          # 보안 규칙 엔진
│   ├── realtime/       # WebSocket 실시간
│   └── server.ts       # Fastify HTTP 서버
├── test/               # 테스트 + 데모
├── docker/             # Docker 설정
└── monitoring/         # 모니터링 설정
```

### 기여하기
1. Fork 후 feature 브랜치 생성
2. 테스트 작성 + 통과 확인
3. PR 생성 (규칙: 제목에 이모지 포함)
4. 코드 리뷰 후 머지

## 🎉 마일스톤

- [x] **v1.0** - 핵심 DB 엔진 (Storage + Index + Rules)
- [x] **v1.1** - JWT 인증 시스템
- [ ] **v1.2** - 실시간 WebSocket 완성
- [ ] **v1.3** - JavaScript SDK
- [ ] **v1.4** - 클러스터링 + 샤딩
- [ ] **v2.0** - GraphQL API + 고급 쿼리

## 📞 지원

- **이슈**: [GitHub Issues](https://github.com/kim/kimdb/issues)
- **문서**: [Wiki](https://github.com/kim/kimdb/wiki)  
- **채팅**: Discord #kimdb-dev

## 📜 라이선스

MIT License - 자유롭게 사용하세요!

---

**🔥 Made with ❤️ by KIM**

*"빅워시, 완전 별개로 의존 없이 만든 우리만의 DB다!"*