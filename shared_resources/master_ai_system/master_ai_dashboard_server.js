/**
 * 🎯 마스터 AI 관리 대시보드 서버
 * 10명의 고급 AI와 5,037명 하위 AI를 관리하는 웹 대시보드
 */

import Fastify from 'fastify';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const fastify = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty'
    }
  }
});

// 정적 파일 서빙 설정
await fastify.register(import('@fastify/static'), {
  root: join(__dirname, 'public'),
  prefix: '/'
});

// CORS 설정
await fastify.register(import('@fastify/cors'), {
  origin: true
});

// 데이터베이스 연결
const db = new Database(join(__dirname, 'shared_database', 'code_team_ai.db'));

// 마스터 AI 목록 조회
fastify.get('/api/master-ais', async (request, reply) => {
  try {
    const masterAIs = db.prepare(`
      SELECT 
        m.*,
        (SELECT COUNT(*) FROM master_ai_subordinates WHERE master_ai_id = m.ai_id) as subordinate_count,
        (SELECT COUNT(*) FROM master_ai_instructions WHERE master_ai_id = m.ai_id AND status = 'pending') as pending_instructions
      FROM master_ai_systems m
      ORDER BY leadership_rank, intelligence_level DESC
    `).all();
    
    return {
      success: true,
      data: masterAIs
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

// 특정 마스터 AI 상세 정보
fastify.get('/api/master-ais/:aiId', async (request, reply) => {
  try {
    const { aiId } = request.params;
    
    // 기본 정보
    const masterAI = db.prepare(`
      SELECT * FROM master_ai_systems WHERE ai_id = ?
    `).get(aiId);
    
    if (!masterAI) {
      return { success: false, error: '마스터 AI를 찾을 수 없습니다.' };
    }
    
    // 능력 목록
    const capabilities = db.prepare(`
      SELECT capability_name, proficiency_level
      FROM master_ai_capabilities 
      WHERE master_ai_id = ?
    `).all(aiId);
    
    // 특수 기술
    const skills = db.prepare(`
      SELECT skill_name, mastery_level
      FROM master_ai_special_skills 
      WHERE master_ai_id = ?
    `).all(aiId);
    
    // 지시 사항
    const instructions = db.prepare(`
      SELECT instruction_type, instruction_content, priority, status, issued_at
      FROM master_ai_instructions 
      WHERE master_ai_id = ?
      ORDER BY priority, issued_at DESC
    `).all(aiId);
    
    // 관리 중인 하위 AI
    const subordinates = db.prepare(`
      SELECT subordinate_ai_id, management_level, assigned_at
      FROM master_ai_subordinates 
      WHERE master_ai_id = ?
      ORDER BY subordinate_ai_id
      LIMIT 10
    `).all(aiId);
    
    return {
      success: true,
      data: {
        ...masterAI,
        capabilities,
        skills,
        instructions,
        subordinates,
        total_subordinates: db.prepare('SELECT COUNT(*) as count FROM master_ai_subordinates WHERE master_ai_id = ?').get(aiId).count
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

// 시스템 통계
fastify.get('/api/master-stats', async (request, reply) => {
  try {
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total_masters,
        AVG(intelligence_level) as avg_intelligence,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_masters,
        MIN(intelligence_level) as min_intelligence,
        MAX(intelligence_level) as max_intelligence
      FROM master_ai_systems
    `).get();
    
    const roleStats = db.prepare(`
      SELECT role, COUNT(*) as count
      FROM master_ai_systems
      GROUP BY role
      ORDER BY count DESC
    `).all();
    
    const instructionStats = db.prepare(`
      SELECT 
        status,
        COUNT(*) as count
      FROM master_ai_instructions
      GROUP BY status
    `).all();
    
    const subordinateStats = db.prepare(`
      SELECT COUNT(*) as total_subordinates
      FROM master_ai_subordinates
    `).get();
    
    // 현재 활성 통신 활동
    const currentActivity = db.prepare(`
      SELECT 
        COUNT(*) as total_activities,
        COUNT(DISTINCT ai_id) as active_ais
      FROM communication_activity
      WHERE hour_group = strftime('%Y-%m-%d %H', 'now')
    `).get();
    
    return {
      success: true,
      data: {
        ...stats,
        roleStats,
        instructionStats,
        subordinateStats,
        currentActivity
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

// 새 지시 사항 발행
fastify.post('/api/master-ais/:aiId/instructions', async (request, reply) => {
  try {
    const { aiId } = request.params;
    const { instruction_type, instruction_content, priority = 1 } = request.body;
    
    const insertInstruction = db.prepare(`
      INSERT INTO master_ai_instructions (
        master_ai_id, instruction_type, instruction_content, priority
      ) VALUES (?, ?, ?, ?)
    `);
    
    const result = insertInstruction.run(aiId, instruction_type, instruction_content, priority);
    
    return {
      success: true,
      data: { instruction_id: result.lastInsertRowid }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

// 하위 AI 성과 조회
fastify.get('/api/subordinate-performance', async (request, reply) => {
  try {
    const performance = db.prepare(`
      SELECT 
        s.master_ai_id,
        m.ai_name as master_name,
        COUNT(s.subordinate_ai_id) as subordinate_count,
        AVG(
          CASE WHEN ca.ai_id IS NOT NULL THEN 1 ELSE 0 END
        ) * 100 as activity_rate
      FROM master_ai_subordinates s
      JOIN master_ai_systems m ON s.master_ai_id = m.ai_id
      LEFT JOIN communication_activity ca ON s.subordinate_ai_id = ca.ai_id 
        AND ca.hour_group = strftime('%Y-%m-%d %H', 'now')
      GROUP BY s.master_ai_id, m.ai_name
      ORDER BY m.leadership_rank
    `).all();
    
    return {
      success: true,
      data: performance
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

// 메인 대시보드 페이지
fastify.get('/', async (request, reply) => {
  return reply.sendFile('master_ai_dashboard.html');
});

// 서버 시작
const start = async () => {
  try {
    await fastify.listen({ port: 38000, host: '0.0.0.0' });
    console.log('🎯 마스터 AI 관리 대시보드가 시작되었습니다!');
    console.log('🖥️  접속 주소: http://localhost:38000');
    console.log('👑 10명의 마스터 AI와 5,037명의 하위 AI를 관리하세요!');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();