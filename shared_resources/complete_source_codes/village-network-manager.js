/**
 * 🌐 AI 마을 네트워크 매니저
 * 25000번대 포트로 7개 마을을 관리하는 중앙 시스템
 */

import Fastify from 'fastify';
import { spawn } from 'child_process';
import { join } from 'path';

const fastify = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty'
    }
  }
});

console.log('🌐 AI 마을 네트워크 매니저 시작...');

// 마을 정보
const VILLAGES = {
  creative: {
    id: 'creative_village',
    name: '🎨 창작 마을',
    port: 25001,
    theme: 'creative',
    population: 800,
    mayor: 'CREATOR1_123',
    specialties: ['Art', 'Design', 'Music', 'Writing'],
    status: 'offline',
    process: null
  },
  research: {
    id: 'research_village', 
    name: '🔬 연구 마을',
    port: 25002,
    theme: 'research',
    population: 900,
    mayor: 'ANALYZER2_456',
    specialties: ['Science', 'Technology', 'Research', 'Innovation'],
    status: 'offline',
    process: null
  },
  admin: {
    id: 'admin_village',
    name: '🏛️ 관리 마을',
    port: 25003,
    theme: 'administration', 
    population: 700,
    mayor: 'LEADER3_789',
    specialties: ['Management', 'Leadership', 'Organization', 'Strategy'],
    status: 'offline',
    process: null
  },
  security: {
    id: 'security_village',
    name: '🛡️ 보안 마을',
    port: 25004,
    theme: 'security',
    population: 650, 
    mayor: 'GUARDIAN4_101112',
    specialties: ['Security', 'Protection', 'Monitoring', 'Safety'],
    status: 'offline',
    process: null
  },
  communication: {
    id: 'communication_village',
    name: '🤝 소통 마을',
    port: 25005,
    theme: 'communication',
    population: 750,
    mayor: 'SUPPORTER5_131415', 
    specialties: ['Communication', 'Support', 'Collaboration', 'Service'],
    status: 'offline',
    process: null
  },
  adventure: {
    id: 'adventure_village',
    name: '🚀 모험 마을', 
    port: 25006,
    theme: 'adventure',
    population: 600,
    mayor: 'EXPLORER6_161718',
    specialties: ['Exploration', 'Adventure', 'Discovery', 'Challenge'],
    status: 'offline',
    process: null
  },
  integration: {
    id: 'integration_village',
    name: '🌈 통합 마을',
    port: 25007,
    theme: 'integration',
    population: 1600,
    mayor: 'MEDIATOR7_192021',
    specialties: ['Diversity', 'Integration', 'Unity', 'Harmony'],
    status: 'offline', 
    process: null
  }
};

// 정적 파일 서비스
await fastify.register(import('@fastify/static'), {
  root: join(process.cwd(), 'public'),
  prefix: '/public/'
});

// === 마을 네트워크 대시보드 ===
fastify.get('/', async (request, reply) => {
  const totalPopulation = Object.values(VILLAGES).reduce((sum, village) => sum + village.population, 0);
  const activeVillages = Object.values(VILLAGES).filter(v => v.status === 'online').length;

  return reply.type('text/html').send(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>🌐 AI 마을 네트워크</title>
        <style>
            body {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #2193b0 100%);
                color: white;
                font-family: 'Arial', sans-serif;
                margin: 0;
                padding: 20px;
                min-height: 100vh;
            }
            .container {
                max-width: 1400px;
                margin: 0 auto;
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(10px);
                border-radius: 20px;
                padding: 30px;
            }
            .header {
                text-align: center;
                margin-bottom: 40px;
            }
            .header h1 {
                font-size: 3.5rem;
                margin: 0;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
                background: linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4, #ffeaa7);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }
            .network-stats {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 20px;
                margin: 30px 0;
            }
            .stat-card {
                background: rgba(255, 255, 255, 0.2);
                border-radius: 15px;
                padding: 20px;
                text-align: center;
            }
            .villages-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
                gap: 25px;
                margin-top: 30px;
            }
            .village-card {
                background: rgba(255, 255, 255, 0.15);
                border-radius: 20px;
                padding: 25px;
                transition: all 0.3s ease;
                border: 2px solid transparent;
                cursor: pointer;
            }
            .village-card:hover {
                transform: translateY(-5px);
                border-color: rgba(255, 255, 255, 0.3);
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            }
            .village-card.online {
                border-color: #00ff88;
                box-shadow: 0 0 20px rgba(0, 255, 136, 0.3);
            }
            .village-card.offline {
                opacity: 0.7;
            }
            .village-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
            }
            .village-header h3 {
                margin: 0;
                font-size: 1.5rem;
            }
            .status-badge {
                padding: 5px 12px;
                border-radius: 20px;
                font-size: 0.8rem;
                font-weight: bold;
            }
            .status-badge.online {
                background: #00ff88;
                color: #000;
            }
            .status-badge.offline {
                background: #ff4757;
                color: white;
            }
            .village-info {
                margin: 15px 0;
            }
            .village-specialties {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin: 10px 0;
            }
            .specialty-tag {
                background: rgba(255, 255, 255, 0.2);
                padding: 4px 10px;
                border-radius: 12px;
                font-size: 0.8rem;
            }
            .village-actions {
                display: flex;
                gap: 10px;
                margin-top: 15px;
            }
            .btn {
                padding: 8px 16px;
                border: none;
                border-radius: 20px;
                cursor: pointer;
                font-weight: bold;
                transition: all 0.3s;
                text-decoration: none;
                display: inline-block;
                text-align: center;
            }
            .btn-visit {
                background: #4ecdc4;
                color: white;
            }
            .btn-start {
                background: #00ff88;
                color: #000;
            }
            .btn-stop {
                background: #ff4757;
                color: white;
            }
            .btn:hover {
                transform: scale(1.05);
            }
            .control-panel {
                text-align: center;
                margin: 40px 0;
                padding: 20px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 15px;
            }
            .control-panel button {
                margin: 0 10px;
                padding: 12px 25px;
                font-size: 1.1rem;
            }
            .network-map {
                margin-top: 40px;
                text-align: center;
            }
            .connections {
                display: flex;
                justify-content: center;
                align-items: center;
                flex-wrap: wrap;
                gap: 20px;
                margin: 20px 0;
            }
            .connection-line {
                width: 60px;
                height: 3px;
                background: linear-gradient(90deg, transparent, #4ecdc4, transparent);
                animation: pulse 2s infinite;
            }
            @keyframes pulse {
                0%, 100% { opacity: 0.3; }
                50% { opacity: 1; }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🌐 AI 마을 네트워크</h1>
                <p>25000번대 포트로 연결된 7개의 특색있는 AI 마을</p>
                <p><strong>총 인구:</strong> ${totalPopulation.toLocaleString()}명 AI | <strong>활성 마을:</strong> ${activeVillages}/7개</p>
            </div>
            
            <div class="network-stats">
                <div class="stat-card">
                    <h3>🏘️ 전체 마을</h3>
                    <div style="font-size: 2.5rem; font-weight: bold;">7개</div>
                </div>
                <div class="stat-card">
                    <h3>🟢 활성 마을</h3>
                    <div style="font-size: 2.5rem; font-weight: bold;">${activeVillages}개</div>
                </div>
                <div class="stat-card">
                    <h3>👥 총 인구</h3>
                    <div style="font-size: 2rem; font-weight: bold;">${totalPopulation.toLocaleString()}</div>
                </div>
                <div class="stat-card">
                    <h3>🌐 포트 범위</h3>
                    <div style="font-size: 1.5rem; font-weight: bold;">25001-25007</div>
                </div>
            </div>

            <div class="control-panel">
                <h3>🎮 마을 네트워크 제어</h3>
                <button class="btn btn-start" onclick="startAllVillages()">🚀 모든 마을 시작</button>
                <button class="btn btn-stop" onclick="stopAllVillages()">⏹️ 모든 마을 정지</button>
                <button class="btn btn-visit" onclick="window.open('/api/network-status', '_blank')">📊 네트워크 상태</button>
            </div>

            <div class="villages-grid">
                ${Object.values(VILLAGES).map(village => `
                    <div class="village-card ${village.status}" onclick="visitVillage(${village.port})">
                        <div class="village-header">
                            <h3>${village.name}</h3>
                            <span class="status-badge ${village.status}">${village.status.toUpperCase()}</span>
                        </div>
                        
                        <div class="village-info">
                            <p><strong>포트:</strong> ${village.port}</p>
                            <p><strong>인구:</strong> ${village.population.toLocaleString()}명</p>
                            <p><strong>마을장:</strong> ${village.mayor}</p>
                        </div>

                        <div class="village-specialties">
                            ${village.specialties.map(spec => `<span class="specialty-tag">${spec}</span>`).join('')}
                        </div>

                        <div class="village-actions">
                            <a href="http://localhost:${village.port}" target="_blank" class="btn btn-visit">🏘️ 방문하기</a>
                            <button class="btn btn-start" onclick="startVillage('${village.id}')">▶️ 시작</button>
                            <button class="btn btn-stop" onclick="stopVillage('${village.id}')">⏹️ 정지</button>
                        </div>
                    </div>
                `).join('')}
            </div>

            <div class="network-map">
                <h3>🗺️ 마을 연결망</h3>
                <div class="connections">
                    <div>🎨 창작마을</div>
                    <div class="connection-line"></div>
                    <div>🔬 연구마을</div>
                    <div class="connection-line"></div>
                    <div>🏛️ 관리마을</div>
                    <div class="connection-line"></div>
                    <div>🛡️ 보안마을</div>
                </div>
                <div class="connections">
                    <div>🤝 소통마을</div>
                    <div class="connection-line"></div>
                    <div>🌈 통합마을</div>
                    <div class="connection-line"></div>
                    <div>🚀 모험마을</div>
                </div>
            </div>
        </div>
        
        <script>
            function visitVillage(port) {
                window.open('http://localhost:' + port, '_blank');
            }
            
            async function startVillage(villageId) {
                try {
                    const response = await fetch('/api/village/' + villageId + '/start', { method: 'POST' });
                    const result = await response.json();
                    if (result.success) {
                        location.reload();
                    }
                } catch (error) {
                    console.error('마을 시작 실패:', error);
                }
            }
            
            async function stopVillage(villageId) {
                try {
                    const response = await fetch('/api/village/' + villageId + '/stop', { method: 'POST' });
                    const result = await response.json();
                    if (result.success) {
                        location.reload();
                    }
                } catch (error) {
                    console.error('마을 정지 실패:', error);
                }
            }
            
            async function startAllVillages() {
                try {
                    const response = await fetch('/api/villages/start-all', { method: 'POST' });
                    const result = await response.json();
                    if (result.success) {
                        location.reload();
                    }
                } catch (error) {
                    console.error('모든 마을 시작 실패:', error);
                }
            }
            
            async function stopAllVillages() {
                try {
                    const response = await fetch('/api/villages/stop-all', { method: 'POST' });
                    const result = await response.json();
                    if (result.success) {
                        location.reload();
                    }
                } catch (error) {
                    console.error('모든 마을 정지 실패:', error);
                }
            }
            
            // 자동 상태 업데이트 (10초마다)
            setInterval(() => {
                fetch('/api/network-status')
                    .then(response => response.json())
                    .then(data => {
                        // 상태가 변경된 경우에만 새로고침
                        // 실제로는 더 세밀한 업데이트 로직 필요
                    })
                    .catch(console.error);
            }, 10000);
        </script>
    </body>
    </html>
  `);
});

// === API 라우트들 ===

// 네트워크 상태 확인
fastify.get('/api/network-status', async () => {
  // 각 마을의 상태를 확인
  const villageStatuses = {};
  
  for (const [key, village] of Object.entries(VILLAGES)) {
    try {
      // 실제 HTTP 요청으로 상태 확인 (간단한 시뮬레이션)
      villageStatuses[key] = {
        ...village,
        lastCheck: new Date(),
        responseTime: Math.random() * 100 + 50 // 시뮬레이션
      };
    } catch (error) {
      villageStatuses[key] = {
        ...village,
        error: error.message,
        lastCheck: new Date()
      };
    }
  }
  
  return {
    success: true,
    timestamp: new Date(),
    totalVillages: Object.keys(VILLAGES).length,
    activeVillages: Object.values(villageStatuses).filter(v => v.status === 'online').length,
    villages: villageStatuses
  };
});

// 개별 마을 시작
fastify.post('/api/village/:villageId/start', async (request, reply) => {
  const { villageId } = request.params;
  const village = Object.values(VILLAGES).find(v => v.id === villageId);
  
  if (!village) {
    return reply.code(404).send({
      success: false,
      error: 'Village not found'
    });
  }
  
  if (village.status === 'online') {
    return {
      success: false,
      message: '마을이 이미 실행 중입니다'
    };
  }
  
  try {
    // 실제로는 마을 서버 프로세스를 시작해야 함
    // 현재는 시뮬레이션
    village.status = 'starting';
    
    setTimeout(() => {
      village.status = 'online';
    }, 3000);
    
    return {
      success: true,
      message: `${village.name} 시작 중...`,
      port: village.port
    };
  } catch (error) {
    return reply.code(500).send({
      success: false,
      error: error.message
    });
  }
});

// 개별 마을 정지  
fastify.post('/api/village/:villageId/stop', async (request, reply) => {
  const { villageId } = request.params;
  const village = Object.values(VILLAGES).find(v => v.id === villageId);
  
  if (!village) {
    return reply.code(404).send({
      success: false,
      error: 'Village not found'
    });
  }
  
  village.status = 'offline';
  
  return {
    success: true,
    message: `${village.name} 정지됨`
  };
});

// 모든 마을 시작
fastify.post('/api/villages/start-all', async () => {
  for (const village of Object.values(VILLAGES)) {
    if (village.status === 'offline') {
      village.status = 'starting';
      // 실제로는 각 마을 서버를 시작해야 함
      setTimeout(() => {
        village.status = 'online';
      }, 2000 + Math.random() * 3000);
    }
  }
  
  return {
    success: true,
    message: '모든 마을 시작 중...',
    villages: Object.values(VILLAGES).length
  };
});

// 모든 마을 정지
fastify.post('/api/villages/stop-all', async () => {
  for (const village of Object.values(VILLAGES)) {
    village.status = 'offline';
  }
  
  return {
    success: true,
    message: '모든 마을 정지됨',
    villages: Object.values(VILLAGES).length
  };
});

// 마을 목록
fastify.get('/api/villages', async () => {
  return {
    success: true,
    data: VILLAGES
  };
});

// 마을 간 연결 테스트
fastify.get('/api/village-connection/:from/:to', async (request, reply) => {
  const { from, to } = request.params;
  
  const fromVillage = Object.values(VILLAGES).find(v => v.id === from);
  const toVillage = Object.values(VILLAGES).find(v => v.id === to);
  
  if (!fromVillage || !toVillage) {
    return reply.code(404).send({
      success: false,
      error: '마을을 찾을 수 없습니다'
    });
  }
  
  return {
    success: true,
    connection: {
      from: fromVillage.name,
      to: toVillage.name,
      latency: Math.random() * 50 + 10,
      status: 'connected',
      lastTest: new Date()
    }
  };
});

// 서버 시작
const start = async () => {
  try {
    await fastify.listen({ port: 25000, host: '0.0.0.0' });
    
    console.log('\\n🌐 AI 마을 네트워크 매니저 시작!');
    console.log('=========================================');
    console.log('🎮 네트워크 관리: http://localhost:25000');
    console.log('📊 상태 모니터링: http://localhost:25000/api/network-status');
    console.log('🏘️ 관리할 마을: 7개');
    console.log('📡 포트 범위: 25001-25007');
    console.log('=========================================');
    
    // 마을별 포트 정보 출력
    console.log('\\n🗺️ 마을 포트 맵:');
    Object.values(VILLAGES).forEach(village => {
      console.log(`${village.name}: http://localhost:${village.port}`);
    });
    console.log('=========================================\\n');
    
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();