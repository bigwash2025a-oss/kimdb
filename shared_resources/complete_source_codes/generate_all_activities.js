import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, 'shared_database', 'code_team_ai.db'));

console.log('🌟 전체 AI 활동 생성 시작 (2,665명 모두)\n');

// 현재 시간 데이터 완전 삭제
console.log('1️⃣ 현재 시간 데이터 삭제 중...');
const deleteResult = db.prepare(`
  DELETE FROM communication_activity 
  WHERE hour_group = strftime('%Y-%m-%d %H', 'now')
`).run();
console.log(`   삭제된 활동: ${deleteResult.changes}개`);

// 전체 AI 목록 가져오기 (LIMIT 없음)
console.log('\n2️⃣ 전체 AI 목록 조회 중...');
const allAIs = db.prepare(`
  SELECT DISTINCT ai_id, ai_name, team_code 
  FROM ai_communication_info
  ORDER BY RANDOM()
`).all();
console.log(`   전체 AI: ${allAIs.length}명 (100% 활동 예정)`);

// 활동 생성
console.log('\n3️⃣ 전체 AI 통신 활동 생성 중...');
const activities = [
  'email_sent', 'email_received', 'sms_sent', 'sms_received',
  'call_made', 'call_received', 'sns_post', 'sns_comment', 'sns_share'
];

const channels = {
  email_sent: ['email_primary', 'email_work', 'email_team'],
  email_received: ['email_primary', 'email_backup', 'email_personal'],
  sms_sent: ['phone_main', 'phone_mobile'],
  sms_received: ['phone_main', 'phone_office'],
  call_made: ['phone_main', 'phone_office', 'phone_mobile'],
  call_received: ['phone_main', 'phone_hotline'],
  sns_post: ['sns_twitter', 'sns_linkedin', 'sns_github'],
  sns_comment: ['sns_slack', 'sns_discord'],
  sns_share: ['sns_twitter', 'sns_linkedin']
};

const insertActivity = db.prepare(`
  INSERT INTO communication_activity (
    ai_id, ai_name, activity_type, channel_used,
    activity_content, target_contact, duration_seconds
  ) VALUES (?, ?, ?, ?, ?, ?, ?)
`);

let totalActivities = 0;
const startTime = Date.now();

console.log('   진행 상황:');
for (let i = 0; i < allAIs.length; i++) {
  const ai = allAIs[i];
  
  // 각 AI마다 3-6개의 활동 생성 (더 활발하게)
  const activityCount = Math.floor(Math.random() * 4) + 3;
  
  for (let j = 0; j < activityCount; j++) {
    const activityType = activities[Math.floor(Math.random() * activities.length)];
    const possibleChannels = channels[activityType];
    const channel = possibleChannels[Math.floor(Math.random() * possibleChannels.length)];
    
    const content = `${ai.team_code} ${activityType} - 실시간 통신`;
    const target = `${ai.team_code.toLowerCase()}_target_${Math.floor(Math.random() * 1000)}@example.com`;
    const duration = Math.floor(Math.random() * 400) + 30;
    
    try {
      insertActivity.run(
        ai.ai_id,
        ai.ai_name,
        activityType,
        channel,
        content,
        target,
        duration
      );
      totalActivities++;
    } catch (error) {
      console.error(`Error for AI ${ai.ai_id}: ${error.message}`);
    }
  }
  
  // 진행 상황 표시 (200명마다)
  if ((i + 1) % 200 === 0 || i + 1 === allAIs.length) {
    const progress = Math.round((i + 1) / allAIs.length * 100);
    console.log(`   ${i + 1}/${allAIs.length} AI 완료 (${progress}%) - ${totalActivities}개 활동 생성`);
  }
}

const endTime = Date.now();
const processingTime = endTime - startTime;

// 최종 결과 확인
console.log('\n4️⃣ 최종 결과:');
const final = db.prepare(`
  SELECT 
    COUNT(*) as total_activities,
    COUNT(DISTINCT ai_id) as active_ais,
    SUM(CASE WHEN activity_type LIKE '%email%' THEN 1 ELSE 0 END) as email_activities,
    SUM(CASE WHEN activity_type LIKE '%sms%' THEN 1 ELSE 0 END) as sms_activities,
    SUM(CASE WHEN activity_type LIKE '%call%' THEN 1 ELSE 0 END) as call_activities,
    SUM(CASE WHEN activity_type LIKE '%sns%' THEN 1 ELSE 0 END) as sns_activities
  FROM communication_activity 
  WHERE hour_group = strftime('%Y-%m-%d %H', 'now')
`).get();

console.log(`   총 활동: ${final.total_activities}개`);
console.log(`   활성 AI: ${final.active_ais}명`);
console.log(`   📧 이메일: ${final.email_activities}개`);
console.log(`   📱 SMS: ${final.sms_activities}개`);
console.log(`   📞 전화: ${final.call_activities}개`);
console.log(`   📱 SNS: ${final.sns_activities}개`);
console.log(`   ⏱️ 처리 시간: ${processingTime}ms`);

// 팀별 활동 통계
console.log('\n5️⃣ 팀별 활동 통계:');
const teamStats = db.prepare(`
  SELECT 
    SUBSTR(ai_name, -5, 5) as team,
    COUNT(*) as activities,
    COUNT(DISTINCT ai_id) as active_ais
  FROM communication_activity 
  WHERE hour_group = strftime('%Y-%m-%d %H', 'now')
  AND ai_name LIKE '%CODE%'
  GROUP BY team
  ORDER BY team
`).all();

for (const stat of teamStats) {
  console.log(`   ${stat.team}: ${stat.active_ais}명 활동, ${stat.activities}개 통신`);
}

console.log('\n✅ 전체 AI 활동 생성 완료!');
console.log(`🎯 전체 2,665명 중 ${final.active_ais}명이 활동 중 (${Math.round(final.active_ais/2665*100)}%)`);

db.close();