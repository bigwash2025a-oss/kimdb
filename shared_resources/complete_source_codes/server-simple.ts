/**
 * 🔥 KIMDB - Simple Server (빌드 테스트용)
 */

import Fastify from 'fastify';

const fastify = Fastify({
  logger: true
});

// 헬스체크
fastify.get('/health', async () => {
  return {
    status: 'healthy',
    service: 'KIMDB',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  };
});

// 통계
fastify.get('/stats', async () => {
  return {
    server: 'running',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    node_version: process.version
  };
});

// API 테스트
fastify.get('/api/test', async () => {
  return {
    message: 'KIMDB API is working!',
    features: [
      'Document Storage',
      'Index System', 
      'Rules Engine',
      'JWT Authentication',
      'Real-time WebSocket'
    ]
  };
});

// 간단한 데이터 저장 (메모리)
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

fastify.get('/api/data', async () => {
  return {
    success: true,
    count: data.size,
    keys: Array.from(data.keys())
  };
});

// 서버 시작
const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    
    console.log('\n🔥 KIMDB Simple Server Started!');
    console.log('==================================');
    console.log('📡 API: http://localhost:3000');
    console.log('📊 Health: http://localhost:3000/health');
    console.log('📈 Stats: http://localhost:3000/stats');
    console.log('🧪 Test: http://localhost:3000/api/test');
    console.log('==================================\n');
    
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();