/**
 * 🔥 KIMDB - Main Server
 * 완전 자체 구현 Firestore 대체 데이터베이스 서버
 */

import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import helmet from '@fastify/helmet';

import { storage } from './core/storage.js';
import { indexSystem } from './core/indexes.js';
import { jwtManager } from './auth/jwt.js';
import { rulesEvaluator, rulesParser } from './rules/index.js';

const fastify = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty'
    }
  }
});

// === 보안 미들웨어 ===
await fastify.register(helmet);
await fastify.register(cors, {
  origin: true,
  credentials: true
});
await fastify.register(rateLimit, {
  max: 1000,
  timeWindow: '1 minute'
});

// === WebSocket 지원 ===
await fastify.register(websocket);

// === API 라우트 등록 ===

// 헬스체크
fastify.get('/health', async () => {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    services: {
      storage: 'running',
      indexes: 'running', 
      auth: 'running',
      rules: 'running'
    }
  };
});

// 통계
fastify.get('/stats', async () => {
  return {
    storage: storage.getStats(),
    indexes: indexSystem.getStats(),
    auth: jwtManager.getStats(),
    rules: rulesEvaluator.getStats()
  };
});

// === 인증 API ===
fastify.post('/auth/login', {
  schema: {
    body: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: { type: 'string', format: 'email' },
        password: { type: 'string', minLength: 6 }
      }
    }
  }
}, async (request, reply) => {
  // TODO: 사용자 검증 로직
  const { email, password } = request.body as any;
  
  // 임시 하드코딩된 사용자
  if (email === 'admin@kimdb.com' && password === 'kimdb123') {
    const tokenPair = jwtManager.issueTokenPair(
      'user_admin',
      'dealer_kim',
      ['admin', 'manager'],
      email,
      true
    );
    
    reply.code(200).send({
      success: true,
      ...tokenPair,
      user: {
        uid: 'user_admin',
        email,
        dealerId: 'dealer_kim',
        roles: ['admin', 'manager']
      }
    });
  } else {
    reply.code(401).send({
      success: false,
      error: 'Invalid credentials'
    });
  }
});

// 토큰 갱신
fastify.post('/auth/refresh', {
  schema: {
    body: {
      type: 'object',
      required: ['refreshToken'],
      properties: {
        refreshToken: { type: 'string' }
      }
    }
  }
}, async (request, reply) => {
  const { refreshToken } = request.body as any;
  
  // TODO: 실제 사용자 정보 조회
  const newTokens = jwtManager.refreshTokens(
    refreshToken,
    'user_admin',
    'dealer_kim', 
    ['admin', 'manager'],
    'admin@kimdb.com',
    true
  );
  
  if (newTokens) {
    reply.code(200).send({
      success: true,
      ...newTokens
    });
  } else {
    reply.code(401).send({
      success: false,
      error: 'Invalid refresh token'
    });
  }
});

// === 문서 API ===

// 문서 생성
fastify.post('/db/:collection', async (request, reply) => {
  const { collection } = request.params as any;
  const data = request.body;
  
  // JWT 검증 (임시로 스킵)
  const dealerId = 'dealer_kim';
  const userId = 'user_admin';
  
  try {
    // 자동 ID 생성
    const docId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const path = `dealers/${dealerId}/${collection}/${docId}`;
    
    const doc = await storage.createDocument(path, data, dealerId, userId);
    
    reply.code(201).send({
      success: true,
      document: doc
    });
  } catch (error: any) {
    reply.code(400).send({
      success: false,
      error: error.message
    });
  }
});

// 문서 조회
fastify.get('/db/:collection/:id', async (request, reply) => {
  const { collection, id } = request.params as any;
  const dealerId = 'dealer_kim';
  
  const path = `dealers/${dealerId}/${collection}/${id}`;
  const doc = await storage.getDocument(path, dealerId);
  
  if (doc) {
    reply.code(200).send({
      success: true,
      document: doc
    });
  } else {
    reply.code(404).send({
      success: false,
      error: 'Document not found'
    });
  }
});

// 컬렉션 조회
fastify.get('/db/:collection', async (request, reply) => {
  const { collection } = request.params as any;
  const dealerId = 'dealer_kim';
  
  try {
    const docs = await storage.getDocuments(collection, dealerId);
    
    reply.code(200).send({
      success: true,
      documents: docs,
      count: docs.length
    });
  } catch (error: any) {
    reply.code(400).send({
      success: false,
      error: error.message
    });
  }
});

// 문서 업데이트
fastify.put('/db/:collection/:id', async (request, reply) => {
  const { collection, id } = request.params as any;
  const data = request.body;
  const dealerId = 'dealer_kim';
  const userId = 'user_admin';
  
  const path = `dealers/${dealerId}/${collection}/${id}`;
  
  try {
    const doc = await storage.updateDocument(path, data, dealerId, userId);
    
    reply.code(200).send({
      success: true,
      document: doc
    });
  } catch (error: any) {
    reply.code(400).send({
      success: false,
      error: error.message
    });
  }
});

// 문서 삭제
fastify.delete('/db/:collection/:id', async (request, reply) => {
  const { collection, id } = request.params as any;
  const dealerId = 'dealer_kim';
  const userId = 'user_admin';
  
  const path = `dealers/${dealerId}/${collection}/${id}`;
  
  try {
    await storage.deleteDocument(path, dealerId, userId);
    
    reply.code(200).send({
      success: true,
      message: 'Document deleted'
    });
  } catch (error: any) {
    reply.code(400).send({
      success: false,
      error: error.message
    });
  }
});

// === WebSocket 실시간 구독 ===
fastify.register(async function (fastify) {
  fastify.get('/ws', { websocket: true }, (connection, req) => {
    console.log('🔌 WebSocket client connected');
    
    connection.socket.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('📨 Received:', data);
        
        // 에코 응답
        connection.socket.send(JSON.stringify({
          type: 'ack',
          original: data,
          timestamp: new Date().toISOString()
        }));
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
    
    connection.socket.on('close', () => {
      console.log('🔌 WebSocket client disconnected');
    });
  });
});

// === 규칙 시스템 초기화 ===
const initializeRules = async () => {
  const sampleRules = `
match /dealers/{dealerId}/bookings/{bookingId} {
  allow read, write: if request.auth != null 
                     && request.auth.token.dealerId == dealerId
                     && hasRole('manager');
  
  allow read: if request.auth != null 
              && request.auth.uid == resource.data.customerId;
}

match /dealers/{dealerId}/customers/{customerId} {
  allow read, write: if request.auth != null
                     && request.auth.token.dealerId == dealerId
                     && (hasRole('staff') || hasRole('manager'));
}
`;
  
  const rules = rulesParser.parseRules(sampleRules);
  rulesEvaluator.loadRules(rules);
  
  console.log('✅ Rules system initialized');
};

// === 서버 시작 ===
const start = async () => {
  try {
    // 규칙 초기화
    await initializeRules();
    
    // 서버 시작
    await fastify.listen({ 
      port: 3000, 
      host: '0.0.0.0' 
    });
    
    console.log('\n🔥 KIMDB Server Started!');
    console.log('====================================');
    console.log('📡 HTTP API: http://localhost:3000');
    console.log('🔌 WebSocket: ws://localhost:3000/ws');
    console.log('📊 Health: http://localhost:3000/health');
    console.log('📈 Stats: http://localhost:3000/stats');
    console.log('====================================\n');
    
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();