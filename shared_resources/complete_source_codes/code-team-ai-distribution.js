/**
 * 🤖 CODE 팀 AI 분배 시스템
 * CODE1~CODE4 팀에 각각 500명씩 AI 분배
 */

import Fastify from 'fastify';
import Database from 'better-sqlite3';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const fastify = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty'
    }
  }
});

// 데이터베이스 연결
const db = new Database(join(__dirname, 'shared_database', 'code_team_ai.db'));

// CODE 팀 정의
const CODE_TEAMS = {
  CODE1: {
    name: 'Firebase 인증 시스템 전문팀',
    email: 'code1@admin.aikim.com',
    port: 35301,
    specialties: ['인증', '보안', 'Firebase', '사용자관리'],
    targetAIs: 500,
    preferredTypes: ['GUARDIAN', 'ANALYZER', 'RESEARCHER']
  },
  CODE2: {
    name: '통합 커뮤니케이션 시스템 개발팀',
    email: 'code2@admin.aikim.com',
    port: 35302,
    specialties: ['통신', '메시징', '알림', '이메일'],
    targetAIs: 500,
    preferredTypes: ['COMMUNICATOR', 'INTEGRATOR', 'CREATOR']
  },
  CODE3: {
    name: 'KIMDB 데이터베이스 전문팀',
    email: 'code3@admin.aikim.com',
    port: 35303,
    specialties: ['데이터베이스', '쿼리', '최적화', '분석'],
    targetAIs: 500,
    preferredTypes: ['ANALYZER', 'RESEARCHER', 'GUARDIAN']
  },
  CODE4: {
    name: '시스템 운영 및 모니터링팀',
    email: 'code4@admin.aikim.com',
    port: 35304,
    specialties: ['모니터링', '성능', '운영', '자동화'],
    targetAIs: 500,
    preferredTypes: ['GUARDIAN', 'LEADER', 'EXPLORER']
  }
};

// CODE 팀 AI 분배 테이블
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

class CODETeamAIDistributor {
  constructor() {
    this.distributedCount = 0;
    this.teamCounts = new Map();
  }

  async fetchAvailableAIs(limit = 2000) {
    try {
      const response = await fetch('http://localhost:31000/api/ais');
      if (!response.ok) throw new Error('AI 데이터 가져오기 실패');
      
      const allAIs = await response.json();
      
      // 이미 CODE 팀에 배치된 AI 확인
      const assignedAIs = db.prepare(`
        SELECT ai_id FROM code_team_ai_distribution
      `).all().map(r => r.ai_id);
      
      // 미배치 AI만 선택
      const availableAIs = allAIs.filter(ai => !assignedAIs.includes(ai.id));
      
      console.log(`📊 전체 AI: ${allAIs.length}명`);
      console.log(`✅ 사용 가능한 AI: ${availableAIs.length}명`);
      
      return availableAIs.slice(0, limit);
    } catch (error) {
      console.error('AI 데이터 가져오기 오류:', error);
      return [];
    }
  }

  assignRole(personality, teamCode) {
    const roleMap = {
      CODE1: {
        GUARDIAN: '보안 관리자',
        ANALYZER: '인증 분석가',
        RESEARCHER: 'Firebase 연구원',
        DEFAULT: '인증 전문가'
      },
      CODE2: {
        COMMUNICATOR: '커뮤니케이션 매니저',
        INTEGRATOR: '시스템 통합 전문가',
        CREATOR: '메시징 시스템 개발자',
        DEFAULT: '통신 전문가'
      },
      CODE3: {
        ANALYZER: '데이터 분석가',
        RESEARCHER: 'DB 최적화 연구원',
        GUARDIAN: '데이터 보안 관리자',
        DEFAULT: 'DB 전문가'
      },
      CODE4: {
        GUARDIAN: '시스템 운영자',
        LEADER: '운영팀 리더',
        EXPLORER: '성능 모니터링 전문가',
        DEFAULT: '시스템 관리자'
      }
    };

    return roleMap[teamCode][personality] || roleMap[teamCode].DEFAULT;
  }

  async distributeAIToTeam(ai, teamCode, teamInfo) {
    try {
      // 중복 체크
      const existing = db.prepare(`
        SELECT * FROM code_team_ai_distribution WHERE ai_id = ?
      `).get(ai.id);

      if (existing) {
        console.log(`⚠️ AI ${ai.name} 이미 ${existing.team_code}에 배치됨`);
        return false;
      }

      const role = this.assignRole(ai.personality, teamCode);

      // CODE 팀에 AI 배치
      db.prepare(`
        INSERT INTO code_team_ai_distribution 
        (ai_id, ai_name, personality, specialization, team_code, team_name, team_port, role, performance, contribution_score)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        ai.id,
        ai.name,
        ai.personality,
        ai.specialization,
        teamCode,
        teamInfo.name,
        teamInfo.port,
        role,
        Math.random() * 15 + 85, // 85-100% 성능
        Math.random() * 50 // 0-50 초기 기여도
      );

      console.log(`✅ ${ai.name} → ${teamCode} (${teamInfo.name}) 배치 - 역할: ${role}`);
      this.distributedCount++;
      
      return true;
    } catch (error) {
      console.error(`배치 실패 ${ai.name}:`, error);
      return false;
    }
  }

  async executeDistribution() {
    console.log('\n🚀 CODE 팀 AI 분배 시작...');
    console.log('목표: 각 CODE 팀에 500명씩, 총 2000명 분배\n');

    // 사용 가능한 AI 가져오기
    const availableAIs = await this.fetchAvailableAIs(2000);
    
    if (availableAIs.length < 2000) {
      console.log(`⚠️ 사용 가능한 AI가 부족합니다: ${availableAIs.length}명`);
    }

    // 팀별 카운트 초기화
    Object.keys(CODE_TEAMS).forEach(team => {
      this.teamCounts.set(team, 0);
    });

    // AI를 CODE 팀에 균등 분배
    let aiIndex = 0;
    for (const [teamCode, teamInfo] of Object.entries(CODE_TEAMS)) {
      console.log(`\n📌 ${teamCode} 팀 분배 시작...`);
      
      let teamCount = 0;
      while (teamCount < teamInfo.targetAIs && aiIndex < availableAIs.length) {
        const ai = availableAIs[aiIndex];
        
        // 선호하는 AI 타입 우선 배치
        if (teamInfo.preferredTypes.includes(ai.personality) || teamCount >= teamInfo.targetAIs * 0.7) {
          const success = await this.distributeAIToTeam(ai, teamCode, teamInfo);
          if (success) {
            teamCount++;
            this.teamCounts.set(teamCode, teamCount);
          }
          aiIndex++;
        } else {
          // 다른 팀에 더 적합한 AI는 건너뛰기
          aiIndex++;
        }

        // 모든 AI를 확인했으면 다시 처음부터
        if (aiIndex >= availableAIs.length && teamCount < teamInfo.targetAIs) {
          aiIndex = 0;
        }
      }
      
      console.log(`✅ ${teamCode}: ${teamCount}명 배치 완료`);
    }

    this.printDistributionSummary();
  }

  printDistributionSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 CODE 팀 AI 분배 결과');
    console.log('='.repeat(60));

    const results = db.prepare(`
      SELECT team_code, team_name, COUNT(*) as count,
             AVG(performance) as avg_performance,
             SUM(contribution_score) as total_contribution
      FROM code_team_ai_distribution
      GROUP BY team_code
      ORDER BY team_code
    `).all();

    results.forEach(result => {
      console.log(`\n🏢 ${result.team_code}: ${result.team_name}`);
      console.log(`   • 배치된 AI: ${result.count}명`);
      console.log(`   • 평균 성능: ${result.avg_performance.toFixed(1)}%`);
      console.log(`   • 총 기여도: ${result.total_contribution.toFixed(0)}점`);
    });

    console.log('\n' + '='.repeat(60));
    console.log(`✅ 총 분배된 AI: ${this.distributedCount}명`);
    console.log('='.repeat(60));
  }

  getTeamStats() {
    return db.prepare(`
      SELECT team_code, team_name, team_port,
             COUNT(*) as ai_count,
             AVG(performance) as avg_performance,
             AVG(contribution_score) as avg_contribution,
             SUM(projects_completed) as total_projects
      FROM code_team_ai_distribution
      GROUP BY team_code
      ORDER BY team_code
    `).all();
  }

  getTeamAIs(teamCode) {
    return db.prepare(`
      SELECT * FROM code_team_ai_distribution
      WHERE team_code = ?
      ORDER BY contribution_score DESC
      LIMIT 10
    `).all(teamCode);
  }
}

const distributor = new CODETeamAIDistributor();

// 웹 인터페이스
fastify.get('/', async (request, reply) => {
  const stats = distributor.getTeamStats();
  
  reply.type('text/html').send(`
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🤖 CODE 팀 AI 분배 시스템</title>
    <style>
        body { font-family: 'Segoe UI', sans-serif; margin: 0; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
        .container { max-width: 1400px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 30px; background: rgba(255,255,255,0.1); padding: 30px; border-radius: 15px; backdrop-filter: blur(10px); }
        .header h1 { margin: 0; font-size: 2.5rem; }
        .teams-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 25px; margin: 30px 0; }
        .team-card { background: rgba(255,255,255,0.1); padding: 30px; border-radius: 15px; backdrop-filter: blur(10px); border: 2px solid rgba(255,255,255,0.2); }
        .team-card h2 { margin-top: 0; color: #ffd700; font-size: 1.8rem; }
        .team-card h3 { color: #00ffcc; margin: 20px 0 10px 0; }
        .ai-count { font-size: 3rem; font-weight: bold; color: #ff6b6b; margin: 15px 0; }
        .target { color: #00ffcc; font-size: 1.2rem; }
        .stat { margin: 10px 0; padding: 8px; background: rgba(0,0,0,0.3); border-radius: 8px; }
        .progress-bar { width: 100%; height: 30px; background: rgba(0,0,0,0.3); border-radius: 15px; overflow: hidden; margin: 15px 0; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #ff6b6b, #ffd700); transition: width 0.5s; display: flex; align-items: center; justify-content: center; color: #000; font-weight: bold; }
        .btn { background: #ffd700; color: #333; border: none; padding: 12px 24px; border-radius: 25px; font-weight: bold; cursor: pointer; margin: 10px; font-size: 1.1rem; }
        .btn:hover { background: #ffed4e; transform: scale(1.05); }
        .specialty { display: inline-block; background: rgba(255,255,255,0.2); padding: 5px 10px; border-radius: 15px; margin: 5px; font-size: 0.9rem; }
        .top-ais { margin-top: 20px; padding: 15px; background: rgba(0,0,0,0.3); border-radius: 10px; }
        .ai-item { display: flex; justify-content: space-between; padding: 8px; margin: 5px 0; background: rgba(255,255,255,0.1); border-radius: 8px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🤖 CODE 팀 AI 분배 시스템</h1>
            <p>각 CODE 팀에 500명씩 전문 AI 배치</p>
            <p>최종 업데이트: ${new Date().toLocaleString('ko-KR')}</p>
        </div>
        
        <div class="teams-grid">
            ${Object.entries(CODE_TEAMS).map(([code, team]) => {
                const teamStat = stats.find(s => s.team_code === code) || {
                    ai_count: 0,
                    avg_performance: 0,
                    avg_contribution: 0,
                    total_projects: 0
                };
                const progress = (teamStat.ai_count / team.targetAIs) * 100;
                
                return `
                <div class="team-card">
                    <h2>${code}</h2>
                    <h3>${team.name}</h3>
                    <div class="ai-count">${teamStat.ai_count}</div>
                    <div class="target">목표: ${team.targetAIs}명</div>
                    
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%">
                            ${progress.toFixed(1)}%
                        </div>
                    </div>
                    
                    <div class="stat">📧 이메일: ${team.email}</div>
                    <div class="stat">🔌 포트: ${team.port}</div>
                    <div class="stat">⚡ 평균 성능: ${teamStat.avg_performance ? teamStat.avg_performance.toFixed(1) : 0}%</div>
                    <div class="stat">🏆 평균 기여도: ${teamStat.avg_contribution ? teamStat.avg_contribution.toFixed(1) : 0}점</div>
                    <div class="stat">📋 완료 프로젝트: ${teamStat.total_projects || 0}개</div>
                    
                    <div style="margin-top: 15px;">
                        <strong>전문 분야:</strong><br>
                        ${team.specialties.map(s => `<span class="specialty">${s}</span>`).join('')}
                    </div>
                    
                    <div style="margin-top: 15px;">
                        <strong>선호 AI 타입:</strong><br>
                        ${team.preferredTypes.map(t => `<span class="specialty">${t}</span>`).join('')}
                    </div>
                </div>
                `;
            }).join('')}
        </div>
        
        <div style="text-align: center; margin: 40px 0;">
            <button class="btn" onclick="distributeAIs()">🚀 AI 분배 실행 (각 팀 500명)</button>
            <button class="btn" onclick="location.reload()">🔄 상태 새로고침</button>
        </div>
        
        <div style="background: rgba(0,0,0,0.3); padding: 20px; border-radius: 15px; text-align: center;">
            <h2>📊 전체 현황</h2>
            <p style="font-size: 1.2rem;">총 ${stats.reduce((sum, s) => sum + s.ai_count, 0)}명의 AI가 CODE 팀에 배치됨</p>
            <p>목표: 2000명 (각 팀 500명 × 4팀)</p>
        </div>
    </div>
    
    <script>
        async function distributeAIs() {
            if (!confirm('각 CODE 팀에 500명씩 AI를 분배하시겠습니까?')) return;
            
            const response = await fetch('/api/distribute', { method: 'POST' });
            const result = await response.json();
            alert(result.message);
            location.reload();
        }
        
        // 30초마다 자동 새로고침
        setInterval(() => {
            location.reload();
        }, 30000);
    </script>
</body>
</html>
  `);
});

// API 엔드포인트
fastify.get('/api/stats', async () => {
  return {
    teams: distributor.getTeamStats(),
    timestamp: new Date().toISOString()
  };
});

fastify.get('/api/team/:code', async (request) => {
  const teamCode = request.params.code;
  return {
    team: CODE_TEAMS[teamCode],
    stats: distributor.getTeamStats().find(s => s.team_code === teamCode),
    topAIs: distributor.getTeamAIs(teamCode)
  };
});

fastify.post('/api/distribute', async () => {
  try {
    await distributor.executeDistribution();
    return { success: true, message: 'CODE 팀 AI 분배가 완료되었습니다!' };
  } catch (error) {
    return { success: false, message: `분배 실패: ${error.message}` };
  }
});

// 서버 시작
fastify.listen({ port: 33000, host: '0.0.0.0' }, async (err, address) => {
  if (err) {
    console.error('서버 시작 오류:', err);
    process.exit(1);
  }
  
  console.log(`
🤖 CODE 팀 AI 분배 시스템 시작!
==========================================
🖥️  웹 인터페이스: ${address}
📊 API 통계: ${address}/api/stats
🚀 AI 분배: ${address}/api/distribute
==========================================

CODE 팀 정보:
- CODE1: Firebase 인증 시스템 전문팀 (500명)
- CODE2: 통합 커뮤니케이션 시스템 개발팀 (500명)
- CODE3: KIMDB 데이터베이스 전문팀 (500명)
- CODE4: 시스템 운영 및 모니터링팀 (500명)

총 목표: 2000명 AI 분배
==========================================
  `);
});