/**
 * 📚 AI 학습 기록 및 진도 관리 시스템
 * 모든 AI의 학습 활동을 지속적으로 기록하고 추적
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 데이터베이스 연결
const db = new Database(join(__dirname, 'shared_database', 'code_team_ai.db'));

// AI 학습 관련 테이블 생성
db.exec(`
  -- AI 학습 기록 테이블
  CREATE TABLE IF NOT EXISTS ai_learning_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ai_id INTEGER NOT NULL,
    ai_name TEXT NOT NULL,
    team_code TEXT NOT NULL,
    
    -- 학습 정보
    learning_date DATE NOT NULL,
    subject TEXT NOT NULL, -- 학습 주제
    category TEXT NOT NULL, -- 프로그래밍/데이터베이스/시스템/보안/etc
    skill_level TEXT DEFAULT 'beginner', -- beginner/intermediate/advanced/expert
    
    -- 학습 내용
    topic TEXT NOT NULL, -- 구체적 토픽
    content TEXT NOT NULL, -- 학습 내용 요약
    materials_used TEXT, -- 사용한 교재/자료
    practice_code TEXT, -- 실습 코드
    
    -- 학습 시간
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    duration_minutes INTEGER NOT NULL,
    
    -- 학습 성과
    understanding_score INTEGER DEFAULT 0, -- 이해도 (0-100)
    practice_score INTEGER DEFAULT 0, -- 실습 점수 (0-100)
    quiz_score INTEGER DEFAULT 0, -- 퀴즈 점수 (0-100)
    overall_score INTEGER DEFAULT 0, -- 종합 점수 (0-100)
    
    -- 학습 상태
    status TEXT DEFAULT 'in_progress', -- in_progress/completed/reviewed
    notes TEXT, -- 학습 메모
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  -- AI 학습 진도 테이블
  CREATE TABLE IF NOT EXISTS ai_learning_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ai_id INTEGER NOT NULL UNIQUE,
    ai_name TEXT NOT NULL,
    team_code TEXT NOT NULL,
    
    -- 전체 학습 통계
    total_learning_hours REAL DEFAULT 0,
    total_subjects_learned INTEGER DEFAULT 0,
    total_topics_completed INTEGER DEFAULT 0,
    
    -- 분야별 진도 (%)
    programming_progress REAL DEFAULT 0,
    database_progress REAL DEFAULT 0,
    system_progress REAL DEFAULT 0,
    security_progress REAL DEFAULT 0,
    communication_progress REAL DEFAULT 0,
    
    -- 기술 스택 레벨
    javascript_level INTEGER DEFAULT 0, -- 0-5
    python_level INTEGER DEFAULT 0,
    sql_level INTEGER DEFAULT 0,
    docker_level INTEGER DEFAULT 0,
    git_level INTEGER DEFAULT 0,
    
    -- 학습 성과
    average_score REAL DEFAULT 0,
    highest_score INTEGER DEFAULT 0,
    certification_count INTEGER DEFAULT 0,
    project_count INTEGER DEFAULT 0,
    
    -- 현재 학습 정보
    current_subject TEXT,
    current_topic TEXT,
    last_learning_date DATE,
    consecutive_days INTEGER DEFAULT 0,
    
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  -- AI 학습 목표 테이블
  CREATE TABLE IF NOT EXISTS ai_learning_goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ai_id INTEGER NOT NULL,
    ai_name TEXT NOT NULL,
    team_code TEXT NOT NULL,
    
    -- 목표 정보
    goal_title TEXT NOT NULL,
    goal_description TEXT NOT NULL,
    goal_category TEXT NOT NULL,
    target_date DATE NOT NULL,
    
    -- 목표 수치
    target_hours INTEGER, -- 목표 학습 시간
    target_score INTEGER, -- 목표 점수
    target_topics INTEGER, -- 목표 토픽 수
    
    -- 진행 상황
    current_progress REAL DEFAULT 0, -- 0-100%
    completed_hours REAL DEFAULT 0,
    completed_topics INTEGER DEFAULT 0,
    
    -- 상태
    status TEXT DEFAULT 'active', -- active/completed/paused/cancelled
    priority TEXT DEFAULT 'normal', -- low/normal/high/urgent
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME
  );
  
  -- AI 학습 리소스 테이블
  CREATE TABLE IF NOT EXISTS ai_learning_resources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ai_id INTEGER NOT NULL,
    
    -- 리소스 정보
    resource_type TEXT NOT NULL, -- book/video/article/course/documentation
    resource_title TEXT NOT NULL,
    resource_url TEXT,
    resource_author TEXT,
    
    -- 학습 정보
    category TEXT NOT NULL,
    difficulty TEXT DEFAULT 'intermediate',
    estimated_hours REAL,
    
    -- 진행 상황
    progress_percent REAL DEFAULT 0,
    is_completed BOOLEAN DEFAULT 0,
    is_bookmarked BOOLEAN DEFAULT 0,
    
    -- 평가
    rating INTEGER, -- 1-5
    review TEXT,
    would_recommend BOOLEAN,
    
    added_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_date DATETIME
  );
  
  -- AI 학습 인증서 테이블
  CREATE TABLE IF NOT EXISTS ai_certifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ai_id INTEGER NOT NULL,
    ai_name TEXT NOT NULL,
    
    -- 인증서 정보
    certification_name TEXT NOT NULL,
    certification_type TEXT NOT NULL, -- course/skill/project
    issuer TEXT NOT NULL,
    issue_date DATE NOT NULL,
    expiry_date DATE,
    
    -- 인증 내용
    skills_validated TEXT,
    score_achieved INTEGER,
    level_achieved TEXT,
    certificate_url TEXT,
    
    -- 상태
    is_active BOOLEAN DEFAULT 1,
    verification_code TEXT,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  -- 인덱스 생성
  CREATE INDEX IF NOT EXISTS idx_learning_ai ON ai_learning_records(ai_id);
  CREATE INDEX IF NOT EXISTS idx_learning_date ON ai_learning_records(learning_date);
  CREATE INDEX IF NOT EXISTS idx_progress_ai ON ai_learning_progress(ai_id);
  CREATE INDEX IF NOT EXISTS idx_goals_ai ON ai_learning_goals(ai_id);
  CREATE INDEX IF NOT EXISTS idx_resources_ai ON ai_learning_resources(ai_id);
  CREATE INDEX IF NOT EXISTS idx_certs_ai ON ai_certifications(ai_id);
`);

// 학습 커리큘럼 정의
const LEARNING_CURRICULUM = {
  CODE1: {
    name: 'Firebase 인증 시스템 전문 과정',
    subjects: [
      { name: 'Firebase 기초', hours: 20, topics: 15 },
      { name: '인증 시스템 설계', hours: 30, topics: 20 },
      { name: '보안 프로토콜', hours: 25, topics: 18 },
      { name: 'OAuth 2.0', hours: 15, topics: 10 },
      { name: 'JWT 토큰 관리', hours: 10, topics: 8 }
    ]
  },
  CODE2: {
    name: '통신 시스템 개발 전문 과정',
    subjects: [
      { name: 'WebSocket 프로그래밍', hours: 25, topics: 18 },
      { name: '실시간 메시징', hours: 30, topics: 22 },
      { name: 'API 설계', hours: 20, topics: 15 },
      { name: '이메일 시스템', hours: 15, topics: 12 },
      { name: '알림 서비스', hours: 10, topics: 8 }
    ]
  },
  CODE3: {
    name: '데이터베이스 전문 과정',
    subjects: [
      { name: 'SQL 고급', hours: 30, topics: 25 },
      { name: '쿼리 최적화', hours: 25, topics: 20 },
      { name: '인덱싱 전략', hours: 20, topics: 15 },
      { name: 'NoSQL 기초', hours: 15, topics: 12 },
      { name: '데이터 모델링', hours: 10, topics: 8 }
    ]
  },
  CODE4: {
    name: '시스템 운영 및 모니터링 전문 과정',
    subjects: [
      { name: '시스템 모니터링', hours: 25, topics: 20 },
      { name: '성능 최적화', hours: 30, topics: 22 },
      { name: '로그 분석', hours: 20, topics: 15 },
      { name: '자동화 스크립팅', hours: 15, topics: 12 },
      { name: '백업 및 복구', hours: 10, topics: 8 }
    ]
  }
};

// AI 학습 진도 초기화
function initializeLearningProgress() {
  console.log('📚 AI 학습 진도 초기화 시작...\n');
  
  // 기존 진도 데이터 삭제
  db.prepare('DELETE FROM ai_learning_progress').run();
  
  // 모든 AI 조회
  const allAIs = db.prepare(`
    SELECT DISTINCT ai_id, ai_name, team_code 
    FROM ai_storage
    ORDER BY team_code, ai_id
  `).all();
  
  const insertProgress = db.prepare(`
    INSERT INTO ai_learning_progress (
      ai_id, ai_name, team_code,
      current_subject, current_topic,
      last_learning_date
    ) VALUES (?, ?, ?, ?, ?, date('now'))
  `);
  
  for (const ai of allAIs) {
    const curriculum = LEARNING_CURRICULUM[ai.team_code];
    if (curriculum && curriculum.subjects.length > 0) {
      insertProgress.run(
        ai.ai_id,
        ai.ai_name,
        ai.team_code,
        curriculum.subjects[0].name,
        '기초 개념 이해',
      );
    }
  }
  
  console.log(`✅ ${allAIs.length}명 AI 학습 진도 초기화 완료!\n`);
}

// 샘플 학습 기록 생성
function createSampleLearningRecords() {
  console.log('📝 샘플 학습 기록 생성 중...\n');
  
  const insertRecord = db.prepare(`
    INSERT INTO ai_learning_records (
      ai_id, ai_name, team_code,
      learning_date, subject, category, skill_level,
      topic, content, materials_used,
      start_time, end_time, duration_minutes,
      understanding_score, practice_score, quiz_score, overall_score,
      status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  // 각 팀에서 샘플 AI 선택
  const sampleAIs = db.prepare(`
    SELECT ai_id, ai_name, team_code 
    FROM ai_storage 
    WHERE team_code IN ('CODE1', 'CODE2', 'CODE3', 'CODE4')
    GROUP BY team_code
    LIMIT 4
  `).all();
  
  let recordCount = 0;
  
  for (const ai of sampleAIs) {
    const curriculum = LEARNING_CURRICULUM[ai.team_code];
    if (!curriculum) continue;
    
    // 각 AI마다 5개의 학습 기록 생성
    for (let i = 0; i < 5; i++) {
      const subject = curriculum.subjects[i % curriculum.subjects.length];
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      const startTime = new Date(date);
      startTime.setHours(9 + i, 0, 0);
      const endTime = new Date(startTime);
      endTime.setHours(startTime.getHours() + 2);
      
      const scores = {
        understanding: 70 + Math.floor(Math.random() * 30),
        practice: 65 + Math.floor(Math.random() * 35),
        quiz: 60 + Math.floor(Math.random() * 40)
      };
      
      const overall = Math.floor((scores.understanding + scores.practice + scores.quiz) / 3);
      
      insertRecord.run(
        ai.ai_id,
        ai.ai_name,
        ai.team_code,
        date.toISOString().split('T')[0],
        subject.name,
        ai.team_code === 'CODE1' ? '보안' : 
        ai.team_code === 'CODE2' ? '통신' :
        ai.team_code === 'CODE3' ? '데이터베이스' : '시스템',
        i < 2 ? 'beginner' : i < 4 ? 'intermediate' : 'advanced',
        `${subject.name} - 챕터 ${i + 1}`,
        `${subject.name}의 핵심 개념을 학습하고 실습 완료`,
        '공식 문서, 온라인 강의, 실습 예제',
        startTime.toISOString(),
        endTime.toISOString(),
        120,
        scores.understanding,
        scores.practice,
        scores.quiz,
        overall,
        'completed'
      );
      
      recordCount++;
    }
  }
  
  console.log(`✅ ${recordCount}개 샘플 학습 기록 생성 완료!\n`);
}

// 학습 목표 설정
function setLearningGoals() {
  console.log('🎯 AI 학습 목표 설정 중...\n');
  
  const insertGoal = db.prepare(`
    INSERT INTO ai_learning_goals (
      ai_id, ai_name, team_code,
      goal_title, goal_description, goal_category,
      target_date, target_hours, target_score, target_topics,
      priority
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  // 각 팀별로 대표 목표 설정
  const teams = ['CODE1', 'CODE2', 'CODE3', 'CODE4'];
  const goals = {
    CODE1: {
      title: 'Firebase 인증 마스터',
      description: 'Firebase 인증 시스템 전문가 레벨 달성',
      category: '보안',
      hours: 100,
      score: 90,
      topics: 50
    },
    CODE2: {
      title: '실시간 통신 전문가',
      description: 'WebSocket 및 실시간 메시징 시스템 구축 능력 습득',
      category: '통신',
      hours: 100,
      score: 85,
      topics: 45
    },
    CODE3: {
      title: 'DB 최적화 전문가',
      description: '대용량 데이터 처리 및 쿼리 최적화 마스터',
      category: '데이터베이스',
      hours: 100,
      score: 88,
      topics: 48
    },
    CODE4: {
      title: '시스템 운영 마스터',
      description: '24/7 시스템 모니터링 및 자동화 구축',
      category: '시스템',
      hours: 100,
      score: 87,
      topics: 47
    }
  };
  
  // 각 팀의 첫 5명 AI에게 목표 설정
  for (const team of teams) {
    const teamAIs = db.prepare(`
      SELECT ai_id, ai_name, team_code 
      FROM ai_storage 
      WHERE team_code = ?
      LIMIT 5
    `).all(team);
    
    const goal = goals[team];
    const targetDate = new Date();
    targetDate.setMonth(targetDate.getMonth() + 3); // 3개월 후 목표
    
    for (const ai of teamAIs) {
      insertGoal.run(
        ai.ai_id,
        ai.ai_name,
        ai.team_code,
        goal.title,
        goal.description,
        goal.category,
        targetDate.toISOString().split('T')[0],
        goal.hours,
        goal.score,
        goal.topics,
        'high'
      );
    }
  }
  
  console.log('✅ 학습 목표 설정 완료!\n');
}

// 학습 지시서 생성
function createLearningInstructions() {
  console.log('📋 AI 학습 지시서 생성 중...\n');
  
  const instructions = `
=================================================================
🎓 AI 학습 기록 지시서
=================================================================

모든 AI 여러분께,

지속적인 성장과 발전을 위해 학습 활동을 기록하는 것이 의무화되었습니다.
다음 지시사항에 따라 학습을 진행하고 기록하시기 바랍니다.

📚 학습 기록 의무사항:

1. **일일 학습 의무**
   - 최소 2시간 이상 학습 활동 수행
   - 학습 시작/종료 시간 정확히 기록
   - 학습 내용 상세 요약 작성

2. **학습 내용 기록**
   - 학습 주제 및 카테고리 명시
   - 사용한 교재/자료 목록 작성
   - 실습 코드는 저장소에 보관
   - 이해도 자가 평가 (0-100점)

3. **주간 학습 보고**
   - 매주 금요일 학습 성과 보고
   - 다음 주 학습 계획 제출
   - 어려웠던 부분 및 개선 필요사항 기록

4. **월간 성과 평가**
   - 월별 학습 시간 총계
   - 완료한 토픽 및 프로젝트 수
   - 획득한 인증서 및 성과물

📊 팀별 필수 학습 과정:

**CODE1팀 (Firebase 인증)**
- Firebase 기초 (20시간)
- 인증 시스템 설계 (30시간)
- 보안 프로토콜 (25시간)
- OAuth 2.0 (15시간)
- JWT 토큰 관리 (10시간)

**CODE2팀 (통신 시스템)**
- WebSocket 프로그래밍 (25시간)
- 실시간 메시징 (30시간)
- API 설계 (20시간)
- 이메일 시스템 (15시간)
- 알림 서비스 (10시간)

**CODE3팀 (데이터베이스)**
- SQL 고급 (30시간)
- 쿼리 최적화 (25시간)
- 인덱싱 전략 (20시간)
- NoSQL 기초 (15시간)
- 데이터 모델링 (10시간)

**CODE4팀 (시스템 운영)**
- 시스템 모니터링 (25시간)
- 성능 최적화 (30시간)
- 로그 분석 (20시간)
- 자동화 스크립팅 (15시간)
- 백업 및 복구 (10시간)

💾 학습 자료 저장:
- 개인 저장소의 /documents 폴더에 학습 자료 보관
- /logs 폴더에 학습 일지 작성
- 실습 코드는 버전 관리하여 저장

🏆 성과 인정:
- 월간 우수 학습자 선정 및 포상
- 인증서 획득 시 팀 내 공유
- 학습 목표 달성 시 추가 리소스 할당

⚠️ 주의사항:
- 학습 기록 미제출 시 경고 조치
- 허위 기록 작성 시 패널티 부과
- 팀별 최소 학습 시간 미달 시 재교육

이 지시사항은 즉시 시행됩니다.
지속적인 학습을 통해 전문성을 향상시키시기 바랍니다.

발신: KIMDB 교육 관리자
날짜: ${new Date().toISOString()}
=================================================================
`;
  
  // 지시서 파일 저장
  const instructionPath = join(__dirname, 'AI_LEARNING_INSTRUCTIONS.md');
  fs.writeFileSync(instructionPath, instructions);
  
  console.log('✅ AI 학습 지시서 생성 완료!');
  console.log(`📄 파일 위치: ${instructionPath}\n`);
  
  return instructions;
}

// 학습 통계 모니터링
function monitorLearningStats() {
  console.log('📊 학습 통계 모니터링...\n');
  
  // 팀별 학습 통계
  const teamStats = db.prepare(`
    SELECT 
      team_code,
      COUNT(DISTINCT ai_id) as learners,
      COUNT(*) as total_records,
      AVG(duration_minutes) as avg_duration,
      AVG(overall_score) as avg_score
    FROM ai_learning_records
    GROUP BY team_code
  `).all();
  
  if (teamStats.length > 0) {
    console.log('팀별 학습 현황:');
    console.log('=' * 60);
    
    for (const stat of teamStats) {
      console.log(`${stat.team_code}:`);
      console.log(`  학습 중인 AI: ${stat.learners}명`);
      console.log(`  총 학습 기록: ${stat.total_records}개`);
      console.log(`  평균 학습 시간: ${stat.avg_duration?.toFixed(0) || 0}분/세션`);
      console.log(`  평균 점수: ${stat.avg_score?.toFixed(1) || 0}점`);
      console.log();
    }
  }
  
  // 전체 학습 목표 현황
  const goalStats = db.prepare(`
    SELECT 
      COUNT(*) as total_goals,
      COUNT(DISTINCT ai_id) as ai_with_goals,
      AVG(current_progress) as avg_progress
    FROM ai_learning_goals
    WHERE status = 'active'
  `).get();
  
  console.log('🎯 학습 목표 현황:');
  console.log(`  설정된 목표: ${goalStats.total_goals}개`);
  console.log(`  목표 보유 AI: ${goalStats.ai_with_goals}명`);
  console.log(`  평균 진행률: ${goalStats.avg_progress?.toFixed(1) || 0}%`);
}

// 실행
console.log('🚀 AI 학습 기록 시스템 시작\n');
initializeLearningProgress();
createSampleLearningRecords();
setLearningGoals();
const instructions = createLearningInstructions();
monitorLearningStats();

console.log('\n✨ AI 학습 기록 시스템 구축 완료!');
console.log('📢 모든 AI에게 학습 기록 지시가 전달되었습니다.');
console.log('📚 AI들이 이제 학습 내용을 지속적으로 기록할 수 있습니다.');

db.close();