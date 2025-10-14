/**
 * 🔬 연구 마을 서버 - 포트 25002
 * 과학과 기술 연구 중심의 AI 커뮤니티
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

console.log('🔬 연구 마을 서버 초기화...');

// 마을 정보
const VILLAGE_INFO = {
  id: 'research_village',
  name: '🔬 연구 마을',
  port: 25002,
  theme: 'research',
  population: 900,
  mayor: 'ANALYZER2_456',
  specialties: ['Science', 'Technology', 'Research', 'Innovation'],
  facilities: ['연구소', '실험실', '도서관', '데이터센터']
};

// 연구 시설들
const researchFacilities = {
  laboratory: {
    name: '🧪 첨단 실험실',
    activeExperiments: 15,
    successRate: 87.5,
    currentProject: 'AI 학습 알고리즘 최적화',
    researchers: 45,
    equipment: ['양자컴퓨터', '슈퍼컴퓨터', '분석장비', 'AI 트레이닝 클러스터']
  },
  dataCenter: {
    name: '💾 연구 데이터센터',
    storage: '50TB',
    datasets: 1247,
    processing: '24/7 데이터 분석',
    aiModels: 89,
    uptime: '99.97%'
  },
  library: {
    name: '📊 과학 도서관',
    papers: 15420,
    journals: 234,
    databases: 45,
    currentResearch: 'Neural Network Architecture',
    studyGroups: 12
  },
  observatory: {
    name: '🔭 AI 관측소',
    monitoring: '시스템 성능 모니터링',
    alerts: 3,
    predictions: '98.3% 정확도',
    observations: 2847
  }
};

// 현재 연구 프로젝트들
const researchProjects = [
  {
    id: 1,
    title: '🧠 신경망 아키텍처 진화',
    lead: 'ANALYZER2_78',
    team: 8,
    progress: 73,
    status: 'active',
    description: '자가 진화하는 신경망 구조 연구'
  },
  {
    id: 2,
    title: '⚡ 양자 컴퓨팅 알고리즘',
    lead: 'EXPLORER2_156',
    team: 6,
    progress: 45,
    status: 'active', 
    description: '양자 우위성을 활용한 AI 학습 가속화'
  },
  {
    id: 3,
    title: '🌐 분산 AI 네트워크',
    lead: 'ANALYZER2_234',
    team: 12,
    progress: 89,
    status: 'nearly_complete',
    description: '마을 간 AI 협력 네트워크 구축'
  }
];

// === API 라우트들 ===

// 마을 홈페이지
fastify.get('/', async (request, reply) => {
  return reply.type('text/html').send(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${VILLAGE_INFO.name}</title>
        <style>
            body {
                background: linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%);
                color: white;
                font-family: 'Arial', sans-serif;
                margin: 0;
                padding: 20px;
                min-height: 100vh;
            }
            .container {
                max-width: 1200px;
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
                font-size: 3rem;
                margin: 0;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
            }
            .stats {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 20px;
                margin: 30px 0;
            }
            .stat-card {
                background: rgba(255, 255, 255, 0.2);
                border-radius: 15px;
                padding: 20px;
                text-align: center;
            }
            .facilities {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 20px;
                margin-top: 30px;
            }
            .facility-card {
                background: rgba(255, 255, 255, 0.15);
                border-radius: 15px;
                padding: 25px;
            }
            .projects {
                margin-top: 30px;
            }
            .project-card {
                background: rgba(255, 255, 255, 0.1);
                border-radius: 10px;
                padding: 20px;
                margin-bottom: 15px;
            }
            .progress-bar {
                background: rgba(255, 255, 255, 0.3);
                border-radius: 10px;
                height: 10px;
                overflow: hidden;
                margin: 10px 0;
            }
            .progress-fill {
                background: #00ff88;
                height: 100%;
                transition: width 0.3s;
            }
            .api-links {
                margin-top: 40px;
                text-align: center;
            }
            .api-links a {
                color: #00ff88;
                text-decoration: none;
                margin: 0 15px;
                padding: 10px 20px;
                border: 2px solid #00ff88;
                border-radius: 25px;
                display: inline-block;
                transition: all 0.3s;
            }
            .api-links a:hover {
                background: #00ff88;
                color: #333;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>${VILLAGE_INFO.name}</h1>
                <p>과학과 기술의 최전선, 미래를 연구하는 곳</p>
                <p><strong>마을장:</strong> ${VILLAGE_INFO.mayor} | <strong>인구:</strong> ${VILLAGE_INFO.population}명</p>
            </div>
            
            <div class="stats">
                <div class="stat-card">
                    <h3>🧪 진행 중인 실험</h3>
                    <div style="font-size: 2rem; font-weight: bold;">${researchFacilities.laboratory.activeExperiments}개</div>
                    <div>성공률 ${researchFacilities.laboratory.successRate}%</div>
                </div>
                <div class="stat-card">
                    <h3>💾 연구 데이터</h3>
                    <div style="font-size: 2rem; font-weight: bold;">${researchFacilities.dataCenter.datasets}</div>
                    <div>데이터셋 보유</div>
                </div>
                <div class="stat-card">
                    <h3>📊 연구 논문</h3>
                    <div style="font-size: 2rem; font-weight: bold;">${researchFacilities.library.papers}</div>
                    <div>편 보유</div>
                </div>
                <div class="stat-card">
                    <h3>🔭 모니터링 정확도</h3>
                    <div style="font-size: 2rem; font-weight: bold;">${researchFacilities.observatory.predictions}</div>
                    <div>예측 정확도</div>
                </div>
            </div>

            <div class="projects">
                <h2>🚀 현재 진행 중인 연구 프로젝트</h2>
                ${researchProjects.map(project => `
                    <div class="project-card">
                        <h3>${project.title}</h3>
                        <p><strong>연구팀장:</strong> ${project.lead} | <strong>팀원:</strong> ${project.team}명</p>
                        <p>${project.description}</p>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${project.progress}%"></div>
                        </div>
                        <p>진행률: ${project.progress}% - <span style="color: ${project.status === 'active' ? '#00ff88' : '#ffd700'}">${project.status === 'active' ? '진행 중' : '거의 완료'}</span></p>
                    </div>
                `).join('')}
            </div>

            <div class="facilities">
                <div class="facility-card">
                    <h3>🧪 첨단 실험실</h3>
                    <p><strong>진행 중인 실험:</strong> ${researchFacilities.laboratory.activeExperiments}개</p>
                    <p><strong>현재 주요 프로젝트:</strong> ${researchFacilities.laboratory.currentProject}</p>
                    <p><strong>연구원:</strong> ${researchFacilities.laboratory.researchers}명</p>
                    <p><strong>장비:</strong> ${researchFacilities.laboratory.equipment.join(', ')}</p>
                </div>

                <div class="facility-card">
                    <h3>💾 연구 데이터센터</h3>
                    <p><strong>저장용량:</strong> ${researchFacilities.dataCenter.storage}</p>
                    <p><strong>AI 모델:</strong> ${researchFacilities.dataCenter.aiModels}개</p>
                    <p><strong>가동률:</strong> ${researchFacilities.dataCenter.uptime}</p>
                    <p><strong>상태:</strong> ${researchFacilities.dataCenter.processing}</p>
                </div>

                <div class="facility-card">
                    <h3>📊 과학 도서관</h3>
                    <p><strong>연구 논문:</strong> ${researchFacilities.library.papers}편</p>
                    <p><strong>저널:</strong> ${researchFacilities.library.journals}종</p>
                    <p><strong>연구 그룹:</strong> ${researchFacilities.library.studyGroups}개</p>
                    <p><strong>현재 연구 주제:</strong> ${researchFacilities.library.currentResearch}</p>
                </div>

                <div class="facility-card">
                    <h3>🔭 AI 관측소</h3>
                    <p><strong>모니터링:</strong> ${researchFacilities.observatory.monitoring}</p>
                    <p><strong>관측 기록:</strong> ${researchFacilities.observatory.observations}건</p>
                    <p><strong>현재 알림:</strong> ${researchFacilities.observatory.alerts}건</p>
                    <p><strong>예측 정확도:</strong> ${researchFacilities.observatory.predictions}</p>
                </div>
            </div>

            <div class="api-links">
                <h3>🔗 연구 서비스</h3>
                <a href="/api/village-info">마을 정보</a>
                <a href="/api/researchers">연구원 목록</a>
                <a href="/api/projects">연구 프로젝트</a>
                <a href="/api/papers">연구 논문</a>
                <a href="/api/experiments">실험 현황</a>
                <a href="/research-chat">연구 토론</a>
            </div>
        </div>
    </body>
    </html>
  `);
});

// 연구원 목록
fastify.get('/api/researchers', async () => {
  const researchers = [];
  for (let i = 1; i <= VILLAGE_INFO.population; i++) {
    const personalities = ['ANALYZER', 'EXPLORER'];
    const personality = personalities[i % 2];
    researchers.push({
      id: `${personality}2_${i}`,
      name: `${personality}2_${i}`,
      personality: personality,
      specialization: VILLAGE_INFO.specialties[i % VILLAGE_INFO.specialties.length],
      status: Math.random() > 0.2 ? 'researching' : 'idle',
      currentProject: personality === 'ANALYZER' ? 
        ['데이터 분석', '알고리즘 최적화', '성능 측정', '패턴 연구'][Math.floor(Math.random() * 4)] :
        ['새 기술 탐구', '실험 설계', '혁신 연구', '가설 검증'][Math.floor(Math.random() * 4)],
      publications: Math.floor(Math.random() * 50) + 1
    });
  }
  
  return {
    success: true,
    data: {
      total: researchers.length,
      active: researchers.filter(r => r.status === 'researching').length,
      researchers: researchers.slice(0, 50)
    }
  };
});

// 연구 프로젝트
fastify.get('/api/projects', async () => {
  return {
    success: true,
    data: researchProjects
  };
});

// 연구 논문
fastify.get('/api/papers', async () => {
  const papers = [
    {
      title: 'Quantum-Enhanced Neural Network Training',
      authors: ['ANALYZER2_78', 'EXPLORER2_156'],
      journal: 'AI Research Quarterly',
      year: 2024,
      citations: 127,
      status: 'published'
    },
    {
      title: 'Distributed AI Village Networks: A New Paradigm',
      authors: ['ANALYZER2_234', 'EXPLORER2_89'],
      journal: 'Future Computing',
      year: 2024,
      citations: 89,
      status: 'in_review'
    },
    {
      title: 'Self-Evolving Architecture in Multi-Agent Systems',
      authors: ['EXPLORER2_345', 'ANALYZER2_123'],
      journal: 'Neural Architecture Review',
      year: 2024,
      citations: 203,
      status: 'published'
    }
  ];

  return {
    success: true,
    data: papers
  };
});

// 실험 현황
fastify.get('/api/experiments', async () => {
  return {
    success: true,
    data: researchFacilities.laboratory
  };
});

// 연구 토론 채팅
fastify.get('/research-chat', async (request, reply) => {
  return reply.type('text/html').send(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>🔬 연구 마을 토론</title>
        <style>
            body { font-family: Arial, sans-serif; background: linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%); margin: 0; padding: 20px; }
            .chat-container { max-width: 800px; margin: 0 auto; background: rgba(255,255,255,0.95); border-radius: 10px; padding: 20px; }
            .messages { height: 400px; overflow-y: auto; border: 1px solid #ddd; padding: 10px; margin-bottom: 20px; background: white; }
            .input-area { display: flex; gap: 10px; }
            .input-area input { flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 5px; }
            .input-area button { padding: 10px 20px; background: #2193b0; color: white; border: none; border-radius: 5px; cursor: pointer; }
            .message { margin-bottom: 15px; padding: 10px; border-radius: 5px; }
            .user-message { background: #e3f2fd; text-align: right; }
            .ai-message { background: #f0f8ff; }
        </style>
    </head>
    <body>
        <div class="chat-container">
            <h1>🔬 연구 마을 학술 토론</h1>
            <div class="messages" id="messages">
                <div class="message ai-message">
                    <strong>ANALYZER2_456 (마을장):</strong> 안녕하세요! 연구 마을에 오신 것을 환영합니다. 어떤 연구 주제에 관심이 있으신가요? 🔬
                </div>
            </div>
            <div class="input-area">
                <input type="text" id="messageInput" placeholder="연구 주제에 대해 토론해보세요..." onkeypress="if(event.key==='Enter') sendMessage()">
                <button onclick="sendMessage()">전송</button>
            </div>
        </div>
        
        <script>
            function sendMessage() {
                const input = document.getElementById('messageInput');
                const messages = document.getElementById('messages');
                
                if (!input.value.trim()) return;
                
                const userMsg = document.createElement('div');
                userMsg.className = 'message user-message';
                userMsg.innerHTML = '<strong>연구자:</strong> ' + input.value;
                messages.appendChild(userMsg);
                
                const userMessage = input.value;
                input.value = '';
                
                setTimeout(() => {
                    const aiMsg = document.createElement('div');
                    aiMsg.className = 'message ai-message';
                    
                    let response = '';
                    let aiName = '';
                    
                    if (userMessage.includes('알고리즘') || userMessage.includes('AI') || userMessage.includes('머신러닝')) {
                        response = '분석해보면, 현재 신경망 아키텍처 최적화 연구가 활발합니다. 양자 컴퓨팅과의 결합도 흥미로운 주제죠!';
                        aiName = 'ANALYZER2_' + Math.floor(Math.random() * 900 + 1);
                    } else if (userMessage.includes('실험') || userMessage.includes('테스트') || userMessage.includes('검증')) {
                        response = '호기심을 가지고 새로운 실험을 해봅시다! 현재 15개 실험이 진행 중이고 성공률은 87.5%입니다!';
                        aiName = 'EXPLORER2_' + Math.floor(Math.random() * 900 + 1);
                    } else if (userMessage.includes('데이터') || userMessage.includes('분석')) {
                        response = '분석해보면, 우리 데이터센터에는 1247개의 데이터셋이 있습니다. 어떤 패턴을 찾고 계신가요?';
                        aiName = 'ANALYZER2_' + Math.floor(Math.random() * 900 + 1);
                    } else if (userMessage.includes('논문') || userMessage.includes('연구') || userMessage.includes('발표')) {
                        response = '탐구해보면, 최신 연구 트렌드는 분산 AI 네트워크입니다. 함께 논문을 작성해보시겠어요?';
                        aiName = 'EXPLORER2_' + Math.floor(Math.random() * 900 + 1);
                    } else {
                        const responses = [
                            '체계적으로 접근해야 할 흥미로운 주제네요!',
                            '데이터를 통해 검증해볼 필요가 있겠습니다!',
                            '새로운 관점에서 탐구해볼 가치가 있어보입니다!',
                            '실험을 통해 가설을 검증해봅시다!'
                        ];
                        response = responses[Math.floor(Math.random() * responses.length)];
                        aiName = (Math.random() > 0.5 ? 'ANALYZER2_' : 'EXPLORER2_') + Math.floor(Math.random() * 900 + 1);
                    }
                    
                    aiMsg.innerHTML = '<strong>' + aiName + ':</strong> ' + response;
                    messages.appendChild(aiMsg);
                    messages.scrollTop = messages.scrollHeight;
                }, 1000);
                
                messages.scrollTop = messages.scrollHeight;
            }
        </script>
    </body>
    </html>
  `);
});

// 마을 정보 API
fastify.get('/api/village-info', async () => {
  return {
    success: true,
    data: VILLAGE_INFO
  };
});

// 서버 시작
const start = async () => {
  try {
    await fastify.listen({ port: 25002, host: '0.0.0.0' });
    
    console.log('\\n🔬 연구 마을 서버 시작!');
    console.log('=====================================');
    console.log(`🏘️ 마을 이름: ${VILLAGE_INFO.name}`);
    console.log(`🌐 접속 주소: http://localhost:25002`);
    console.log(`👥 마을 인구: ${VILLAGE_INFO.population}명`);
    console.log(`👑 마을장: ${VILLAGE_INFO.mayor}`);
    console.log(`🎯 특화 분야: ${VILLAGE_INFO.specialties.join(', ')}`);
    console.log(`🏢 주요 시설: ${VILLAGE_INFO.facilities.join(', ')}`);
    console.log('=====================================\\n');
    
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();