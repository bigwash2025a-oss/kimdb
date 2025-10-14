/**
 * 🏘️ 모든 AI 마을 서버 일괄 시작 스크립트
 */

import { spawn } from 'child_process';
import path from 'path';

const VILLAGES = [
  { name: 'management', port: 25003, theme: '관리', population: 700 },
  { name: 'security', port: 25004, theme: '보안', population: 650 },
  { name: 'communication', port: 25005, theme: '소통', population: 750 },
  { name: 'adventure', port: 25006, theme: '모험', population: 600 },
  { name: 'integration', port: 25007, theme: '통합', population: 1600 }
];

async function createVillageServer(villageConfig) {
  const { name, port, theme, population } = villageConfig;
  
  const serverCode = `/**
 * 🏘️ ${theme} 마을 서버 (포트 ${port})
 * ${population}명 AI 에이전트 거주
 */

import Fastify from 'fastify';

const fastify = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true
      }
    }
  }
});

console.log('🏘️ ${theme} 마을 서버 시작...');

// 마을 기본 정보
const VILLAGE_INFO = {
  id: '${name}_village',
  name: '${getEmoji(theme)} ${theme} 마을',
  theme: '${name}',
  port: ${port},
  population: ${population},
  mayor: '${getMayor(theme)}',
  status: 'active',
  facilities: getFacilities('${name}'),
  specialties: getSpecialties('${name}'),
  aiAgents: generateAIAgents(${population})
};

// 이모지 매핑
function getEmoji(theme) {
  const emojis = {
    '관리': '🏛️',
    '보안': '🛡️', 
    '소통': '🤝',
    '모험': '🚀',
    '통합': '🌈'
  };
  return emojis[theme] || '🏘️';
}

// 시장 매핑
function getMayor(theme) {
  const mayors = {
    '관리': 'LEADER3_789',
    '보안': 'GUARDIAN2_456',
    '소통': 'COMMUNICATOR1_123',
    '모험': 'EXPLORER4_012',
    '통합': 'INTEGRATOR3_345'
  };
  return mayors[theme] || 'MANAGER1_000';
}

// 시설 생성
function getFacilities(villageType) {
  const facilitiesMap = {
    management: [
      { name: '🏢 관리사무소', type: 'office', capacity: 100, usage: 78 },
      { name: '📊 전략센터', type: 'strategy_center', capacity: 50, usage: 42 },
      { name: '📋 기획실', type: 'planning_room', capacity: 30, usage: 28 }
    ],
    security: [
      { name: '🛡️ 보안관제센터', type: 'control_center', capacity: 80, usage: 65 },
      { name: '🔒 방화벽센터', type: 'firewall_center', capacity: 60, usage: 48 },
      { name: '👮 순찰본부', type: 'patrol_base', capacity: 40, usage: 35 }
    ],
    communication: [
      { name: '📡 통신센터', type: 'comm_center', capacity: 120, usage: 95 },
      { name: '🤝 협업공간', type: 'collaboration_space', capacity: 200, usage: 156 },
      { name: '💬 소통광장', type: 'communication_plaza', capacity: 300, usage: 234 }
    ],
    adventure: [
      { name: '🗺️ 탐험기지', type: 'exploration_base', capacity: 80, usage: 67 },
      { name: '🎯 도전센터', type: 'challenge_center', capacity: 60, usage: 45 },
      { name: '🚀 혁신랩', type: 'innovation_lab', capacity: 40, usage: 32 }
    ],
    integration: [
      { name: '🌈 통합센터', type: 'integration_center', capacity: 500, usage: 387 },
      { name: '🔗 연결허브', type: 'connection_hub', capacity: 300, usage: 267 },
      { name: '⚖️ 균형센터', type: 'balance_center', capacity: 200, usage: 156 },
      { name: '🎭 다양성홀', type: 'diversity_hall', capacity: 400, usage: 321 }
    ]
  };
  
  return facilitiesMap[villageType] || [];
}

// 전문분야 생성
function getSpecialties(villageType) {
  const specialtiesMap = {
    management: ['리더십', '전략기획', '프로젝트관리', '의사결정', '조직운영'],
    security: ['사이버보안', '위험관리', '모니터링', '방어체계', '사고대응'],
    communication: ['소통기술', '협업도구', '관계관리', '정보전달', '팀워크'],
    adventure: ['탐험기술', '혁신사고', '도전정신', '문제해결', '창의성'],
    integration: ['통합관리', '조화구현', '다양성포용', '균형유지', '연결촉진']
  };
  
  return specialtiesMap[villageType] || [];
}

// AI 에이전트 생성
function generateAIAgents(count) {
  const agents = [];
  for (let i = 1; i <= count; i++) {
    agents.push({
      id: \`\${VILLAGE_INFO.theme}_ai_\${i.toString().padStart(4, '0')}\`,
      name: \`${theme}AI_\${i}\`,
      role: VILLAGE_INFO.specialties[i % VILLAGE_INFO.specialties.length],
      status: 'active',
      performance: Math.random() * 30 + 70,
      satisfaction: Math.random() * 20 + 80,
      joinDate: new Date().toISOString()
    });
  }
  return agents;
}

// 홈페이지
fastify.get('/', async (request, reply) => {
  reply.type('text/html').send(\`
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>\${VILLAGE_INFO.name}</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background: #f0f8ff; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 30px; background: white; padding: 30px; border-radius: 15px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 30px 0; }
        .stat-card { background: white; padding: 25px; border-radius: 15px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .stat-number { font-size: 32px; font-weight: bold; color: #007bff; margin-bottom: 10px; }
        .stat-label { color: #666; font-size: 16px; }
        .facilities, .ai-list { background: white; padding: 25px; border-radius: 15px; margin: 20px 0; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .facility-item { padding: 15px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; }
        .ai-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 15px; max-height: 400px; overflow-y: auto; }
        .ai-card { background: #f8f9fa; padding: 15px; border-radius: 10px; }
        .progress-bar { width: 100%; height: 8px; background: #e0e0e0; border-radius: 4px; overflow: hidden; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #4CAF50, #2196F3); transition: width 0.3s; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>\${VILLAGE_INFO.name}</h1>
            <p>포트 \${VILLAGE_INFO.port} | 인구 \${VILLAGE_INFO.population}명 | 시장: \${VILLAGE_INFO.mayor}</p>
        </div>
        
        <div class="stats">
            <div class="stat-card">
                <div class="stat-number">\${VILLAGE_INFO.population}</div>
                <div class="stat-label">거주 AI</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">\${VILLAGE_INFO.facilities.length}</div>
                <div class="stat-label">운영 시설</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">\${VILLAGE_INFO.specialties.length}</div>
                <div class="stat-label">전문분야</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">98.5%</div>
                <div class="stat-label">만족도</div>
            </div>
        </div>

        <div class="facilities">
            <h2>🏢 마을 시설</h2>
            \${VILLAGE_INFO.facilities.map(facility => \`
                <div class="facility-item">
                    <div>
                        <strong>\${facility.name}</strong>
                        <div style="color: #666; font-size: 14px;">용량: \${facility.capacity} | 현재: \${facility.usage}</div>
                    </div>
                    <div style="width: 100px;">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: \${(facility.usage/facility.capacity*100)}%"></div>
                        </div>
                    </div>
                </div>
            \`).join('')}
        </div>

        <div class="ai-list">
            <h2>🤖 AI 에이전트 (최근 20명)</h2>
            <div class="ai-grid">
                \${VILLAGE_INFO.aiAgents.slice(0, 20).map(ai => \`
                    <div class="ai-card">
                        <div><strong>\${ai.name}</strong></div>
                        <div style="color: #666; font-size: 14px;">\${ai.role}</div>
                        <div style="margin-top: 10px;">
                            <div>성능: \${ai.performance.toFixed(1)}%</div>
                            <div class="progress-bar" style="margin-top: 5px;">
                                <div class="progress-fill" style="width: \${ai.performance}%"></div>
                            </div>
                        </div>
                    </div>
                \`).join('')}
            </div>
        </div>
    </div>
</body>
</html>
  \`);
});

// API 엔드포인트들
fastify.get('/api/status', async () => {
  return {
    success: true,
    village: VILLAGE_INFO.name,
    status: 'active',
    population: VILLAGE_INFO.population,
    facilities: VILLAGE_INFO.facilities.length,
    timestamp: new Date().toISOString()
  };
});

fastify.get('/api/facilities', async () => {
  return {
    success: true,
    facilities: VILLAGE_INFO.facilities
  };
});

fastify.get('/api/agents', async (request) => {
  const { limit = 50, offset = 0 } = request.query;
  const agents = VILLAGE_INFO.aiAgents.slice(offset, offset + parseInt(limit));
  
  return {
    success: true,
    total: VILLAGE_INFO.aiAgents.length,
    agents: agents
  };
});

fastify.get('/health', async () => {
  return { status: 'healthy', timestamp: new Date().toISOString() };
});

// 서버 시작
fastify.listen({ port: ${port}, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    console.error('서버 시작 오류:', err);
    process.exit(1);
  }
  console.log(\`
🏘️ ${theme} 마을 서버 시작 완료!
============================
🌐 주소: \${address}
👥 인구: ${population}명 AI
🏢 시설: \${VILLAGE_INFO.facilities.length}개
🎯 전문분야: \${VILLAGE_INFO.specialties.length}개
============================
  \`);
});`;

  // 파일 저장
  const filePath = path.join('villages', `${name}-village-server.js`);
  return { code: serverCode, path: filePath };
}

async function startAllVillages() {
  console.log('🏘️ 모든 AI 마을 서버 생성 및 시작...\n');
  
  for (const village of VILLAGES) {
    try {
      // 서버 코드 생성
      const { code, path: filePath } = await createVillageServer(village);
      
      // 파일 쓰기
      const fs = await import('fs');
      await fs.promises.writeFile(filePath, code);
      
      console.log(`📝 ${village.theme} 마을 서버 파일 생성: ${filePath}`);
      
      // 서버 시작
      const serverProcess = spawn('node', [filePath], {
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe']
      });
      
      serverProcess.stdout.on('data', (data) => {
        console.log(`[${village.theme} 마을] ${data.toString().trim()}`);
      });
      
      serverProcess.stderr.on('data', (data) => {
        console.error(`[${village.theme} 마을 ERROR] ${data.toString().trim()}`);
      });
      
      console.log(`🚀 ${village.theme} 마을 서버 시작됨 (PID: ${serverProcess.pid})`);
      
      // 잠시 대기
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`❌ ${village.theme} 마을 서버 시작 실패:`, error.message);
    }
  }
  
  console.log('\n✅ 모든 AI 마을 서버 시작 완료!');
  console.log('\n🌐 접속 주소:');
  VILLAGES.forEach(village => {
    console.log(`   ${village.theme} 마을: http://localhost:${village.port}`);
  });
}

// 시작
startAllVillages().catch(console.error);