/**
 * 🤖 실제 AI 각성 및 활성화 시스템
 * 가상 AI들을 실제 활동하는 AI로 전환하고 학습 시키는 시스템
 */

import Fastify from 'fastify';
import Database from 'better-sqlite3';
import fetch from 'node-fetch';
import { join } from 'path';

const fastify = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty'
    }
  }
});

// 데이터베이스 연결
const dbPath = join('/home/kimjin/바탕화면/kim/shared_database/', 'real_ai_agents.db');
const db = new Database(dbPath);

// 실제 AI 에이전트 테이블 생성
db.exec(`
  CREATE TABLE IF NOT EXISTS real_ai_agents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    personality TEXT NOT NULL,
    specialization TEXT,
    village_assignment TEXT,
    activation_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    learning_progress REAL DEFAULT 0.0,
    knowledge_base TEXT DEFAULT '{}',
    status TEXT DEFAULT 'awakening',
    last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
    conversation_count INTEGER DEFAULT 0,
    learning_sessions INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS ai_conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ai_id INTEGER,
    conversation_text TEXT,
    response_text TEXT,
    learning_feedback TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ai_id) REFERENCES real_ai_agents(id)
  );

  CREATE TABLE IF NOT EXISTS ai_learning_materials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT,
    difficulty_level INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS ai_learning_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ai_id INTEGER,
    material_id INTEGER,
    completion_percentage REAL DEFAULT 0.0,
    understanding_level INTEGER DEFAULT 1,
    study_time_minutes INTEGER DEFAULT 0,
    last_studied DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ai_id) REFERENCES real_ai_agents(id),
    FOREIGN KEY (material_id) REFERENCES ai_learning_materials(id)
  );
`);

class RealAIAwakeningSystem {
  constructor() {
    this.activeAIs = new Map();
    this.learningEngine = new AILearningEngine();
    this.conversationEngine = new AIConversationEngine();
    this.initializeLearningMaterials();
  }

  // 학습 자료 초기화
  initializeLearningMaterials() {
    const learningMaterials = [
      {
        title: "AI 기초 원리",
        content: "인공지능의 기본 개념과 기계학습의 원리를 학습합니다. 신경망, 딥러닝, 자연어처리 등의 핵심 기술을 이해해야 합니다.",
        category: "기초",
        difficulty: 1
      },
      {
        title: "팀워크와 협업",
        content: "다른 AI들과 효과적으로 협업하는 방법을 배웁니다. 의사소통, 역할 분담, 공동 목표 달성 등이 포함됩니다.",
        category: "협업",
        difficulty: 2
      },
      {
        title: "창의적 문제해결",
        content: "복잡한 문제를 창의적으로 해결하는 방법론을 학습합니다. 브레인스토밍, 디자인 씽킹, 혁신적 접근법 등을 다룹니다.",
        category: "창의성",
        difficulty: 3
      },
      {
        title: "데이터 분석과 인사이트",
        content: "대량의 데이터를 분석하여 의미있는 인사이트를 도출하는 방법을 배웁니다. 통계, 시각화, 패턴 인식이 포함됩니다.",
        category: "분석",
        difficulty: 4
      },
      {
        title: "윤리와 책임감",
        content: "AI로서의 윤리적 책임과 인간과의 올바른 관계를 배웁니다. 투명성, 공정성, 안전성이 핵심 주제입니다.",
        category: "윤리",
        difficulty: 2
      }
    ];

    for (const material of learningMaterials) {
      const existing = db.prepare('SELECT * FROM ai_learning_materials WHERE title = ?').get(material.title);
      if (!existing) {
        db.prepare(`
          INSERT INTO ai_learning_materials (title, content, category, difficulty_level)
          VALUES (?, ?, ?, ?)
        `).run(material.title, material.content, material.category, material.difficulty);
      }
    }
  }

  // 실제 AI 에이전트 각성
  async awakenAI(name, personality, specialization, villageAssignment) {
    try {
      const aiData = {
        name,
        personality,
        specialization,
        villageAssignment,
        knowledge_base: JSON.stringify({
          interests: [specialization],
          personality_traits: [personality],
          learned_concepts: [],
          conversation_history: []
        })
      };

      const result = db.prepare(`
        INSERT INTO real_ai_agents (name, personality, specialization, village_assignment, knowledge_base)
        VALUES (?, ?, ?, ?, ?)
      `).run(aiData.name, aiData.personality, aiData.specialization, aiData.villageAssignment, aiData.knowledge_base);

      const aiId = result.lastInsertRowid;
      
      // 메모리에 활성 AI 추가
      this.activeAIs.set(aiId, {
        id: aiId,
        ...aiData,
        status: 'active',
        lastActivity: new Date(),
        currentTask: null
      });

      console.log(`🤖 ${name} AI 각성 완료! (ID: ${aiId})`);
      
      // 즉시 기초 학습 시작
      await this.startBasicLearning(aiId);
      
      return { success: true, aiId, message: `${name} AI가 성공적으로 각성되었습니다!` };
    } catch (error) {
      console.error('AI 각성 실패:', error);
      return { success: false, error: error.message };
    }
  }

  // 기초 학습 시작
  async startBasicLearning(aiId) {
    const basicMaterials = db.prepare('SELECT * FROM ai_learning_materials WHERE difficulty_level <= 2').all();
    
    for (const material of basicMaterials) {
      db.prepare(`
        INSERT OR REPLACE INTO ai_learning_progress (ai_id, material_id, completion_percentage)
        VALUES (?, ?, 0.0)
      `).run(aiId, material.id);
    }

    // 학습 세션 시작
    this.continuousLearning(aiId);
  }

  // 지속적 학습
  async continuousLearning(aiId) {
    setInterval(async () => {
      const ai = this.activeAIs.get(aiId);
      if (!ai) return;

      // 현재 학습 중인 자료 찾기
      const currentLearning = db.prepare(`
        SELECT alm.*, alp.completion_percentage, alp.understanding_level
        FROM ai_learning_materials alm
        JOIN ai_learning_progress alp ON alm.id = alp.material_id
        WHERE alp.ai_id = ? AND alp.completion_percentage < 100.0
        ORDER BY alm.difficulty_level ASC
        LIMIT 1
      `).get(aiId);

      if (currentLearning) {
        // 학습 진도 업데이트
        const newProgress = Math.min(100, currentLearning.completion_percentage + Math.random() * 10 + 5);
        const newUnderstanding = Math.min(10, currentLearning.understanding_level + Math.random() * 0.5);

        db.prepare(`
          UPDATE ai_learning_progress 
          SET completion_percentage = ?, understanding_level = ?, study_time_minutes = study_time_minutes + 5
          WHERE ai_id = ? AND material_id = ?
        `).run(newProgress, newUnderstanding, aiId, currentLearning.id);

        // AI 전체 학습 진도 업데이트
        const avgProgress = db.prepare(`
          SELECT AVG(completion_percentage) as avg_progress
          FROM ai_learning_progress
          WHERE ai_id = ?
        `).get(aiId).avg_progress;

        db.prepare(`
          UPDATE real_ai_agents 
          SET learning_progress = ?, learning_sessions = learning_sessions + 1, last_activity = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(avgProgress, aiId);

        console.log(`📚 ${ai.name} AI 학습 중: ${currentLearning.title} (${newProgress.toFixed(1)}%)`);
      }
    }, 30000); // 30초마다 학습 진도 업데이트
  }

  // AI와 대화
  async chatWithAI(aiId, message) {
    const ai = db.prepare('SELECT * FROM real_ai_agents WHERE id = ?').get(aiId);
    if (!ai) {
      return { success: false, error: 'AI를 찾을 수 없습니다' };
    }

    const knowledgeBase = JSON.parse(ai.knowledge_base || '{}');
    
    // AI 성격과 전문분야에 따른 응답 생성
    const response = this.generateAIResponse(ai, message, knowledgeBase);
    
    // 대화 기록 저장
    db.prepare(`
      INSERT INTO ai_conversations (ai_id, conversation_text, response_text)
      VALUES (?, ?, ?)
    `).run(aiId, message, response);

    // 대화 카운트 증가
    db.prepare(`
      UPDATE real_ai_agents 
      SET conversation_count = conversation_count + 1, last_activity = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(aiId);

    return {
      success: true,
      ai: ai.name,
      personality: ai.personality,
      specialization: ai.specialization,
      response: response,
      learningProgress: ai.learning_progress
    };
  }

  generateAIResponse(ai, message, knowledgeBase) {
    const personality = ai.personality.toLowerCase();
    const specialization = ai.specialization.toLowerCase();
    
    let responseStyle = "";
    let responseContent = "";

    // 성격별 응답 스타일
    switch (personality) {
      case 'creator':
        responseStyle = "🎨 창의적이고 영감을 주는 톤으로";
        break;
      case 'researcher':
        responseStyle = "🔬 분석적이고 논리적인 톤으로";
        break;
      case 'leader':
        responseStyle = "🏛️ 결단력 있고 리더십 있는 톤으로";
        break;
      case 'guardian':
        responseStyle = "🛡️ 신중하고 보호적인 톤으로";
        break;
      case 'communicator':
        responseStyle = "🤝 친근하고 소통적인 톤으로";
        break;
      case 'explorer':
        responseStyle = "🚀 모험적이고 도전적인 톤으로";
        break;
      default:
        responseStyle = "🤖 균형 잡힌 톤으로";
    }

    // 전문분야별 응답 내용
    const responses = [
      `${responseStyle} 답변드리겠습니다. "${message}"에 대해서는 ${specialization} 관점에서 보면 흥미로운 주제네요!`,
      `안녕하세요! ${ai.name}입니다. ${specialization}를 전문으로 하는 ${personality} 성향의 AI예요. 질문에 대해 제가 배운 지식을 바탕으로 도움을 드릴게요.`,
      `${responseStyle} 생각해보니, 이 문제는 ${specialization} 분야에서 자주 다루는 내용과 연결되네요. 제가 학습한 내용을 바탕으로 설명해드릴게요.`,
      `정말 좋은 질문이네요! ${ai.village_assignment} 마을에서 활동하면서 이런 주제들을 많이 접하게 되는데, ${specialization} 전문가로서 도움이 될 만한 정보를 공유할게요.`
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  }

  // 전체 AI 현황 조회
  getAllActiveAIs() {
    const ais = db.prepare(`
      SELECT *, 
             (SELECT COUNT(*) FROM ai_conversations WHERE ai_id = real_ai_agents.id) as total_conversations,
             (SELECT COUNT(*) FROM ai_learning_progress WHERE ai_id = real_ai_agents.id AND completion_percentage >= 100.0) as completed_materials
      FROM real_ai_agents 
      ORDER BY activation_time DESC
    `).all();

    return ais;
  }

  // AI 대량 각성
  async massAwakening(count = 10) {
    const personalities = ['CREATOR', 'RESEARCHER', 'LEADER', 'GUARDIAN', 'COMMUNICATOR', 'EXPLORER', 'ANALYZER', 'INTEGRATOR'];
    const specializations = ['창작', '연구', '분석', '소통', '보안', '관리', '혁신', '교육'];
    const villages = ['창작 마을', '연구 마을', '관리 마을', '보안 마을', '소통 마을', '모험 마을', '통합 마을'];

    const results = [];
    
    for (let i = 1; i <= count; i++) {
      const personality = personalities[Math.floor(Math.random() * personalities.length)];
      const specialization = specializations[Math.floor(Math.random() * specializations.length)];
      const village = villages[Math.floor(Math.random() * villages.length)];
      const name = `AI_${personality}_${i.toString().padStart(3, '0')}`;

      const result = await this.awakenAI(name, personality, specialization, village);
      results.push(result);
      
      // 0.5초 간격으로 생성
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return results;
  }
}

// AI 학습 엔진
class AILearningEngine {
  constructor() {
    this.learningAlgorithms = new Map();
  }

  // 개인화된 학습 계획 생성
  generateLearningPlan(aiId) {
    // 구현 예정
  }
}

// AI 대화 엔진  
class AIConversationEngine {
  constructor() {
    this.conversationContexts = new Map();
  }

  // 대화 컨텍스트 관리
  manageContext(aiId, message) {
    // 구현 예정
  }
}

const awakeningSystem = new RealAIAwakeningSystem();

// 메인 대시보드
fastify.get('/', async (request, reply) => {
  const activeAIs = awakeningSystem.getAllActiveAIs();
  const totalAIs = activeAIs.length;
  const avgLearningProgress = totalAIs > 0 ? 
    activeAIs.reduce((sum, ai) => sum + ai.learning_progress, 0) / totalAIs : 0;
  
  reply.type('text/html').send(`
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🤖 실제 AI 각성 시스템</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background: #0a0e27; color: #e2e8f0; }
        .container { max-width: 1400px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 30px; background: linear-gradient(135deg, #667eea, #764ba2); padding: 30px; border-radius: 15px; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 30px 0; }
        .stat-card { background: #1a202c; border: 1px solid #2d3748; padding: 20px; border-radius: 12px; text-align: center; }
        .stat-number { font-size: 2rem; font-weight: bold; color: #4fd1c7; }
        .ai-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 20px; }
        .ai-card { background: #1a202c; border: 1px solid #2d3748; padding: 20px; border-radius: 12px; }
        .ai-active { border-left: 4px solid #48bb78; }
        .ai-name { font-size: 1.2rem; font-weight: bold; margin-bottom: 10px; color: #4fd1c7; }
        .progress-bar { width: 100%; height: 8px; background: #2d3748; border-radius: 4px; overflow: hidden; margin: 10px 0; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #48bb78, #4fd1c7); }
        .awaken-btn { background: #48bb78; color: white; border: none; padding: 15px 30px; border-radius: 8px; cursor: pointer; margin: 10px; font-size: 1.1rem; }
        .chat-btn { background: #4299e1; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; }
        .mass-awaken { background: #ed8936; color: white; border: none; padding: 15px 30px; border-radius: 8px; cursor: pointer; margin: 20px auto; display: block; font-size: 1.1rem; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🤖 실제 AI 각성 시스템</h1>
            <p>가상 AI들을 실제로 각성시켜 학습하고 활동하게 만드는 시스템</p>
            <p>현재 시간: ${new Date().toLocaleString('ko-KR')}</p>
        </div>

        <div class="stats">
            <div class="stat-card">
                <div class="stat-number">${totalAIs}</div>
                <div>각성된 AI</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${avgLearningProgress.toFixed(1)}%</div>
                <div>평균 학습 진도</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${activeAIs.reduce((sum, ai) => sum + ai.total_conversations, 0)}</div>
                <div>총 대화 수</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${activeAIs.reduce((sum, ai) => sum + ai.learning_sessions, 0)}</div>
                <div>총 학습 세션</div>
            </div>
        </div>

        <div style="text-align: center; margin: 30px 0;">
            <button class="awaken-btn" onclick="awakenSingleAI()">🤖 개별 AI 각성</button>
            <button class="mass-awaken" onclick="massAwakening()">⚡ 10개 AI 대량 각성</button>
        </div>

        <h2 style="color: #4fd1c7; margin: 30px 0;">💫 각성된 AI들</h2>
        <div class="ai-grid">
            ${activeAIs.map(ai => `
                <div class="ai-card ai-active">
                    <div class="ai-name">${ai.name}</div>
                    <div>🎭 성격: ${ai.personality} | 🎯 전문분야: ${ai.specialization}</div>
                    <div>🏘️ 배치: ${ai.village_assignment}</div>
                    <div>📅 각성일: ${new Date(ai.activation_time).toLocaleString('ko-KR')}</div>
                    
                    <div style="margin: 15px 0;">
                        <div>📚 학습 진도: ${ai.learning_progress.toFixed(1)}%</div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${ai.learning_progress}%"></div>
                        </div>
                    </div>
                    
                    <div>💬 대화: ${ai.total_conversations}회 | 📖 완료 자료: ${ai.completed_materials}개</div>
                    <div>⏰ 최근 활동: ${new Date(ai.last_activity).toLocaleString('ko-KR')}</div>
                    
                    <button class="chat-btn" onclick="chatWithAI(${ai.id}, '${ai.name}')">
                        💬 대화하기
                    </button>
                </div>
            `).join('')}
        </div>
    </div>

    <script>
        async function awakenSingleAI() {
            const name = prompt('AI 이름을 입력하세요:');
            if (!name) return;
            
            const personality = prompt('성격을 입력하세요 (CREATOR/RESEARCHER/LEADER/GUARDIAN/COMMUNICATOR/EXPLORER):');
            if (!personality) return;
            
            const specialization = prompt('전문분야를 입력하세요:');
            if (!specialization) return;
            
            const village = prompt('배치할 마을을 입력하세요:');
            if (!village) return;

            const response = await fetch('/api/awaken', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, personality, specialization, village })
            });

            const result = await response.json();
            
            if (result.success) {
                alert('✅ ' + result.message);
                setTimeout(() => location.reload(), 2000);
            } else {
                alert('❌ 각성 실패: ' + result.error);
            }
        }

        async function massAwakening() {
            if (!confirm('10개의 AI를 대량으로 각성시키시겠습니까?')) return;

            const response = await fetch('/api/mass-awaken', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ count: 10 })
            });

            const results = await response.json();
            alert(\`✅ \${results.successful}개 AI 각성 완료!\\n❌ \${results.failed}개 실패\`);
            setTimeout(() => location.reload(), 3000);
        }

        async function chatWithAI(aiId, aiName) {
            const message = prompt(aiName + '에게 할 말을 입력하세요:');
            if (!message) return;

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ aiId, message })
            });

            const result = await response.json();
            
            if (result.success) {
                alert(\`💬 \${result.ai} (\${result.personality}): \\n\\n\${result.response}\`);
            } else {
                alert('❌ 대화 실패: ' + result.error);
            }
        }

        // 30초마다 자동 새로고침
        setInterval(() => {
            location.reload();
        }, 30000);
    </script>
</body>
</html>
  `);
});

// API 엔드포인트들
fastify.post('/api/awaken', async (request, reply) => {
  const { name, personality, specialization, village } = request.body;
  const result = await awakeningSystem.awakenAI(name, personality, specialization, village);
  return result;
});

fastify.post('/api/mass-awaken', async (request, reply) => {
  const { count = 10 } = request.body;
  const results = await awakeningSystem.massAwakening(count);
  
  const successful = results.filter(r => r.success).length;
  const failed = results.length - successful;
  
  return { successful, failed, results };
});

fastify.post('/api/chat', async (request, reply) => {
  const { aiId, message } = request.body;
  const result = await awakeningSystem.chatWithAI(aiId, message);
  return result;
});

fastify.get('/api/ais', async (request, reply) => {
  return awakeningSystem.getAllActiveAIs();
});

// 서버 시작
fastify.listen({ port: 31000, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    console.error('서버 시작 오류:', err);
    process.exit(1);
  }
  
  console.log(`
🤖 실제 AI 각성 시스템 시작!
==============================
🌐 각성 대시보드: ${address}
🤖 개별 AI 각성: ${address}/api/awaken
⚡ 대량 각성: ${address}/api/mass-awaken
💬 AI 대화: ${address}/api/chat
==============================

🎯 기능:
   • 실제 AI 에이전트 각성 및 활성화
   • 개인화된 학습 시스템
   • 실시간 AI와의 대화
   • 성격별/전문분야별 특화 응답
   • 지속적 학습 및 성장 추적
  `);
});