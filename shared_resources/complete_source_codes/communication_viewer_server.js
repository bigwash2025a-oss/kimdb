/**
 * 📱 AI 통신 정보 조회 앱 서버
 * 메일, SNS, 전화 정보를 한번에 볼 수 있는 웹 앱
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

// AI 통신 정보 전체 조회 API (실제 데이터)
fastify.get('/api/communications', async (request, reply) => {
  try {
    const { team, limit = 50, offset = 0, search } = request.query;
    
    let query = `
      SELECT 
        c.ai_id,
        c.ai_name,
        c.team_code,
        c.email_primary,
        c.email_work,
        c.email_backup,
        c.email_team,
        c.email_personal,
        c.sns_twitter,
        c.sns_linkedin,
        c.sns_github,
        c.sns_slack,
        c.sns_discord,
        c.phone_main,
        c.phone_office,
        c.phone_mobile,
        c.phone_emergency,
        c.phone_hotline,
        c.port_main,
        c.port_api,
        c.port_websocket,
        c.port_backup,
        c.port_debug,
        s.used_size_mb,
        s.total_files,
        s.email_count,
        p.total_learning_hours,
        p.average_score,
        (SELECT COUNT(*) FROM communication_activity WHERE ai_id = c.ai_id AND hour_group = strftime('%Y-%m-%d %H', 'now')) as current_hour_activities
      FROM ai_communication_info c
      LEFT JOIN ai_storage s ON c.ai_id = s.ai_id
      LEFT JOIN ai_learning_progress p ON c.ai_id = p.ai_id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (team) {
      query += ' AND c.team_code = ?';
      params.push(team);
    }
    
    if (search) {
      query += ' AND (c.ai_name LIKE ? OR c.team_code LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    
    query += ' ORDER BY c.team_code, c.ai_id LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const communications = db.prepare(query).all(...params);
    
    // 전체 개수 조회
    let countQuery = 'SELECT COUNT(*) as total FROM ai_communication_info c WHERE 1=1';
    const countParams = [];
    
    if (team) {
      countQuery += ' AND c.team_code = ?';
      countParams.push(team);
    }
    
    if (search) {
      countQuery += ' AND (c.ai_name LIKE ? OR c.team_code LIKE ?)';
      countParams.push(`%${search}%`, `%${search}%`);
    }
    
    const totalCount = db.prepare(countQuery).get(...countParams);
    
    return {
      success: true,
      data: communications,
      pagination: {
        total: totalCount.total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + parseInt(limit) < totalCount.total
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

// 특정 AI 통신 정보 상세 조회
fastify.get('/api/communications/:aiId', async (request, reply) => {
  try {
    const { aiId } = request.params;
    
    const communication = db.prepare(`
      SELECT 
        c.*,
        s.storage_path,
        s.used_size_mb,
        s.available_size_mb,
        s.total_files,
        s.email_count,
        s.last_accessed,
        p.current_subject,
        p.total_learning_hours,
        p.average_score
      FROM ai_communication_info c
      LEFT JOIN ai_storage s ON c.ai_id = s.ai_id
      LEFT JOIN ai_learning_progress p ON c.ai_id = p.ai_id
      WHERE c.ai_id = ?
    `).get(aiId);
    
    if (!communication) {
      return {
        success: false,
        error: 'AI를 찾을 수 없습니다.'
      };
    }
    
    // 최근 이메일 기록 조회
    const recentEmails = db.prepare(`
      SELECT subject, email_type, sent_at, is_read
      FROM ai_email_history
      WHERE ai_id = ?
      ORDER BY sent_at DESC
      LIMIT 5
    `).all(aiId);
    
    // 학습 기록 조회
    const recentLearning = db.prepare(`
      SELECT subject, topic, overall_score, learning_date
      FROM ai_learning_records
      WHERE ai_id = ?
      ORDER BY learning_date DESC
      LIMIT 3
    `).all(aiId);
    
    return {
      success: true,
      data: {
        ...communication,
        recentEmails,
        recentLearning
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

// 팀별 통신 통계 API
fastify.get('/api/stats/teams', async (request, reply) => {
  try {
    const teamStats = db.prepare(`
      SELECT 
        c.team_code,
        COUNT(*) as ai_count,
        AVG(s.used_size_mb) as avg_storage_used,
        SUM(s.email_count) as total_emails,
        COUNT(CASE WHEN s.last_accessed > datetime('now', '-7 days') THEN 1 END) as active_ais
      FROM ai_communication_info c
      LEFT JOIN ai_storage s ON c.ai_id = s.ai_id
      GROUP BY c.team_code
      ORDER BY c.team_code
    `).all();
    
    return {
      success: true,
      data: teamStats
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

// 실시간 통신 활동 통계 (완전히 데이터베이스 기준)
fastify.get('/api/stats/activity', async (request, reply) => {
  try {
    // 실시간 통신 활동 통계 (현재 시간 기준)
    const currentHourActivity = db.prepare(`
      SELECT 
        COUNT(*) as total_activities,
        COUNT(DISTINCT ai_id) as active_ais,
        SUM(CASE WHEN activity_type LIKE '%email%' THEN 1 ELSE 0 END) as email_activities,
        SUM(CASE WHEN activity_type LIKE '%sms%' THEN 1 ELSE 0 END) as sms_activities,
        SUM(CASE WHEN activity_type LIKE '%call%' THEN 1 ELSE 0 END) as call_activities,
        SUM(CASE WHEN activity_type LIKE '%sns%' THEN 1 ELSE 0 END) as sns_activities
      FROM communication_activity
      WHERE hour_group = strftime('%Y-%m-%d %H', 'now')
    `).get();
    
    // CODE 팀별 분포 (실제 통신 정보 기준)
    const codeTeamStats = db.prepare(`
      SELECT 
        SUM(CASE WHEN team_code = 'CODE1' THEN 1 ELSE 0 END) as code1_count,
        SUM(CASE WHEN team_code = 'CODE2' THEN 1 ELSE 0 END) as code2_count,
        SUM(CASE WHEN team_code = 'CODE3' THEN 1 ELSE 0 END) as code3_count,
        SUM(CASE WHEN team_code = 'CODE4' THEN 1 ELSE 0 END) as code4_count
      FROM ai_communication_info
    `).get();
    
    // 실제 통신 채널 개수 계산 (데이터베이스 기준)
    const communicationChannelStats = db.prepare(`
      SELECT 
        COUNT(DISTINCT email_primary) + 
        COUNT(DISTINCT email_work) + 
        COUNT(DISTINCT email_backup) + 
        COUNT(DISTINCT email_team) + 
        COUNT(DISTINCT email_personal) as total_emails,
        
        COUNT(DISTINCT sns_twitter) + 
        COUNT(DISTINCT sns_linkedin) + 
        COUNT(DISTINCT sns_github) + 
        COUNT(DISTINCT sns_slack) + 
        COUNT(DISTINCT sns_discord) as total_sns,
        
        COUNT(DISTINCT phone_main) + 
        COUNT(DISTINCT phone_office) + 
        COUNT(DISTINCT phone_mobile) + 
        COUNT(DISTINCT phone_emergency) + 
        COUNT(DISTINCT phone_hotline) as total_phones,
        
        COUNT(DISTINCT port_main) + 
        COUNT(DISTINCT port_api) + 
        COUNT(DISTINCT port_websocket) + 
        COUNT(DISTINCT port_backup) + 
        COUNT(DISTINCT port_debug) as total_ports
      FROM ai_communication_info
    `).get();
    
    const activityStats = {
      total_ais: currentHourActivity.active_ais, // 실제 활동 중인 AI 수
      ...codeTeamStats
    };
    
    const communicationChannels = {
      emails: communicationChannelStats.total_emails || 0,
      sns: communicationChannelStats.total_sns || 0,
      phones: communicationChannelStats.total_phones || 0,
      ports: communicationChannelStats.total_ports || 0,
      total: (communicationChannelStats.total_emails || 0) + 
             (communicationChannelStats.total_sns || 0) + 
             (communicationChannelStats.total_phones || 0) + 
             (communicationChannelStats.total_ports || 0)
    };
    
    // 실시간 활동 데이터 추가
    const realTimeActivity = {
      total_activities: currentHourActivity.total_activities || 0,
      active_ais: currentHourActivity.active_ais || 0,
      email_activities: currentHourActivity.email_activities || 0,
      sms_activities: currentHourActivity.sms_activities || 0,
      call_activities: currentHourActivity.call_activities || 0,
      sns_activities: currentHourActivity.sns_activities || 0
    };
    
    return {
      success: true,
      data: {
        ...activityStats,
        communicationChannels,
        realTimeActivity
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

// 검색 API
fastify.get('/api/search', async (request, reply) => {
  try {
    const { q, type = 'all' } = request.query;
    
    if (!q) {
      return {
        success: false,
        error: '검색어를 입력하세요.'
      };
    }
    
    let results = [];
    
    if (type === 'all' || type === 'ai') {
      // AI 이름 검색
      const aiResults = db.prepare(`
        SELECT ai_id, ai_name, team_code, email_primary, phone_main
        FROM ai_communication_info
        WHERE ai_name LIKE ? OR team_code LIKE ?
        LIMIT 20
      `).all(`%${q}%`, `%${q}%`);
      
      results.push(...aiResults.map(ai => ({
        type: 'ai',
        ...ai
      })));
    }
    
    if (type === 'all' || type === 'email') {
      // 이메일 검색
      const emailResults = db.prepare(`
        SELECT ai_id, ai_name, team_code, email_primary, email_work, email_team
        FROM ai_communication_info
        WHERE email_primary LIKE ? OR email_work LIKE ? OR email_team LIKE ?
        LIMIT 20
      `).all(`%${q}%`, `%${q}%`, `%${q}%`);
      
      results.push(...emailResults.map(email => ({
        type: 'email',
        ...email
      })));
    }
    
    if (type === 'all' || type === 'phone') {
      // 전화번호 검색
      const phoneResults = db.prepare(`
        SELECT ai_id, ai_name, team_code, phone_main, phone_office, phone_mobile
        FROM ai_communication_info
        WHERE phone_main LIKE ? OR phone_office LIKE ? OR phone_mobile LIKE ?
        LIMIT 20
      `).all(`%${q}%`, `%${q}%`, `%${q}%`);
      
      results.push(...phoneResults.map(phone => ({
        type: 'phone',
        ...phone
      })));
    }
    
    return {
      success: true,
      data: results,
      total: results.length
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

// 메인 페이지
fastify.get('/', async (request, reply) => {
  return reply.sendFile('communication_viewer.html');
});

// 서버 시작
const start = async () => {
  try {
    await fastify.listen({ port: 37000, host: '0.0.0.0' });
    console.log('🚀 AI 통신 정보 조회 앱이 시작되었습니다!');
    console.log('📱 접속 주소: http://localhost:37000');
    console.log('📊 실시간으로 AI들의 메일, SNS, 전화 정보를 확인하세요!');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();