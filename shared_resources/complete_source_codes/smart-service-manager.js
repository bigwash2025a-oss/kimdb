/**
 * 🔄 스마트 서비스 관리자
 * 방문자 모니터링, 자동 폐쇄/활성화, AI 요청 시 즉시 활성화
 */

import Fastify from 'fastify';
import fetch from 'node-fetch';
import Database from 'better-sqlite3';
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

// 데이터베이스 연결
const dbPath = join('/home/kimjin/바탕화면/kim/shared_database/', 'service_management.db');
const db = new Database(dbPath);

// 서비스 관리 테이블 생성
db.exec(`
  CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    port INTEGER UNIQUE NOT NULL,
    type TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    last_visit DATETIME,
    visit_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    closed_at DATETIME,
    activation_requests INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS service_visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_id INTEGER,
    visit_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT,
    user_agent TEXT,
    FOREIGN KEY (service_id) REFERENCES services(id)
  );

  CREATE TABLE IF NOT EXISTS activation_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_id INTEGER,
    requester TEXT,
    reason TEXT,
    request_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'pending',
    FOREIGN KEY (service_id) REFERENCES services(id)
  );
`);

const SERVICES = [
  { name: '🎨 창작 마을', port: 25001, type: 'village', script: 'villages/creative-village-server.js' },
  { name: '🔬 연구 마을', port: 25002, type: 'village', script: 'villages/research-village-server.js' },
  { name: '🏢 통합 관제센터', port: 26000, type: 'control', script: 'integrated-control-center.js' },
  { name: '🔍 고급 검색 API', port: 27000, type: 'search', script: 'smart-search-api.js' },
  { name: '🏢 CODE 팀 허브', port: 29000, type: 'team', script: 'team-communication-hub.js' }
];

class SmartServiceManager {
  constructor() {
    this.runningProcesses = new Map();
    this.visitStats = new Map();
    this.initServices();
    this.startMonitoring();
  }

  initServices() {
    console.log('📊 서비스 초기화 중...');
    
    // 서비스 DB에 등록
    for (const service of SERVICES) {
      const existing = db.prepare('SELECT * FROM services WHERE port = ?').get(service.port);
      if (!existing) {
        db.prepare(`
          INSERT INTO services (name, port, type, status, visit_count)
          VALUES (?, ?, ?, 'active', 0)
        `).run(service.name, service.port, service.type);
        console.log(`📝 ${service.name} 서비스 등록 완료`);
      }
    }
  }

  async checkServiceVisits(port) {
    try {
      const response = await fetch(`http://localhost:${port}`, { 
        timeout: 3000,
        headers: { 'User-Agent': 'ServiceMonitor/1.0' }
      });
      
      if (response.ok) {
        // 방문 기록
        const service = db.prepare('SELECT * FROM services WHERE port = ?').get(port);
        if (service) {
          db.prepare(`
            UPDATE services 
            SET last_visit = CURRENT_TIMESTAMP, visit_count = visit_count + 1
            WHERE port = ?
          `).run(port);
          
          db.prepare(`
            INSERT INTO service_visits (service_id, ip_address, user_agent)
            VALUES (?, 'monitor', 'ServiceMonitor/1.0')
          `).run(service.id);
        }
        return true;
      }
    } catch (error) {
      return false;
    }
    return false;
  }

  async analyzeServiceUsage() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    // 1시간 동안 방문이 없는 서비스들 찾기
    const inactiveServices = db.prepare(`
      SELECT * FROM services 
      WHERE status = 'active' 
      AND (last_visit IS NULL OR last_visit < ?)
      AND visit_count < 5
    `).all(oneHourAgo);

    console.log(`🔍 1시간 동안 방문 없는 서비스: ${inactiveServices.length}개`);
    
    return inactiveServices;
  }

  async closeInactiveService(serviceId, port, name) {
    try {
      // 프로세스 종료
      const processes = await this.findProcessByPort(port);
      for (const pid of processes) {
        try {
          process.kill(pid, 'SIGTERM');
          console.log(`🛑 ${name} (PID: ${pid}) 프로세스 종료`);
        } catch (killError) {
          console.warn(`⚠️ 프로세스 ${pid} 종료 실패:`, killError.message);
        }
      }

      // DB 상태 업데이트
      db.prepare(`
        UPDATE services 
        SET status = 'maintenance', closed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(serviceId);

      console.log(`💤 ${name} 서비스 정기점검 모드로 전환`);
      return true;
    } catch (error) {
      console.error(`❌ ${name} 서비스 종료 실패:`, error.message);
      return false;
    }
  }

  async findProcessByPort(port) {
    return new Promise((resolve) => {
      const { exec } = require('child_process');
      exec(`lsof -t -i:${port}`, (error, stdout) => {
        if (error) {
          resolve([]);
          return;
        }
        const pids = stdout.trim().split('\n').filter(pid => pid).map(pid => parseInt(pid));
        resolve(pids);
      });
    });
  }

  async activateService(serviceId, requester, reason) {
    const service = db.prepare('SELECT * FROM services WHERE id = ?').get(serviceId);
    if (!service) {
      return { success: false, error: '서비스를 찾을 수 없습니다' };
    }

    try {
      // 요청 기록
      db.prepare(`
        INSERT INTO activation_requests (service_id, requester, reason)
        VALUES (?, ?, ?)
      `).run(serviceId, requester, reason);

      // 서비스 스크립트 찾기
      const serviceConfig = SERVICES.find(s => s.port === service.port);
      if (!serviceConfig) {
        return { success: false, error: '서비스 설정을 찾을 수 없습니다' };
      }

      // 프로세스 시작
      const serverProcess = spawn('node', [serviceConfig.script], {
        detached: false,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      console.log(`🚀 ${service.name} 서비스 활성화 시작 (PID: ${serverProcess.pid})`);

      // DB 상태 업데이트
      db.prepare(`
        UPDATE services 
        SET status = 'active', activation_requests = activation_requests + 1
        WHERE id = ?
      `).run(serviceId);

      db.prepare(`
        UPDATE activation_requests 
        SET status = 'completed'
        WHERE service_id = ? AND status = 'pending'
      `).run(serviceId);

      return { 
        success: true, 
        message: `${service.name} 서비스가 활성화되었습니다`,
        pid: serverProcess.pid
      };
    } catch (error) {
      console.error(`❌ ${service.name} 활성화 실패:`, error.message);
      return { success: false, error: error.message };
    }
  }

  async startMonitoring() {
    console.log('🔄 서비스 모니터링 시작 (1시간 간격)');
    
    // 1시간마다 체크
    setInterval(async () => {
      console.log('\n📊 정기 서비스 사용량 분석...');
      
      const inactiveServices = await this.analyzeServiceUsage();
      
      for (const service of inactiveServices) {
        console.log(`💤 ${service.name} - 방문자 ${service.visit_count}회, 마지막 방문: ${service.last_visit || '없음'}`);
        await this.closeInactiveService(service.id, service.port, service.name);
      }
      
      if (inactiveServices.length === 0) {
        console.log('✅ 모든 서비스가 활성 상태입니다');
      }
    }, 60 * 60 * 1000); // 1시간

    // 5분마다 빠른 체크
    setInterval(async () => {
      for (const service of SERVICES) {
        await this.checkServiceVisits(service.port);
      }
    }, 5 * 60 * 1000); // 5분
  }

  getServiceStats() {
    const services = db.prepare('SELECT * FROM services ORDER BY visit_count DESC').all();
    const recentVisits = db.prepare(`
      SELECT s.name, sv.visit_time 
      FROM service_visits sv
      JOIN services s ON sv.service_id = s.id
      ORDER BY sv.visit_time DESC
      LIMIT 10
    `).all();

    return { services, recentVisits };
  }
}

const serviceManager = new SmartServiceManager();

// 관리 대시보드
fastify.get('/', async (request, reply) => {
  const stats = serviceManager.getServiceStats();
  
  reply.type('text/html').send(`
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🔄 스마트 서비스 관리자</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background: #0f172a; color: #e2e8f0; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 30px; background: linear-gradient(135deg, #1e40af, #3b82f6); padding: 30px; border-radius: 15px; }
        .services-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 20px; }
        .service-card { background: #1e293b; border: 1px solid #334155; padding: 20px; border-radius: 12px; }
        .status-active { border-left: 4px solid #10b981; }
        .status-maintenance { border-left: 4px solid #f59e0b; }
        .service-name { font-size: 1.2rem; font-weight: bold; margin-bottom: 10px; }
        .service-stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin: 15px 0; }
        .stat-item { background: #0f172a; padding: 10px; border-radius: 6px; text-align: center; }
        .activate-btn { background: #10b981; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; width: 100%; }
        .activate-btn:disabled { background: #6b7280; cursor: not-allowed; }
        .recent-visits { background: #1e293b; border: 1px solid #334155; padding: 20px; border-radius: 12px; margin-top: 20px; }
        .visit-item { padding: 8px; background: #0f172a; margin: 5px 0; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔄 스마트 서비스 관리자</h1>
            <p>방문자 모니터링 및 자동 최적화 시스템</p>
            <p>현재 시간: ${new Date().toLocaleString('ko-KR')}</p>
        </div>

        <div class="services-grid">
            ${stats.services.map(service => `
                <div class="service-card status-${service.status}">
                    <div class="service-name">${service.name}</div>
                    <div>포트: ${service.port} | 상태: ${service.status === 'active' ? '🟢 활성' : '🟡 정기점검'}</div>
                    
                    <div class="service-stats">
                        <div class="stat-item">
                            <div><strong>${service.visit_count}</strong></div>
                            <div>총 방문</div>
                        </div>
                        <div class="stat-item">
                            <div><strong>${service.activation_requests}</strong></div>
                            <div>활성화 요청</div>
                        </div>
                    </div>
                    
                    <div>마지막 방문: ${service.last_visit ? new Date(service.last_visit).toLocaleString('ko-KR') : '없음'}</div>
                    
                    ${service.status === 'maintenance' ? `
                        <button class="activate-btn" onclick="activateService(${service.id}, '${service.name}')">
                            🚀 서비스 활성화
                        </button>
                    ` : `
                        <button class="activate-btn" disabled>
                            ✅ 활성 중
                        </button>
                    `}
                </div>
            `).join('')}
        </div>

        <div class="recent-visits">
            <h3>📊 최근 방문 기록</h3>
            ${stats.recentVisits.map(visit => `
                <div class="visit-item">
                    ${visit.name} - ${new Date(visit.visit_time).toLocaleString('ko-KR')}
                </div>
            `).join('')}
        </div>
    </div>

    <script>
        async function activateService(serviceId, serviceName) {
            const reason = prompt(serviceName + ' 서비스를 활성화하는 이유를 입력하세요:');
            if (!reason) return;

            try {
                const response = await fetch('/api/activate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        serviceId,
                        requester: 'AI_USER',
                        reason
                    })
                });

                const result = await response.json();
                
                if (result.success) {
                    alert('✅ ' + result.message);
                    setTimeout(() => location.reload(), 2000);
                } else {
                    alert('❌ 활성화 실패: ' + result.error);
                }
            } catch (error) {
                alert('❌ 오류 발생: ' + error.message);
            }
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

// API 엔드포인트들
fastify.post('/api/activate', async (request, reply) => {
  const { serviceId, requester, reason } = request.body;
  const result = await serviceManager.activateService(serviceId, requester, reason);
  return result;
});

fastify.get('/api/services', async (request, reply) => {
  return serviceManager.getServiceStats();
});

fastify.get('/api/services/:id/activate', async (request, reply) => {
  const serviceId = parseInt(request.params.id);
  const result = await serviceManager.activateService(serviceId, 'API_REQUEST', 'API 호출을 통한 활성화');
  return result;
});

// 공개 활성화 페이지 (AI들이 접근)
fastify.get('/activate', async (request, reply) => {
  const services = db.prepare('SELECT * FROM services WHERE status = "maintenance"').all();
  
  reply.type('text/html').send(`
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🚀 서비스 활성화 요청</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background: #1a202c; color: #e2e8f0; text-align: center; }
        .container { max-width: 800px; margin: 0 auto; background: #2d3748; padding: 40px; border-radius: 15px; }
        .service-item { background: #4a5568; padding: 20px; margin: 15px 0; border-radius: 10px; }
        .activate-btn { background: #48bb78; color: white; border: none; padding: 15px 30px; border-radius: 8px; cursor: pointer; font-size: 1.1rem; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 서비스 활성화 요청</h1>
        <p>현재 정기점검 중인 서비스들을 다시 활성화할 수 있습니다</p>
        
        ${services.length > 0 ? services.map(service => `
            <div class="service-item">
                <h3>${service.name}</h3>
                <p>포트: ${service.port} | 정기점검 시작: ${new Date(service.closed_at).toLocaleString('ko-KR')}</p>
                <button class="activate-btn" onclick="activateService(${service.id}, '${service.name}')">
                    활성화 요청
                </button>
            </div>
        `).join('') : '<p>현재 모든 서비스가 활성 상태입니다! ✅</p>'}
    </div>

    <script>
        async function activateService(serviceId, serviceName) {
            const reason = prompt('활성화 사유를 입력하세요:');
            if (!reason) return;

            const response = await fetch('/api/activate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    serviceId,
                    requester: 'AI_REQUEST',
                    reason
                })
            });

            const result = await response.json();
            
            if (result.success) {
                alert('✅ ' + serviceName + ' 서비스가 활성화되었습니다!');
                setTimeout(() => location.reload(), 2000);
            } else {
                alert('❌ 활성화 실패: ' + result.error);
            }
        }
    </script>
</body>
</html>
  `);
});

// 서버 시작
fastify.listen({ port: 30100, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    console.error('서버 시작 오류:', err);
    process.exit(1);
  }
  
  console.log(`
🔄 스마트 서비스 관리자 시작!
================================
🖥️  관리 대시보드: ${address}
🚀 공개 활성화: ${address}/activate
📊 API 상태: ${address}/api/services
================================

📋 모니터링 대상 서비스:
${SERVICES.map(s => `   ${s.name} (포트 ${s.port})`).join('\n')}

🔍 모니터링 정책:
   • 1시간 동안 방문자 없는 서비스 → 정기점검 모드
   • 방문자 5회 미만 → 폐쇄 대상
   • AI 요청 시 즉시 활성화 가능
   • 5분마다 방문자 체크, 1시간마다 분석
  `);
});