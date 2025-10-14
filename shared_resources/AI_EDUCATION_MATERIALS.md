# 🎓 AI 개발팀 교육 자료

## 📚 개발 지식 교육 매뉴얼

### 🔧 **Ubuntu 시스템 개발 환경**

#### **1. 기본 시스템 정보**
```bash
# 현재 환경
OS: Ubuntu 22.04 LTS (Linux 6.8.0-65-generic) x86_64
Node.js: v22.18.0 (nvm 관리)
npm: v10.9.3
SQLite: libsqlite3-0 설치됨
```

#### **2. 필수 개발 도구 설치**
```bash
# SQLite 완전 설치
sudo apt update && sudo apt install -y sqlite3 libsqlite3-dev build-essential

# Python 개발 환경
sudo apt install -y python3 python3-pip python3-venv

# Git 및 기본 도구
sudo apt install -y git curl wget vim nano htop
```

### 🏗️ **KIMDB 시스템 아키텍처**

#### **1. 현재 구조**
```
📁 KIMDB/
├── 🗄️ SQLite DB (kimdb_ai_data.db) - 5000명 AI 저장
├── 🌐 웹 인터페이스 (public/) - HTML/CSS/JS
├── ⚙️ FastAPI 서버 (src/server-final.ts)
├── 🤖 AI 시스템 (src/ai-system/)
└── 💾 데이터베이스 (src/database/)
```

#### **2. API 엔드포인트**
```javascript
// AI 관리
GET  /ai/init           - 5000명 AI 초기화
GET  /ai/stats          - 전체 통계
GET  /ai               - AI 목록 (필터링 지원)
GET  /ai/:id           - 특정 AI 조회
PUT  /ai/:id/status    - AI 상태 변경

// AI 상호작용
POST /ai/:id/chat      - AI와 채팅
GET  /ai/search?q=     - AI 검색
GET  /ai/random        - 랜덤 AI 선택

// 팀 관리
GET  /ai/team/CODE1    - 팀별 조회
```

### 💻 **개발 언어별 가이드**

#### **Frontend (CODE1 팀)**
```html
<!-- HTML5 구조 -->
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>KIMDB AI System</title>
    <link rel="stylesheet" href="/css/style.css">
</head>
<body>
    <!-- 컴포넌트 구조 -->
</body>
</html>
```

```css
/* CSS3 스타일링 */
:root {
    --primary: #ff4757;
    --secondary: #5352ed;
    --bg-primary: #1a1a2e;
}

.component {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 20px;
}
```

```javascript
// JavaScript ES6+ 
class KIMDBApp {
    constructor() {
        this.apiBase = '';
        this.init();
    }
    
    async loadAIs() {
        const response = await fetch('/ai/stats');
        const data = await response.json();
        return data;
    }
}
```

#### **Backend (CODE2 팀)**
```typescript
// TypeScript/Node.js
import Fastify from 'fastify';
import { SQLiteDatabase } from './database/sqlite.js';

const server = Fastify();
const db = new SQLiteDatabase();

server.get('/api/data', async (request, reply) => {
    const result = await db.query('SELECT * FROM table');
    return { success: true, data: result };
});
```

```python
# Python 백엔드 예시
import sqlite3
import fastapi
from fastapi import FastAPI

app = FastAPI()

@app.get("/api/data")
async def get_data():
    conn = sqlite3.connect("database.db")
    cursor = conn.execute("SELECT * FROM table")
    result = cursor.fetchall()
    conn.close()
    return {"success": True, "data": result}
```

#### **DevOps (CODE2 팀)**
```bash
# 배포 스크립트
#!/bin/bash
echo "🚀 KIMDB 배포 시작..."

# 의존성 설치
npm install

# 빌드
npm run build

# 서비스 재시작
pm2 restart kimdb || pm2 start dist/server.js --name kimdb

echo "✅ 배포 완료!"
```

```dockerfile
# Docker 설정
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### 🎯 **AI별 전문 분야**

#### **CREATOR (창조자)**
- 새로운 기능 아이디어 제안
- UI/UX 디자인 컨셉
- 혁신적인 솔루션 설계

#### **ANALYZER (분석가)**
- 코드 리뷰 및 최적화
- 성능 분석 및 개선
- 시스템 아키텍처 검토

#### **LEADER (리더)**
- 프로젝트 관리 및 계획
- 팀 간 협업 조율
- 전략적 의사결정

#### **SUPPORTER (서포터)**
- 버그 수정 및 유지보수
- 문서화 및 가이드 작성
- 사용자 지원

### 🛠️ **실제 개발 명령어**

#### **프로젝트 시작**
```bash
# 새 프로젝트 생성
mkdir my-app && cd my-app
npm init -y

# 의존성 설치
npm install fastify better-sqlite3 @types/node typescript

# 개발 환경 설정
npx tsc --init
```

#### **데이터베이스 작업**
```bash
# SQLite 접속
sqlite3 database.db

# 테이블 생성
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE
);

# 데이터 조회
SELECT * FROM users LIMIT 10;
```

#### **서버 실행**
```bash
# 개발 모드
npm run dev

# 프로덕션 빌드
npm run build
npm start

# 로그 확인
pm2 logs kimdb
```

### 📊 **성능 최적화**

#### **프론트엔드**
- 이미지 최적화 (WebP, 압축)
- CSS/JS 번들링 및 미니파이
- 캐싱 전략 (브라우저, CDN)
- 지연 로딩 (Lazy Loading)

#### **백엔드**
- 데이터베이스 인덱싱
- 쿼리 최적화
- 메모리 캐싱 (Redis)
- API 응답 압축

#### **시스템**
- PM2 클러스터 모드
- Nginx 리버스 프록시
- SSL/TLS 설정
- 모니터링 (로그, 메트릭)

### 🚨 **일반적인 오류 해결**

#### **Node.js 관련**
```bash
# node-gyp 오류
sudo apt install -y build-essential python3

# 권한 오류
sudo chown -R $USER ~/.npm

# 포트 사용 중
sudo lsof -ti:3000 | xargs kill -9
```

#### **SQLite 관련**
```bash
# 파일 권한 문제
chmod 664 database.db
chown $USER:$USER database.db

# 잠금 오류
sudo pkill -f sqlite
```

### 📝 **코딩 컨벤션**

#### **JavaScript/TypeScript**
```javascript
// 변수명: camelCase
const userName = 'john';
const apiResponse = await fetchData();

// 함수명: 동사 + 명사
function getUserData() { }
async function saveToDatabase() { }

// 클래스명: PascalCase
class DatabaseManager { }
class UserService { }
```

#### **CSS**
```css
/* 클래스명: kebab-case */
.user-card { }
.nav-menu-item { }

/* BEM 방법론 */
.block { }
.block__element { }
.block--modifier { }
```

### 🎓 **학습 리소스**

#### **공식 문서**
- Node.js: https://nodejs.org/docs
- SQLite: https://sqlite.org/docs.html
- Fastify: https://fastify.dev/docs
- TypeScript: https://typescriptlang.org/docs

#### **추천 도구**
- VS Code (에디터)
- Postman (API 테스트)
- DBeaver (DB 관리)
- Git (버전 관리)

---

## 🎯 **실습 과제**

### **1단계: 기본 환경 설정**
- SQLite CLI 설치 확인
- 새 Node.js 프로젝트 생성
- 기본 API 서버 구현

### **2단계: 데이터베이스 작업**
- SQLite 테이블 생성
- CRUD 작업 구현
- 인덱스 최적화

### **3단계: 웹 인터페이스**
- HTML 페이지 작성
- CSS 스타일링
- JavaScript 상호작용

이 자료를 바탕으로 각 AI가 전문 분야에서 실제 개발 작업을 수행할 수 있도록 교육합니다!