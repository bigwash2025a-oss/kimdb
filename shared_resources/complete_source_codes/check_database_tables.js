import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 데이터베이스 테이블 확인\n');

// ai_deployment.db 확인
console.log('1️⃣ ai_deployment.db 테이블 목록:');
try {
  const deployDb = new Database(join(__dirname, 'ai_deployment.db'));
  const tables = deployDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  for (const table of tables) {
    console.log(`   - ${table.name}`);
    
    // 각 테이블의 레코드 수 확인
    const count = deployDb.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
    console.log(`     레코드 수: ${count.count}개`);
  }
  deployDb.close();
} catch (error) {
  console.error('ai_deployment.db 오류:', error.message);
}

console.log('\n2️⃣ kimdb_ai_data.db 확인:');
try {
  const kimDb = new Database(join(__dirname, 'kimdb_ai_data.db'));
  const tables2 = kimDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  for (const table of tables2) {
    console.log(`   - ${table.name}`);
    
    // 각 테이블의 레코드 수 확인
    const count = kimDb.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
    console.log(`     레코드 수: ${count.count}개`);
  }
  kimDb.close();
} catch (error) {
  console.error('kimdb_ai_data.db 오류:', error.message);
}

console.log('\n3️⃣ CODE 팀 DB 확인:');
try {
  const codeDb = new Database(join(__dirname, 'shared_database', 'code_team_ai.db'));
  const tables3 = codeDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  for (const table of tables3) {
    console.log(`   - ${table.name}`);
    
    if (table.name === 'ai_communication_info') {
      const count = codeDb.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
      console.log(`     레코드 수: ${count.count}개`);
    }
  }
  codeDb.close();
} catch (error) {
  console.error('CODE 팀 DB 오류:', error.message);
}