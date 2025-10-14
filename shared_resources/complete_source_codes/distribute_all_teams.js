/**
 * 🚀 CODE 1,2,3,4 팀 전체 AI 분배 시스템
 * 각 팀에 500명씩 총 2000명 AI 분배
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 데이터베이스 연결
const db = new Database(join(__dirname, 'shared_database', 'code_team_ai.db'));

// CODE 팀 정의
const CODE_TEAMS = {
  CODE1: {
    name: 'Firebase 인증 시스템 전문팀',
    specialties: ['인증', '보안', 'Firebase', '사용자관리'],
    targetAIs: 500,
    preferredTypes: ['GUARDIAN', 'ANALYZER', 'RESEARCHER']
  },
  CODE2: {
    name: '통합 커뮤니케이션 시스템 개발팀',
    specialties: ['통신', '메시징', '알림', '이메일'],
    targetAIs: 500,
    preferredTypes: ['COMMUNICATOR', 'INTEGRATOR', 'CREATOR']
  },
  CODE3: {
    name: 'KIMDB 데이터베이스 전문팀',
    specialties: ['데이터베이스', '쿼리', '최적화', '분석'],
    targetAIs: 500,
    preferredTypes: ['ANALYZER', 'RESEARCHER', 'GUARDIAN']
  },
  CODE4: {
    name: '시스템 운영 및 모니터링팀',
    specialties: ['모니터링', '성능', '운영', '자동화'],
    targetAIs: 500,
    preferredTypes: ['GUARDIAN', 'LEADER', 'EXPLORER']
  }
};

// 테이블 생성
db.exec(`
  CREATE TABLE IF NOT EXISTS code_team_ai_distribution (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ai_id INTEGER NOT NULL,
    ai_name TEXT NOT NULL,
    personality TEXT NOT NULL,
    specialization TEXT NOT NULL,
    team_code TEXT NOT NULL,
    team_name TEXT NOT NULL,
    team_port INTEGER NOT NULL,
    role TEXT NOT NULL,
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'active',
    performance REAL DEFAULT 85.0,
    contribution_score REAL DEFAULT 0.0,
    projects_completed INTEGER DEFAULT 0
  );

  CREATE INDEX IF NOT EXISTS idx_team_code ON code_team_ai_distribution(team_code);
  CREATE INDEX IF NOT EXISTS idx_ai_id ON code_team_ai_distribution(ai_id);
`);

// AI 성격 타입
const AI_TYPES = [
  'CREATOR', 'ANALYZER', 'LEADER', 'SUPPORTER', 'COMMUNICATOR',
  'RESEARCHER', 'GUARDIAN', 'EXPLORER', 'INTEGRATOR'
];

// AI 이름 생성기
function generateAIName(teamCode, index, type) {
  const prefixes = {
    CODE1: ['Firebase', 'Auth', 'Secure', 'Shield'],
    CODE2: ['Connect', 'Comm', 'Link', 'Bridge'],
    CODE3: ['Data', 'Query', 'DB', 'Index'],
    CODE4: ['Monitor', 'Guard', 'Watch', 'System']
  };
  
  const prefix = prefixes[teamCode][Math.floor(Math.random() * prefixes[teamCode].length)];
  return `${prefix}_${type}_${teamCode}_${index}`;
}

// 역할 생성기
function generateRole(teamCode, type) {
  const roles = {
    CODE1: {
      GUARDIAN: '보안 관리자',
      ANALYZER: '인증 분석가',
      RESEARCHER: 'Firebase 전문가'
    },
    CODE2: {
      COMMUNICATOR: '소통 전문가',
      INTEGRATOR: '통합 관리자',
      CREATOR: '시스템 설계자'
    },
    CODE3: {
      ANALYZER: '데이터 분석가',
      RESEARCHER: 'DB 연구원',
      GUARDIAN: '데이터 보호자'
    },
    CODE4: {
      GUARDIAN: '시스템 관리자',
      LEADER: '운영 리더',
      EXPLORER: '성능 탐색가'
    }
  };
  
  return roles[teamCode][type] || '팀원';
}

// AI 분배 실행
function distributeAIsToAllTeams() {
  console.log('🚀 CODE 전체 팀 AI 분배 시작...\n');
  
  // 기존 데이터 삭제
  db.prepare('DELETE FROM code_team_ai_distribution').run();
  
  let totalDistributed = 0;
  const results = {};
  
  for (const [teamCode, teamInfo] of Object.entries(CODE_TEAMS)) {
    console.log(`\n📦 ${teamCode} - ${teamInfo.name} 분배 중...`);
    
    const insertStmt = db.prepare(`
      INSERT INTO code_team_ai_distribution (
        ai_id, ai_name, personality, specialization,
        team_code, team_name, team_port, role,
        performance, contribution_score
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const teamAIs = [];
    
    for (let i = 0; i < teamInfo.targetAIs; i++) {
      // 팀별 선호 타입 우선 배치
      const typeIndex = i % teamInfo.preferredTypes.length;
      const personality = teamInfo.preferredTypes[typeIndex];
      const aiId = totalDistributed + i + 1;
      const aiName = generateAIName(teamCode, aiId, personality);
      const role = generateRole(teamCode, personality);
      const specialization = teamInfo.specialties[i % teamInfo.specialties.length];
      const performance = 75 + Math.random() * 25; // 75-100%
      const contribution = Math.random() * 100;
      
      insertStmt.run(
        aiId,
        aiName,
        personality,
        specialization,
        teamCode,
        teamInfo.name,
        35300 + parseInt(teamCode.slice(-1)),
        role,
        performance,
        contribution
      );
      
      teamAIs.push({
        id: aiId,
        name: aiName,
        type: personality,
        role: role
      });
    }
    
    totalDistributed += teamInfo.targetAIs;
    results[teamCode] = {
      count: teamInfo.targetAIs,
      sample: teamAIs.slice(0, 3)
    };
    
    console.log(`✅ ${teamCode}: ${teamInfo.targetAIs}명 분배 완료`);
  }
  
  // 통계 출력
  console.log('\n' + '='.repeat(60));
  console.log('📊 전체 분배 완료 통계\n');
  
  for (const [teamCode, info] of Object.entries(results)) {
    const teamInfo = CODE_TEAMS[teamCode];
    console.log(`🎯 ${teamCode} - ${teamInfo.name}`);
    console.log(`   총 인원: ${info.count}명`);
    console.log(`   샘플 AI:`);
    info.sample.forEach(ai => {
      console.log(`     - ${ai.name} (${ai.type}) - ${ai.role}`);
    });
    console.log();
  }
  
  // 전체 통계
  const stats = db.prepare(`
    SELECT 
      COUNT(*) as total,
      COUNT(DISTINCT team_code) as teams,
      AVG(performance) as avg_performance
    FROM code_team_ai_distribution
  `).get();
  
  console.log('='.repeat(60));
  console.log('🎊 최종 결과');
  console.log(`✅ 총 ${stats.total}명 AI 분배 완료`);
  console.log(`✅ ${stats.teams}개 팀 활성화`);
  console.log(`✅ 평균 성능: ${stats.avg_performance.toFixed(1)}%`);
  console.log('='.repeat(60));
  
  // 팀별 타입 분포
  const typeDistribution = db.prepare(`
    SELECT 
      team_code,
      personality,
      COUNT(*) as count
    FROM code_team_ai_distribution
    GROUP BY team_code, personality
    ORDER BY team_code, count DESC
  `).all();
  
  console.log('\n📈 팀별 AI 타입 분포:');
  let currentTeam = '';
  typeDistribution.forEach(row => {
    if (currentTeam !== row.team_code) {
      currentTeam = row.team_code;
      console.log(`\n${currentTeam}:`);
    }
    console.log(`  ${row.personality}: ${row.count}명`);
  });
  
  db.close();
  console.log('\n✨ 모든 CODE 팀 AI 분배가 성공적으로 완료되었습니다!');
}

// 실행
distributeAIsToAllTeams();