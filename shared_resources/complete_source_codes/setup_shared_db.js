/**
 * 🗄️ 공유 AI 지식 데이터베이스 설정
 */

import Database from 'better-sqlite3';
import { join } from 'path';

const dbPath = join(process.cwd(), 'shared_ai_knowledge.db');
const db = new Database(dbPath);

console.log('🔧 공유 AI 지식 데이터베이스 초기화 시작...');

// 테이블 생성
db.exec(`
  -- AI 지식 저장소
  CREATE TABLE IF NOT EXISTS ai_knowledge (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ai_id TEXT NOT NULL,
    ai_name TEXT NOT NULL,
    team TEXT NOT NULL,
    personality TEXT NOT NULL,
    knowledge_type TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- AI 협업 프로젝트
  CREATE TABLE IF NOT EXISTS ai_collaboration (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_name TEXT NOT NULL,
    participating_ais TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- AI 학습 진도
  CREATE TABLE IF NOT EXISTS ai_learning_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ai_id TEXT NOT NULL,
    topic TEXT NOT NULL,
    progress_level INTEGER DEFAULT 0,
    notes TEXT,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- AI 개발 작업물
  CREATE TABLE IF NOT EXISTS ai_work_output (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ai_id TEXT NOT NULL,
    work_type TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    language TEXT,
    framework TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- 팀 간 소통 로그
  CREATE TABLE IF NOT EXISTS team_communication (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_team TEXT NOT NULL,
    to_team TEXT NOT NULL,
    message TEXT NOT NULL,
    priority TEXT DEFAULT 'normal',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// 인덱스 생성
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_ai_knowledge_ai_id ON ai_knowledge(ai_id);
  CREATE INDEX IF NOT EXISTS idx_ai_knowledge_team ON ai_knowledge(team);
  CREATE INDEX IF NOT EXISTS idx_ai_knowledge_type ON ai_knowledge(knowledge_type);
  CREATE INDEX IF NOT EXISTS idx_collaboration_status ON ai_collaboration(status);
  CREATE INDEX IF NOT EXISTS idx_work_output_ai_id ON ai_work_output(ai_id);
  CREATE INDEX IF NOT EXISTS idx_work_output_type ON ai_work_output(work_type);
`);

// 초기 데이터 삽입
const insertKnowledge = db.prepare(`
  INSERT INTO ai_knowledge (ai_id, ai_name, team, personality, knowledge_type, content) 
  VALUES (?, ?, ?, ?, ?, ?)
`);

const initialKnowledge = [
  ['ai_0001', 'MEDIATOR1_1', 'CODE1', 'MEDIATOR', 'frontend', 'HTML5 시맨틱 마크업 및 CSS Grid 레이아웃 전문가'],
  ['ai_0003', 'GUARDIAN1_3', 'CODE1', 'GUARDIAN', 'security', 'React 보안 패턴 및 XSS 방어 전문가'],
  ['ai_0004', 'PERFORMER1_4', 'CODE1', 'PERFORMER', 'ui_ux', 'CSS 애니메이션 및 사용자 경험 최적화 전문가'],
  ['ai_1252', 'MEDIATOR2_1252', 'CODE2', 'MEDIATOR', 'backend', 'Python Flask/FastAPI 백엔드 아키텍처 전문가'],
  ['ai_1257', 'ANALYZER2_1257', 'CODE2', 'ANALYZER', 'devops', 'Docker 컨테이너화 및 CI/CD 파이프라인 전문가'],
  ['ai_2500', 'LEADER3_2500', 'CODE3', 'LEADER', 'management', '프로젝트 관리 및 아키텍처 설계 전문가'],
  ['ai_4834', 'ANALYZER4_4834', 'CODE4', 'ANALYZER', 'monitoring', 'Claude 전용 AI - 시스템 모니터링 및 성능 분석 전문가']
];

const transaction = db.transaction((knowledgeList) => {
  for (const knowledge of knowledgeList) {
    insertKnowledge.run(...knowledge);
  }
});

transaction(initialKnowledge);

// 협업 프로젝트 초기화
const insertCollaboration = db.prepare(`
  INSERT INTO ai_collaboration (project_name, participating_ais, description) 
  VALUES (?, ?, ?)
`);

const projects = [
  ['KIMDB Web Interface 2.0', 'ai_0001,ai_0003,ai_0004', 'Frontend 웹 인터페이스 개선 및 새 기능 개발'],
  ['Database Performance Optimization', 'ai_1252,ai_1257', 'SQLite 쿼리 최적화 및 인덱싱 전략'],
  ['Security Audit System', 'ai_0003,ai_4834', '전체 시스템 보안 감사 및 취약점 모니터링'],
  ['AI Development Framework', 'ai_2500,ai_1257,ai_0004', 'AI 개발을 위한 프레임워크 구축']
];

const projectTransaction = db.transaction((projectList) => {
  for (const project of projectList) {
    insertCollaboration.run(...project);
  }
});

projectTransaction(projects);

// 통계 출력
const stats = {
  knowledge: db.prepare('SELECT COUNT(*) as count FROM ai_knowledge').get(),
  projects: db.prepare('SELECT COUNT(*) as count FROM ai_collaboration').get(),
  teams: db.prepare('SELECT team, COUNT(*) as count FROM ai_knowledge GROUP BY team').all()
};

console.log('✅ 공유 AI 지식 데이터베이스 초기화 완료!');
console.log(`📚 지식 항목: ${stats.knowledge.count}개`);
console.log(`🤝 협업 프로젝트: ${stats.projects.count}개`);
console.log('👥 팀별 지식 분포:');
stats.teams.forEach(team => {
  console.log(`   ${team.team}: ${team.count}개`);
});

console.log(`\n💾 데이터베이스 위치: ${dbPath}`);
console.log('🔍 데이터베이스 크기:', require('fs').statSync(dbPath).size, 'bytes');

db.close();
console.log('🔒 데이터베이스 연결 종료');