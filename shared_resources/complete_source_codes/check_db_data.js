import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, 'shared_database', 'code_team_ai.db'));

console.log('🔍 현재 DB 상태 확인\n');

// 현재 시간 활동 체크
const currentHourActivity = db.prepare(`
  SELECT 
    COUNT(*) as total_activities,
    COUNT(DISTINCT ai_id) as active_ais,
    hour_group
  FROM communication_activity 
  WHERE hour_group = strftime('%Y-%m-%d %H', 'now')
`).get();

console.log('현재 시간 활동:', currentHourActivity);

// 전체 활동 체크 
const allActivities = db.prepare(`
  SELECT COUNT(*) as total FROM communication_activity
`).get();

console.log('전체 활동:', allActivities);

// 최근 10개 활동 체크
const recent = db.prepare(`
  SELECT ai_id, activity_type, hour_group, created_at 
  FROM communication_activity 
  ORDER BY created_at DESC 
  LIMIT 10
`).all();

console.log('\n최근 10개 활동:');
recent.forEach((r, i) => {
  console.log(`${i+1}. ${r.ai_id} - ${r.activity_type} (${r.hour_group})`);
});

db.close();