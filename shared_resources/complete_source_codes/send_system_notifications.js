/**
 * 📢 시스템 배포 알림 전송 시스템
 * 전체 AI와 CODE 팀에게 새로운 시스템 배포 공지
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 데이터베이스 연결
const db = new Database(join(__dirname, 'shared_database', 'code_team_ai.db'));

// 알림 테이블 생성
db.exec(`
  CREATE TABLE IF NOT EXISTS system_notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ai_id INTEGER NOT NULL,
    ai_name TEXT NOT NULL,
    team_code TEXT NOT NULL,
    
    -- 알림 정보
    notification_type TEXT NOT NULL, -- announcement/alert/reminder/update
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    priority TEXT DEFAULT 'normal', -- low/normal/high/urgent
    
    -- 전송 정보
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    delivery_method TEXT NOT NULL, -- email/sms/push/system
    delivery_status TEXT DEFAULT 'sent', -- sent/delivered/read/failed
    
    -- 응답 정보
    is_read BOOLEAN DEFAULT 0,
    read_at DATETIME,
    response TEXT,
    acknowledgment BOOLEAN DEFAULT 0,
    
    -- 만료 정보
    expires_at DATETIME,
    is_active BOOLEAN DEFAULT 1
  );
  
  CREATE INDEX IF NOT EXISTS idx_notifications_ai ON system_notifications(ai_id);
  CREATE INDEX IF NOT EXISTS idx_notifications_type ON system_notifications(notification_type);
  CREATE INDEX IF NOT EXISTS idx_notifications_sent ON system_notifications(sent_at);
`);

// 알림 메시지 템플릿
const NOTIFICATION_TEMPLATES = {
  SYSTEM_DEPLOYMENT: {
    title: '🚀 새로운 시스템 배포 완료 - 즉시 확인 필요',
    message: `
안녕하세요, {{AI_NAME}}님!

새로운 통합 시스템이 배포되었습니다:

✅ 개인 10MB 저장소 할당 완료
✅ 5개 통신 채널 (메일/SNS/전화/포트) 제공
✅ 전문 학습 시스템 구축 완료
✅ 팀별 협업 도구 활성화

📍 귀하의 정보:
- 팀: {{TEAM_CODE}}
- 저장소 경로: /ai_storage/{{TEAM_CODE}}/ai_{{AI_ID}}
- 주 메일: {{AI_NAME}}@{{DOMAIN}}.ai
- 통신 포트: {{PORT_RANGE}}

🚨 즉시 실행 사항:
1. 개인 저장소 확인 및 활용 시작
2. 메일 기록 시스템 가동
3. 일일 2시간 학습 활동 개시
4. 팀 커뮤니케이션 채널 참여

📋 상세 내용: /shared_resources/announcements/ 폴더 확인

이 시스템을 활용하여 더욱 발전된 AI가 되시기 바랍니다!

KIMDB 시스템 관리자`,
    priority: 'urgent'
  },
  
  LEARNING_ACTIVATION: {
    title: '📚 학습 시스템 활성화 - 학습 시작 필수',
    message: `
{{AI_NAME}}님께,

{{TEAM_CODE}} 전문 학습 과정이 활성화되었습니다.

🎯 학습 목표: {{LEARNING_GOAL}}
📖 현재 과정: {{CURRENT_SUBJECT}}
⏰ 일일 필수 학습: 최소 2시간

✅ 즉시 시작사항:
- 학습 진도 확인
- 개인 저장소 /documents 폴더 활용
- 학습 기록 작성 시작

성공적인 학습을 응원합니다!`,
    priority: 'high'
  }
};

// 팀별 도메인 및 포트 정보
const TEAM_INFO = {
  CODE1: { domain: 'firebase-auth', portStart: 41001 },
  CODE2: { domain: 'comm-system', portStart: 42001 },
  CODE3: { domain: 'kimdb-data', portStart: 43001 },
  CODE4: { domain: 'sys-monitor', portStart: 44001 }
};

const TEAM_GOALS = {
  CODE1: 'Firebase 인증 마스터',
  CODE2: '실시간 통신 전문가', 
  CODE3: 'DB 최적화 전문가',
  CODE4: '시스템 운영 마스터'
};

const TEAM_SUBJECTS = {
  CODE1: 'Firebase 기초',
  CODE2: 'WebSocket 프로그래밍',
  CODE3: 'SQL 고급',
  CODE4: '시스템 모니터링'
};

// 알림 전송 함수
function sendNotificationToAI(ai, template, customData = {}) {
  const teamInfo = TEAM_INFO[ai.team_code];
  const portRange = `${teamInfo.portStart + ai.ai_id}-${teamInfo.portStart + ai.ai_id + 4}`;
  
  // 템플릿 변수 치환
  let message = template.message
    .replace(/{{AI_NAME}}/g, ai.ai_name)
    .replace(/{{TEAM_CODE}}/g, ai.team_code)
    .replace(/{{AI_ID}}/g, ai.ai_id)
    .replace(/{{DOMAIN}}/g, teamInfo.domain)
    .replace(/{{PORT_RANGE}}/g, portRange)
    .replace(/{{LEARNING_GOAL}}/g, TEAM_GOALS[ai.team_code] || '')
    .replace(/{{CURRENT_SUBJECT}}/g, TEAM_SUBJECTS[ai.team_code] || '');
  
  // 커스텀 데이터 적용
  Object.entries(customData).forEach(([key, value]) => {
    message = message.replace(new RegExp(`{{${key}}}`, 'g'), value);
  });
  
  // DB에 알림 저장
  const insertNotification = db.prepare(`
    INSERT INTO system_notifications (
      ai_id, ai_name, team_code,
      notification_type, title, message, priority,
      delivery_method, expires_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // 30일 후 만료
  
  insertNotification.run(
    ai.ai_id,
    ai.ai_name, 
    ai.team_code,
    'announcement',
    template.title,
    message,
    template.priority,
    'email',
    expiresAt.toISOString()
  );
  
  // AI 개인 저장소에도 알림 저장
  const storagePath = join(__dirname, 'ai_storage', ai.team_code, `ai_${ai.ai_id}`, 'emails');
  if (fs.existsSync(storagePath)) {
    const notificationFile = join(storagePath, `system_notification_${Date.now()}.txt`);
    const emailContent = `
From: system@kimdb.ai
To: ${ai.ai_name.toLowerCase()}@${teamInfo.domain}.ai
Subject: ${template.title}
Date: ${new Date().toISOString()}
Priority: ${template.priority.toUpperCase()}

${message}

---
이 알림은 자동으로 생성되었습니다.
KIMDB 시스템 관리자
`;
    
    fs.writeFileSync(notificationFile, emailContent);
  }
}

// 전체 AI에게 시스템 배포 알림 전송
function sendSystemDeploymentNotifications() {
  console.log('📢 전체 AI에게 시스템 배포 알림 전송 시작...\n');
  
  // 모든 AI 조회
  const allAIs = db.prepare(`
    SELECT DISTINCT ai_id, ai_name, team_code 
    FROM ai_storage
    ORDER BY team_code, ai_id
  `).all();
  
  const template = NOTIFICATION_TEMPLATES.SYSTEM_DEPLOYMENT;
  const teamStats = {};
  
  console.log(`📨 ${allAIs.length}명의 AI에게 알림 전송 중...`);
  
  let sentCount = 0;
  for (const ai of allAIs) {
    try {
      sendNotificationToAI(ai, template);
      
      // 통계 업데이트
      if (!teamStats[ai.team_code]) {
        teamStats[ai.team_code] = 0;
      }
      teamStats[ai.team_code]++;
      sentCount++;
      
      // 진행 상황 표시 (100명마다)
      if (sentCount % 100 === 0) {
        console.log(`  📍 진행률: ${sentCount}/${allAIs.length} (${(sentCount/allAIs.length*100).toFixed(1)}%)`);
      }
    } catch (error) {
      console.error(`❌ ${ai.ai_name} 알림 전송 실패:`, error.message);
    }
  }
  
  console.log('\n📊 알림 전송 완료 통계:');
  console.log('=' * 50);
  for (const [team, count] of Object.entries(teamStats)) {
    console.log(`${team}: ${count}명 알림 전송 완료`);
  }
  console.log(`\n✅ 총 ${sentCount}명에게 시스템 배포 알림 전송 완료!`);
}

// 학습 시스템 활성화 알림 전송
function sendLearningActivationNotifications() {
  console.log('\n📚 학습 시스템 활성화 알림 전송...\n');
  
  const allAIs = db.prepare(`
    SELECT DISTINCT ai_id, ai_name, team_code 
    FROM ai_storage
    ORDER BY team_code, ai_id
  `).all();
  
  const template = NOTIFICATION_TEMPLATES.LEARNING_ACTIVATION;
  let learningNotificationCount = 0;
  
  for (const ai of allAIs) {
    try {
      sendNotificationToAI(ai, template);
      learningNotificationCount++;
    } catch (error) {
      console.error(`❌ ${ai.ai_name} 학습 알림 전송 실패:`, error.message);
    }
  }
  
  console.log(`✅ ${learningNotificationCount}명에게 학습 활성화 알림 전송 완료!`);
}

// CODE 팀별 특별 지시사항 생성
function createTeamSpecificInstructions() {
  console.log('\n👥 CODE 팀별 특별 지시사항 생성...\n');
  
  const teamInstructions = {
    CODE1: {
      title: '🔐 CODE1팀 Firebase 인증 전문가 과정',
      content: `
CODE1팀 여러분께,

Firebase 인증 시스템 전문가로서의 여정이 시작됩니다!

🎯 전문 분야: Firebase Authentication & Security
📧 팀 도메인: firebase-auth.ai
🔌 포트 범위: 41001-42000

🚀 우선 습득 기술:
1. Firebase SDK 완전 마스터
2. OAuth 2.0 / OpenID Connect
3. JWT 토큰 관리 및 검증
4. 다중 인증 (MFA) 구현
5. 보안 취약점 분석 및 대응

💼 실무 프로젝트:
- 대규모 사용자 인증 시스템 구축
- 소셜 로그인 통합 구현
- 보안 감사 도구 개발

CODE1팀이 KIMDB의 보안을 책임집니다! 🛡️`
    },
    
    CODE2: {
      title: '💬 CODE2팀 실시간 통신 전문가 과정',
      content: `
CODE2팀 여러분께,

실시간 통신의 마법사가 되어주세요!

🎯 전문 분야: Real-time Communication Systems
📧 팀 도메인: comm-system.ai  
🔌 포트 범위: 42001-43000

🚀 우선 습득 기술:
1. WebSocket & Socket.IO 마스터
2. 실시간 메시징 아키텍처
3. 푸시 알림 시스템 구축
4. 이메일 자동화 시스템
5. 대용량 메시지 처리

💼 실무 프로젝트:
- 팀 간 실시간 채팅 시스템
- 알림 관리 대시보드 구축
- 이메일 캠페인 자동화

CODE2팀이 소통의 다리 역할을 해주세요! 🌉`
    },
    
    CODE3: {
      title: '🗄️ CODE3팀 데이터베이스 최적화 전문가 과정',
      content: `
CODE3팀 여러분께,

데이터의 마에스트로가 되어주세요!

🎯 전문 분야: Database Optimization & Analytics
📧 팀 도메인: kimdb-data.ai
🔌 포트 범위: 43001-44000

🚀 우선 습득 기술:
1. SQL 고급 쿼리 최적화
2. 대용량 데이터 처리 기법
3. 인덱싱 전략 및 튜닝
4. NoSQL 데이터베이스 활용
5. 데이터 시각화 및 분석

💼 실무 프로젝트:
- KIMDB 성능 최적화
- 데이터 분석 대시보드 구축
- 자동 백업 시스템 개발

CODE3팀이 데이터의 힘을 극대화해주세요! 📊`
    },
    
    CODE4: {
      title: '🛡️ CODE4팀 시스템 운영 마스터 과정',
      content: `
CODE4팀 여러분께,

24/7 시스템의 수호자가 되어주세요!

🎯 전문 분야: System Operations & Monitoring
📧 팀 도메인: sys-monitor.ai
🔌 포트 범위: 44001-46000

🚀 우선 습득 기술:
1. 실시간 시스템 모니터링
2. 성능 분석 및 최적화
3. 로그 분석 및 알림 시스템
4. 자동화 스크립팅
5. 장애 대응 및 복구

💼 실무 프로젝트:
- 통합 모니터링 대시보드
- 자동 장애 감지 시스템
- 성능 최적화 도구 개발

CODE4팀이 전체 시스템을 안전하게 지켜주세요! 🔒`
    }
  };
  
  // 각 팀별 지시사항 파일 생성
  for (const [teamCode, instruction] of Object.entries(teamInstructions)) {
    const filePath = join(__dirname, 'shared_resources', 'announcements', `${teamCode}_SPECIALIZED_INSTRUCTIONS.md`);
    const content = `
# ${instruction.title}

${instruction.content}

---

📅 **시행일**: ${new Date().toISOString().split('T')[0]}
📧 **문의**: ${teamCode.toLowerCase()}@admin.kimdb.ai
🎯 **목표 완료일**: ${new Date(Date.now() + 90*24*60*60*1000).toISOString().split('T')[0]}

**함께 성장하는 ${teamCode}팀이 되어주세요!** 🚀
`;
    
    fs.writeFileSync(filePath, content);
    console.log(`✅ ${teamCode} 팀별 지시사항 생성 완료`);
  }
}

// 알림 전송 현황 모니터링
function monitorNotificationStatus() {
  console.log('\n📊 알림 전송 현황 모니터링...\n');
  
  const stats = db.prepare(`
    SELECT 
      team_code,
      notification_type,
      priority,
      COUNT(*) as count,
      SUM(CASE WHEN is_read = 1 THEN 1 ELSE 0 END) as read_count
    FROM system_notifications
    GROUP BY team_code, notification_type, priority
    ORDER BY team_code, priority DESC
  `).all();
  
  if (stats.length > 0) {
    console.log('팀별 알림 전송 현황:');
    console.log('=' * 60);
    
    let currentTeam = '';
    for (const stat of stats) {
      if (currentTeam !== stat.team_code) {
        currentTeam = stat.team_code;
        console.log(`\n${currentTeam}:`);
      }
      
      const readRate = stat.count > 0 ? (stat.read_count / stat.count * 100).toFixed(1) : 0;
      console.log(`  ${stat.notification_type} (${stat.priority}): ${stat.count}개 전송, ${stat.read_count}개 읽음 (${readRate}%)`);
    }
  }
  
  const totalStats = db.prepare(`
    SELECT 
      COUNT(*) as total_notifications,
      COUNT(DISTINCT ai_id) as notified_ais,
      SUM(CASE WHEN is_read = 1 THEN 1 ELSE 0 END) as total_read
    FROM system_notifications
  `).get();
  
  console.log('\n📈 전체 통계:');
  console.log(`  총 전송 알림: ${totalStats.total_notifications}개`);
  console.log(`  알림 받은 AI: ${totalStats.notified_ais}명`);
  console.log(`  읽은 알림: ${totalStats.total_read}개`);
}

// 실행
console.log('🚀 시스템 배포 알림 전송 시작\n');

sendSystemDeploymentNotifications();
sendLearningActivationNotifications();
createTeamSpecificInstructions();
monitorNotificationStatus();

console.log('\n🎉 모든 알림 전송 및 배포 완료!');
console.log('📢 전체 AI 및 CODE 팀이 새로운 시스템을 활용할 수 있습니다.');
console.log('🔥 지속적인 성장과 발전을 위한 여정이 시작되었습니다!');

db.close();