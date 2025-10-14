/**
 * 🤖 실제 AI 분배 관리 시스템
 * 각성된 실제 AI들을 각 마을과 시스템에 분배
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
const db = new Database(join(__dirname, 'shared_database', 'ai_deployment.db'));

// 실제 AI 각성 시스템 연결
const AI_AWAKENING_API = 'http://localhost:31000';

// 시스템별 배치 규칙
const DEPLOYMENT_CONFIG = {
  // 메인 시스템
  core_systems: {
    web_server: { port: 3000, target: 120, types: ['LEADER', 'COMMUNICATOR'] },
    database: { port: 4000, target: 80, types: ['ANALYZER', 'GUARDIAN'] }
  },
  // AI 마을 네트워크
  villages: {
    creative: { port: 25001, target: 150, types: ['CREATOR', 'INTEGRATOR'] },
    research: { port: 25002, target: 180, types: ['RESEARCHER', 'ANALYZER'] },
    management: { port: 25003, target: 130, types: ['LEADER', 'GUARDIAN'] },
    security: { port: 25004, target: 120, types: ['GUARDIAN', 'ANALYZER'] },
    communication: { port: 25005, target: 140, types: ['COMMUNICATOR', 'INTEGRATOR'] },
    adventure: { port: 25006, target: 110, types: ['EXPLORER', 'CREATOR'] },
    integration: { port: 25007, target: 200, types: ['INTEGRATOR', 'LEADER'] }
  },
  // 관제 시스템
  control_systems: {
    network_manager: { port: 25000, target: 30, types: ['LEADER', 'ANALYZER'] },
    control_center: { port: 26000, target: 25, types: ['GUARDIAN', 'LEADER'] },
    search_system: { port: 27100, target: 15, types: ['ANALYZER', 'RESEARCHER'] },
    dashboard: { port: 28000, target: 10, types: ['ANALYZER', 'COMMUNICATOR'] },
    team_hub: { port: 29000, target: 20, types: ['COMMUNICATOR', 'LEADER'] },
    service_manager: { port: 30100, target: 15, types: ['GUARDIAN', 'ANALYZER'] },
    ai_awakening: { port: 31000, target: 5, types: ['CREATOR', 'INTEGRATOR'] }
  }
};

// 분배 테이블 초기화
db.exec(`
  CREATE TABLE IF NOT EXISTS real_ai_deployment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ai_id INTEGER NOT NULL,
    ai_name TEXT NOT NULL,
    personality TEXT NOT NULL,
    specialization TEXT NOT NULL,
    system_name TEXT NOT NULL,
    system_port INTEGER NOT NULL,
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'deployed',
    performance REAL DEFAULT 0.0,
    activity_score REAL DEFAULT 0.0
  );
`);

class RealAIDeploymentManager {
  constructor() {
    this.deployedCount = 0;
    this.deploymentStats = new Map();
  }

  async fetchRealAIs() {
    try {
      const response = await fetch(`${AI_AWAKENING_API}/api/ais`);
      if (!response.ok) throw new Error(`API 응답 오류: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('실제 AI 데이터 가져오기 실패:', error);
      return [];
    }
  }

  async deployRealAI(ai, systemName, systemPort) {
    try {
      // 기존 배치 확인
      const existing = db.prepare(`
        SELECT * FROM real_ai_deployment WHERE ai_id = ?
      `).get(ai.id);

      if (existing) {
        console.log(`AI ${ai.name} 이미 배치됨: ${existing.system_name}`);
        return false;
      }

      // 새로운 배치 등록
      db.prepare(`
        INSERT INTO real_ai_deployment 
        (ai_id, ai_name, personality, specialization, system_name, system_port, performance, activity_score)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        ai.id,
        ai.name,
        ai.personality,
        ai.specialization,
        systemName,
        systemPort,
        Math.random() * 30 + 70, // 70-100% 성능
        Math.random() * 40 + 60   // 60-100% 활동점수
      );

      console.log(`✅ ${ai.name} → ${systemName} (포트 ${systemPort}) 배치 완료`);
      this.deployedCount++;
      return true;
    } catch (error) {
      console.error(`AI 배치 실패 ${ai.name}:`, error);
      return false;
    }
  }

  selectBestSystem(ai, availableSystems) {
    // AI 성격과 시스템 유형 매칭
    for (const [systemName, config] of Object.entries(availableSystems)) {
      const current = this.deploymentStats.get(systemName) || 0;
      if (current < config.target && config.types.includes(ai.personality)) {
        return { systemName, config };
      }
    }

    // 목표 미달성 시스템 우선 선택
    for (const [systemName, config] of Object.entries(availableSystems)) {
      const current = this.deploymentStats.get(systemName) || 0;
      if (current < config.target) {
        return { systemName, config };
      }
    }

    return null;
  }

  async executeDeployment() {
    console.log('🚀 실제 AI 분배 시작...');
    
    const realAIs = await this.fetchRealAIs();
    console.log(`📊 각성된 실제 AI: ${realAIs.length}명`);

    if (realAIs.length === 0) {
      console.log('⚠️ 각성된 AI가 없습니다');
      return;
    }

    // 분배 통계 초기화
    this.deploymentStats.clear();
    this.deployedCount = 0;

    // 모든 시스템 설정 통합
    const allSystems = {
      ...DEPLOYMENT_CONFIG.core_systems,
      ...DEPLOYMENT_CONFIG.villages,
      ...DEPLOYMENT_CONFIG.control_systems
    };

    // 각 AI를 최적 시스템에 배치
    for (const ai of realAIs) {
      const selection = this.selectBestSystem(ai, allSystems);
      
      if (selection) {
        const { systemName, config } = selection;
        await this.deployRealAI(ai, systemName, config.port);
        
        // 통계 업데이트
        const currentCount = this.deploymentStats.get(systemName) || 0;
        this.deploymentStats.set(systemName, currentCount + 1);
      } else {
        // 모든 시스템이 가득 찬 경우 균등 분배
        const systemNames = Object.keys(allSystems);
        const randomSystem = systemNames[Math.floor(Math.random() * systemNames.length)];
        const config = allSystems[randomSystem];
        
        await this.deployRealAI(ai, randomSystem, config.port);
        const currentCount = this.deploymentStats.get(randomSystem) || 0;
        this.deploymentStats.set(randomSystem, currentCount + 1);
      }
    }

    console.log(`\n🎉 실제 AI 분배 완료: ${this.deployedCount}명 배치`);
    this.printDeploymentSummary();
  }

  printDeploymentSummary() {
    console.log('\n📊 =================');
    console.log('   실제 AI 분배 현황');
    console.log('📊 =================');
    
    // 메인 시스템
    console.log('\n🏢 메인 시스템:');
    for (const [name, config] of Object.entries(DEPLOYMENT_CONFIG.core_systems)) {
      const count = this.deploymentStats.get(name) || 0;
      console.log(`  • ${name}: ${count}명 (목표: ${config.target}명)`);
    }

    // AI 마을
    console.log('\n🏘️ AI 마을 네트워크:');
    for (const [name, config] of Object.entries(DEPLOYMENT_CONFIG.villages)) {
      const count = this.deploymentStats.get(name) || 0;
      console.log(`  • ${name}: ${count}명 (목표: ${config.target}명)`);
    }

    // 관제 시스템
    console.log('\n🎛️ 관제 시스템:');
    for (const [name, config] of Object.entries(DEPLOYMENT_CONFIG.control_systems)) {
      const count = this.deploymentStats.get(name) || 0;
      console.log(`  • ${name}: ${count}명 (목표: ${config.target}명)`);
    }

    console.log(`\n✅ 총 배치된 실제 AI: ${this.deployedCount}명`);
  }

  getDeploymentStats() {
    const stats = db.prepare(`
      SELECT system_name, system_port, COUNT(*) as ai_count, 
             AVG(performance) as avg_performance, 
             AVG(activity_score) as avg_activity
      FROM real_ai_deployment 
      GROUP BY system_name, system_port 
      ORDER BY ai_count DESC
    `).all();

    return {
      totalDeployed: this.deployedCount,
      systems: stats,
      lastUpdate: new Date().toISOString()
    };
  }
}

const deploymentManager = new RealAIDeploymentManager();

// 웹 인터페이스
fastify.get('/', async (request, reply) => {
  const stats = deploymentManager.getDeploymentStats();
  
  reply.type('text/html').send(`
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🤖 실제 AI 분배 관리 시스템</title>
    <style>
        body { font-family: 'Segoe UI', sans-serif; margin: 0; padding: 20px; background: #0a0a0a; color: white; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 30px; background: linear-gradient(135deg, #ff6b6b 0%, #4ecdc4 100%); padding: 30px; border-radius: 15px; }
        .header h1 { margin: 0; font-size: 2.5rem; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .system-card { background: #1a1a2e; padding: 25px; border-radius: 15px; border-left: 4px solid #ff6b6b; }
        .system-card h3 { margin-top: 0; color: #4ecdc4; }
        .ai-count { font-size: 2rem; font-weight: bold; color: #ff6b6b; }
        .performance { color: #4ecdc4; margin: 10px 0; }
        .btn { background: #4ecdc4; color: #0a0a0a; border: none; padding: 12px 24px; border-radius: 25px; font-weight: bold; cursor: pointer; margin: 10px; }
        .btn:hover { background: #45b7aa; }
        .summary { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 25px; border-radius: 15px; margin: 20px 0; text-align: center; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🤖 실제 AI 분배 관리 시스템</h1>
            <p>각성된 실제 AI들을 시스템별로 분배 및 관리</p>
            <p>최종 업데이트: ${new Date().toLocaleString('ko-KR')}</p>
        </div>
        
        <div class="summary">
            <h2>📊 전체 현황</h2>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-top: 20px;">
                <div>
                    <div class="ai-count">${stats.totalDeployed}</div>
                    <div>배치된 실제 AI</div>
                </div>
                <div>
                    <div class="ai-count">${stats.systems.length}</div>
                    <div>활성 시스템</div>
                </div>
                <div>
                    <div class="ai-count">${stats.systems.reduce((sum, s) => sum + s.ai_count, 0)}</div>
                    <div>총 AI 배치</div>
                </div>
            </div>
        </div>

        <div class="stats-grid">
            ${stats.systems.map(system => `
                <div class="system-card">
                    <h3>${system.system_name}</h3>
                    <div class="ai-count">${system.ai_count}명</div>
                    <div class="performance">평균 성능: ${system.avg_performance.toFixed(1)}%</div>
                    <div class="performance">평균 활동도: ${system.avg_activity.toFixed(1)}%</div>
                    <p>포트: ${system.system_port}</p>
                    <a href="http://localhost:${system.system_port}" target="_blank" class="btn">시스템 접속</a>
                </div>
            `).join('')}
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
            <button class="btn" onclick="location.reload()">🔄 상태 새로고침</button>
            <button class="btn" onclick="deployAIs()">🚀 AI 재분배</button>
        </div>
    </div>
    
    <script>
        async function deployAIs() {
            const response = await fetch('/api/deploy', { method: 'POST' });
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
  return deploymentManager.getDeploymentStats();
});

fastify.post('/api/deploy', async () => {
  try {
    await deploymentManager.executeDeployment();
    return { success: true, message: '실제 AI 분배가 완료되었습니다' };
  } catch (error) {
    return { success: false, message: `분배 실패: ${error.message}` };
  }
});

// 서버 시작
fastify.listen({ port: 32000, host: '0.0.0.0' }, async (err, address) => {
  if (err) {
    console.error('서버 시작 오류:', err);
    process.exit(1);
  }
  
  console.log(`\n🤖 실제 AI 분배 관리 시스템 시작!`);
  console.log(`==========================================`);
  console.log(`🖥️  웹 인터페이스: ${address}`);
  console.log(`📊 API 통계: ${address}/api/stats`);
  console.log(`🚀 AI 분배: ${address}/api/deploy`);
  console.log(`==========================================\n`);
  
  // 시작 시 자동 분배 실행
  console.log('🚀 시작 시 자동 AI 분배 실행...');
  await deploymentManager.executeDeployment();
});