/**
 * 🧪 SQLite 데이터베이스 검증 테스트
 */

import Database from 'better-sqlite3';
import { statSync } from 'fs';

const db = new Database('./kimdb_ai_data.db');

console.log('🔍 KIMDB AI Database 검증 시작...\n');

// 1. 테이블 존재 확인
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('📋 테이블 목록:');
tables.forEach(table => console.log(`  - ${table.name}`));

// 2. AI 에이전트 총 수
const totalCount = db.prepare('SELECT COUNT(*) as count FROM ai_agents').get();
console.log(`\n👥 총 AI 에이전트: ${totalCount.count}명`);

// 3. 팀별 분포
const teamStats = db.prepare('SELECT team, COUNT(*) as count FROM ai_agents GROUP BY team').all();
console.log('\n🎯 팀별 분포:');
teamStats.forEach(team => console.log(`  ${team.team}: ${team.count}명`));

// 4. 성격별 분포
const personalityStats = db.prepare('SELECT personality, COUNT(*) as count FROM ai_agents GROUP BY personality').all();
console.log('\n🎭 성격별 분포:');
personalityStats.forEach(p => console.log(`  ${p.personality}: ${p.count}명`));

// 5. React 전문가 AI 조회
const reactExperts = db.prepare(`
  SELECT id, name, team, personality, skills 
  FROM ai_agents 
  WHERE skills LIKE '%React%' 
  LIMIT 5
`).all();
console.log('\n⚛️ React 전문가 AI (5명):');
reactExperts.forEach(ai => {
  const skills = JSON.parse(ai.skills);
  console.log(`  ${ai.id} - ${ai.name} (${ai.team}/${ai.personality}): [${skills.join(', ')}]`);
});

// 6. 데이터베이스 파일 정보
const fileInfo = statSync('./kimdb_ai_data.db');
console.log(`\n💾 데이터베이스 파일:
  경로: ./kimdb_ai_data.db
  크기: ${(fileInfo.size / 1024).toFixed(2)} KB
  생성일: ${fileInfo.birthtime.toLocaleString()}`);

db.close();
console.log('\n✅ 데이터베이스 검증 완료!');