import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, 'shared_database', 'code_team_ai.db'));

console.log('🧪 수동 리셋 테스트 시작\n');

// 현재 데이터 확인
console.log('1️⃣ 삭제 전 현재 데이터:');
const beforeDelete = db.prepare(`
  SELECT COUNT(*) as count FROM communication_activity 
  WHERE hour_group = strftime('%Y-%m-%d %H', 'now')
`).get();
console.log(`   현재 시간 활동: ${beforeDelete.count}개`);

// 현재 시간 데이터 삭제
console.log('\n2️⃣ 현재 시간 데이터 삭제 중...');
const deleteResult = db.prepare(`
  DELETE FROM communication_activity 
  WHERE hour_group = strftime('%Y-%m-%d %H', 'now')
`).run();
console.log(`   삭제된 활동: ${deleteResult.changes}개`);

// 삭제 후 확인
console.log('\n3️⃣ 삭제 후 데이터:');
const afterDelete = db.prepare(`
  SELECT COUNT(*) as count FROM communication_activity 
  WHERE hour_group = strftime('%Y-%m-%d %H', 'now')
`).get();
console.log(`   현재 시간 활동: ${afterDelete.count}개`);

// 새 데이터 생성 (간단히 100개만)
console.log('\n4️⃣ 새 데이터 생성 중...');
const allAIs = db.prepare(`
  SELECT DISTINCT ai_id, ai_name, team_code 
  FROM ai_communication_info
  ORDER BY RANDOM()
  LIMIT 100
`).all();

const activities = ['email_sent', 'sms_sent', 'call_made', 'sns_post'];
const channels = ['email_primary', 'phone_main', 'sns_twitter', 'port_main'];

const insertActivity = db.prepare(`
  INSERT INTO communication_activity (
    ai_id, ai_name, activity_type, channel_used,
    activity_content, target_contact, duration_seconds
  ) VALUES (?, ?, ?, ?, ?, ?, ?)
`);

let generated = 0;
for (const ai of allAIs) {
  const activityType = activities[Math.floor(Math.random() * activities.length)];
  const channel = channels[Math.floor(Math.random() * channels.length)];
  
  try {
    insertActivity.run(
      ai.ai_id,
      ai.ai_name,
      activityType,
      channel,
      `Test ${activityType}`,
      'test@example.com',
      Math.floor(Math.random() * 300) + 60
    );
    generated++;
  } catch (error) {
    console.error(`Error: ${error.message}`);
  }
}

console.log(`   생성된 새 활동: ${generated}개`);

// 최종 확인
console.log('\n5️⃣ 최종 결과:');
const final = db.prepare(`
  SELECT 
    COUNT(*) as total_activities,
    COUNT(DISTINCT ai_id) as active_ais
  FROM communication_activity 
  WHERE hour_group = strftime('%Y-%m-%d %H', 'now')
`).get();
console.log(`   현재 시간 활동: ${final.total_activities}개`);
console.log(`   활성 AI: ${final.active_ais}명`);

console.log('\n✅ 수동 리셋 테스트 완료!');
db.close();