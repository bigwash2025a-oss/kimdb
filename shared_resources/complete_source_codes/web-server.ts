/**
 * 🌐 서버1: 웹 인터페이스 서버
 * KIMDB Web Server - UI + 서버2 DB 연동
 */

import Fastify from 'fastify';
import { join } from 'path';
import fetch from 'node-fetch';

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
  prefix: '/'
});

// 데이터베이스 서버 URL
const DB_SERVER = 'http://localhost:4000';

console.log('🌐 Web Server 초기화...');

// 데이터베이스 서버와 통신하는 헬퍼 함수
const fetchFromDB = async (endpoint: string): Promise<any> => {
  try {
    const response = await fetch(`${DB_SERVER}${endpoint}`);
    return await response.json();
  } catch (error) {
    console.error(`DB 서버 통신 오류: ${endpoint}`, error);
    return { success: false, error: 'Database server connection failed' };
  }
};

const postToDB = async (endpoint: string, data: any): Promise<any> => {
  try {
    const response = await fetch(`${DB_SERVER}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (error) {
    console.error(`DB 서버 POST 오류: ${endpoint}`, error);
    return { success: false, error: 'Database server connection failed' };
  }
};

// === 메인 라우트들 ===

// 루트 경로를 HTML 파일로 리다이렉트
fastify.get('/', async (request, reply) => {
  return reply.redirect('/index.html');
});

// 헬스체크
fastify.get('/health', async () => {
  const dbStatus = await fetchFromDB('/health');
  
  return {
    status: 'healthy',
    service: 'KIMDB Web Server',
    databaseServer: dbStatus.success ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  };
});

// === AI 시스템 API (DB 서버로 프록시) ===

// AI 초기화 (DB 서버가 아닌 여기서 처리)
fastify.get('/ai/init', async (request, reply) => {
  // 실제로는 이미 DB에 데이터가 있으므로 상태만 확인
  const stats = await fetchFromDB('/db/ai/stats');
  
  if (stats.success && stats.data.total > 0) {
    return {
      success: true,
      message: `${stats.data.total} AI agents already initialized`,
      count: stats.data.total,
      initTime: 0,
      teams: stats.data.byTeam
    };
  } else {
    return reply.code(500).send({
      success: false,
      error: 'Database server not available'
    });
  }
});

// AI 통계 (DB 서버에서 가져오기)
fastify.get('/ai/stats', async (request, reply) => {
  const result = await fetchFromDB('/db/ai/stats');
  return result;
});

// AI 목록 조회
fastify.get('/ai', async (request, reply) => {
  const queryString = new URLSearchParams(request.query as any).toString();
  const result = await fetchFromDB(`/db/ai?${queryString}`);
  return result;
});

// 특정 AI 조회
fastify.get('/ai/:id', async (request, reply) => {
  const { id } = request.params as any;
  const result = await fetchFromDB(`/db/ai/${id}`);
  
  if (!result.success) {
    return reply.code(404).send(result);
  }
  
  return result;
});

// AI와 채팅 (응답 생성 + DB 서버에 상호작용 저장)
fastify.post('/ai/:id/chat', async (request, reply) => {
  const { id } = request.params as any;
  const { message } = request.body as any;
  
  // 먼저 AI 정보를 DB 서버에서 가져오기
  const aiResult = await fetchFromDB(`/db/ai/${id}`);
  
  if (!aiResult.success) {
    return reply.code(404).send({
      success: false,
      error: 'AI not found'
    });
  }
  
  const ai = aiResult.data;
  
  if (ai.status !== 'active' && ai.status !== 'idle') {
    return reply.code(400).send({
      success: false,
      error: `AI is currently ${ai.status}`
    });
  }
  
  const startTime = Date.now();
  
  // AI 응답 생성 (성격 기반)
  let response = `안녕하세요! 저는 ${ai.name}입니다.`;
  
  if (ai.personality === 'ANALYZER') {
    response = `분석해보면, "${message}"에 대해 체계적으로 접근해야 합니다.`;
  } else if (ai.personality === 'CREATOR') {
    response = `와! 정말 창의적인 아이디어네요! 🎨 "${message}"를 더 발전시켜보면 어떨까요?`;
  } else if (ai.personality === 'LEADER') {
    response = `리더 관점에서 "${message}"에 대해 전략적으로 접근해봅시다.`;
  } else if (ai.personality === 'SUPPORTER') {
    response = `"${message}"에 대해 최선을 다해 도움드리겠습니다! 😊`;
  } else if (ai.personality === 'GUARDIAN') {
    response = `신중하게 보호하면서 "${message}"에 대해 안전하게 진행해야 합니다.`;
  } else if (ai.personality === 'EXPLORER') {
    response = `호기심을 가지고 "${message}"를 실험해봅시다! 🚀`;
  } else if (ai.personality === 'PERFORMER') {
    response = `활발하게 "${message}"를 표현해보겠습니다! 🎭`;
  } else if (ai.personality === 'MEDIATOR') {
    response = `균형잡힌 관점에서 "${message}"에 대해 조화롭게 접근해봅시다.`;
  }
  
  const responseTime = Date.now() - startTime;
  
  // DB 서버에 상호작용 저장
  await postToDB(`/db/ai/${id}/interaction`, {
    message,
    response,
    responseTime
  });
  
  return {
    success: true,
    data: {
      response,
      aiId: ai.id,
      aiName: ai.name,
      personality: ai.personality,
      responseTime,
      timestamp: new Date()
    }
  };
});

// AI 검색
fastify.get('/ai/search', async (request, reply) => {
  const queryString = new URLSearchParams(request.query as any).toString();
  const result = await fetchFromDB(`/db/ai/search?${queryString}`);
  return result;
});

// 팀별 AI 조회
fastify.get('/ai/team/:team', async (request, reply) => {
  const { team } = request.params as any;
  const result = await fetchFromDB(`/db/ai/team/${team}`);
  return result;
});

// 랜덤 AI 선택
fastify.get('/ai/random', async (request, reply) => {
  // 모든 AI 가져와서 랜덤 선택
  const allAIs = await fetchFromDB('/db/ai?limit=5000');
  
  if (!allAIs.success || allAIs.data.length === 0) {
    return {
      success: false,
      message: 'No AI agents available'
    };
  }
  
  const randomAI = allAIs.data[Math.floor(Math.random() * allAIs.data.length)];
  
  return {
    success: true,
    data: randomAI
  };
});

// AI 상태 업데이트 (실제 구현은 DB 서버에서)
fastify.put('/ai/:id/status', async (request, reply) => {
  const { id } = request.params as any;
  const { status } = request.body as any;
  
  // 현재는 메모리만 업데이트 (실제로는 DB 서버 API 필요)
  return {
    success: true,
    data: {
      aiId: id,
      status: status,
      updatedAt: new Date()
    }
  };
});

// === 데이터베이스 관련 API (프록시) ===

// 지식 베이스 조회
fastify.get('/api/knowledge', async (request, reply) => {
  const result = await fetchFromDB('/db/knowledge');
  return result;
});

// 협업 프로젝트 조회
fastify.get('/api/collaboration', async (request, reply) => {
  const result = await fetchFromDB('/db/collaboration');
  return result;
});

// 프로젝트 파일 조회
fastify.get('/api/files', async (request, reply) => {
  const queryString = new URLSearchParams(request.query as any).toString();
  const result = await fetchFromDB(`/db/files?${queryString}`);
  return result;
});

// KIMDB 메타데이터 조회
fastify.get('/api/metadata', async (request, reply) => {
  const result = await fetchFromDB('/db/metadata');
  return result;
});

// 프로젝트 통계 조회
fastify.get('/api/statistics', async (request, reply) => {
  const queryString = new URLSearchParams(request.query as any).toString();
  const result = await fetchFromDB(`/db/statistics?${queryString}`);
  return result;
});

// DB 서버 상태 조회
fastify.get('/api/db-status', async (request, reply) => {
  const result = await fetchFromDB('/db/status');
  return result;
});

// === 기본 데이터 API (레거시) ===
const data = new Map<string, any>();

fastify.post('/api/data/:key', async (request, reply) => {
  const { key } = request.params as any;
  const body = request.body;
  
  data.set(key, {
    data: body,
    timestamp: new Date(),
    key
  });
  
  reply.code(201).send({
    success: true,
    key,
    message: 'Data stored successfully'
  });
});

fastify.get('/api/data/:key', async (request, reply) => {
  const { key } = request.params as any;
  const item = data.get(key);
  
  if (item) {
    reply.send({
      success: true,
      ...item
    });
  } else {
    reply.code(404).send({
      success: false,
      error: 'Key not found'
    });
  }
});

// 서버 시작
const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    
    console.log('\n🌐 KIMDB Web Server Started!');
    console.log('=====================================');
    console.log('📡 Web Interface: http://localhost:3000');
    console.log('🗄️ Database Server: http://localhost:4000');
    console.log('🤖 AI API: http://localhost:3000/ai/*');
    console.log('📊 DB API: http://localhost:3000/api/*');
    console.log('❤️ Health: http://localhost:3000/health');
    console.log('=====================================\n');
    
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();