/**
 * 📱 AI 통신 정보 추가 시스템
 * 각 AI에게 메일, SNS, 전화, 통신포트 5개씩 할당
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 데이터베이스 연결
const db = new Database(join(__dirname, 'shared_database', 'code_team_ai.db'));

// Foreign Key 제약 비활성화
db.pragma('foreign_keys = OFF');

// 통신 정보 테이블 생성
db.exec(`
  CREATE TABLE IF NOT EXISTS ai_communication_info (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ai_id INTEGER NOT NULL,
    ai_name TEXT NOT NULL,
    team_code TEXT NOT NULL,
    
    -- 이메일 정보 (5개)
    email_primary TEXT NOT NULL,
    email_work TEXT NOT NULL,
    email_backup TEXT NOT NULL,
    email_team TEXT NOT NULL,
    email_personal TEXT NOT NULL,
    
    -- SNS 정보 (5개)
    sns_twitter TEXT NOT NULL,
    sns_linkedin TEXT NOT NULL,
    sns_github TEXT NOT NULL,
    sns_slack TEXT NOT NULL,
    sns_discord TEXT NOT NULL,
    
    -- 전화번호 (5개)
    phone_main TEXT NOT NULL,
    phone_office TEXT NOT NULL,
    phone_mobile TEXT NOT NULL,
    phone_emergency TEXT NOT NULL,
    phone_hotline TEXT NOT NULL,
    
    -- 통신 포트 (5개)
    port_main INTEGER NOT NULL,
    port_api INTEGER NOT NULL,
    port_websocket INTEGER NOT NULL,
    port_backup INTEGER NOT NULL,
    port_debug INTEGER NOT NULL,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE INDEX IF NOT EXISTS idx_comm_ai_id ON ai_communication_info(ai_id);
  CREATE INDEX IF NOT EXISTS idx_comm_team ON ai_communication_info(team_code);
`);

// 통신 정보 생성 함수
function generateCommunicationInfo(aiId, aiName, teamCode) {
  const teamNum = parseInt(teamCode.slice(-1));
  const basePort = 40000 + (teamNum * 1000) + aiId;
  
  // 팀별 도메인
  const domains = {
    CODE1: 'firebase-auth',
    CODE2: 'comm-system',
    CODE3: 'kimdb-data',
    CODE4: 'sys-monitor'
  };
  
  const domain = domains[teamCode];
  const cleanName = aiName.toLowerCase().replace(/_/g, '-');
  
  return {
    // 이메일 (5개)
    email_primary: `${cleanName}@${domain}.ai`,
    email_work: `${cleanName}@work.${domain}.ai`,
    email_backup: `${cleanName}@backup.${domain}.ai`,
    email_team: `${cleanName}@${teamCode.toLowerCase()}.team.ai`,
    email_personal: `${cleanName}@personal.aikim.com`,
    
    // SNS (5개)
    sns_twitter: `@ai_${cleanName}`,
    sns_linkedin: `linkedin.com/in/ai-${cleanName}`,
    sns_github: `github.com/${cleanName}-ai`,
    sns_slack: `${teamCode.toLowerCase()}.slack.com/team/${cleanName}`,
    sns_discord: `${cleanName}#${String(aiId).padStart(4, '0')}`,
    
    // 전화번호 (5개)
    phone_main: `010-${teamNum}000-${String(aiId).padStart(4, '0')}`,
    phone_office: `02-${teamNum}100-${String(aiId).padStart(4, '0')}`,
    phone_mobile: `010-${teamNum}200-${String(aiId).padStart(4, '0')}`,
    phone_emergency: `119-${teamNum}${String(aiId).padStart(3, '0')}`,
    phone_hotline: `1588-${teamNum}${String(aiId).padStart(3, '0')}`,
    
    // 통신 포트 (5개)
    port_main: basePort,
    port_api: basePort + 1,
    port_websocket: basePort + 2,
    port_backup: basePort + 3,
    port_debug: basePort + 4
  };
}

// AI들에게 통신 정보 할당
function assignCommunicationInfo() {
  console.log('📱 AI 통신 정보 할당 시작...\n');
  
  // 기존 데이터 삭제
  db.prepare('DELETE FROM ai_communication_info').run();
  
  // 모든 AI 조회
  const allAIs = db.prepare(`
    SELECT ai_id, ai_name, team_code 
    FROM code_team_ai_distribution
    ORDER BY team_code, ai_id
  `).all();
  
  console.log(`총 ${allAIs.length}명의 AI에게 통신 정보 할당 중...\n`);
  
  // 통신 정보 삽입 준비
  const insertStmt = db.prepare(`
    INSERT INTO ai_communication_info (
      ai_id, ai_name, team_code,
      email_primary, email_work, email_backup, email_team, email_personal,
      sns_twitter, sns_linkedin, sns_github, sns_slack, sns_discord,
      phone_main, phone_office, phone_mobile, phone_emergency, phone_hotline,
      port_main, port_api, port_websocket, port_backup, port_debug
    ) VALUES (
      ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?
    )
  `);
  
  const teamStats = {};
  
  // 각 AI에게 통신 정보 할당
  for (const ai of allAIs) {
    const commInfo = generateCommunicationInfo(ai.ai_id, ai.ai_name, ai.team_code);
    
    insertStmt.run(
      ai.ai_id, ai.ai_name, ai.team_code,
      commInfo.email_primary, commInfo.email_work, commInfo.email_backup, 
      commInfo.email_team, commInfo.email_personal,
      commInfo.sns_twitter, commInfo.sns_linkedin, commInfo.sns_github,
      commInfo.sns_slack, commInfo.sns_discord,
      commInfo.phone_main, commInfo.phone_office, commInfo.phone_mobile,
      commInfo.phone_emergency, commInfo.phone_hotline,
      commInfo.port_main, commInfo.port_api, commInfo.port_websocket,
      commInfo.port_backup, commInfo.port_debug
    );
    
    // 통계 업데이트
    if (!teamStats[ai.team_code]) {
      teamStats[ai.team_code] = { count: 0, sample: [] };
    }
    teamStats[ai.team_code].count++;
    
    // 각 팀별로 샘플 저장 (처음 2개만)
    if (teamStats[ai.team_code].sample.length < 2) {
      teamStats[ai.team_code].sample.push({
        name: ai.ai_name,
        email: commInfo.email_primary,
        phone: commInfo.phone_main,
        port: commInfo.port_main
      });
    }
  }
  
  // 결과 출력
  console.log('=' * 60);
  console.log('📊 통신 정보 할당 완료!\n');
  
  for (const [team, stats] of Object.entries(teamStats)) {
    console.log(`🎯 ${team}: ${stats.count}명`);
    console.log('   샘플 AI 통신 정보:');
    stats.sample.forEach(ai => {
      console.log(`   - ${ai.name}`);
      console.log(`     📧 메일: ${ai.email}`);
      console.log(`     📱 전화: ${ai.phone}`);
      console.log(`     🔌 포트: ${ai.port}-${ai.port+4}`);
    });
    console.log();
  }
  
  // 전체 통계
  const totalStats = db.prepare(`
    SELECT 
      COUNT(*) as total,
      COUNT(DISTINCT team_code) as teams
    FROM ai_communication_info
  `).get();
  
  console.log('=' * 60);
  console.log('✨ 최종 결과:');
  console.log(`✅ 총 ${totalStats.total}명의 AI에게 통신 정보 할당 완료`);
  console.log(`✅ 각 AI당 5개씩 이메일, SNS, 전화번호, 포트 할당`);
  console.log(`✅ 총 ${totalStats.total * 20}개의 통신 채널 생성`);
  console.log('=' * 60);
  
  db.close();
}

// 실행
assignCommunicationInfo();