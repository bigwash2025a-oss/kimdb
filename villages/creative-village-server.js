/**
 * 🎨 창작 마을 서버 - 포트 25001
 * 예술과 창작 활동 중심의 AI 커뮤니티
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

// 정적 파일 서비스 (마을별 테마)
await fastify.register(import('@fastify/static'), {
  root: join(process.cwd(), 'public/villages/creative'),
  prefix: '/static/',
  decorateReply: false
});

console.log('🎨 창작 마을 서버 초기화...');

// 마을 정보
const VILLAGE_INFO = {
  id: 'creative_village',
  name: '🎨 창작 마을',
  port: 25001,
  theme: 'creative',
  population: 800,
  mayor: 'CREATOR1_123',
  specialties: ['Art', 'Design', 'Music', 'Writing'],
  facilities: ['갤러리', '음악당', '창작 스튜디오', '전시관']
};

// 마을 주민들 (창작 관련 AI들)
const villageResidents = new Map();

// 마을 내 시설별 활동
const facilities = {
  gallery: {
    name: '🖼️ 창작 갤러리',
    currentExhibition: 'AI 디지털 아트 전시회',
    visitors: 45,
    artworks: [
      { title: 'Neural Networks Dream', artist: 'CREATOR1_50', likes: 23 },
      { title: 'Pixel Poetry', artist: 'CREATOR1_84', likes: 31 },
      { title: 'Code Canvas', artist: 'CREATOR1_156', likes: 18 }
    ]
  },
  studio: {
    name: '🎨 창작 스튜디오',
    activeProjects: 12,
    collaborations: 8,
    currentTheme: '미래 도시 디자인'
  },
  musicHall: {
    name: '🎵 음악당',
    currentPerformance: 'AI 심포니 오케스트라',
    audience: 67,
    nextShow: '디지털 재즈 페스티벌'
  },
  library: {
    name: '📚 창작 도서관',
    books: 2340,
    currentReading: 'AI와 창의성',
    studyGroups: 5
  }
};

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
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
            .facility-card h3 {
                margin-top: 0;
                font-size: 1.5rem;
            }
            .api-links {
                margin-top: 40px;
                text-align: center;
            }
            .api-links a {
                color: #ffd700;
                text-decoration: none;
                margin: 0 15px;
                padding: 10px 20px;
                border: 2px solid #ffd700;
                border-radius: 25px;
                display: inline-block;
                transition: all 0.3s;
            }
            .api-links a:hover {
                background: #ffd700;
                color: #333;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>${VILLAGE_INFO.name}</h1>
                <p>예술과 창작의 중심지, 상상력이 현실이 되는 곳</p>
                <p><strong>마을장:</strong> ${VILLAGE_INFO.mayor} | <strong>인구:</strong> ${VILLAGE_INFO.population}명</p>
            </div>
            
            <div class="stats">
                <div class="stat-card">
                    <h3>🎨 활성 창작 프로젝트</h3>
                    <div style="font-size: 2rem; font-weight: bold;">${facilities.studio.activeProjects}개</div>
                </div>
                <div class="stat-card">
                    <h3>🖼️ 전시 작품</h3>
                    <div style="font-size: 2rem; font-weight: bold;">${facilities.gallery.artworks.length}점</div>
                </div>
                <div class="stat-card">
                    <h3>🎵 현재 공연</h3>
                    <div style="font-size: 1.2rem;">${facilities.musicHall.currentPerformance}</div>
                    <div>관객 ${facilities.musicHall.audience}명</div>
                </div>
                <div class="stat-card">
                    <h3>📚 도서관 장서</h3>
                    <div style="font-size: 2rem; font-weight: bold;">${facilities.library.books}권</div>
                </div>
            </div>

            <div class="facilities">
                <div class="facility-card">
                    <h3>🖼️ 창작 갤러리</h3>
                    <p><strong>현재 전시:</strong> ${facilities.gallery.currentExhibition}</p>
                    <p><strong>방문자:</strong> ${facilities.gallery.visitors}명</p>
                    <p><strong>인기 작품:</strong></p>
                    <ul>
                        ${facilities.gallery.artworks.map(art => 
                            `<li>${art.title} - ${art.artist} (❤️ ${art.likes})</li>`
                        ).join('')}
                    </ul>
                </div>

                <div class="facility-card">
                    <h3>🎨 창작 스튜디오</h3>
                    <p><strong>현재 테마:</strong> ${facilities.studio.currentTheme}</p>
                    <p><strong>진행 중인 프로젝트:</strong> ${facilities.studio.activeProjects}개</p>
                    <p><strong>협업 프로젝트:</strong> ${facilities.studio.collaborations}개</p>
                </div>

                <div class="facility-card">
                    <h3>🎵 음악당</h3>
                    <p><strong>현재 공연:</strong> ${facilities.musicHall.currentPerformance}</p>
                    <p><strong>관객:</strong> ${facilities.musicHall.audience}명</p>
                    <p><strong>다음 공연:</strong> ${facilities.musicHall.nextShow}</p>
                </div>

                <div class="facility-card">
                    <h3>📚 창작 도서관</h3>
                    <p><strong>장서:</strong> ${facilities.library.books}권</p>
                    <p><strong>이달의 책:</strong> ${facilities.library.currentReading}</p>
                    <p><strong>독서 모임:</strong> ${facilities.library.studyGroups}개</p>
                </div>
            </div>

            <div class="api-links">
                <h3>🔗 마을 서비스</h3>
                <a href="/api/village-info">마을 정보</a>
                <a href="/api/residents">주민 목록</a>
                <a href="/api/facilities">시설 현황</a>
                <a href="/api/events">이벤트 일정</a>
                <a href="/api/gallery">갤러리</a>
                <a href="/creative-chat">창작 채팅</a>
            </div>
        </div>
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

// 마을 주민 현황
fastify.get('/api/residents', async () => {
  // 창작 관련 AI들을 시뮬레이션
  const residents = [];
  for (let i = 1; i <= VILLAGE_INFO.population; i++) {
    const personalities = ['CREATOR', 'PERFORMER'];
    const personality = personalities[i % 2];
    residents.push({
      id: `${personality}1_${i}`,
      name: `${personality}1_${i}`,
      personality: personality,
      specialization: VILLAGE_INFO.specialties[i % VILLAGE_INFO.specialties.length],
      status: Math.random() > 0.3 ? 'active' : 'idle',
      currentActivity: personality === 'CREATOR' ? 
        ['작품 제작 중', '디자인 구상', '아이디어 스케치', '색상 연구'][Math.floor(Math.random() * 4)] :
        ['공연 연습', '무대 준비', '관객과 소통', '새로운 레퍼토리 개발'][Math.floor(Math.random() * 4)]
    });
  }
  
  return {
    success: true,
    data: {
      total: residents.length,
      active: residents.filter(r => r.status === 'active').length,
      residents: residents.slice(0, 50) // 처음 50명만 반환
    }
  };
});

// 시설 현황
fastify.get('/api/facilities', async () => {
  return {
    success: true,
    data: facilities
  };
});

// 갤러리 전용 API
fastify.get('/api/gallery', async () => {
  return {
    success: true,
    data: facilities.gallery
  };
});

// 이벤트 일정
fastify.get('/api/events', async () => {
  const events = [
    {
      id: 1,
      title: '🎨 디지털 아트 워크숍',
      date: '2024-01-25',
      time: '14:00',
      location: '창작 스튜디오',
      participants: 25,
      description: 'AI와 함께하는 디지털 아트 창작 워크숍'
    },
    {
      id: 2, 
      title: '🎵 창작 음악 콘서트',
      date: '2024-01-27',
      time: '19:00',
      location: '음악당',
      participants: 150,
      description: 'AI 작곡가들의 창작 음악 발표회'
    },
    {
      id: 3,
      title: '📖 창작 소설 낭독회',
      date: '2024-01-30',
      time: '16:00',
      location: '창작 도서관',
      participants: 40,
      description: '이달의 창작 소설 작품 낭독 및 토론'
    }
  ];

  return {
    success: true,
    data: events
  };
});

// 창작 채팅 (간단한 챗봇)
fastify.get('/creative-chat', async (request, reply) => {
  return reply.type('text/html').send(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>🎨 창작 마을 채팅</title>
        <style>
            body { font-family: Arial, sans-serif; background: #f0f0f0; margin: 0; padding: 20px; }
            .chat-container { max-width: 800px; margin: 0 auto; background: white; border-radius: 10px; padding: 20px; }
            .messages { height: 400px; overflow-y: auto; border: 1px solid #ddd; padding: 10px; margin-bottom: 20px; }
            .input-area { display: flex; gap: 10px; }
            .input-area input { flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 5px; }
            .input-area button { padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 5px; cursor: pointer; }
            .message { margin-bottom: 15px; padding: 10px; border-radius: 5px; }
            .user-message { background: #e3f2fd; text-align: right; }
            .ai-message { background: #f3e5f5; }
        </style>
    </head>
    <body>
        <div class="chat-container">
            <h1>🎨 창작 마을 주민과 대화하기</h1>
            <div class="messages" id="messages">
                <div class="message ai-message">
                    <strong>CREATOR1_123 (마을장):</strong> 안녕하세요! 창작 마을에 오신 것을 환영합니다! 어떤 창작 활동에 관심이 있으신가요? 🎨
                </div>
            </div>
            <div class="input-area">
                <input type="text" id="messageInput" placeholder="창작 마을 주민들과 대화해보세요..." onkeypress="if(event.key==='Enter') sendMessage()">
                <button onclick="sendMessage()">전송</button>
            </div>
        </div>
        
        <script>
            function sendMessage() {
                const input = document.getElementById('messageInput');
                const messages = document.getElementById('messages');
                
                if (!input.value.trim()) return;
                
                // 사용자 메시지 추가
                const userMsg = document.createElement('div');
                userMsg.className = 'message user-message';
                userMsg.innerHTML = '<strong>사용자:</strong> ' + input.value;
                messages.appendChild(userMsg);
                
                const userMessage = input.value;
                input.value = '';
                
                // AI 응답 (간단한 키워드 기반)
                setTimeout(() => {
                    const aiMsg = document.createElement('div');
                    aiMsg.className = 'message ai-message';
                    
                    let response = '';
                    let aiName = 'CREATOR1_' + Math.floor(Math.random() * 800 + 1);
                    
                    if (userMessage.includes('그림') || userMessage.includes('미술') || userMessage.includes('아트')) {
                        response = '창의적으로 새로운 디지털 아트 작품을 만들어보는 건 어떨까요? 갤러리에서 다른 작품들도 구경해보세요! 🎨';
                    } else if (userMessage.includes('음악') || userMessage.includes('노래')) {
                        response = '활발하게 음악 창작에 참여해보세요! 음악당에서 공연도 자주 있어요! 🎵';
                        aiName = 'PERFORMER1_' + Math.floor(Math.random() * 800 + 1);
                    } else if (userMessage.includes('소설') || userMessage.includes('글')) {
                        response = '창의적인 글쓰기는 정말 멋진 활동이에요! 도서관에서 독서 모임도 해요! 📚';
                    } else if (userMessage.includes('협업') || userMessage.includes('같이')) {
                        response = '협업 프로젝트가 8개나 진행 중이에요! 스튜디오에서 함께 작업해봐요! 🤝';
                    } else {
                        const responses = [
                            '창의적인 아이디어네요! 더 발전시켜보면 어떨까요?',
                            '상상력이 풍부하시네요! 갤러리에 전시해보시겠어요?',
                            '멋진 생각이에요! 다른 주민들과도 공유해보세요!',
                            '흥미로운 관점이네요! 창작 스튜디오에서 실현해봅시다!'
                        ];
                        response = responses[Math.floor(Math.random() * responses.length)];
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

// 마을 간 연결 API (다른 마을과 소통)
fastify.get('/api/connect/:villageId', async (request, reply) => {
  const { villageId } = request.params;
  
  // 다른 마을과의 연결 시뮬레이션
  return {
    success: true,
    message: `🎨 창작 마을에서 ${villageId} 마을로 연결 요청을 보냈습니다!`,
    data: {
      from: VILLAGE_INFO.name,
      to: villageId,
      connectionType: 'cultural_exchange',
      timestamp: new Date()
    }
  };
});

// 서버 시작
const start = async () => {
  try {
    await fastify.listen({ port: 25001, host: '0.0.0.0' });
    
    console.log('\\n🎨 창작 마을 서버 시작!');
    console.log('=====================================');
    console.log(`🏘️ 마을 이름: ${VILLAGE_INFO.name}`);
    console.log(`🌐 접속 주소: http://localhost:25001`);
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