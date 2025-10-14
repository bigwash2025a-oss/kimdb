import Database from 'better-sqlite3';

const db = new Database('code_team_ai.db');

console.log('📋 데이터베이스 테이블 확인:');
try {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('사용 가능한 테이블들:', tables.map(t => t.name));
  
  // AI 관련 테이블 확인
  if (tables.some(t => t.name === 'code_team_ais')) {
    console.log('\n📊 code_team_ais 테이블 구조:');
    const schema = db.prepare("PRAGMA table_info(code_team_ais)").all();
    console.log(schema);
    
    console.log('\n👥 샘플 AI 데이터:');
    const sampleAIs = db.prepare('SELECT * FROM code_team_ais LIMIT 3').all();
    console.log(sampleAIs);
  }
} catch (error) {
  console.error('❌ 데이터베이스 에러:', error.message);
}

db.close();