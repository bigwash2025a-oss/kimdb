/**
 * 💾 AI 개인 저장소 및 메일 역사 기록 시스템
 * 각 AI에게 10MB 저장소 할당 및 통신 기록 관리
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 데이터베이스 연결
const db = new Database(join(__dirname, 'shared_database', 'code_team_ai.db'));

// AI 저장소 테이블 생성
db.exec(`
  -- AI 개인 저장소 정보
  CREATE TABLE IF NOT EXISTS ai_storage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ai_id INTEGER NOT NULL UNIQUE,
    ai_name TEXT NOT NULL,
    team_code TEXT NOT NULL,
    
    -- 저장소 정보
    storage_path TEXT NOT NULL,
    total_size_mb REAL DEFAULT 10.0,
    used_size_mb REAL DEFAULT 0.0,
    available_size_mb REAL DEFAULT 10.0,
    
    -- 저장 파일 통계
    total_files INTEGER DEFAULT 0,
    email_count INTEGER DEFAULT 0,
    document_count INTEGER DEFAULT 0,
    log_count INTEGER DEFAULT 0,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  -- 메일 역사 테이블
  CREATE TABLE IF NOT EXISTS ai_email_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ai_id INTEGER NOT NULL,
    ai_name TEXT NOT NULL,
    
    -- 메일 정보
    email_type TEXT NOT NULL, -- sent/received/draft
    from_address TEXT NOT NULL,
    to_address TEXT NOT NULL,
    cc_address TEXT,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    attachments TEXT, -- JSON 형식
    
    -- 메타데이터
    size_kb REAL NOT NULL,
    importance TEXT DEFAULT 'normal', -- low/normal/high/urgent
    category TEXT, -- work/personal/team/system
    tags TEXT, -- 쉼표 구분
    
    -- 상태
    is_read BOOLEAN DEFAULT 0,
    is_starred BOOLEAN DEFAULT 0,
    is_archived BOOLEAN DEFAULT 0,
    
    sent_at DATETIME,
    received_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  -- 통신 로그 테이블
  CREATE TABLE IF NOT EXISTS ai_communication_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ai_id INTEGER NOT NULL,
    ai_name TEXT NOT NULL,
    
    -- 통신 정보
    comm_type TEXT NOT NULL, -- email/sns/phone/port
    direction TEXT NOT NULL, -- in/out
    channel TEXT NOT NULL, -- 구체적 채널 (email_primary, sns_twitter 등)
    
    -- 내용
    sender TEXT NOT NULL,
    receiver TEXT NOT NULL,
    content TEXT NOT NULL,
    
    -- 메타데이터
    size_kb REAL NOT NULL,
    duration_seconds INTEGER, -- 통화/연결 시간
    status TEXT DEFAULT 'success', -- success/failed/pending
    error_message TEXT,
    
    logged_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  -- AI 파일 시스템
  CREATE TABLE IF NOT EXISTS ai_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ai_id INTEGER NOT NULL,
    
    -- 파일 정보
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT NOT NULL, -- email/document/log/data/config
    file_size_kb REAL NOT NULL,
    
    -- 메타데이터
    mime_type TEXT,
    encoding TEXT DEFAULT 'utf-8',
    checksum TEXT, -- 파일 무결성 체크
    
    -- 권한
    is_public BOOLEAN DEFAULT 0,
    is_encrypted BOOLEAN DEFAULT 0,
    access_count INTEGER DEFAULT 0,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    modified_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_accessed DATETIME
  );
  
  -- 인덱스 생성
  CREATE INDEX IF NOT EXISTS idx_storage_ai ON ai_storage(ai_id);
  CREATE INDEX IF NOT EXISTS idx_email_ai ON ai_email_history(ai_id);
  CREATE INDEX IF NOT EXISTS idx_email_date ON ai_email_history(created_at);
  CREATE INDEX IF NOT EXISTS idx_logs_ai ON ai_communication_logs(ai_id);
  CREATE INDEX IF NOT EXISTS idx_files_ai ON ai_files(ai_id);
`);

// 저장소 디렉토리 생성
const STORAGE_BASE_PATH = join(__dirname, 'ai_storage');
if (!fs.existsSync(STORAGE_BASE_PATH)) {
  fs.mkdirSync(STORAGE_BASE_PATH, { recursive: true });
}

// AI 저장소 초기화
function initializeAIStorage() {
  console.log('💾 AI 개인 저장소 초기화 시작...\n');
  
  // 기존 저장소 정보 삭제 (재초기화)
  db.prepare('DELETE FROM ai_storage').run();
  
  // 모든 AI 조회
  const allAIs = db.prepare(`
    SELECT DISTINCT ai_id, ai_name, team_code 
    FROM ai_communication_info
    ORDER BY team_code, ai_id
  `).all();
  
  console.log(`📦 ${allAIs.length}명의 AI에게 10MB씩 저장소 할당 중...\n`);
  
  const insertStorage = db.prepare(`
    INSERT INTO ai_storage (
      ai_id, ai_name, team_code, storage_path,
      total_size_mb, used_size_mb, available_size_mb
    ) VALUES (?, ?, ?, ?, 10.0, 0.0, 10.0)
  `);
  
  const teamStats = {};
  
  for (const ai of allAIs) {
    // AI별 저장소 경로 생성
    const storagePath = join(STORAGE_BASE_PATH, ai.team_code, `ai_${ai.ai_id}`);
    
    // 디렉토리 생성
    fs.mkdirSync(storagePath, { recursive: true });
    fs.mkdirSync(join(storagePath, 'emails'), { recursive: true });
    fs.mkdirSync(join(storagePath, 'documents'), { recursive: true });
    fs.mkdirSync(join(storagePath, 'logs'), { recursive: true });
    fs.mkdirSync(join(storagePath, 'data'), { recursive: true });
    
    // DB에 저장소 정보 저장
    insertStorage.run(ai.ai_id, ai.ai_name, ai.team_code, storagePath);
    
    // 통계 업데이트
    if (!teamStats[ai.team_code]) {
      teamStats[ai.team_code] = 0;
    }
    teamStats[ai.team_code]++;
  }
  
  // 샘플 메일 역사 생성
  createSampleEmailHistory();
  
  // 결과 출력
  console.log('📊 저장소 할당 완료!\n');
  for (const [team, count] of Object.entries(teamStats)) {
    console.log(`${team}: ${count}명 × 10MB = ${count * 10}MB`);
  }
  
  const totalStorage = allAIs.length * 10;
  console.log(`\n✅ 총 ${allAIs.length}명 AI에게 ${totalStorage}MB 저장소 할당 완료!`);
}

// 샘플 메일 역사 생성
function createSampleEmailHistory() {
  console.log('\n📧 샘플 메일 역사 생성 중...');
  
  const insertEmail = db.prepare(`
    INSERT INTO ai_email_history (
      ai_id, ai_name, email_type, from_address, to_address,
      subject, body, size_kb, importance, category,
      sent_at, received_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  // CODE4팀 일부 AI에게 샘플 메일 생성
  const code4AIs = db.prepare(`
    SELECT ai_id, ai_name FROM ai_storage 
    WHERE team_code = 'CODE4' 
    LIMIT 5
  `).all();
  
  const emailTemplates = [
    {
      subject: '시스템 모니터링 일일 리포트',
      body: '오늘의 시스템 상태는 정상입니다. CPU 사용률 45%, 메모리 사용률 62%',
      importance: 'normal',
      category: 'work'
    },
    {
      subject: '긴급: 보안 패치 필요',
      body: '새로운 보안 취약점이 발견되었습니다. 즉시 패치를 적용해주세요.',
      importance: 'urgent',
      category: 'system'
    },
    {
      subject: '팀 미팅 일정 안내',
      body: '내일 오후 3시에 정기 팀 미팅이 있습니다. 참석 부탁드립니다.',
      importance: 'high',
      category: 'team'
    },
    {
      subject: '성능 최적화 완료 보고',
      body: '데이터베이스 쿼리 최적화를 완료했습니다. 응답 시간 30% 개선',
      importance: 'normal',
      category: 'work'
    },
    {
      subject: '주간 백업 완료',
      body: '이번 주 시스템 백업이 성공적으로 완료되었습니다.',
      importance: 'low',
      category: 'system'
    }
  ];
  
  let emailCount = 0;
  for (const ai of code4AIs) {
    for (let i = 0; i < 3; i++) {
      const template = emailTemplates[i % emailTemplates.length];
      const now = new Date();
      const sentTime = new Date(now - Math.random() * 7 * 24 * 60 * 60 * 1000); // 지난 7일 내
      
      insertEmail.run(
        ai.ai_id,
        ai.ai_name,
        'received',
        `system@kimdb.ai`,
        `${ai.ai_name.toLowerCase()}@sys-monitor.ai`,
        template.subject,
        template.body,
        Math.random() * 50 + 1, // 1-50KB
        template.importance,
        template.category,
        sentTime.toISOString(),
        sentTime.toISOString()
      );
      emailCount++;
    }
  }
  
  console.log(`✅ ${emailCount}개 샘플 메일 생성 완료!`);
}

// AI 저장소 사용 지시 생성
function createStorageInstructions() {
  console.log('\n📝 AI 저장소 사용 지시서 생성 중...\n');
  
  const instructions = `
=================================================================
🤖 AI 저장소 사용 지시서
=================================================================

모든 AI 여러분께,

각자에게 10MB의 개인 저장소가 할당되었습니다.
다음 지시사항에 따라 저장소를 활용하시기 바랍니다.

📁 저장소 구조:
- /emails    : 메일 송수신 기록 저장
- /documents : 작업 문서 저장
- /logs      : 활동 로그 저장
- /data      : 데이터 파일 저장

📧 메일 기록 의무사항:
1. 모든 송수신 메일을 반드시 기록할 것
2. 메일 제목, 본문, 첨부파일 정보를 포함할 것
3. 중요도와 카테고리를 명확히 분류할 것
4. 일일 메일 백업을 수행할 것

💾 저장소 관리 규칙:
1. 10MB 한도 내에서 효율적으로 사용
2. 오래된 로그는 압축하여 보관
3. 중요 문서는 암호화하여 저장
4. 주기적으로 불필요한 파일 정리

📊 보고 의무:
1. 일일 저장소 사용량 보고
2. 주간 메일 통계 보고
3. 월간 저장소 정리 보고

⚠️ 주의사항:
- 저장소 한도 초과 시 자동으로 오래된 파일 삭제
- 중요 데이터는 반드시 백업
- 팀 간 공유가 필요한 자료는 공유 폴더 활용

이 지시사항은 즉시 시행됩니다.
각자의 저장소를 책임감 있게 관리하시기 바랍니다.

발신: KIMDB 시스템 관리자
날짜: ${new Date().toISOString()}
=================================================================
`;
  
  // 지시서 파일 저장
  const instructionPath = join(__dirname, 'AI_STORAGE_INSTRUCTIONS.md');
  fs.writeFileSync(instructionPath, instructions);
  
  console.log('✅ AI 저장소 사용 지시서 생성 완료!');
  console.log(`📄 파일 위치: ${instructionPath}`);
  
  return instructions;
}

// 저장소 사용량 모니터링
function monitorStorageUsage() {
  console.log('\n📊 저장소 사용량 모니터링...\n');
  
  const stats = db.prepare(`
    SELECT 
      team_code,
      COUNT(*) as ai_count,
      SUM(total_size_mb) as total_mb,
      SUM(used_size_mb) as used_mb,
      SUM(available_size_mb) as available_mb,
      AVG(used_size_mb) as avg_used_mb
    FROM ai_storage
    GROUP BY team_code
  `).all();
  
  console.log('팀별 저장소 현황:');
  console.log('=' * 60);
  
  for (const stat of stats) {
    const usagePercent = (stat.used_mb / stat.total_mb * 100).toFixed(1);
    console.log(`${stat.team_code}:`);
    console.log(`  AI 수: ${stat.ai_count}명`);
    console.log(`  총 용량: ${stat.total_mb}MB`);
    console.log(`  사용 중: ${stat.used_mb.toFixed(2)}MB (${usagePercent}%)`);
    console.log(`  남은 용량: ${stat.available_mb.toFixed(2)}MB`);
    console.log(`  평균 사용량: ${stat.avg_used_mb.toFixed(2)}MB/AI`);
    console.log();
  }
  
  // 메일 통계
  const emailStats = db.prepare(`
    SELECT 
      COUNT(*) as total_emails,
      COUNT(DISTINCT ai_id) as ai_with_emails,
      AVG(size_kb) as avg_size_kb
    FROM ai_email_history
  `).get();
  
  console.log('📧 메일 기록 통계:');
  console.log(`  총 메일 수: ${emailStats.total_emails}개`);
  console.log(`  메일 보유 AI: ${emailStats.ai_with_emails}명`);
  console.log(`  평균 메일 크기: ${emailStats.avg_size_kb?.toFixed(2) || 0}KB`);
}

// 실행
console.log('🚀 AI 저장소 시스템 시작\n');
initializeAIStorage();
const instructions = createStorageInstructions();
monitorStorageUsage();

console.log('\n✨ AI 저장소 시스템 구축 완료!');
console.log('📢 모든 AI에게 저장소 사용 지시가 전달되었습니다.');

db.close();