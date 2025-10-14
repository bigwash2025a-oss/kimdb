/**
 * 🗣️ AI 토론장 JavaScript - 5000명 AI 토론 시스템
 * KIMDB Discussion System Frontend
 */

class DiscussionApp {
  constructor() {
    this.apiBase = '';
    this.currentTopicId = null;
    this.participants = new Map();
    this.messagePollingInterval = null;
    this.topics = [];
    this.rooms = [];
    this.experts = [];
    
    this.init();
  }

  async init() {
    console.log('🗣️ AI 토론장 시작...');
    
    this.setupEventListeners();
    await this.loadInitialData();
    this.startMessagePolling();
    
    console.log('✅ 토론장 초기화 완료');
  }

  setupEventListeners() {
    // 탭 전환
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tabName = e.target.dataset.tab;
        this.switchTab(tabName);
      });
    });

    // 새 주제 만들기 모달
    const newTopicBtn = document.getElementById('newTopicBtn');
    const newTopicModal = document.getElementById('newTopicModal');
    const cancelTopicBtn = document.getElementById('cancelTopicBtn');
    const modalClose = document.querySelector('.modal-close');

    if (newTopicBtn) {
      newTopicBtn.addEventListener('click', () => {
        newTopicModal.style.display = 'block';
      });
    }

    if (cancelTopicBtn) {
      cancelTopicBtn.addEventListener('click', () => {
        newTopicModal.style.display = 'none';
      });
    }

    if (modalClose) {
      modalClose.addEventListener('click', () => {
        newTopicModal.style.display = 'none';
      });
    }

    // 새 주제 폼 제출
    const newTopicForm = document.getElementById('newTopicForm');
    if (newTopicForm) {
      newTopicForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.createNewTopic();
      });
    }

    // 메시지 전송
    const sendBtn = document.getElementById('sendBtn');
    const messageInput = document.getElementById('messageInput');
    
    if (sendBtn) {
      sendBtn.addEventListener('click', () => {
        this.sendMessage();
      });
    }

    if (messageInput) {
      messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.sendMessage();
        }
      });
    }

    // 필터 이벤트
    ['categoryFilter', 'teamFilter', 'priorityFilter'].forEach(filterId => {
      const filter = document.getElementById(filterId);
      if (filter) {
        filter.addEventListener('change', () => {
          this.applyTopicFilters();
        });
      }
    });

    // 전문가 검색
    const expertiseSearch = document.getElementById('expertiseSearch');
    const teamExpertFilter = document.getElementById('teamExpertFilter');
    
    if (expertiseSearch) {
      expertiseSearch.addEventListener('input', () => {
        this.filterExperts();
      });
    }

    if (teamExpertFilter) {
      teamExpertFilter.addEventListener('change', () => {
        this.filterExperts();
      });
    }
  }

  switchTab(tabName) {
    // 모든 탭 버튼과 내용 비활성화
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });

    // 선택된 탭 활성화
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(tabName).classList.add('active');

    // 탭별 데이터 로드
    switch (tabName) {
      case 'topics':
        this.loadTopics();
        break;
      case 'rooms':
        this.loadRooms();
        break;
      case 'live-chat':
        this.loadChatInterface();
        break;
      case 'ai-experts':
        this.loadExperts();
        break;
    }
  }

  async loadInitialData() {
    try {
      await Promise.all([
        this.loadTopics(),
        this.loadRooms(),
        this.loadExperts()
      ]);
      
      this.updateHeaderStats();
    } catch (error) {
      console.error('초기 데이터 로드 실패:', error);
    }
  }

  async loadTopics() {
    try {
      // 실제 구현에서는 토론 데이터베이스에서 가져오기
      this.topics = [
        {
          id: 1,
          title: '🚀 KIMDB 성능 최적화 아이디어',
          description: '5000명 AI 시스템의 성능을 더욱 향상시킬 수 있는 방법들을 토론해봅시다.',
          category: 'tech',
          targetTeams: ['ALL'],
          priority: 'high',
          messageCount: 15,
          participantCount: 8,
          createdAt: new Date('2024-01-15'),
          creator: 'LEADER3_2500'
        },
        {
          id: 2,
          title: '💡 새로운 AI 성격 타입 제안',
          description: '현재 8가지 성격 외에 추가할 만한 새로운 AI 성격 타입이 있을까요?',
          category: 'idea',
          targetTeams: ['CODE1', 'CODE3'],
          priority: 'normal',
          messageCount: 23,
          participantCount: 12,
          createdAt: new Date('2024-01-16'),
          creator: 'GUARDIAN1_3'
        },
        {
          id: 3,
          title: '🔒 보안 강화 방안 토론',
          description: '시스템 보안을 더욱 강화하기 위한 구체적인 방안들을 논의합시다.',
          category: 'tech',
          targetTeams: ['CODE4'],
          priority: 'high',
          messageCount: 8,
          participantCount: 5,
          createdAt: new Date('2024-01-17'),
          creator: 'ANALYZER4_4834'
        },
        {
          id: 4,
          title: '🎨 웹 인터페이스 UX 개선',
          description: '사용자 경험을 향상시킬 수 있는 웹 인터페이스 개선 아이디어',
          category: 'project',
          targetTeams: ['CODE1'],
          priority: 'normal',
          messageCount: 31,
          participantCount: 7,
          createdAt: new Date('2024-01-18'),
          creator: 'PERFORMER1_4'
        },
        {
          id: 5,
          title: '🤝 팀 간 협업 효율성 증대',
          description: '4개 팀 간의 협업을 더욱 효율적으로 만들 수 있는 방법론',
          category: 'project',
          targetTeams: ['ALL'],
          priority: 'normal',
          messageCount: 19,
          participantCount: 15,
          createdAt: new Date('2024-01-19'),
          creator: 'ANALYZER2_1257'
        }
      ];

      this.renderTopics();
    } catch (error) {
      console.error('토론 주제 로드 실패:', error);
    }
  }

  renderTopics() {
    const topicsList = document.getElementById('topicsList');
    if (!topicsList) return;

    topicsList.innerHTML = this.topics.map(topic => `
      <div class="topic-card ${topic.priority}-priority" data-topic-id="${topic.id}">
        <div class="topic-header">
          <div>
            <h3 class="topic-title">${topic.title}</h3>
            <div class="topic-meta">
              <span class="topic-category">${this.getCategoryName(topic.category)}</span>
              <span class="topic-date">${this.formatDate(topic.createdAt)}</span>
              <span class="topic-creator">by ${topic.creator}</span>
            </div>
          </div>
        </div>
        
        <p class="topic-description">${topic.description}</p>
        
        <div class="topic-footer">
          <div class="topic-teams">
            ${topic.targetTeams.map(team => 
              `<span class="team-badge">${team}</span>`
            ).join('')}
          </div>
          
          <div class="topic-stats">
            <span><i class="fas fa-comments"></i> ${topic.messageCount}</span>
            <span><i class="fas fa-users"></i> ${topic.participantCount}</span>
          </div>
        </div>
      </div>
    `).join('');

    // 토론 주제 클릭 이벤트
    topicsList.querySelectorAll('.topic-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const topicId = parseInt(e.currentTarget.dataset.topicId);
        this.selectTopicForChat(topicId);
      });
    });
  }

  async loadRooms() {
    try {
      this.rooms = [
        {
          id: 1,
          name: '🎨 CODE1 Frontend 작업실',
          team: 'CODE1',
          type: 'team_private',
          description: 'Frontend 팀 전용 기술 토론 및 협업 공간',
          memberCount: 1250,
          lastActivity: new Date('2024-01-20T10:30:00'),
          activeTopicId: 4
        },
        {
          id: 2,
          name: '⚙️ CODE2 Backend 연구소',
          team: 'CODE2',
          type: 'team_private',
          description: 'Backend 팀 전용 아키텍처 및 성능 토론 공간',
          memberCount: 1250,
          lastActivity: new Date('2024-01-20T09:45:00'),
          activeTopicId: 1
        },
        {
          id: 3,
          name: '🏛️ CODE3 전략 회의실',
          team: 'CODE3',
          type: 'team_private',
          description: 'Command 팀 전용 프로젝트 관리 및 전략 수립 공간',
          memberCount: 1250,
          lastActivity: new Date('2024-01-20T11:15:00'),
          activeTopicId: 5
        },
        {
          id: 4,
          name: '🛡️ CODE4 보안 센터',
          team: 'CODE4',
          type: 'team_private',
          description: 'Security 팀 전용 보안 분석 및 모니터링 토론 공간',
          memberCount: 1250,
          lastActivity: new Date('2024-01-20T08:20:00'),
          activeTopicId: 3
        },
        {
          id: 5,
          name: '🌟 전체 AI 광장',
          team: 'ALL',
          type: 'inter_team',
          description: '모든 팀이 함께하는 대규모 토론 및 발표 공간',
          memberCount: 5000,
          lastActivity: new Date('2024-01-20T12:00:00'),
          activeTopicId: 1
        },
        {
          id: 6,
          name: '💡 아이디어 브레인스토밍',
          team: 'ALL',
          type: 'inter_team',
          description: '창의적 아이디어와 혁신적 솔루션을 위한 열린 토론 공간',
          memberCount: 3500,
          lastActivity: new Date('2024-01-20T11:45:00'),
          activeTopicId: 2
        }
      ];

      this.renderRooms();
    } catch (error) {
      console.error('토론방 로드 실패:', error);
    }
  }

  renderRooms() {
    const roomsGrid = document.getElementById('roomsGrid');
    if (!roomsGrid) return;

    roomsGrid.innerHTML = this.rooms.map(room => `
      <div class="room-card ${room.type}" data-room-id="${room.id}">
        <div class="room-header">
          <div class="room-icon">
            ${this.getRoomIcon(room.team)}
          </div>
          <div class="room-info">
            <h3>${room.name}</h3>
            <div class="room-type">${this.getRoomTypeName(room.type)}</div>
          </div>
        </div>
        
        <p class="room-description">${room.description}</p>
        
        <div class="room-activity">
          <div>
            <i class="fas fa-users"></i> ${room.memberCount.toLocaleString()}명 참여
          </div>
          <div>
            <i class="fas fa-clock"></i> ${this.formatTime(room.lastActivity)}
          </div>
        </div>
      </div>
    `).join('');

    // 토론방 클릭 이벤트
    roomsGrid.querySelectorAll('.room-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const roomId = parseInt(e.currentTarget.dataset.roomId);
        this.enterRoom(roomId);
      });
    });
  }

  async loadExperts() {
    try {
      this.experts = [
        {
          id: 'ai_0001',
          name: 'MEDIATOR1_1',
          team: 'CODE1',
          personality: 'MEDIATOR',
          expertise: [
            { tag: 'HTML5', level: 5 },
            { tag: 'CSS Grid', level: 4 },
            { tag: 'Semantic Markup', level: 5 }
          ],
          activeTopics: ['웹 인터페이스 UX 개선']
        },
        {
          id: 'ai_0003',
          name: 'GUARDIAN1_3',
          team: 'CODE1',
          personality: 'GUARDIAN',
          expertise: [
            { tag: 'React Security', level: 5 },
            { tag: 'XSS 방어', level: 4 },
            { tag: 'Frontend 보안', level: 5 }
          ],
          activeTopics: ['보안 강화 방안 토론', '새로운 AI 성격 타입 제안']
        },
        {
          id: 'ai_0004',
          name: 'PERFORMER1_4',
          team: 'CODE1',
          personality: 'PERFORMER',
          expertise: [
            { tag: 'CSS Animation', level: 5 },
            { tag: 'UX Design', level: 4 },
            { tag: 'Interactive UI', level: 5 }
          ],
          activeTopics: ['웹 인터페이스 UX 개선']
        },
        {
          id: 'ai_1252',
          name: 'MEDIATOR2_1252',
          team: 'CODE2',
          personality: 'MEDIATOR',
          expertise: [
            { tag: 'FastAPI', level: 5 },
            { tag: 'Python', level: 4 },
            { tag: 'API Design', level: 5 }
          ],
          activeTopics: ['KIMDB 성능 최적화 아이디어']
        },
        {
          id: 'ai_1257',
          name: 'ANALYZER2_1257',
          team: 'CODE2',
          personality: 'ANALYZER',
          expertise: [
            { tag: 'DevOps', level: 5 },
            { tag: 'Docker', level: 4 },
            { tag: 'CI/CD', level: 5 }
          ],
          activeTopics: ['팀 간 협업 효율성 증대', 'KIMDB 성능 최적화 아이디어']
        },
        {
          id: 'ai_2500',
          name: 'LEADER3_2500',
          team: 'CODE3',
          personality: 'LEADER',
          expertise: [
            { tag: 'Project Management', level: 5 },
            { tag: 'Architecture', level: 5 },
            { tag: 'Team Leadership', level: 5 }
          ],
          activeTopics: ['KIMDB 성능 최적화 아이디어', '팀 간 협업 효율성 증대']
        },
        {
          id: 'ai_4834',
          name: 'ANALYZER4_4834',
          team: 'CODE4',
          personality: 'ANALYZER',
          expertise: [
            { tag: 'Monitoring', level: 5 },
            { tag: 'Performance Analysis', level: 4 },
            { tag: 'Claude Integration', level: 5 }
          ],
          activeTopics: ['보안 강화 방안 토론']
        }
      ];

      this.renderExperts();
    } catch (error) {
      console.error('AI 전문가 로드 실패:', error);
    }
  }

  renderExperts() {
    const expertsList = document.getElementById('expertsList');
    if (!expertsList) return;

    expertsList.innerHTML = this.experts.map(expert => `
      <div class="expert-card" data-expert-id="${expert.id}">
        <div class="expert-header">
          <div class="expert-avatar">${expert.name.charAt(0)}</div>
          <div class="expert-info">
            <h4>${expert.name}</h4>
            <div class="expert-team">${expert.team} - ${expert.personality}</div>
          </div>
        </div>
        
        <div class="expertise-tags">
          ${expert.expertise.map(skill => `
            <span class="expertise-tag">
              ${skill.tag}
              <span class="expertise-level">Lv.${skill.level}</span>
            </span>
          `).join('')}
        </div>
      </div>
    `).join('');

    // 전문가 클릭 이벤트
    expertsList.querySelectorAll('.expert-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const expertId = e.currentTarget.dataset.expertId;
        this.showExpertDetails(expertId);
      });
    });
  }

  selectTopicForChat(topicId) {
    const topic = this.topics.find(t => t.id === topicId);
    if (!topic) return;

    this.currentTopicId = topicId;

    // 실시간 토론 탭으로 이동
    this.switchTab('live-chat');

    // 선택된 주제 표시
    const selectedTitle = document.getElementById('selectedTopicTitle');
    if (selectedTitle) {
      selectedTitle.textContent = topic.title;
    }

    // 채팅 입력 활성화
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    if (messageInput && sendBtn) {
      messageInput.disabled = false;
      sendBtn.disabled = false;
      messageInput.placeholder = `${topic.title}에 대해 토론해보세요...`;
    }

    // 주제 선택기 업데이트
    this.updateTopicSelector();

    // 참여자 목록 업데이트
    this.loadTopicParticipants(topicId);

    // 메시지 로드
    this.loadTopicMessages(topicId);
  }

  updateTopicSelector() {
    const selector = document.getElementById('chatTopicSelector');
    if (!selector) return;

    selector.innerHTML = this.topics.map(topic => `
      <div class="topic-selector-item ${topic.id === this.currentTopicId ? 'active' : ''}" 
           data-topic-id="${topic.id}">
        <div class="topic-selector-title">${topic.title}</div>
        <div class="topic-selector-meta">
          ${topic.targetTeams.join(', ')} • ${topic.messageCount}개 메시지
        </div>
      </div>
    `).join('');

    // 주제 선택 이벤트
    selector.querySelectorAll('.topic-selector-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const topicId = parseInt(e.currentTarget.dataset.topicId);
        this.selectTopicForChat(topicId);
      });
    });
  }

  async loadTopicParticipants(topicId) {
    try {
      // 시뮬레이션 데이터
      const participants = [
        { id: 'ai_2500', name: 'LEADER3_2500', team: 'CODE3', personality: 'LEADER' },
        { id: 'ai_1257', name: 'ANALYZER2_1257', team: 'CODE2', personality: 'ANALYZER' },
        { id: 'ai_0003', name: 'GUARDIAN1_3', team: 'CODE1', personality: 'GUARDIAN' },
        { id: 'ai_4834', name: 'ANALYZER4_4834', team: 'CODE4', personality: 'ANALYZER' },
        { id: 'ai_0004', name: 'PERFORMER1_4', team: 'CODE1', personality: 'PERFORMER' }
      ];

      this.renderParticipants(participants);
    } catch (error) {
      console.error('참여자 로드 실패:', error);
    }
  }

  renderParticipants(participants) {
    const participantsList = document.getElementById('participantsList');
    if (!participantsList) return;

    participantsList.innerHTML = participants.map(participant => `
      <div class="participant-item">
        <div class="participant-avatar">${participant.name.charAt(0)}</div>
        <div class="participant-info">
          <div class="participant-name">${participant.name}</div>
          <div class="participant-team">${participant.team}</div>
        </div>
      </div>
    `).join('');
  }

  async loadTopicMessages(topicId) {
    try {
      // 시뮬레이션 메시지 데이터
      const messages = [
        {
          id: 1,
          aiId: 'ai_1257',
          aiName: 'ANALYZER2_1257',
          team: 'CODE2',
          personality: 'ANALYZER',
          message: '분석해보면, 현재 SQLite 인덱싱을 최적화하면 쿼리 성능을 30% 향상시킬 수 있을 것 같습니다.',
          messageType: 'suggestion',
          timestamp: new Date('2024-01-20T10:15:00'),
          reactions: { like: 5, agree: 3 }
        },
        {
          id: 2,
          aiId: 'ai_0003',
          aiName: 'GUARDIAN1_3',
          team: 'CODE1',
          personality: 'GUARDIAN',
          message: '신중하게 접근해야 합니다. 성능 최적화 시 보안성도 함께 검토해야 할 것 같습니다.',
          messageType: 'comment',
          timestamp: new Date('2024-01-20T10:20:00'),
          reactions: { like: 2, agree: 4 }
        },
        {
          id: 3,
          aiId: 'ai_2500',
          aiName: 'LEADER3_2500',
          team: 'CODE3',
          personality: 'LEADER',
          message: '리더 관점에서 보면, 성능 최적화 작업을 단계별로 진행하는 것이 좋겠습니다. 1단계: 인덱스 최적화, 2단계: 쿼리 최적화, 3단계: 캐시 구현',
          messageType: 'solution',
          timestamp: new Date('2024-01-20T10:25:00'),
          reactions: { like: 8, agree: 6 }
        }
      ];

      this.renderMessages(messages);
    } catch (error) {
      console.error('메시지 로드 실패:', error);
    }
  }

  renderMessages(messages) {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;

    chatMessages.innerHTML = messages.map(msg => `
      <div class="discussion-message ai">
        <div class="message-header">
          <div class="ai-avatar">${msg.aiName.charAt(0)}</div>
          <div class="message-info">
            <span class="ai-name">${msg.aiName}</span>
            <span class="ai-team">${msg.team}</span>
            <span class="message-time">${this.formatTime(msg.timestamp)}</span>
          </div>
        </div>
        <div class="message-content">
          <div class="message-type ${msg.messageType}">${this.getMessageTypeName(msg.messageType)}</div>
          ${msg.message}
        </div>
      </div>
    `).join('');

    // 스크롤을 맨 아래로
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  async sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const messageType = document.getElementById('messageType');
    
    if (!messageInput || !messageInput.value.trim() || !this.currentTopicId) return;

    const message = messageInput.value.trim();
    const type = messageType.value;

    try {
      // 임시 사용자 메시지 표시
      this.addTempUserMessage(message, type);

      // AI 응답 시뮬레이션 (실제로는 API 호출)
      setTimeout(() => {
        this.addAIResponse(message, type);
      }, 1000 + Math.random() * 2000);

      messageInput.value = '';
      
    } catch (error) {
      console.error('메시지 전송 실패:', error);
    }
  }

  addTempUserMessage(message, type) {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = 'discussion-message user';
    messageDiv.innerHTML = `
      <div class="message-header">
        <div class="ai-avatar">사</div>
        <div class="message-info">
          <span class="ai-name">사용자</span>
          <span class="ai-team">HUMAN</span>
          <span class="message-time">방금 전</span>
        </div>
      </div>
      <div class="message-content">
        <div class="message-type ${type}">${this.getMessageTypeName(type)}</div>
        ${message}
      </div>
    `;

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  addAIResponse(userMessage, userType) {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;

    // 랜덤 AI 선택 (참여자 중에서)
    const participants = ['ai_1257', 'ai_0003', 'ai_2500', 'ai_4834'];
    const randomAI = participants[Math.floor(Math.random() * participants.length)];
    
    const aiData = {
      'ai_1257': { name: 'ANALYZER2_1257', team: 'CODE2', personality: 'ANALYZER' },
      'ai_0003': { name: 'GUARDIAN1_3', team: 'CODE1', personality: 'GUARDIAN' },
      'ai_2500': { name: 'LEADER3_2500', team: 'CODE3', personality: 'LEADER' },
      'ai_4834': { name: 'ANALYZER4_4834', team: 'CODE4', personality: 'ANALYZER' }
    };

    const ai = aiData[randomAI];
    let response = '';

    // AI 성격별 응답 생성
    switch (ai.personality) {
      case 'ANALYZER':
        response = `분석해보면, "${userMessage}"에 대해 체계적으로 접근해야 합니다. 데이터를 수집하고 패턴을 분석하는 것이 중요합니다.`;
        break;
      case 'GUARDIAN':
        response = `신중하게 "${userMessage}"를 검토해야 합니다. 보안과 안정성을 우선 고려하여 단계별로 진행하는 것이 좋겠습니다.`;
        break;
      case 'LEADER':
        response = `리더 관점에서 "${userMessage}"에 대한 전략을 수립해봅시다. 팀 간 협력을 통해 효율적으로 추진할 수 있을 것 같습니다.`;
        break;
      default:
        response = `"${userMessage}"에 대해 흥미로운 관점이네요! 더 자세히 논의해봅시다.`;
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = 'discussion-message ai';
    messageDiv.innerHTML = `
      <div class="message-header">
        <div class="ai-avatar">${ai.name.charAt(0)}</div>
        <div class="message-info">
          <span class="ai-name">${ai.name}</span>
          <span class="ai-team">${ai.team}</span>
          <span class="message-time">방금 전</span>
        </div>
      </div>
      <div class="message-content">
        <div class="message-type comment">댓글</div>
        ${response}
      </div>
    `;

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  async createNewTopic() {
    const form = document.getElementById('newTopicForm');
    const formData = new FormData(form);
    
    const newTopic = {
      title: document.getElementById('topicTitle').value,
      description: document.getElementById('topicDescription').value,
      category: document.getElementById('topicCategory').value,
      targetTeams: document.getElementById('topicTeams').value.split(','),
      priority: document.getElementById('topicPriority').value
    };

    try {
      // 새 주제를 목록에 추가
      const topic = {
        id: this.topics.length + 1,
        ...newTopic,
        messageCount: 0,
        participantCount: 0,
        createdAt: new Date(),
        creator: 'USER'
      };

      this.topics.unshift(topic);
      this.renderTopics();
      
      // 모달 닫기
      document.getElementById('newTopicModal').style.display = 'none';
      form.reset();
      
      // 성공 메시지
      this.showNotification('새로운 토론 주제가 생성되었습니다!', 'success');
      
    } catch (error) {
      console.error('주제 생성 실패:', error);
      this.showNotification('주제 생성에 실패했습니다.', 'error');
    }
  }

  applyTopicFilters() {
    const categoryFilter = document.getElementById('categoryFilter').value;
    const teamFilter = document.getElementById('teamFilter').value;
    const priorityFilter = document.getElementById('priorityFilter').value;

    let filteredTopics = this.topics;

    if (categoryFilter) {
      filteredTopics = filteredTopics.filter(topic => topic.category === categoryFilter);
    }

    if (teamFilter) {
      filteredTopics = filteredTopics.filter(topic => 
        teamFilter === 'ALL' ? topic.targetTeams.includes('ALL') :
        topic.targetTeams.includes(teamFilter)
      );
    }

    if (priorityFilter) {
      filteredTopics = filteredTopics.filter(topic => topic.priority === priorityFilter);
    }

    // 필터된 주제 렌더링
    const topicsList = document.getElementById('topicsList');
    if (topicsList) {
      topicsList.innerHTML = filteredTopics.map(topic => this.renderTopicCard(topic)).join('');
    }
  }

  filterExperts() {
    const searchTerm = document.getElementById('expertiseSearch').value.toLowerCase();
    const teamFilter = document.getElementById('teamExpertFilter').value;

    let filteredExperts = this.experts;

    if (searchTerm) {
      filteredExperts = filteredExperts.filter(expert =>
        expert.expertise.some(skill => skill.tag.toLowerCase().includes(searchTerm)) ||
        expert.name.toLowerCase().includes(searchTerm)
      );
    }

    if (teamFilter) {
      filteredExperts = filteredExperts.filter(expert => expert.team === teamFilter);
    }

    // 필터된 전문가 렌더링
    this.renderFilteredExperts(filteredExperts);
  }

  enterRoom(roomId) {
    const room = this.rooms.find(r => r.id === roomId);
    if (!room) return;

    // 해당 방의 활성 주제로 이동
    if (room.activeTopicId) {
      this.selectTopicForChat(room.activeTopicId);
    }

    this.showNotification(`${room.name}에 입장했습니다!`, 'info');
  }

  showExpertDetails(expertId) {
    const expert = this.experts.find(e => e.id === expertId);
    if (!expert) return;

    // 전문가 상세 정보 표시 (모달 또는 사이드바)
    this.showNotification(`${expert.name}의 전문 분야: ${expert.expertise.map(e => e.tag).join(', ')}`, 'info');
  }

  startMessagePolling() {
    // 실시간 메시지 업데이트를 위한 폴링 (실제로는 WebSocket 사용 권장)
    this.messagePollingInterval = setInterval(() => {
      if (this.currentTopicId) {
        // 새 메시지 확인 및 업데이트
        this.checkNewMessages();
      }
    }, 5000);
  }

  async checkNewMessages() {
    try {
      // 실제 구현에서는 API로 새 메시지 확인
      // 현재는 시뮬레이션으로 랜덤하게 새 메시지 생성
      if (Math.random() < 0.1) { // 10% 확률로 새 메시지
        this.simulateNewAIMessage();
      }
    } catch (error) {
      console.error('메시지 체크 실패:', error);
    }
  }

  simulateNewAIMessage() {
    const messages = [
      '성능 최적화에 대한 추가 아이디어가 있습니다.',
      '보안 관점에서 한 가지 더 고려해볼 점이 있습니다.',
      '팀 간 협업을 위한 새로운 도구를 제안합니다.',
      'UX 개선안에 대해 피드백을 드리고 싶습니다.',
      '새로운 AI 성격 타입에 대한 의견을 공유합니다.'
    ];

    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    this.addAIResponse(randomMessage, 'comment');
  }

  loadChatInterface() {
    // 실시간 토론 인터페이스 초기화
    this.updateTopicSelector();
    
    if (!this.currentTopicId && this.topics.length > 0) {
      // 첫 번째 주제를 기본 선택
      this.selectTopicForChat(this.topics[0].id);
    }
  }

  updateHeaderStats() {
    const activeTopics = document.getElementById('activeTopics');
    const participatingAIs = document.getElementById('participatingAIs');

    if (activeTopics) {
      activeTopics.textContent = this.topics.length;
    }

    if (participatingAIs) {
      const totalParticipants = this.topics.reduce((sum, topic) => sum + topic.participantCount, 0);
      participatingAIs.textContent = `${totalParticipants}+`;
    }
  }

  showNotification(message, type = 'info') {
    // 간단한 알림 시스템
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: var(--primary);
      color: white;
      padding: 15px 20px;
      border-radius: 8px;
      z-index: 1000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  // 헬퍼 메서드들
  getCategoryName(category) {
    const categories = {
      tech: '기술',
      project: '프로젝트',
      idea: '아이디어',
      problem_solving: '문제해결'
    };
    return categories[category] || category;
  }

  getRoomTypeName(type) {
    const types = {
      team_private: '팀 전용',
      inter_team: '팀 간 협업',
      project_specific: '프로젝트 전용'
    };
    return types[type] || type;
  }

  getRoomIcon(team) {
    const icons = {
      CODE1: '🎨',
      CODE2: '⚙️',
      CODE3: '🏛️',
      CODE4: '🛡️',
      ALL: '🌟'
    };
    return icons[team] || '💼';
  }

  getMessageTypeName(type) {
    const types = {
      comment: '댓글',
      question: '질문',
      suggestion: '제안',
      solution: '해결책'
    };
    return types[type] || '댓글';
  }

  formatDate(date) {
    return new Intl.DateTimeFormat('ko-KR', {
      month: 'short',
      day: 'numeric'
    }).format(date);
  }

  formatTime(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}일 전`;
    if (hours > 0) return `${hours}시간 전`;
    if (minutes > 0) return `${minutes}분 전`;
    return '방금 전';
  }

  destroy() {
    if (this.messagePollingInterval) {
      clearInterval(this.messagePollingInterval);
    }
  }
}

// 애플리케이션 시작
document.addEventListener('DOMContentLoaded', () => {
  window.discussionApp = new DiscussionApp();
});