/**
 * 🏢 통합 관제센터 - 스마트 AI 마을 중앙 제어실
 * 포트 26000 - 모든 인프라 통합 모니터링
 */

import Fastify from 'fastify';
import { join } from 'path';

const fastify = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty'
    }
  }
});

// 정적 파일 서비스
await fastify.register(import('@fastify/static'), {
  root: join(process.cwd(), 'public'),
  prefix: '/static/'
});

console.log('🏢 스마트 AI 마을 통합 관제센터 시작...');

// 인프라 상태 데이터
const infraStatus = {
  // 기본 생활 인프라
  basicInfra: {
    dataFlow: {
      status: 'optimal',
      throughput: '8.7TB/hour',
      efficiency: 94.2,
      alerts: 0
    },
    computePower: {
      status: 'optimal', 
      utilization: 67.3,
      capacity: '5000 concurrent AI',
      peakLoad: 89.1
    },
    memoryStorage: {
      status: 'good',
      usage: 67.8,
      freeSpace: '160TB',
      fragmentationLevel: 'low'
    }
  },

  // 네트워크 및 통신
  network: {
    bandwidth: {
      status: 'optimal',
      utilization: 45.3,
      peakSpeed: '98.7Gbps',
      latency: '2.3ms average'
    },
    connectivity: {
      villageUptime: {
        'creative_village': 99.97,
        'research_village': 99.95,
        'admin_village': 100.0,
        'security_village': 99.99,
        'communication_village': 99.94,
        'adventure_village': 99.92,
        'integration_village': 99.98
      },
      totalConnections: 4847,
      activeStreams: 1236
    }
  },

  // 보안 시스템
  security: {
    threatLevel: 'green',
    activeThreats: 0,
    blockedAttempts: 23,
    lastUpdate: new Date(),
    vulnerabilityScore: 2.1
  },

  // AI 웰니스
  aiWellness: {
    averageHealth: 94.8,
    performanceIndex: 97.1,
    satisfactionRate: 96.3,
    stressLevel: 'low',
    learningEfficiency: 89.7
  },

  // 환경 및 에너지
  environment: {
    energyEfficiency: 94.2,
    carbonFootprint: 'neutral',
    resourceOptimization: 91.5,
    ecosystemHealth: 98.1
  }
};

// 실시간 메트릭
const realtimeMetrics = {
  activeAI: 4847,
  totalTransactions: 234567,
  systemUptime: 99.97,
  responseTime: 23.4,
  errorRate: 0.03,
  dataProcessed: '45.2TB today'
};

// 알림 시스템
const notifications = [
  {
    id: 1,
    type: 'info',
    title: '🔬 연구 마을 새로운 실험 시작',
    message: '양자 컴퓨팅 알고리즘 연구 프로젝트가 시작되었습니다.',
    timestamp: new Date('2024-01-20T14:30:00'),
    village: 'research_village',
    priority: 'normal'
  },
  {
    id: 2,
    type: 'success',
    title: '🎨 창작 마을 전시회 성공',
    message: 'AI 디지털 아트 전시회가 성공적으로 완료되었습니다.',
    timestamp: new Date('2024-01-20T12:15:00'),
    village: 'creative_village',
    priority: 'low'
  },
  {
    id: 3,
    type: 'warning',
    title: '⚡ 컴퓨팅 파워 사용량 증가',
    message: 'CPU 사용률이 85%를 초과했습니다. 모니터링 중...',
    timestamp: new Date('2024-01-20T15:45:00'),
    village: 'all',
    priority: 'medium'
  }
];

// === 메인 대시보드 ===
fastify.get('/', async (request, reply) => {
  return reply.type('text/html').send(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>🏢 스마트 AI 마을 통합 관제센터</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                background: linear-gradient(135deg, #1e3c72 0%, #2a5298 50%, #667eea 100%);
                color: white;
                font-family: 'Arial', sans-serif;
                overflow-x: hidden;
            }
            
            .control-center {
                min-height: 100vh;
                display: grid;
                grid-template-areas: 
                    "header header header header"
                    "sidebar main main metrics"
                    "sidebar main main metrics";
                grid-template-columns: 280px 1fr 1fr 320px;
                grid-template-rows: 80px 1fr 1fr;
                gap: 20px;
                padding: 20px;
            }
            
            .header {
                grid-area: header;
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(10px);
                border-radius: 15px;
                padding: 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border: 1px solid rgba(255, 255, 255, 0.2);
            }
            
            .header h1 {
                font-size: 1.8rem;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .system-time {
                font-size: 1.2rem;
                color: #00ff88;
            }
            
            .sidebar {
                grid-area: sidebar;
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(10px);
                border-radius: 15px;
                padding: 20px;
                border: 1px solid rgba(255, 255, 255, 0.2);
            }
            
            .main-panel {
                grid-area: main;
                display: grid;
                grid-template-columns: 1fr 1fr;
                grid-template-rows: 1fr 1fr;
                gap: 20px;
            }
            
            .metrics-panel {
                grid-area: metrics;
                display: flex;
                flex-direction: column;
                gap: 20px;
            }
            
            .panel {
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(10px);
                border-radius: 15px;
                padding: 20px;
                border: 1px solid rgba(255, 255, 255, 0.2);
                transition: all 0.3s ease;
            }
            
            .panel:hover {
                transform: translateY(-2px);
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            }
            
            .panel h3 {
                margin-bottom: 15px;
                color: #00ff88;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .status-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 15px;
                margin-top: 15px;
            }
            
            .status-item {
                text-align: center;
                padding: 15px;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 10px;
            }
            
            .status-value {
                font-size: 1.8rem;
                font-weight: bold;
                color: #00ff88;
                display: block;
                margin-bottom: 5px;
            }
            
            .status-label {
                font-size: 0.9rem;
                color: rgba(255, 255, 255, 0.8);
            }
            
            .village-list {
                list-style: none;
            }
            
            .village-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px;
                margin-bottom: 8px;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.3s;
            }
            
            .village-item:hover {
                background: rgba(255, 255, 255, 0.15);
                transform: translateX(5px);
            }
            
            .village-status {
                display: flex;
                align-items: center;
                gap: 5px;
            }
            
            .status-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #00ff88;
                animation: pulse 2s infinite;
            }
            
            .status-dot.warning {
                background: #ffd700;
            }
            
            .status-dot.error {
                background: #ff4757;
            }
            
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
            }
            
            .notification-item {
                padding: 12px;
                margin-bottom: 10px;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 8px;
                border-left: 4px solid #00ff88;
            }
            
            .notification-item.warning {
                border-left-color: #ffd700;
            }
            
            .notification-item.error {
                border-left-color: #ff4757;
            }
            
            .notification-title {
                font-weight: bold;
                margin-bottom: 5px;
            }
            
            .notification-message {
                font-size: 0.9rem;
                color: rgba(255, 255, 255, 0.8);
                margin-bottom: 5px;
            }
            
            .notification-time {
                font-size: 0.8rem;
                color: rgba(255, 255, 255, 0.6);
            }
            
            .progress-bar {
                width: 100%;
                height: 8px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 4px;
                overflow: hidden;
                margin: 10px 0;
            }
            
            .progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #00ff88, #4ecdc4);
                border-radius: 4px;
                transition: width 0.3s ease;
            }
            
            .chart-placeholder {
                height: 150px;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: rgba(255, 255, 255, 0.6);
            }
            
            @media (max-width: 1200px) {
                .control-center {
                    grid-template-areas: 
                        "header header"
                        "sidebar main"
                        "metrics metrics";
                    grid-template-columns: 300px 1fr;
                    grid-template-rows: 80px 1fr auto;
                }
                
                .main-panel {
                    grid-template-columns: 1fr;
                }
                
                .metrics-panel {
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    display: grid;
                }
            }
        </style>
    </head>
    <body>
        <div class="control-center">
            <!-- Header -->
            <div class="header">
                <h1>
                    <span>🏢</span>
                    <span>스마트 AI 마을 통합 관제센터</span>
                </h1>
                <div class="system-time" id="systemTime">
                    ${new Date().toLocaleString('ko-KR')}
                </div>
            </div>

            <!-- Sidebar - Village Status -->
            <div class="sidebar panel">
                <h3>🏘️ 마을 현황</h3>
                <ul class="village-list">
                    <li class="village-item" onclick="openVillage(25001)">
                        <span>🎨 창작 마을</span>
                        <div class="village-status">
                            <span class="status-dot"></span>
                            <span>99.97%</span>
                        </div>
                    </li>
                    <li class="village-item" onclick="openVillage(25002)">
                        <span>🔬 연구 마을</span>
                        <div class="village-status">
                            <span class="status-dot"></span>
                            <span>99.95%</span>
                        </div>
                    </li>
                    <li class="village-item" onclick="openVillage(25003)">
                        <span>🏛️ 관리 마을</span>
                        <div class="village-status">
                            <span class="status-dot"></span>
                            <span>100.0%</span>
                        </div>
                    </li>
                    <li class="village-item" onclick="openVillage(25004)">
                        <span>🛡️ 보안 마을</span>
                        <div class="village-status">
                            <span class="status-dot"></span>
                            <span>99.99%</span>
                        </div>
                    </li>
                    <li class="village-item" onclick="openVillage(25005)">
                        <span>🤝 소통 마을</span>
                        <div class="village-status">
                            <span class="status-dot warning"></span>
                            <span>99.94%</span>
                        </div>
                    </li>
                    <li class="village-item" onclick="openVillage(25006)">
                        <span>🚀 모험 마을</span>
                        <div class="village-status">
                            <span class="status-dot"></span>
                            <span>99.92%</span>
                        </div>
                    </li>
                    <li class="village-item" onclick="openVillage(25007)">
                        <span>🌈 통합 마을</span>
                        <div class="village-status">
                            <span class="status-dot"></span>
                            <span>99.98%</span>
                        </div>
                    </li>
                </ul>
                
                <div style="margin-top: 20px;">
                    <h4>📊 전체 통계</h4>
                    <div class="status-grid" style="grid-template-columns: 1fr;">
                        <div class="status-item">
                            <span class="status-value">${realtimeMetrics.activeAI}</span>
                            <span class="status-label">활성 AI</span>
                        </div>
                        <div class="status-item">
                            <span class="status-value">${realtimeMetrics.systemUptime}%</span>
                            <span class="status-label">시스템 가동률</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Main Panels -->
            <div class="main-panel">
                <!-- 인프라 상태 -->
                <div class="panel">
                    <h3>🌊 기본 인프라 상태</h3>
                    <div class="status-grid">
                        <div class="status-item">
                            <span class="status-value">${infraStatus.basicInfra.dataFlow.throughput}</span>
                            <span class="status-label">데이터 처리량</span>
                        </div>
                        <div class="status-item">
                            <span class="status-value">${infraStatus.basicInfra.computePower.utilization}%</span>
                            <span class="status-label">컴퓨팅 사용률</span>
                        </div>
                        <div class="status-item">
                            <span class="status-value">${infraStatus.basicInfra.memoryStorage.usage}%</span>
                            <span class="status-label">메모리 사용률</span>
                        </div>
                        <div class="status-item">
                            <span class="status-value">${infraStatus.network.bandwidth.utilization}%</span>
                            <span class="status-label">네트워크 사용률</span>
                        </div>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${infraStatus.basicInfra.dataFlow.efficiency}%"></div>
                    </div>
                    <p style="text-align: center; margin-top: 10px;">전체 효율성: ${infraStatus.basicInfra.dataFlow.efficiency}%</p>
                </div>

                <!-- 보안 상태 -->
                <div class="panel">
                    <h3>🛡️ 보안 현황</h3>
                    <div class="status-grid">
                        <div class="status-item">
                            <span class="status-value" style="color: #00ff88;">GREEN</span>
                            <span class="status-label">위협 수준</span>
                        </div>
                        <div class="status-item">
                            <span class="status-value">${infraStatus.security.activeThreats}</span>
                            <span class="status-label">활성 위협</span>
                        </div>
                        <div class="status-item">
                            <span class="status-value">${infraStatus.security.blockedAttempts}</span>
                            <span class="status-label">차단된 시도</span>
                        </div>
                        <div class="status-item">
                            <span class="status-value">${infraStatus.security.vulnerabilityScore}</span>
                            <span class="status-label">취약점 점수</span>
                        </div>
                    </div>
                    <div class="chart-placeholder">
                        📈 보안 이벤트 실시간 모니터링
                    </div>
                </div>

                <!-- AI 웰니스 -->
                <div class="panel">
                    <h3>🏥 AI 웰니스 현황</h3>
                    <div class="status-grid">
                        <div class="status-item">
                            <span class="status-value">${infraStatus.aiWellness.averageHealth}</span>
                            <span class="status-label">평균 건강도</span>
                        </div>
                        <div class="status-item">
                            <span class="status-value">${infraStatus.aiWellness.performanceIndex}</span>
                            <span class="status-label">성능 지수</span>
                        </div>
                        <div class="status-item">
                            <span class="status-value">${infraStatus.aiWellness.satisfactionRate}%</span>
                            <span class="status-label">만족도</span>
                        </div>
                        <div class="status-item">
                            <span class="status-value" style="color: #00ff88;">LOW</span>
                            <span class="status-label">스트레스 수준</span>
                        </div>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${infraStatus.aiWellness.learningEfficiency}%"></div>
                    </div>
                    <p style="text-align: center; margin-top: 10px;">학습 효율성: ${infraStatus.aiWellness.learningEfficiency}%</p>
                </div>

                <!-- 환경 및 에너지 -->
                <div class="panel">
                    <h3>🌱 환경 & 에너지</h3>
                    <div class="status-grid">
                        <div class="status-item">
                            <span class="status-value">${infraStatus.environment.energyEfficiency}%</span>
                            <span class="status-label">에너지 효율</span>
                        </div>
                        <div class="status-item">
                            <span class="status-value" style="color: #00ff88;">NEUTRAL</span>
                            <span class="status-label">탄소 발자국</span>
                        </div>
                        <div class="status-item">
                            <span class="status-value">${infraStatus.environment.resourceOptimization}%</span>
                            <span class="status-label">자원 최적화</span>
                        </div>
                        <div class="status-item">
                            <span class="status-value">${infraStatus.environment.ecosystemHealth}%</span>
                            <span class="status-label">생태계 건강도</span>
                        </div>
                    </div>
                    <div class="chart-placeholder">
                        🔋 실시간 에너지 사용량 모니터링
                    </div>
                </div>
            </div>

            <!-- Metrics Panel -->
            <div class="metrics-panel">
                <!-- 실시간 메트릭 -->
                <div class="panel">
                    <h3>📊 실시간 메트릭</h3>
                    <div class="status-item" style="margin-bottom: 10px;">
                        <span class="status-value">${realtimeMetrics.responseTime}ms</span>
                        <span class="status-label">평균 응답 시간</span>
                    </div>
                    <div class="status-item" style="margin-bottom: 10px;">
                        <span class="status-value">${realtimeMetrics.totalTransactions.toLocaleString()}</span>
                        <span class="status-label">총 트랜잭션</span>
                    </div>
                    <div class="status-item" style="margin-bottom: 10px;">
                        <span class="status-value">${realtimeMetrics.errorRate}%</span>
                        <span class="status-label">오류율</span>
                    </div>
                    <div class="status-item">
                        <span class="status-value">${realtimeMetrics.dataProcessed}</span>
                        <span class="status-label">처리된 데이터</span>
                    </div>
                </div>

                <!-- 알림 -->
                <div class="panel">
                    <h3>🔔 시스템 알림</h3>
                    <div style="max-height: 300px; overflow-y: auto;">
                        ${notifications.map(notif => `
                            <div class="notification-item ${notif.type}">
                                <div class="notification-title">${notif.title}</div>
                                <div class="notification-message">${notif.message}</div>
                                <div class="notification-time">${notif.timestamp.toLocaleString('ko-KR')}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- 퀵 액세스 -->
                <div class="panel">
                    <h3>⚡ 퀵 액세스</h3>
                    <button style="width: 100%; margin: 5px 0; padding: 10px; background: rgba(0,255,136,0.2); color: #00ff88; border: 1px solid #00ff88; border-radius: 8px; cursor: pointer;" onclick="window.open('http://localhost:25000', '_blank')">
                        🌐 마을 네트워크 매니저
                    </button>
                    <button style="width: 100%; margin: 5px 0; padding: 10px; background: rgba(0,255,136,0.2); color: #00ff88; border: 1px solid #00ff88; border-radius: 8px; cursor: pointer;" onclick="window.open('http://localhost:3000/discussion.html', '_blank')">
                        🗣️ AI 토론장
                    </button>
                    <button style="width: 100%; margin: 5px 0; padding: 10px; background: rgba(0,255,136,0.2); color: #00ff88; border: 1px solid #00ff88; border-radius: 8px; cursor: pointer;" onclick="window.open('http://localhost:3000', '_blank')">
                        🤖 메인 AI 시스템
                    </button>
                    <button style="width: 100%; margin: 5px 0; padding: 10px; background: rgba(0,255,136,0.2); color: #00ff88; border: 1px solid #00ff88; border-radius: 8px; cursor: pointer;" onclick="refreshAll()">
                        🔄 전체 새로고침
                    </button>
                </div>
            </div>
        </div>

        <script>
            function openVillage(port) {
                window.open('http://localhost:' + port, '_blank');
            }
            
            function refreshAll() {
                location.reload();
            }
            
            // 실시간 시간 업데이트
            function updateTime() {
                document.getElementById('systemTime').textContent = new Date().toLocaleString('ko-KR');
            }
            
            setInterval(updateTime, 1000);
            
            // 실시간 데이터 업데이트 (시뮬레이션)
            function updateMetrics() {
                // 실제로는 API 호출하여 최신 데이터 가져오기
                fetch('/api/realtime-metrics')
                    .then(response => response.json())
                    .then(data => {
                        // 메트릭 업데이트 로직
                    })
                    .catch(console.error);
            }
            
            setInterval(updateMetrics, 5000);
            
            console.log('🏢 통합 관제센터 가동 중...');
        </script>
    </body>
    </html>
  `);
});

// === API 엔드포인트들 ===

// 실시간 메트릭 API
fastify.get('/api/realtime-metrics', async () => {
  return {
    success: true,
    timestamp: new Date(),
    data: realtimeMetrics
  };
});

// 인프라 상태 API
fastify.get('/api/infrastructure-status', async () => {
  return {
    success: true,
    timestamp: new Date(),
    data: infraStatus
  };
});

// 알림 API
fastify.get('/api/notifications', async () => {
  return {
    success: true,
    data: notifications
  };
});

// 전체 시스템 상태
fastify.get('/api/system-status', async () => {
  return {
    success: true,
    timestamp: new Date(),
    systemHealth: 'optimal',
    uptime: realtimeMetrics.systemUptime,
    data: {
      infrastructure: infraStatus,
      realtime: realtimeMetrics,
      notifications: notifications
    }
  };
});

// 마을별 상세 상태
fastify.get('/api/village/:villageId/detailed-status', async (request, reply) => {
  const { villageId } = request.params;
  
  return {
    success: true,
    villageId,
    timestamp: new Date(),
    data: {
      infrastructure: infraStatus,
      performance: {
        cpuUsage: Math.random() * 30 + 60,
        memoryUsage: Math.random() * 20 + 65,
        networkLatency: Math.random() * 10 + 15,
        activeConnections: Math.floor(Math.random() * 500 + 800)
      },
      residents: {
        total: Math.floor(Math.random() * 300 + 600),
        active: Math.floor(Math.random() * 200 + 500),
        satisfaction: Math.random() * 10 + 90
      }
    }
  };
});

// 서버 시작
const start = async () => {
  try {
    await fastify.listen({ port: 26000, host: '0.0.0.0' });
    
    console.log('\\n🏢 스마트 AI 마을 통합 관제센터 가동!');
    console.log('=========================================');
    console.log('🎮 관제센터: http://localhost:26000');
    console.log('📊 실시간 API: http://localhost:26000/api/system-status');
    console.log('🏘️ 관제 대상: 7개 AI 마을');
    console.log('📡 모니터링: 실시간 인프라 상태');
    console.log('🔔 알림 시스템: 활성');
    console.log('=========================================\\n');
    
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();