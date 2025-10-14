import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🌟 전체 5,037명 AI 활동 생성 시작\n');

// CODE 팀 DB 연결
const codeDb = new Database(join(__dirname, 'shared_database', 'code_team_ai.db'));

// 메인 배치 DB 연결
const mainDb = new Database(join(__dirname, 'ai_deployment.db'));

// 현재 시간 데이터 완전 삭제
console.log('1️⃣ 현재 시간 데이터 삭제 중...');
const deleteResult = codeDb.prepare(`
  DELETE FROM communication_activity 
  WHERE hour_group = strftime('%Y-%m-%d %H', 'now')
`).run();
console.log(`   삭제된 활동: ${deleteResult.changes}개`);

// CODE 팀 AI들 (2,665명)
console.log('\n2️⃣ CODE 팀 AI 조회 중...');
const codeTeamAIs = codeDb.prepare(`
  SELECT DISTINCT ai_id, ai_name, team_code 
  FROM ai_communication_info
`).all();
console.log(`   CODE 팀 AI: ${codeTeamAIs.length}명`);

// 전체 배치 AI들 (5,037명)
console.log('\n3️⃣ 전체 AI 조회 중...');
const allDeployedAIs = mainDb.prepare(`
  SELECT id as ai_id, ai_name, ai_type as team_code
  FROM real_ai_deployment
`).all();
console.log(`   전체 배치 AI: ${allDeployedAIs.length}명`);

// 전체 AI 목록 생성 (중복 제거)
const allAIs = [];
const aiIdSet = new Set();

// CODE 팀 AI 추가
for (const ai of codeTeamAIs) {
  allAIs.push(ai);
  aiIdSet.add(ai.ai_id);
}

// 나머지 AI 추가 (중복 제거)
for (const ai of allDeployedAIs) {
  if (!aiIdSet.has(ai.ai_id)) {
    allAIs.push({
      ai_id: ai.ai_id,
      ai_name: ai.ai_name,
      team_code: ai.team_code || 'OTHER'
    });
    aiIdSet.add(ai.ai_id);
  }
}

console.log(`\n4️⃣ 최종 AI 목록: ${allAIs.length}명 (100% 활동 예정)`);

// 활동 생성
console.log('\n5️⃣ 전체 AI 통신 활동 생성 중...');
const activities = [
  'email_sent', 'email_received', 'sms_sent', 'sms_received',
  'call_made', 'call_received', 'sns_post', 'sns_comment', 'sns_share'
];

const channels = [
  'email_primary', 'email_work', 'email_team', 
  'phone_main', 'phone_mobile', 'phone_office',
  'sns_twitter', 'sns_linkedin', 'sns_github', 'sns_slack'
];

const insertActivity = codeDb.prepare(`
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
  
  // 각 AI마다 3-6개의 활동 생성
  const activityCount = Math.floor(Math.random() * 4) + 3;
  
  for (let j = 0; j < activityCount; j++) {
    const activityType = activities[Math.floor(Math.random() * activities.length)];
    const channel = channels[Math.floor(Math.random() * channels.length)];
    
    const content = `${ai.team_code} ${activityType} - 전체 AI 실시간 통신`;
    const target = `target_${Math.floor(Math.random() * 10000)}@${ai.team_code?.toLowerCase() || 'system'}.com`;
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
  
  // 진행 상황 표시 (500명마다)
  if ((i + 1) % 500 === 0 || i + 1 === allAIs.length) {
    const progress = Math.round((i + 1) / allAIs.length * 100);
    console.log(`   ${i + 1}/${allAIs.length} AI 완료 (${progress}%) - ${totalActivities}개 활동 생성`);
  }
}

const endTime = Date.now();
const processingTime = endTime - startTime;

// 최종 결과 확인
console.log('\n6️⃣ 최종 결과:');
const final = codeDb.prepare(`
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

console.log('\n✅ 전체 5,037명 AI 활동 생성 완료!');
console.log(`🎯 전체 5,037명 중 ${final.active_ais}명이 활동 중 (${Math.round(final.active_ais/5037*100)}%)`);

// DB 연결 종료
codeDb.close();
mainDb.close();