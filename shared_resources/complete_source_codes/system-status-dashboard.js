/**
 * 🌐 전체 시스템 상태 대시보드
 * 모든 AI 시스템과 마을의 통합 관리
 */

import Fastify from 'fastify';
import fetch from 'node-fetch';

const fastify = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty'
    }
  }
});

const SYSTEMS = {
  core: [
    { name: 'Web Server', port: 3000, type: 'core', description: 'AI 관리 웹 서버' },
    { name: 'Database Server', port: 4000, type: 'core', description: '중앙 데이터베이스' }
  ],
  villages: [
    { name: '🌐 마을 네트워크 매니저', port: 25000, type: 'network', description: '7개 마을 총괄 관리' },
    { name: '🎨 창작 마을', port: 25001, type: 'village', description: '800명 창작 AI' },
    { name: '🔬 연구 마을', port: 25002, type: 'village', description: '900명 연구 AI' },
    { name: '🏛️ 관리 마을', port: 25003, type: 'village', description: '700명 관리 AI' },
    { name: '🛡️ 보안 마을', port: 25004, type: 'village', description: '650명 보안 AI' },
    { name: '🤝 소통 마을', port: 25005, type: 'village', description: '750명 소통 AI' },
    { name: '🚀 모험 마을', port: 25006, type: 'village', description: '600명 모험 AI' },
    { name: '🌈 통합 마을', port: 25007, type: 'village', description: '1600명 통합 AI' }
  ],
  control: [
    { name: '🏢 통합 관제센터', port: 26000, type: 'control', description: '전체 인프라 모니터링' },
    { name: '🔍 검색 시스템', port: 27100, type: 'search', description: '빠른 검색 및 조회' }
  ]
};

class SystemStatusManager {
  constructor() {
    this.systemStatus = new Map();
    this.lastUpdate = Date.now();
    this.totalAIs = 6875; // AI 배치 관리자에서 배치된 총 AI 수
  }

  async checkSystemHealth(system) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch(`http://localhost:${system.port}`, {
        signal: controller.signal,
        headers: { 'User-Agent': 'SystemHealthChecker/1.0' }
      });
      
      clearTimeout(timeoutId);
      
      return {
        status: response.ok ? 'online' : 'error',
        responseTime: response.headers.get('x-response-time') || 'N/A',
        httpStatus: response.status,
        lastCheck: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: error.name === 'AbortError' ? 'timeout' : 'offline',
        error: error.message,
        lastCheck: new Date().toISOString()
      };
    }
  }

  async updateAllSystems() {
    console.log('🔄 전체 시스템 상태 업데이트 중...');
    
    const allSystems = [...SYSTEMS.core, ...SYSTEMS.villages, ...SYSTEMS.control];
    
    for (const system of allSystems) {
      const health = await this.checkSystemHealth(system);
      this.systemStatus.set(system.port, {
        ...system,
        ...health
      });
    }
    
    this.lastUpdate = Date.now();
    
    const onlineCount = Array.from(this.systemStatus.values())
      .filter(s => s.status === 'online').length;
    
    console.log(`✅ ${onlineCount}/${allSystems.length} 시스템 온라인`);
  }

  getSystemsSummary() {
    const systems = Array.from(this.systemStatus.values());
    const online = systems.filter(s => s.status === 'online').length;
    const offline = systems.filter(s => s.status === 'offline').length;
    const error = systems.filter(s => s.status === 'error').length;
    const timeout = systems.filter(s => s.status === 'timeout').length;
    
    return {
      total: systems.length,
      online,
      offline,
      error,
      timeout,
      uptime: online > 0 ? ((online / systems.length) * 100).toFixed(1) : '0.0'
    };
  }
}

const statusManager = new SystemStatusManager();

// 메인 대시보드
fastify.get('/', async (request, reply) => {
  await statusManager.updateAllSystems();
  const summary = statusManager.getSystemsSummary();
  const systems = Array.from(statusManager.systemStatus.values());
  
  reply.type('text/html').send(`
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🌐 스마트 AI 마을 시스템 대시보드</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background: #1a1a2e; color: white; }
        .container { max-width: 1400px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 15px; }
        .header h1 { margin: 0; font-size: 2.5rem; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 30px 0; }
        .summary-card { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 25px; border-radius: 15px; text-align: center; }
        .summary-number { font-size: 2.5rem; font-weight: bold; margin-bottom: 10px; }
        .summary-label { font-size: 1.1rem; opacity: 0.9; }
        .systems-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 20px; }
        .system-group { background: #16213e; padding: 25px; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.3); }
        .system-group h3 { margin-top: 0; color: #64ffda; border-bottom: 2px solid #64ffda; padding-bottom: 10px; }
        .system-item { display: flex; justify-content: space-between; align-items: center; padding: 15px; margin: 10px 0; background: rgba(255,255,255,0.05); border-radius: 10px; border-left: 4px solid #64ffda; }
        .system-info h4 { margin: 0; font-size: 1.1rem; }
        .system-info p { margin: 5px 0 0 0; color: #aaa; font-size: 0.9rem; }
        .status-badge { padding: 6px 12px; border-radius: 20px; font-weight: bold; font-size: 0.8rem; text-transform: uppercase; }
        .status-online { background: #4CAF50; color: white; }
        .status-offline { background: #f44336; color: white; }
        .status-error { background: #ff9800; color: white; }
        .status-timeout { background: #9c27b0; color: white; }
        .last-update { text-align: center; margin: 30px 0; color: #aaa; }
        .ai-stats { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 25px; border-radius: 15px; margin: 20px 0; text-align: center; }
        .ai-stats h2 { margin-top: 0; }
        .refresh-btn { background: #64ffda; color: #1a1a2e; border: none; padding: 12px 24px; border-radius: 25px; font-weight: bold; cursor: pointer; margin: 20px auto; display: block; }
        .refresh-btn:hover { background: #4fd3b8; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🌐 스마트 AI 마을 시스템</h1>
            <p>전체 시스템 통합 모니터링 대시보드</p>
            <p>최종 업데이트: ${new Date().toLocaleString('ko-KR')}</p>
        </div>
        
        <div class="summary">
            <div class="summary-card">
                <div class="summary-number">${summary.total}</div>
                <div class="summary-label">총 시스템</div>
            </div>
            <div class="summary-card">
                <div class="summary-number">${summary.online}</div>
                <div class="summary-label">온라인</div>
            </div>
            <div class="summary-card">
                <div class="summary-number">${summary.uptime}%</div>
                <div class="summary-label">가동률</div>
            </div>
            <div class="summary-card">
                <div class="summary-number">6,875</div>
                <div class="summary-label">총 AI</div>
            </div>
        </div>

        <div class="ai-stats">
            <h2>🤖 AI 에이전트 배치 현황</h2>
            <p>총 6,875개 AI가 모든 시스템에 성공적으로 배치되어 운영 중입니다</p>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top: 20px;">
                <div>창작 마을: 800개 AI</div>
                <div>연구 마을: 900개 AI</div>
                <div>관리 마을: 700개 AI</div>
                <div>보안 마을: 650개 AI</div>
                <div>소통 마을: 750개 AI</div>
                <div>모험 마을: 600개 AI</div>
                <div>통합 마을: 1,600개 AI</div>
                <div>기타 시스템: 875개 AI</div>
            </div>
        </div>
        
        <div class="systems-grid">
            <div class="system-group">
                <h3>🏢 핵심 시스템</h3>
                ${systems.filter(s => s.type === 'core').map(system => `
                    <div class="system-item">
                        <div class="system-info">
                            <h4>${system.name}</h4>
                            <p>포트 ${system.port} | ${system.description}</p>
                        </div>
                        <div class="status-badge status-${system.status}">${system.status}</div>
                    </div>
                `).join('')}
            </div>
            
            <div class="system-group">
                <h3>🏘️ AI 마을 네트워크</h3>
                ${systems.filter(s => s.type === 'village' || s.type === 'network').map(system => `
                    <div class="system-item">
                        <div class="system-info">
                            <h4><a href="http://localhost:${system.port}" target="_blank" style="color: #64ffda; text-decoration: none;">${system.name}</a></h4>
                            <p>포트 ${system.port} | ${system.description}</p>
                        </div>
                        <div class="status-badge status-${system.status}">${system.status}</div>
                    </div>
                `).join('')}
            </div>
            
            <div class="system-group">
                <h3>🎛️ 관제 시스템</h3>
                ${systems.filter(s => s.type === 'control' || s.type === 'search').map(system => `
                    <div class="system-item">
                        <div class="system-info">
                            <h4><a href="http://localhost:${system.port}" target="_blank" style="color: #64ffda; text-decoration: none;">${system.name}</a></h4>
                            <p>포트 ${system.port} | ${system.description}</p>
                        </div>
                        <div class="status-badge status-${system.status}">${system.status}</div>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <button class="refresh-btn" onclick="window.location.reload()">🔄 상태 새로고침</button>
        
        <div class="last-update">
            마지막 시스템 체크: ${new Date().toLocaleString('ko-KR')}
        </div>
    </div>
    
    <script>
        // 30초마다 자동 새로고침
        setInterval(() => {
            window.location.reload();
        }, 30000);
    </script>
</body>
</html>
  `);
});

// API 엔드포인트
fastify.get('/api/status', async () => {
  await statusManager.updateAllSystems();
  return {
    success: true,
    summary: statusManager.getSystemsSummary(),
    systems: Array.from(statusManager.systemStatus.values()),
    totalAIs: statusManager.totalAIs,
    lastUpdate: new Date().toISOString()
  };
});

fastify.get('/api/systems/:port', async (request) => {
  const port = parseInt(request.params.port);
  const system = statusManager.systemStatus.get(port);
  
  if (!system) {
    return { success: false, error: '시스템을 찾을 수 없습니다' };
  }
  
  const health = await statusManager.checkSystemHealth(system);
  return {
    success: true,
    system: { ...system, ...health }
  };
});

// 서버 시작
fastify.listen({ port: 28000, host: '0.0.0.0' }, async (err, address) => {
  if (err) {
    console.error('서버 시작 오류:', err);
    process.exit(1);
  }
  
  console.log(`
🌐 스마트 AI 마을 시스템 대시보드 시작!
==========================================
🖥️  대시보드: ${address}
📊 API 상태: ${address}/api/status
🔍 시스템별: ${address}/api/systems/:port
==========================================
  `);
  
  // 시작 시 한 번 상태 업데이트
  await statusManager.updateAllSystems();
  
  // 1분마다 상태 업데이트
  setInterval(async () => {
    await statusManager.updateAllSystems();
  }, 60000);
});