import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 ai_agents 테이블 구조 확인\n');

const mainDb = new Database(join(__dirname, 'kimdb_ai_data.db'));

// 테이블 구조 확인
console.log('1️⃣ ai_agents 테이블 구조:');
const schema = mainDb.prepare("PRAGMA table_info(ai_agents)").all();
for (const column of schema) {
  console.log(`   - ${column.name}: ${column.type}`);
}

// 샘플 데이터 확인
console.log('\n2️⃣ 샘플 데이터 (처음 5개):');
const samples = mainDb.prepare("SELECT * FROM ai_agents LIMIT 5").all();
for (const sample of samples) {
  console.log(`   ID: ${sample.id}, Name: ${sample.name || 'NULL'}, Type: ${sample.ai_type || 'NULL'}`);
}

// 총 개수 확인
const count = mainDb.prepare("SELECT COUNT(*) as total FROM ai_agents").get();
console.log(`\n3️⃣ 총 AI 수: ${count.total}명`);

mainDb.close();