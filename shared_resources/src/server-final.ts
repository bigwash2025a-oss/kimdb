/**
 * 🔥 KIMDB - Final AI Server with 5000 Agents
 */

import Fastify from 'fastify';
import { SimpleAI, simpleAIGenerator } from './ai-system/ai-simple.js';
import { aiDatabase } from './database/ai-storage.js';
import { join } from 'path';

const fastify = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty'
    }
  }
});

// AI 데이터베이스 (메모리 + SQLite)
let memoryDatabase: Map<string, SimpleAI> = new Map();
let isInitialized = false;

// === 메인 라우트들 ===

// 정적 파일 서비스
await fastify.register(import('@fastify/static'), {
  root: join(process.cwd(), 'public'),
  prefix: '/'
});

// 루트 경로를 HTML 파일로 리다이렉트
fastify.get('/', async (request, reply) => {
  return reply.redirect('/index.html');
});

// 헬스체크
fastify.get('/health', async () => {
  return {
    status: 'healthy',
    service: 'KIMDB AI System',
    agents: memoryDatabase.size,
    initialized: isInitialized,
    timestamp: new Date().toISOString()
  };
});

// === AI 시스템 API ===

// AI 초기화 (5000명 생성)
fastify.get('/ai/init', async (request, reply) => {
  if (isInitialized) {
    return {
      success: true,
      message: 'AI system already initialized',
      count: memoryDatabase.size
    };
  }

  console.log('🤖 Initializing 5000 AI agents...');
  const startTime = Date.now();

  try {
    const ais = simpleAIGenerator.generateAIs(5000);
    
    // 메모리와 SQLite에 저장
    memoryDatabase.clear();
    for (const ai of ais) {
      memoryDatabase.set(ai.id, ai);
    }
    
    // SQLite에 영구 저장
    await aiDatabase.saveAIs(ais);
    console.log('✅ AIs saved to SQLite database');

    isInitialized = true;
    const elapsed = Date.now() - startTime;

    console.log(`✅ 5000 AI agents initialized in ${elapsed}ms`);

    return {
      success: true,
      message: '5000 AI agents initialized successfully',
      count: ais.length,
      initTime: elapsed,
      teams: simpleAIGenerator.getTeamStats(ais).byTeam
    };
  } catch (error: any) {
    return reply.code(500).send({
      success: false,
      error: error.message
    });
  }
});

// AI 통계
fastify.get('/ai/stats', async () => {
  if (memoryDatabase.size === 0) {
    return {
      success: false,
      message: 'No AI agents found. Run /ai/init first.'
    };
  }

  const ais = Array.from(memoryDatabase.values());
  const stats = simpleAIGenerator.getTeamStats(ais);

  return {
    success: true,
    data: stats
  };
});

// AI 목록 조회 (페이징)
fastify.get('/ai', async (request, reply) => {
  const query = request.query as any;
  const limit = parseInt(query.limit) || 50;
  const offset = parseInt(query.offset) || 0;
  const team = query.team;
  const personality = query.personality;
  const status = query.status;

  let ais = Array.from(memoryDatabase.values());

  // 필터 적용
  if (team) {
    ais = ais.filter(ai => ai.team === team);
  }
  if (personality) {
    ais = ais.filter(ai => ai.personality === personality);
  }
  if (status) {
    ais = ais.filter(ai => ai.status === status);
  }

  const total = ais.length;
  const paginatedAIs = ais.slice(offset, offset + limit);

  return {
    success: true,
    data: paginatedAIs,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + limit < total
    }
  };
});

// 특정 AI 조회
fastify.get('/ai/:id', async (request, reply) => {
  const { id } = request.params as any;
  const ai = memoryDatabase.get(id);

  if (!ai) {
    return reply.code(404).send({
      success: false,
      error: 'AI not found'
    });
  }

  return {
    success: true,
    data: ai
  };
});

// AI와 채팅
fastify.post('/ai/:id/chat', async (request, reply) => {
  const { id } = request.params as any;
  const { message } = request.body as any;
  const ai = memoryDatabase.get(id);

  if (!ai) {
    return reply.code(404).send({
      success: false,
      error: 'AI not found'
    });
  }

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
  } else {
    response = `${ai.personality} 스타일로 "${message}"에 대해 말씀드리면...`;
  }

  const responseTime = Date.now() - startTime;

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

// 팀별 AI 조회
fastify.get('/ai/team/:team', async (request, reply) => {
  const { team } = request.params as any;

  if (!['CODE1', 'CODE2', 'CODE3', 'CODE4'].includes(team)) {
    return reply.code(400).send({
      success: false,
      error: 'Invalid team. Must be CODE1, CODE2, CODE3, or CODE4'
    });
  }

  const teamAIs = Array.from(memoryDatabase.values())
    .filter(ai => ai.team === team)
    .sort((a, b) => a.id.localeCompare(b.id));

  return {
    success: true,
    data: teamAIs,
    count: teamAIs.length
  };
});

// AI 검색
fastify.get('/ai/search', async (request, reply) => {
  const { q, limit = 20 } = request.query as any;

  if (!q || q.length < 2) {
    return reply.code(400).send({
      success: false,
      error: 'Query must be at least 2 characters'
    });
  }

  const query = q.toLowerCase();
  const matchingAIs = Array.from(memoryDatabase.values())
    .filter(ai => 
      ai.name.toLowerCase().includes(query) ||
      ai.personality.toLowerCase().includes(query) ||
      ai.skills.some(skill => skill.toLowerCase().includes(query))
    )
    .slice(0, parseInt(limit));

  return {
    success: true,
    data: matchingAIs,
    count: matchingAIs.length
  };
});

// 랜덤 AI 선택
fastify.get('/ai/random', async () => {
  if (memoryDatabase.size === 0) {
    return {
      success: false,
      message: 'No AI agents available. Run /ai/init first.'
    };
  }

  const ais = Array.from(memoryDatabase.values());
  const randomAI = ais[Math.floor(Math.random() * ais.length)];

  return {
    success: true,
    data: randomAI
  };
});

// AI 상태 업데이트
fastify.put('/ai/:id/status', async (request, reply) => {
  const { id } = request.params as any;
  const { status } = request.body as any;
  const ai = memoryDatabase.get(id);

  if (!ai) {
    return reply.code(404).send({
      success: false,
      error: 'AI not found'
    });
  }

  if (!['active', 'idle', 'busy'].includes(status)) {
    return reply.code(400).send({
      success: false,
      error: 'Invalid status. Must be active, idle, or busy'
    });
  }

  ai.status = status;

  return {
    success: true,
    data: {
      aiId: ai.id,
      status: ai.status,
      updatedAt: new Date()
    }
  };
});

// === 기본 데이터 API ===
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
    
    console.log('\n🔥 KIMDB Final AI Server Started!');
    console.log('=====================================');
    console.log('📡 Main: http://localhost:3000');
    console.log('🤖 Init: http://localhost:3000/ai/init');
    console.log('📊 Stats: http://localhost:3000/ai/stats');
    console.log('🎯 Teams: http://localhost:3000/ai/team/CODE1');
    console.log('💬 Chat: POST http://localhost:3000/ai/ai_0001/chat');
    console.log('=====================================\n');
    
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();