# 🔥 Custom Firestore DB - 완전 자체 구현 아키텍처

## 핵심 설계 원칙
- **완전 의존 제거**: 데이터 일관성, 권한, 실시간, 인덱스, SDK, 운영까지 전부 자체 구현
- **안전성 우선**: 버그가 나도 데이터가 망가지지 않는 설계
- **성능 목표**: p95 읽기 <30ms, 쓰기 <50ms (핫 컬렉션 제외)

## 시스템 아키텍처

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   SDK (JS/TS)   │    │  HTTP Gateway   │    │  WebSocket RT   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Auth Engine    │    │   API Router    │    │  Rules Engine   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Query Engine   │    │ Transaction Mgr │    │  Index System   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Storage Engine  │    │  Change Log     │    │  Backup/Restore │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 핵심 컴포넌트 설계

### 1. Database Core (최우선)
```typescript
interface Document {
  path: string;           // dealers/abc123/bookings/xyz789
  collection: string;     // bookings
  data: any;              // JSON 문서
  version: number;        // 옵티미스틱 락
  createdAt: Date;
  updatedAt: Date;
  dealerId: string;       // 멀티테넌트 파티션 키
}

interface Index {
  name: string;
  collection: string;
  fields: IndexField[];
  isUnique: boolean;
  dealerId: string;
}

interface IndexField {
  field: string;          // 'schedule.date'
  direction: 'asc' | 'desc';
}
```

### 2. Rules Engine (핵심 쟁점)
```javascript
// 규칙 DSL 예제
match /dealers/{dealerId}/bookings/{bookingId} {
  allow read, write: if request.auth != null 
                     && request.auth.token.dealerId == dealerId
                     && hasRole('manager', 'staff');
  
  allow read: if request.auth != null 
              && request.auth.uid == resource.data.customerId;
}

// 경로 패턴 매칭 (트라이 구조)
PathMatcher:
  /dealers/{dealerId}/bookings/{bookingId}
  /dealers/{dealerId}/customers/{customerId}
  /dealers/{dealerId}/settings/config
```

### 3. Query System
```typescript
interface Query {
  collection: string;
  where: WhereClause[];
  orderBy: OrderByClause[];
  limit?: number;
  startAfter?: any;
  dealerId: string;       // 필수 파티션 키
}

interface WhereClause {
  field: string;
  operator: '==' | '!=' | '<' | '<=' | '>' | '>=' | 'in' | 'array-contains';
  value: any;
}
```

## 핵심 기술 구현

### 인덱스 전략 (성능 핵심)
```sql
-- 복합 인덱스 예제 (bookings)
CREATE INDEX idx_bookings_date_status_created ON documents(
  dealer_id,              -- 파티션 키 (항상 첫번째)
  json_extract(data, '$.schedule.date'),
  json_extract(data, '$.status'),
  created_at DESC
) WHERE collection = 'bookings';

-- 쿼리 매칭 규칙
-- where schedule.date == '2023-10-15'
-- where status IN ('confirmed', 'pending') 
-- orderBy createdAt DESC
-- → 인덱스와 정확히 일치해야 함
```

### 멀티테넌시 (보안 핵심)
```typescript
class SecurityContext {
  dealerId: string;
  userId: string;
  roles: string[];
  
  // 모든 쿼리에 자동 주입
  addTenantFilter(query: Query): Query {
    return {
      ...query,
      where: [
        { field: '__dealerId', operator: '==', value: this.dealerId },
        ...query.where
      ]
    };
  }
}
```

### 실시간 구독 (diff 계산)
```typescript
interface Subscription {
  id: string;
  query: Query;
  queryHash: string;        // 캐노니컬 쿼리 해시
  lastSnapshot: Document[];
  callback: (changes: Change[]) => void;
}

interface Change {
  type: 'added' | 'modified' | 'removed';
  doc: Document;
  oldIndex?: number;
  newIndex?: number;
}
```

## 팀별 구현 분담

### Team 1: Database Core
**파일**: `src/core/`
- `storage.ts` - 문서 CRUD + 버전 관리
- `indexes.ts` - 인덱스 생성/관리/쿼리
- `transactions.ts` - 옵티미스틱 락 + 멱등성
- `change-log.ts` - 모든 변경 사항 로깅

### Team 2: Authentication  
**파일**: `src/auth/`
- `email-auth.ts` - 이메일/패스워드 + 검증
- `oauth.ts` - Google/GitHub 연동
- `jwt.ts` - 토큰 발급/검증/갱신
- `user-management.ts` - 역할/권한 관리

### Team 3: Rules Engine
**파일**: `src/rules/`
- `parser.ts` - DSL → AST 파싱
- `matcher.ts` - 경로 패턴 매칭 (트라이)
- `evaluator.ts` - 규칙 평가 + 컨텍스트 주입
- `cache.ts` - 규칙 결과 캐싱

### Team 4: Realtime
**파일**: `src/realtime/`
- `websocket.ts` - WS 연결 관리 + 인증
- `subscriptions.ts` - 쿼리 구독 관리
- `diff-engine.ts` - 변경 사항 diff 계산
- `broadcast.ts` - 멀티 인스턴스 팬아웃

### Team 5: SDK
**파일**: `sdk/js/`
- `firestore.ts` - 메인 API (Firestore 호환)
- `query.ts` - 쿼리 빌더 + 체이닝
- `realtime.ts` - onSnapshot + 오프라인 큐
- `auth.ts` - 인증 상태 관리

### Team 6: Operations
**파일**: `ops/`
- `docker/` - 컨테이너화
- `k8s/` - 쿠버네티스 배포
- `monitoring/` - 메트릭/로깅/트레이싱
- `backup/` - 백업/복구 자동화

## 4주 개발 로드맵

### Week 1: Foundation
- Database Core MVP (CRUD + 기본 인덱스)
- Auth 기본 (Email/Password + JWT)
- Rules 파서 (단순 경로 매칭)
- SDK 기본 API (get/set/collection)

### Week 2: Core Features  
- Query System (where/orderBy/limit)
- Index 자동 관리 + 제안
- Rules 평가 엔진 + 캐시
- Realtime 기본 (단순 문서 구독)

### Week 3: Advanced
- 트랜잭션 + 배치 처리
- 복합 쿼리 + 페이지네이션
- 오프라인 큐 + 충돌 해결
- OAuth 연동

### Week 4: Production Ready
- 부하 테스트 + 성능 튜닝
- 모니터링 + 알람 설정
- 백업/복구 시스템
- 보안 감사 + 취약점 테스트

## 성능 목표 & 제약

### 성능 SLA
- 읽기 쿼리: p95 < 30ms
- 쓰기 작업: p95 < 50ms  
- 실시간 지연: < 100ms
- 동시 연결: 10,000+ WebSocket

### 확장성 제약
- 문서 크기: < 1MB
- 배치 크기: < 500 operations
- 인덱스 수: < 200 per collection
- 구독 수: < 100 per client

## 보안 체크리스트

- [ ] 모든 쿼리에 dealerId 필터 자동 주입
- [ ] Rules 엔진 성능 p95 < 2ms
- [ ] JWT 토큰 만료/갱신 자동화  
- [ ] 민감 데이터 필드 레벨 암호화
- [ ] 감사 로그 (모든 write 추적)
- [ ] 레이트 리미팅 (user/IP/tenant별)
- [ ] 입력 검증 (Zod 스키마)
- [ ] CORS 정책 엄격 설정

이 아키텍처로 완전 자체 구현 DB 시작합니다! 어떤 팀부터 집중할까요?