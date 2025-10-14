/**
 * ⏰ 1시간마다 통신 데이터 자동 리셋 시스템
 * 전화, SNS, 메일 데이터베이스를 정기적으로 초기화
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import cron from 'node-cron';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 데이터베이스 연결
const db = new Database(join(__dirname, 'shared_database', 'code_team_ai.db'));

// 리셋 로그 테이블 생성
db.exec(`
  CREATE TABLE IF NOT EXISTS reset_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reset_type TEXT NOT NULL, -- hourly/manual/emergency
    reset_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- 리셋 대상
    emails_reset INTEGER DEFAULT 0,
    sms_reset INTEGER DEFAULT 0, 
    calls_reset INTEGER DEFAULT 0,
    sns_reset INTEGER DEFAULT 0,
    
    -- 통계
    affected_ais INTEGER DEFAULT 0,
    reset_duration_ms INTEGER DEFAULT 0,
    
    -- 상태
    status TEXT DEFAULT 'completed', -- completed/failed/partial
    error_message TEXT,
    
    -- 리셋 후 통계
    new_emails_generated INTEGER DEFAULT 0,
    new_sms_generated INTEGER DEFAULT 0,
    new_calls_generated INTEGER DEFAULT 0,
    new_sns_generated INTEGER DEFAULT 0
  );
  
  CREATE INDEX IF NOT EXISTS idx_reset_logs_timestamp ON reset_logs(reset_timestamp);
  CREATE INDEX IF NOT EXISTS idx_reset_logs_type ON reset_logs(reset_type);
  
  -- 실시간 통신 활동 테이블
  CREATE TABLE IF NOT EXISTS communication_activity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ai_id INTEGER NOT NULL,
    ai_name TEXT NOT NULL,
    
    -- 활동 정보
    activity_type TEXT NOT NULL, -- email_sent/email_received/sms_sent/call_made/sns_post
    channel_used TEXT NOT NULL, -- email_primary/phone_main/sns_twitter 등
    
    -- 내용 (필요시 암호화)
    activity_content TEXT,
    target_contact TEXT,
    
    -- 메타데이터
    activity_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    duration_seconds INTEGER,
    status TEXT DEFAULT 'success', -- success/failed/pending
    
    -- 시간별 그룹핑용
    hour_group TEXT DEFAULT (strftime('%Y-%m-%d %H', 'now'))
  );
  
  CREATE INDEX IF NOT EXISTS idx_activity_ai ON communication_activity(ai_id);
  CREATE INDEX IF NOT EXISTS idx_activity_hour ON communication_activity(hour_group);
  CREATE INDEX IF NOT EXISTS idx_activity_type ON communication_activity(activity_type);
`);

// 팀별 통신 정보
const TEAM_INFO = {
  CODE1: { domain: 'firebase-auth', portStart: 41001 },
  CODE2: { domain: 'comm-system', portStart: 42001 },
  CODE3: { domain: 'kimdb-data', portStart: 43001 },
  CODE4: { domain: 'sys-monitor', portStart: 44001 }
};

// 랜덤 통신 활동 생성기
function generateRandomActivity(ai) {
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
  
  const activityType = activities[Math.floor(Math.random() * activities.length)];
  const availableChannels = channels[activityType] || ['email_primary'];
  const channel = availableChannels[Math.floor(Math.random() * availableChannels.length)];
  
  const contents = {
    email_sent: '업무 이메일 발송 - 프로젝트 진행 상황 보고',
    email_received: '시스템 알림 수신 - 새로운 업데이트 안내',
    sms_sent: '긴급 알림 전송 - 시스템 점검 완료',
    sms_received: '확인 메시지 수신 - 작업 승인 완료',
    call_made: '팀 회의 참여 - 주간 진행 상황 논의',
    call_received: '기술 지원 요청 처리',
    sns_post: '학습 성과 공유 - 새로운 기술 습득',
    sns_comment: '동료 게시물에 피드백 제공',
    sns_share: '유용한 기술 문서 공유'
  };
  
  return {
    activityType,
    channel,
    content: contents[activityType] || '일반 통신 활동',
    duration: Math.floor(Math.random() * 300) + 30, // 30초-5분
    target: generateRandomTarget(ai, activityType)
  };
}

// 랜덤 타겟 생성
function generateRandomTarget(ai, activityType) {
  const teamInfo = TEAM_INFO[ai.team_code];
  
  if (activityType.includes('email')) {
    return `colleague@${teamInfo.domain}.ai`;
  } else if (activityType.includes('sms') || activityType.includes('call')) {
    return `010-${Math.floor(Math.random() * 9000) + 1000}-${Math.floor(Math.random() * 9000) + 1000}`;
  } else if (activityType.includes('sns')) {
    return `@colleague_${Math.floor(Math.random() * 1000)}`;
  }
  
  return 'unknown';
}

// 통신 활동 데이터 생성
function generateCommunicationActivities() {
  console.log('📱 통신 활동 데이터 생성 중...');
  
  // CODE 팀 AI들 가져오기
  const codeTeamAIs = db.prepare(`
    SELECT DISTINCT ai_id, ai_name, team_code 
    FROM ai_communication_info
    ORDER BY RANDOM()
  `).all();

  // 메인 DB에서 나머지 AI들도 가져오기
  const mainDb = new Database(join(__dirname, 'ai_deployment.db'));
  const allMainAIs = mainDb.prepare(`
    SELECT id as ai_id, ai_name, ai_type as team_code
    FROM real_ai_deployment
    WHERE id NOT IN (SELECT ai_id FROM (${codeTeamAIs.map(() => '?').join(',')}) AS code_ids)
    ORDER BY RANDOM()
  `).all(...codeTeamAIs.map(ai => ai.ai_id));
  mainDb.close();

  const allAIs = [...codeTeamAIs, ...allMainAIs]; // 전체 5,037명 AI 모두 활동
  
  const insertActivity = db.prepare(`
    INSERT INTO communication_activity (
      ai_id, ai_name, activity_type, channel_used,
      activity_content, target_contact, duration_seconds
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  let activitiesGenerated = 0;
  
  for (const ai of allAIs) {
    // 각 AI마다 1-3개의 활동 생성
    const activityCount = Math.floor(Math.random() * 3) + 1;
    
    for (let i = 0; i < activityCount; i++) {
      const activity = generateRandomActivity(ai);
      
      try {
        insertActivity.run(
          ai.ai_id,
          ai.ai_name,
          activity.activityType,
          activity.channel,
          activity.content,
          activity.target,
          activity.duration
        );
        
        activitiesGenerated++;
      } catch (error) {
        console.error(`❌ ${ai.ai_name} 활동 생성 실패:`, error.message);
      }
    }
  }
  
  console.log(`✅ ${activitiesGenerated}개 통신 활동 생성 완료`);
  return activitiesGenerated;
}

// 이전 시간 데이터 삭제
function clearPreviousHourData() {
  console.log('🗑️ 이전 시간 데이터 삭제 중...');
  
  const startTime = Date.now();
  
  // 현재 시간 데이터 삭제 (완전 리셋)
  const deleteQuery = db.prepare(`
    DELETE FROM communication_activity 
    WHERE hour_group = strftime('%Y-%m-%d %H', 'now')
  `);
  
  const deletedRows = deleteQuery.run();
  
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  console.log(`✅ ${deletedRows.changes}개 이전 시간 활동 데이터 삭제 완료 (${duration}ms)`);
  
  return {
    deletedRows: deletedRows.changes,
    duration
  };
}

// 통신 데이터 통계 업데이트
function updateCommunicationStats() {
  console.log('📊 통신 통계 업데이트 중...');
  
  // 현재 시간 그룹의 통계
  const currentHourStats = db.prepare(`
    SELECT 
      activity_type,
      COUNT(*) as count,
      AVG(duration_seconds) as avg_duration
    FROM communication_activity
    WHERE hour_group = strftime('%Y-%m-%d %H', 'now')
    GROUP BY activity_type
  `).all();
  
  console.log('현재 시간 활동 통계:');
  currentHourStats.forEach(stat => {
    console.log(`  ${stat.activity_type}: ${stat.count}건 (평균 ${stat.avg_duration?.toFixed(1)}초)`);
  });
  
  // AI별 활동량 상위 10명
  const topActiveAIs = db.prepare(`
    SELECT 
      ai_name,
      COUNT(*) as activity_count,
      COUNT(DISTINCT activity_type) as activity_types
    FROM communication_activity
    WHERE hour_group = strftime('%Y-%m-%d %H', 'now')
    GROUP BY ai_id, ai_name
    ORDER BY activity_count DESC
    LIMIT 10
  `).all();
  
  if (topActiveAIs.length > 0) {
    console.log('\n🏆 시간당 최고 활동 AI:');
    topActiveAIs.forEach((ai, index) => {
      console.log(`  ${index + 1}. ${ai.ai_name}: ${ai.activity_count}건 활동`);
    });
  }
}

// 1시간마다 리셋 실행
function performHourlyReset() {
  console.log('\n' + '='.repeat(60));
  console.log('⏰ 시간당 통신 데이터 리셋 시작');
  console.log('시간:', new Date().toISOString());
  console.log('='.repeat(60));
  
  const resetStartTime = Date.now();
  
  try {
    // 1. 이전 시간 데이터 삭제
    const deleteResult = clearPreviousHourData();
    
    // 2. 새로운 통신 활동 생성
    const newActivities = generateCommunicationActivities();
    
    // 3. 통계 업데이트
    updateCommunicationStats();
    
    const resetEndTime = Date.now();
    const totalDuration = resetEndTime - resetStartTime;
    
    // 4. 리셋 로그 기록
    const logReset = db.prepare(`
      INSERT INTO reset_logs (
        reset_type, affected_ais, reset_duration_ms,
        emails_reset, sms_reset, calls_reset, sns_reset,
        new_emails_generated, new_sms_generated, new_calls_generated, new_sns_generated,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    // 활동 타입별 통계 계산
    const typeStats = db.prepare(`
      SELECT 
        SUM(CASE WHEN activity_type LIKE '%email%' THEN 1 ELSE 0 END) as emails,
        SUM(CASE WHEN activity_type LIKE '%sms%' THEN 1 ELSE 0 END) as sms,
        SUM(CASE WHEN activity_type LIKE '%call%' THEN 1 ELSE 0 END) as calls,
        SUM(CASE WHEN activity_type LIKE '%sns%' THEN 1 ELSE 0 END) as sns,
        COUNT(DISTINCT ai_id) as unique_ais
      FROM communication_activity
      WHERE hour_group = strftime('%Y-%m-%d %H', 'now')
    `).get();
    
    logReset.run(
      'hourly',
      typeStats.unique_ais || 0,
      totalDuration,
      deleteResult.deletedRows,
      deleteResult.deletedRows,
      deleteResult.deletedRows,
      deleteResult.deletedRows,
      typeStats.emails || 0,
      typeStats.sms || 0,
      typeStats.calls || 0,
      typeStats.sns || 0,
      'completed'
    );
    
    console.log('\n✅ 시간당 리셋 완료!');
    console.log(`📊 처리 시간: ${totalDuration}ms`);
    console.log(`🔄 삭제된 이전 데이터: ${deleteResult.deletedRows}개`);
    console.log(`📱 생성된 새 활동: ${newActivities}개`);
    console.log(`👥 활동 AI 수: ${typeStats.unique_ais}명`);
    
    // AI들에게 리셋 알림 전송
    sendResetNotification(typeStats, totalDuration);
    
  } catch (error) {
    console.error('❌ 시간당 리셋 실패:', error.message);
    
    // 실패 로그 기록
    const logError = db.prepare(`
      INSERT INTO reset_logs (
        reset_type, reset_duration_ms, status, error_message
      ) VALUES (?, ?, ?, ?)
    `);
    
    const resetEndTime = Date.now();
    const totalDuration = resetEndTime - resetStartTime;
    
    logError.run('hourly', totalDuration, 'failed', error.message);
  }
  
  console.log('='.repeat(60) + '\n');
}

// 리셋 알림 전송
function sendResetNotification(stats, duration) {
  console.log('📢 리셋 완료 알림 전송...');
  
  const insertNotification = db.prepare(`
    INSERT INTO system_notifications (
      ai_id, ai_name, team_code,
      notification_type, title, message, priority,
      delivery_method, expires_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  // 대표 AI들에게만 알림 (각 팀당 1명씩)
  const teamLeaders = db.prepare(`
    SELECT ai_id, ai_name, team_code
    FROM ai_communication_info
    WHERE ai_id IN (
      SELECT MIN(ai_id) FROM ai_communication_info GROUP BY team_code
    )
  `).all();
  
  const currentTime = new Date();
  const expiresAt = new Date(currentTime.getTime() + 2 * 60 * 60 * 1000); // 2시간 후 만료
  
  const message = `
🔄 시간당 통신 데이터 리셋 완료

📊 리셋 통계:
- 처리 시간: ${duration}ms
- 활동 AI: ${stats.unique_ais}명
- 이메일 활동: ${stats.emails}건
- SMS 활동: ${stats.sms}건  
- 통화 활동: ${stats.calls}건
- SNS 활동: ${stats.sns}건

🕐 다음 리셋: ${new Date(currentTime.getTime() + 60 * 60 * 1000).toLocaleString()}

시스템이 정상적으로 초기화되었습니다.
`;

  for (const leader of teamLeaders) {
    try {
      insertNotification.run(
        leader.ai_id,
        leader.ai_name,
        leader.team_code,
        'system_reset',
        '🔄 시간당 통신 데이터 리셋 완료',
        message,
        'normal',
        'system',
        expiresAt.toISOString()
      );
    } catch (error) {
      console.error(`❌ ${leader.ai_name} 알림 전송 실패:`, error.message);
    }
  }
  
  console.log(`✅ ${teamLeaders.length}명 팀 리더에게 리셋 알림 전송 완료`);
}

// 리셋 상태 모니터링
function monitorResetStatus() {
  const recentResets = db.prepare(`
    SELECT 
      reset_type,
      reset_timestamp,
      affected_ais,
      reset_duration_ms,
      status
    FROM reset_logs
    ORDER BY reset_timestamp DESC
    LIMIT 10
  `).all();
  
  console.log('📋 최근 리셋 기록:');
  recentResets.forEach((reset, index) => {
    const time = new Date(reset.reset_timestamp).toLocaleString();
    const status = reset.status === 'completed' ? '✅' : '❌';
    console.log(`  ${index + 1}. ${status} ${reset.reset_type} - ${time} (${reset.reset_duration_ms}ms, ${reset.affected_ais}명)`);
  });
}

// 수동 리셋 기능
function performManualReset() {
  console.log('🔧 수동 리셋 실행...');
  performHourlyReset();
}

// 시작 시 초기 데이터 생성
function initializeSystem() {
  console.log('🚀 시간당 리셋 시스템 초기화...');
  
  // 초기 통신 활동 데이터 생성
  generateCommunicationActivities();
  updateCommunicationStats();
  
  console.log('✅ 시스템 초기화 완료');
  console.log('⏰ 다음 자동 리셋: 매시 정각');
  console.log('📱 실시간 모니터링 활성화');
}

// 스케줄러 설정 (매시 정각에 실행)
console.log('⏰ 1시간마다 통신 데이터 자동 리셋 시스템 시작');
console.log('📅 스케줄: 매시 정각 (예: 01:00, 02:00, 03:00...)');

// 매시 정각에 실행
cron.schedule('0 * * * *', () => {
  performHourlyReset();
}, {
  timezone: "Asia/Seoul"
});

// 5분마다 상태 모니터링
cron.schedule('*/5 * * * *', () => {
  console.log(`📊 [${new Date().toLocaleString()}] 시스템 상태 체크`);
  monitorResetStatus();
}, {
  timezone: "Asia/Seoul"
});

// 초기화 실행
initializeSystem();

// 첫 리셋 즉시 실행 (테스트용)
console.log('\n🧪 테스트용 첫 리셋 실행 중...');
setTimeout(() => {
  performHourlyReset();
}, 5000);

console.log('\n✨ 시간당 리셋 시스템이 활성화되었습니다!');
console.log('🔧 수동 리셋이 필요한 경우: performManualReset() 함수 호출');

// 프로세스 종료 시 정리
process.on('SIGINT', () => {
  console.log('\n🛑 시간당 리셋 시스템 종료 중...');
  db.close();
  process.exit(0);
});

// 수동 리셋을 위한 글로벌 함수 등록
global.performManualReset = performManualReset;
global.monitorResetStatus = monitorResetStatus;