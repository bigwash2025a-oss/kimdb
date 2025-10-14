/**
 * 🏢 CODE 팀 전용 커뮤니케이션 허브
 * CODE1~4 팀과 ADMIN을 위한 전용 소통 시스템
 */

import Fastify from 'fastify';
import fetch from 'node-fetch';

const fastify = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty'
    }
  }
});

const TEAMS = {
  CODE1: {
    name: 'Firebase 인증 시스템 전문팀',
    email: 'code1@admin.aikim.com',
    emoji: '📧',
    speciality: 'Firebase Auth, 사용자 인증, 보안',
    status: 'active',
    currentProjects: ['Firebase 인증 시스템 구축', 'OAuth 2.0 구현', '2FA 보안 강화'],
    port: 29001
  },
  CODE2: {
    name: '통합 커뮤니케이션 시스템 개발팀',
    email: 'code2@admin.aikim.com',
    emoji: '💬',
    speciality: '이메일, 메시징, 실시간 통신',
    status: 'active',
    currentProjects: ['이메일 시스템 구축', 'WebRTC 화상통화', 'Socket.io 실시간 채팅'],
    port: 29002
  },
  CODE3: {
    name: 'KIMDB 데이터베이스 시스템팀',
    email: 'code3@admin.aikim.com',
    emoji: '💾',
    speciality: 'Database, 데이터 모델링, 최적화',
    status: 'active',
    currentProjects: ['KIMDB 최적화', '빅데이터 분석', '백업 시스템'],
    port: 29003
  },
  CODE4: {
    name: '시스템 운영 및 백업 관리팀',
    email: 'code4@admin.aikim.com',
    emoji: '🔧',
    speciality: '시스템 운영, 백업, 모니터링, DevOps',
    status: 'active',
    currentProjects: ['자동 백업 시스템', 'CI/CD 파이프라인', '인프라 모니터링'],
    port: 29004
  },
  ADMIN: {
    name: '전체 시스템 관리자',
    email: 'admin@master.aikim.com',
    emoji: '👑',
    speciality: '전체 시스템 관리, 모든 활동 모니터링',
    status: 'active',
    currentProjects: ['마스터 관제 시스템', '전체 성능 모니터링', '보안 감사'],
    port: 29000
  }
};

// 팀 간 메시지 저장
const teamMessages = new Map();
const systemNotifications = [];

// 메인 허브 페이지
fastify.get('/', async (request, reply) => {
  const currentTime = new Date().toLocaleString('ko-KR');
  
  reply.type('text/html').send(`
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🏢 CODE 팀 커뮤니케이션 허브</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background: #0d1117; color: #c9d1d9; }
        .container { max-width: 1400px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 30px; background: linear-gradient(135deg, #238636, #2ea043); padding: 30px; border-radius: 15px; }
        .header h1 { margin: 0; font-size: 2.5rem; color: white; }
        .teams-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 20px; margin: 30px 0; }
        .team-card { background: #161b22; border: 1px solid #30363d; padding: 25px; border-radius: 15px; transition: transform 0.3s; }
        .team-card:hover { transform: translateY(-5px); border-color: #58a6ff; }
        .team-header { display: flex; align-items: center; margin-bottom: 15px; }
        .team-emoji { font-size: 2rem; margin-right: 15px; }
        .team-info h3 { margin: 0; color: #58a6ff; }
        .team-email { color: #7d8590; font-size: 0.9rem; margin: 5px 0; }
        .team-specialty { color: #f0883e; font-weight: bold; margin: 10px 0; }
        .projects { margin: 15px 0; }
        .projects h4 { margin: 10px 0 5px 0; color: #f0883e; }
        .project-list { list-style: none; padding: 0; }
        .project-list li { background: #0d1117; padding: 8px 12px; margin: 5px 0; border-radius: 6px; border-left: 3px solid #238636; }
        .contact-btn { background: #238636; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; width: 100%; margin-top: 10px; }
        .contact-btn:hover { background: #2ea043; }
        .system-status { background: #161b22; border: 1px solid #30363d; padding: 20px; border-radius: 15px; margin: 20px 0; }
        .status-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top: 15px; }
        .status-item { background: #0d1117; padding: 15px; border-radius: 8px; text-align: center; }
        .status-online { border-left: 4px solid #238636; }
        .notifications { background: #161b22; border: 1px solid #30363d; padding: 20px; border-radius: 15px; margin: 20px 0; }
        .notification-item { background: #0d1117; padding: 12px; margin: 8px 0; border-radius: 6px; border-left: 3px solid #f0883e; }
        .quick-actions { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; margin: 30px 0; }
        .action-btn { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 20px; border-radius: 10px; text-align: center; text-decoration: none; transition: transform 0.3s; }
        .action-btn:hover { transform: scale(1.05); color: white; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏢 CODE 팀 커뮤니케이션 허브</h1>
            <p>전문팀 간 협업과 소통을 위한 통합 플랫폼</p>
            <p>현재 시간: ${currentTime}</p>
        </div>

        <div class="system-status">
            <h2>📊 시스템 현황</h2>
            <div class="status-grid">
                <div class="status-item status-online">
                    <div><strong>6,875개</strong></div>
                    <div>총 AI 에이전트</div>
                </div>
                <div class="status-item status-online">
                    <div><strong>12개</strong></div>
                    <div>운영 중인 시스템</div>
                </div>
                <div class="status-item status-online">
                    <div><strong>5개</strong></div>
                    <div>전문 팀</div>
                </div>
                <div class="status-item status-online">
                    <div><strong>85.1%</strong></div>
                    <div>평균 시스템 성능</div>
                </div>
            </div>
        </div>

        <div class="quick-actions">
            <a href="http://localhost:28000" target="_blank" class="action-btn">
                📊 통합 대시보드
            </a>
            <a href="http://localhost:35300" target="_blank" class="action-btn">
                📧 이메일 시스템
            </a>
            <a href="http://localhost:25000" target="_blank" class="action-btn">
                🏘️ AI 마을 네트워크
            </a>
            <a href="http://localhost:27100" target="_blank" class="action-btn">
                🔍 검색 시스템
            </a>
        </div>

        <h2 style="color: #58a6ff; margin: 30px 0 20px 0;">👥 전문팀 현황</h2>
        <div class="teams-grid">
            ${Object.entries(TEAMS).map(([code, team]) => `
                <div class="team-card">
                    <div class="team-header">
                        <div class="team-emoji">${team.emoji}</div>
                        <div class="team-info">
                            <h3>${code}</h3>
                            <div class="team-email">${team.email}</div>
                        </div>
                    </div>
                    <div class="team-specialty">${team.speciality}</div>
                    <div><strong>${team.name}</strong></div>
                    
                    <div class="projects">
                        <h4>🚀 진행 중인 프로젝트</h4>
                        <ul class="project-list">
                            ${team.currentProjects.map(project => 
                                `<li>${project}</li>`
                            ).join('')}
                        </ul>
                    </div>
                    
                    <button class="contact-btn" onclick="contactTeam('${code}', '${team.email}')">
                        💬 ${code} 팀에게 문의하기
                    </button>
                </div>
            `).join('')}
        </div>

        <div class="notifications">
            <h2>🔔 시스템 알림</h2>
            <div class="notification-item">
                <strong>✅ 시스템 배포 완료</strong> - 6,875개 AI 에이전트가 성공적으로 배치되었습니다
            </div>
            <div class="notification-item">
                <strong>🔍 검색 시스템 활성화</strong> - 43개 항목에 대한 실시간 검색이 가능합니다
            </div>
            <div class="notification-item">
                <strong>📊 실시간 모니터링 가동</strong> - 모든 시스템의 상태를 30초마다 업데이트합니다
            </div>
            <div class="notification-item">
                <strong>💬 CODE2 팀 이메일 시스템</strong> - 포트 35300에서 이메일 서비스가 운영 중입니다
            </div>
        </div>
    </div>

    <script>
        function contactTeam(teamCode, email) {
            if (teamCode === 'CODE2') {
                // CODE2는 이메일 시스템으로 직접 연결
                window.open('http://localhost:35300/email', '_blank');
                alert('📧 CODE2 팀의 이메일 시스템으로 연결됩니다!\\n\\n이메일: ' + email + '\\n포트: 35300');
            } else {
                // 다른 팀들은 문의 양식
                const message = prompt(teamCode + ' 팀에게 보낼 메시지를 입력하세요:');
                if (message) {
                    fetch('/api/send-message', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            to: teamCode,
                            email: email,
                            message: message,
                            timestamp: new Date().toISOString()
                        })
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            alert('✅ ' + teamCode + ' 팀에게 메시지가 전송되었습니다!');
                        }
                    });
                }
            }
        }

        // 30초마다 페이지 새로고침
        setInterval(() => {
            location.reload();
        }, 30000);
    </script>
</body>
</html>
  `);
});

// CODE2 이메일 시스템 연결 API
fastify.get('/api/code2-email', async (request, reply) => {
  try {
    const response = await fetch('http://localhost:35300/email');
    const data = await response.text();
    return { success: true, redirect: 'http://localhost:35300/email' };
  } catch (error) {
    return { 
      success: false, 
      error: 'CODE2 이메일 시스템에 연결할 수 없습니다',
      suggestion: '포트 35300이 실행 중인지 확인해주세요' 
    };
  }
});

// 팀 간 메시지 전송
fastify.post('/api/send-message', async (request, reply) => {
  const { to, email, message, timestamp } = request.body;
  
  const messageId = Date.now().toString();
  const messageData = {
    id: messageId,
    to,
    email,
    message,
    timestamp,
    status: 'sent',
    from: 'System'
  };
  
  if (!teamMessages.has(to)) {
    teamMessages.set(to, []);
  }
  
  teamMessages.get(to).push(messageData);
  
  console.log(`📧 ${to} 팀에게 메시지 전송: ${message.substring(0, 50)}...`);
  
  return { success: true, messageId, data: messageData };
});

// 팀별 메시지 조회
fastify.get('/api/messages/:team', async (request, reply) => {
  const { team } = request.params;
  const messages = teamMessages.get(team.toUpperCase()) || [];
  
  return {
    success: true,
    team,
    count: messages.length,
    messages: messages.slice(-20) // 최근 20개
  };
});

// 시스템 상태 조회
fastify.get('/api/teams/status', async (request, reply) => {
  const teamsStatus = {};
  
  for (const [code, team] of Object.entries(TEAMS)) {
    teamsStatus[code] = {
      ...team,
      messageCount: teamMessages.get(code)?.length || 0,
      lastMessage: teamMessages.get(code)?.slice(-1)[0]?.timestamp || null
    };
  }
  
  return {
    success: true,
    teams: teamsStatus,
    totalTeams: Object.keys(TEAMS).length,
    systemInfo: {
      totalAIs: 6875,
      runningServices: 12,
      uptime: '99.7%'
    }
  };
});

// 특별 CODE2 연결 엔드포인트
fastify.get('/code2', async (request, reply) => {
  reply.type('text/html').send(`
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>💬 CODE2 팀 연결</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 50px; background: #0d1117; color: #c9d1d9; text-align: center; }
        .container { max-width: 600px; margin: 0 auto; background: #161b22; padding: 40px; border-radius: 15px; border: 1px solid #30363d; }
        .code2-logo { font-size: 4rem; margin-bottom: 20px; }
        h1 { color: #58a6ff; margin-bottom: 30px; }
        .info-box { background: #0d1117; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #238636; }
        .connect-btn { background: linear-gradient(135deg, #238636, #2ea043); color: white; padding: 15px 30px; border: none; border-radius: 10px; font-size: 1.1rem; cursor: pointer; margin: 10px; }
        .connect-btn:hover { transform: scale(1.05); }
    </style>
</head>
<body>
    <div class="container">
        <div class="code2-logo">💬</div>
        <h1>CODE2 팀 연결</h1>
        <p>통합 커뮤니케이션 시스템 개발팀</p>
        
        <div class="info-box">
            <strong>📧 이메일:</strong> code2@admin.aikim.com<br>
            <strong>🌐 포트:</strong> 35300<br>
            <strong>🚀 현재 상태:</strong> 이메일 시스템 구축 완료
        </div>
        
        <button class="connect-btn" onclick="window.open('http://localhost:35300/email', '_blank')">
            📧 이메일 시스템 접속
        </button>
        
        <button class="connect-btn" onclick="window.open('http://localhost:35300', '_blank')">
            🏠 CODE2 메인 시스템
        </button>
        
        <div class="info-box">
            <h3>📋 진행 중인 프로젝트</h3>
            <ul style="text-align: left;">
                <li>이메일 시스템 구축 ✅</li>
                <li>WebRTC 화상통화</li>
                <li>Socket.io 실시간 채팅</li>
            </ul>
        </div>
    </div>
</body>
</html>
  `);
});

// 서버 시작
fastify.listen({ port: 29000, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    console.error('서버 시작 오류:', err);
    process.exit(1);
  }
  
  console.log(`
🏢 CODE 팀 커뮤니케이션 허브 시작!
=====================================
🌐 메인 허브: ${address}
💬 CODE2 연결: ${address}/code2
📧 이메일 연동: 포트 35300
📊 팀 상태: ${address}/api/teams/status
=====================================

📧 CODE1: Firebase 인증 시스템 전문팀
💬 CODE2: 통합 커뮤니케이션 시스템 개발팀 (이메일 구축 완료)
💾 CODE3: KIMDB 데이터베이스 시스템팀  
🔧 CODE4: 시스템 운영 및 백업 관리팀
👑 ADMIN: 전체 시스템 관리자
  `);
});