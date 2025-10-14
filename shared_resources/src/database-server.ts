/**
 * 🗄️ 서버2: 데이터베이스 전용 서버
 * KIMDB Database Server - 순수 데이터 API만 제공
 */

import Fastify from 'fastify';
import Database from 'better-sqlite3';
import { join } from 'path';

const fastify = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty'
    }
  }
});

// CORS 설정 (서버간 통신 허용)
await fastify.register(import('@fastify/cors'), {
  origin: ['http://localhost:3000', 'http://localhost:4000'],
  credentials: true
});

// 데이터베이스 연결
const mainDB = new Database(join(process.cwd(), 'kimdb_ai_data.db'));
const sharedDB = new Database('/home/kimjin/바탕화면/kim/shared_database/shared_ai_knowledge.db');

console.log('🗄️ Database Server 초기화...');

// === 메인 AI 데이터베이스 API ===

// AI 전체 목록
fastify.get('/db/ai', async (request, reply) => {
  const query = request.query as any;
  const limit = parseInt(query.limit) || 50;
  const offset = parseInt(query.offset) || 0;
  const team = query.team;
  
  try {
    let sql = 'SELECT * FROM ai_agents WHERE 1=1';
    const params: any[] = [];
    
    if (team) {
      sql += ' AND team = ?';
      params.push(team);
    }
    
    sql += ' ORDER BY id LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const stmt = mainDB.prepare(sql);
    const ais = stmt.all(...params);
    
    // JSON 파싱
    const parsedAIs = ais.map((ai: any) => ({
      ...ai,
      skills: JSON.parse(ai.skills),
      createdAt: new Date(ai.created_at),
      storedAt: new Date(ai.stored_at)
    }));
    
    return {
      success: true,
      data: parsedAIs,
      pagination: {
        limit,
        offset,
        total: mainDB.prepare('SELECT COUNT(*) as count FROM ai_agents').get()
      }
    };
  } catch (error: any) {
    return reply.code(500).send({
      success: false,
      error: error.message
    });
  }
});

// AI 통계
fastify.get('/db/ai/stats', async (request, reply) => {
  try {
    const totalCount = mainDB.prepare('SELECT COUNT(*) as count FROM ai_agents').get() as any;
    const teamStats = mainDB.prepare('SELECT team, COUNT(*) as count FROM ai_agents GROUP BY team').all() as any[];
    const personalityStats = mainDB.prepare('SELECT personality, COUNT(*) as count FROM ai_agents GROUP BY personality').all() as any[];
    const statusStats = mainDB.prepare('SELECT status, COUNT(*) as count FROM ai_agents GROUP BY status').all() as any[];
    
    return {
      success: true,
      data: {
        total: totalCount.count,
        byTeam: Object.fromEntries(teamStats.map(row => [row.team, row.count])),
        byPersonality: Object.fromEntries(personalityStats.map(row => [row.personality, row.count])),
        byStatus: Object.fromEntries(statusStats.map(row => [row.status, row.count]))
      }
    };
  } catch (error: any) {
    return reply.code(500).send({
      success: false,
      error: error.message
    });
  }
});

// 특정 AI 조회
fastify.get('/db/ai/:id', async (request, reply) => {
  const { id } = request.params as any;
  
  try {
    const stmt = mainDB.prepare('SELECT * FROM ai_agents WHERE id = ?');
    const ai = stmt.get(id) as any;
    
    if (!ai) {
      return reply.code(404).send({
        success: false,
        error: 'AI not found'
      });
    }
    
    return {
      success: true,
      data: {
        ...ai,
        skills: JSON.parse(ai.skills),
        createdAt: new Date(ai.created_at),
        storedAt: new Date(ai.stored_at)
      }
    };
  } catch (error: any) {
    return reply.code(500).send({
      success: false,
      error: error.message
    });
  }
});

// AI 검색
fastify.get('/db/ai/search', async (request, reply) => {
  const { q, limit = 20 } = request.query as any;
  
  if (!q || q.length < 2) {
    return reply.code(400).send({
      success: false,
      error: 'Query must be at least 2 characters'
    });
  }
  
  try {
    const stmt = mainDB.prepare(`
      SELECT * FROM ai_agents 
      WHERE name LIKE ? OR personality LIKE ? OR skills LIKE ?
      ORDER BY id LIMIT ?
    `);
    
    const searchPattern = `%${q}%`;
    const results = stmt.all(searchPattern, searchPattern, searchPattern, parseInt(limit)) as any[];
    
    const parsedResults = results.map((ai: any) => ({
      ...ai,
      skills: JSON.parse(ai.skills),
      createdAt: new Date(ai.created_at),
      storedAt: new Date(ai.stored_at)
    }));
    
    return {
      success: true,
      data: parsedResults,
      count: parsedResults.length
    };
  } catch (error: any) {
    return reply.code(500).send({
      success: false,
      error: error.message
    });
  }
});

// 팀별 AI 조회
fastify.get('/db/ai/team/:team', async (request, reply) => {
  const { team } = request.params as any;
  
  if (!['CODE1', 'CODE2', 'CODE3', 'CODE4'].includes(team)) {
    return reply.code(400).send({
      success: false,
      error: 'Invalid team'
    });
  }
  
  try {
    const stmt = mainDB.prepare('SELECT * FROM ai_agents WHERE team = ? ORDER BY id');
    const teamAIs = stmt.all(team) as any[];
    
    const parsedAIs = teamAIs.map((ai: any) => ({
      ...ai,
      skills: JSON.parse(ai.skills),
      createdAt: new Date(ai.created_at),
      storedAt: new Date(ai.stored_at)
    }));
    
    return {
      success: true,
      data: parsedAIs,
      count: parsedAIs.length
    };
  } catch (error: any) {
    return reply.code(500).send({
      success: false,
      error: error.message
    });
  }
});

// === 공유 지식 데이터베이스 API ===

// AI 지식 조회
fastify.get('/db/knowledge', async (request, reply) => {
  try {
    const stmt = sharedDB.prepare('SELECT * FROM ai_knowledge ORDER BY created_at DESC');
    const knowledge = stmt.all();
    
    return {
      success: true,
      data: knowledge
    };
  } catch (error: any) {
    return reply.code(500).send({
      success: false,
      error: error.message
    });
  }
});

// 협업 프로젝트 조회
fastify.get('/db/collaboration', async (request, reply) => {
  try {
    const stmt = sharedDB.prepare('SELECT * FROM ai_collaboration WHERE status = ? ORDER BY created_at DESC');
    const projects = stmt.all('active');
    
    return {
      success: true,
      data: projects
    };
  } catch (error: any) {
    return reply.code(500).send({
      success: false,
      error: error.message
    });
  }
});

// 프로젝트 파일 조회
fastify.get('/db/files', async (request, reply) => {
  const { phase, type } = request.query as any;
  
  try {
    let sql = 'SELECT * FROM project_files WHERE 1=1';
    const params: any[] = [];
    
    if (phase) {
      sql += ' AND project_phase = ?';
      params.push(phase);
    }
    
    if (type) {
      sql += ' AND file_type = ?';
      params.push(type);
    }
    
    sql += ' ORDER BY created_at DESC';
    
    const stmt = sharedDB.prepare(sql);
    const files = stmt.all(...params);
    
    return {
      success: true,
      data: files
    };
  } catch (error: any) {
    return reply.code(500).send({
      success: false,
      error: error.message
    });
  }
});

// KIMDB 메타데이터 조회
fastify.get('/db/metadata', async (request, reply) => {
  try {
    const stmt = sharedDB.prepare('SELECT * FROM kimdb_metadata ORDER BY created_at DESC');
    const metadata = stmt.all();
    
    return {
      success: true,
      data: metadata
    };
  } catch (error: any) {
    return reply.code(500).send({
      success: false,
      error: error.message
    });
  }
});

// 프로젝트 통계 조회
fastify.get('/db/statistics', async (request, reply) => {
  const { type } = request.query as any;
  
  try {
    let sql = 'SELECT * FROM project_statistics';
    const params: any[] = [];
    
    if (type) {
      sql += ' WHERE metric_type = ?';
      params.push(type);
    }
    
    sql += ' ORDER BY measurement_time DESC';
    
    const stmt = sharedDB.prepare(sql);
    const stats = stmt.all(...params);
    
    return {
      success: true,
      data: stats
    };
  } catch (error: any) {
    return reply.code(500).send({
      success: false,
      error: error.message
    });
  }
});

// === 데이터 쓰기 API ===

// AI 상호작용 저장
fastify.post('/db/ai/:id/interaction', async (request, reply) => {
  const { id } = request.params as any;
  const { message, response, responseTime } = request.body as any;
  
  try {
    // AI 존재 여부 확인
    const aiExists = mainDB.prepare('SELECT id FROM ai_agents WHERE id = ?').get(id);
    if (!aiExists) {
      return reply.code(404).send({
        success: false,
        error: 'AI not found'
      });
    }
    
    // 상호작용 저장 (상호작용 테이블이 있다면)
    const interactionId = `interaction_${Date.now()}`;
    
    // AI의 last_interaction 및 total_interactions 업데이트
    const updateStmt = mainDB.prepare(`
      UPDATE ai_agents 
      SET last_interaction = ?, total_interactions = total_interactions + 1
      WHERE id = ?
    `);
    
    updateStmt.run(new Date().toISOString(), id);
    
    return {
      success: true,
      data: {
        interactionId,
        aiId: id,
        message,
        response,
        responseTime,
        timestamp: new Date()
      }
    };
  } catch (error: any) {
    return reply.code(500).send({
      success: false,
      error: error.message
    });
  }
});

// === 데이터베이스 정보 API ===

// 데이터베이스 상태
fastify.get('/db/status', async (request, reply) => {
  try {
    const mainDBInfo = {
      path: 'kimdb_ai_data.db',
      tables: mainDB.prepare("SELECT name FROM sqlite_master WHERE type='table'").all(),
      size: 'Available'
    };
    
    const sharedDBInfo = {
      path: '/home/kimjin/바탕화면/kim/shared_database/shared_ai_knowledge.db',
      tables: sharedDB.prepare("SELECT name FROM sqlite_master WHERE type='table'").all(),
      size: 'Available'
    };
    
    return {
      success: true,
      data: {
        mainDatabase: mainDBInfo,
        sharedDatabase: sharedDBInfo,
        serverStatus: 'running',
        timestamp: new Date()
      }
    };
  } catch (error: any) {
    return reply.code(500).send({
      success: false,
      error: error.message
    });
  }
});

// 헬스체크
fastify.get('/health', async () => {
  return {
    status: 'healthy',
    service: 'KIMDB Database Server',
    databases: {
      main: 'connected',
      shared: 'connected'
    },
    timestamp: new Date().toISOString()
  };
});

// 서버 시작
const start = async () => {
  try {
    await fastify.listen({ port: 4000, host: '0.0.0.0' });
    
    console.log('\n🗄️ KIMDB Database Server Started!');
    console.log('=========================================');
    console.log('🔗 Database API: http://localhost:4000');
    console.log('📊 Status: http://localhost:4000/db/status');
    console.log('❤️ Health: http://localhost:4000/health');
    console.log('🤖 AI Data: http://localhost:4000/db/ai');
    console.log('🧠 Knowledge: http://localhost:4000/db/knowledge');
    console.log('=========================================\n');
    
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

// 종료 시 DB 연결 해제
process.on('SIGINT', () => {
  console.log('\n🔒 Closing database connections...');
  mainDB.close();
  sharedDB.close();
  process.exit(0);
});

start();