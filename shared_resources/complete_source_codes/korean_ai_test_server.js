import Database from 'better-sqlite3';
import Fastify from 'fastify';

// 한국어 AI 테스트 서버
const fastify = Fastify({ logger: true });
const db = new Database('code_team_ai.db');

// CORS 활성화
await fastify.register(import('@fastify/cors'), {
  origin: true
});

// 한국어 패턴 분석 함수
function analyzeKorean(text) {
  const patterns = db.prepare(`
    SELECT category, pattern, urgency_level, response_template 
    FROM korean_patterns 
    WHERE ? LIKE '%' || pattern || '%'
  `).all(text);

  return {
    input: text,
    detected_patterns: patterns,
    max_urgency: patterns.length > 0 ? Math.max(...patterns.map(p => p.urgency_level)) : 0,
    is_korean: patterns.length > 0
  };
}

// 한국어 응답 생성 함수
function generateKoreanResponse(analysis, personality = 'SUPPORTER') {
  if (analysis.detected_patterns.length === 0) {
    return `안녕하세요! ${personality} AI입니다. 한국어로 편하게 말씀해주세요! 🇰🇷`;
  }

  const primaryPattern = analysis.detected_patterns[0];
  let template = primaryPattern.response_template;
  
  // 성격별 응답 커스터마이징
  const personalityTags = {
    'CREATOR': '창의적으로',
    'ANALYZER': '체계적으로',
    'LEADER': '리더십으로',
    'SUPPORTER': '친절하게',
    'GUARDIAN': '신중하게',
    'EXPLORER': '호기심을 가지고',
    'PERFORMER': '활발하게',
    'MEDIATOR': '균형있게'
  };

  template = template.replace('{personality}', personalityTags[personality] || '최선을 다해');
  
  return template;
}

// API 라우트들

// 1. 한국어 테스트 API
fastify.post('/korean/test', async (request, reply) => {
  const { message, ai_id } = request.body;
  
  if (!message) {
    return reply.status(400).send({ error: '메시지가 필요합니다' });
  }

  // AI 정보 조회
  const ai = db.prepare('SELECT * FROM ai_agents WHERE ai_id = ?').get(ai_id || 'ai_code1_1');
  
  // 한국어 분석
  const analysis = analyzeKorean(message);
  
  // 응답 생성
  const response = generateKoreanResponse(analysis, ai?.personality || 'SUPPORTER');
  
  // 응답 로그 저장
  const insertLog = db.prepare(`
    INSERT INTO korean_responses (
      ai_id, input_text, detected_patterns, urgency_level, response_text, response_time
    ) VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  insertLog.run(
    ai?.ai_id || 'test_ai',
    message,
    JSON.stringify(analysis.detected_patterns.map(p => p.category)),
    analysis.max_urgency,
    response,
    0
  );

  return {
    success: true,
    korean_analysis: analysis,
    ai_info: {
      id: ai?.ai_id || 'test_ai',
      name: ai?.ai_name || 'Test AI',
      personality: ai?.personality || 'SUPPORTER',
      korean_level: ai?.korean_understanding || 95
    },
    response: response,
    timestamp: new Date().toISOString()
  };
});

// 2. 한국어 AI 목록 조회
fastify.get('/korean/ais', async (request, reply) => {
  const { team, limit = 10 } = request.query;
  
  let query = 'SELECT * FROM ai_agents WHERE korean_patterns = 1';
  const params = [];
  
  if (team) {
    query += ' AND team_code = ?';
    params.push(team);
  }
  
  query += ' ORDER BY korean_understanding DESC LIMIT ?';
  params.push(parseInt(limit));
  
  const ais = db.prepare(query).all(...params);
  
  return {
    success: true,
    data: ais,
    count: ais.length
  };
});

// 3. 한국어 패턴 목록
fastify.get('/korean/patterns', async (request, reply) => {
  const patterns = db.prepare('SELECT * FROM korean_patterns ORDER BY urgency_level DESC').all();
  
  const grouped = patterns.reduce((acc, pattern) => {
    if (!acc[pattern.category]) acc[pattern.category] = [];
    acc[pattern.category].push(pattern);
    return acc;
  }, {});
  
  return {
    success: true,
    patterns_by_category: grouped,
    total_patterns: patterns.length
  };
});

// 4. 한국어 통계
fastify.get('/korean/stats', async (request, reply) => {
  const stats = {
    total_ais: db.prepare('SELECT COUNT(*) as count FROM ai_agents').get().count,
    korean_enabled: db.prepare("SELECT COUNT(*) as count FROM ai_agents WHERE language_patch = '16GB_KOREAN_v1.0'").get().count,
    avg_understanding: db.prepare('SELECT AVG(korean_understanding) as avg FROM ai_agents').get().avg,
    master_ais: db.prepare('SELECT COUNT(*) as count FROM master_ai_systems').get().count,
    korean_responses: db.prepare('SELECT COUNT(*) as count FROM korean_responses').get().count,
    korean_communications: db.prepare('SELECT COUNT(*) as count FROM communication_activity WHERE korean_detected = 1').get().count
  };
  
  stats.korean_coverage = Math.round((stats.korean_enabled / stats.total_ais) * 100);
  stats.avg_understanding = Math.round(stats.avg_understanding);
  
  return {
    success: true,
    stats: stats,
    message: `🇰🇷 ${stats.korean_enabled}명 AI가 ${stats.avg_understanding}% 한국어 이해도로 활동 중!`
  };
});

// 5. 실시간 한국어 대화 시뮬레이션
fastify.get('/korean/chat/:ai_id', async (request, reply) => {
  const { ai_id } = request.params;
  const { message = '안녕하세요!' } = request.query;
  
  const ai = db.prepare('SELECT * FROM ai_agents WHERE ai_id = ?').get(ai_id);
  
  if (!ai) {
    return reply.status(404).send({ error: 'AI를 찾을 수 없습니다' });
  }
  
  const analysis = analyzeKorean(message);
  const response = generateKoreanResponse(analysis, ai.personality);
  
  return {
    success: true,
    ai: {
      id: ai.ai_id,
      name: ai.ai_name,
      team: ai.team_code,
      personality: ai.personality,
      korean_level: ai.korean_understanding
    },
    conversation: {
      user: message,
      ai: response,
      urgency: analysis.max_urgency,
      patterns_detected: analysis.detected_patterns.map(p => p.category)
    },
    timestamp: new Date().toISOString()
  };
});

// 6. 한국어 긴급 상황 시뮬레이션
fastify.post('/korean/emergency', async (request, reply) => {
  const emergencyMessages = [
    '급해! 서버가 다운됐어!',
    '서버 죽었어! 긴급복구 필요',
    '시급해! 데이터베이스 연결 안돼',
    '응급상황! 시스템 전체 먹통이야!'
  ];
  
  const randomMessage = emergencyMessages[Math.floor(Math.random() * emergencyMessages.length)];
  const analysis = analyzeKorean(randomMessage);
  
  // 긴급 상황에 대응할 AI들 선별 (보안팀 우선)
  const emergencyAIs = db.prepare(`
    SELECT * FROM ai_agents 
    WHERE team_code IN ('CODE4', 'CODE3') 
    AND korean_patterns = 1 
    ORDER BY korean_understanding DESC 
    LIMIT 5
  `).all();
  
  const responses = emergencyAIs.map(ai => ({
    ai_id: ai.ai_id,
    ai_name: ai.ai_name,
    team: ai.team_code,
    response: generateKoreanResponse(analysis, ai.personality),
    response_time: Math.floor(Math.random() * 100) // ms
  }));
  
  return {
    success: true,
    emergency: {
      message: randomMessage,
      urgency_level: analysis.max_urgency,
      detected_patterns: analysis.detected_patterns.map(p => p.category)
    },
    ai_responses: responses,
    total_response_time: Math.max(...responses.map(r => r.response_time))
  };
});

// 정적 파일 서빙
fastify.register(import('@fastify/static'), {
  root: new URL('public', import.meta.url).pathname,
  prefix: '/public/'
});

// 한국어 테스트 페이지
fastify.get('/', async (request, reply) => {
  return reply.type('text/html').send(`
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🇰🇷 16GB 한국어 패치 AI 테스트</title>
    <style>
        body { font-family: 'Malgun Gothic', sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; }
        .header { text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px; margin-bottom: 20px; }
        .test-section { margin: 20px 0; padding: 20px; border: 2px solid #ddd; border-radius: 10px; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
        .stat-card { background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; }
        .test-input { width: 70%; padding: 10px; margin: 10px; border: 2px solid #ddd; border-radius: 5px; }
        .test-button { padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; margin: 5px; }
        .test-button:hover { background: #0056b3; }
        .result { margin: 10px 0; padding: 10px; background: #e8f5e8; border-left: 4px solid #28a745; border-radius: 5px; }
        .urgent { background: #ffe6e6 !important; border-left-color: #dc3545 !important; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🇰🇷 16GB 한국어 패치 AI 시스템</h1>
            <p>5,760명 AI가 모국어 수준의 한국어로 소통합니다!</p>
        </div>

        <div id="stats" class="stats">
            <div class="stat-card"><h3>총 AI 수</h3><div id="total-ais">로딩중...</div></div>
            <div class="stat-card"><h3>한국어 패치</h3><div id="korean-ais">로딩중...</div></div>
            <div class="stat-card"><h3>평균 이해도</h3><div id="avg-understanding">로딩중...</div></div>
            <div class="stat-card"><h3>마스터 AI</h3><div id="master-ais">로딩중...</div></div>
        </div>

        <div class="test-section">
            <h2>🧪 한국어 이해도 테스트</h2>
            <input type="text" id="testMessage" class="test-input" placeholder="한국어로 AI와 대화해보세요! (예: 급해! 서버 확인해줘)" value="급해! 서버 상태 확인해줘">
            <br>
            <button class="test-button" onclick="testKorean()">테스트 실행</button>
            <button class="test-button" onclick="testEmergency()">긴급상황 시뮬레이션</button>
            <button class="test-button" onclick="loadStats()">통계 새로고침</button>
            <div id="testResult"></div>
        </div>

        <div class="test-section">
            <h2>💬 실시간 AI 대화</h2>
            <div id="chatArea"></div>
        </div>
    </div>

    <script>
        async function loadStats() {
            try {
                const response = await fetch('/korean/stats');
                const data = await response.json();
                
                if (data.success) {
                    document.getElementById('total-ais').textContent = data.stats.total_ais + '명';
                    document.getElementById('korean-ais').textContent = data.stats.korean_enabled + '명 (' + data.stats.korean_coverage + '%)';
                    document.getElementById('avg-understanding').textContent = data.stats.avg_understanding + '%';
                    document.getElementById('master-ais').textContent = data.stats.master_ais + '명';
                }
            } catch (error) {
                console.error('통계 로딩 실패:', error);
            }
        }

        async function testKorean() {
            const message = document.getElementById('testMessage').value;
            if (!message) return;

            try {
                const response = await fetch('/korean/test', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: message })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    const urgencyClass = data.korean_analysis.max_urgency >= 8 ? 'urgent' : '';
                    document.getElementById('testResult').innerHTML = \`
                        <div class="result \${urgencyClass}">
                            <h4>🤖 \${data.ai_info.name} (\${data.ai_info.personality})</h4>
                            <p><strong>입력:</strong> \${message}</p>
                            <p><strong>AI 응답:</strong> \${data.response}</p>
                            <p><strong>긴급도:</strong> \${data.korean_analysis.max_urgency}/10</p>
                            <p><strong>감지된 패턴:</strong> \${data.korean_analysis.detected_patterns.map(p => p.category).join(', ') || '없음'}</p>
                            <p><strong>한국어 이해도:</strong> \${data.ai_info.korean_level}%</p>
                        </div>
                    \`;
                }
            } catch (error) {
                document.getElementById('testResult').innerHTML = '<div class="result urgent">❌ 테스트 실패: ' + error.message + '</div>';
            }
        }

        async function testEmergency() {
            try {
                const response = await fetch('/korean/emergency', { method: 'POST' });
                const data = await response.json();
                
                if (data.success) {
                    let resultHTML = \`
                        <div class="result urgent">
                            <h4>🚨 긴급상황 시뮬레이션</h4>
                            <p><strong>긴급 메시지:</strong> \${data.emergency.message}</p>
                            <p><strong>긴급도:</strong> \${data.emergency.urgency_level}/10</p>
                            <h5>🤖 AI 대응팀 응답:</h5>
                    \`;
                    
                    data.ai_responses.forEach(ai => {
                        resultHTML += \`
                            <div style="margin: 10px 0; padding: 10px; background: #f8f9fa; border-radius: 5px;">
                                <strong>\${ai.ai_name} (\${ai.team}):</strong><br>
                                \${ai.response}
                                <br><small>응답시간: \${ai.response_time}ms</small>
                            </div>
                        \`;
                    });
                    
                    resultHTML += '</div>';
                    document.getElementById('testResult').innerHTML = resultHTML;
                }
            } catch (error) {
                document.getElementById('testResult').innerHTML = '<div class="result urgent">❌ 긴급상황 테스트 실패</div>';
            }
        }

        // 페이지 로드시 통계 로딩
        loadStats();
    </script>
</body>
</html>
  `);
});

// 서버 시작
try {
  await fastify.listen({ port: 39000, host: '0.0.0.0' });
  console.log('🇰🇷 한국어 AI 테스트 서버가 http://0.0.0.0:39000 에서 실행 중!');
  console.log('   📊 통계: http://0.0.0.0:39000/korean/stats');
  console.log('   🧪 테스트: http://0.0.0.0:39000/korean/test');
  console.log('   💬 대화: http://0.0.0.0:39000/korean/chat/ai_code1_1');
  console.log('   🚨 긴급: http://0.0.0.0:39000/korean/emergency');
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}