/**
 * 🚀 KIMDB AI System - Frontend JavaScript
 * Created by AI Development Team
 */

class KIMDBApp {
    constructor() {
        this.apiBase = '';
        this.currentTab = 'dashboard';
        this.currentAI = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadDashboard();
        this.showLoading('AI 시스템 초기화 중...');
        this.initializeSystem();
    }

    // 이벤트 바인딩
    bindEvents() {
        // 탭 전환
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // 팀 보기 버튼
        document.querySelectorAll('.view-team-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const team = e.target.dataset.team;
                this.switchTab('teams');
                this.loadTeamMembers(team);
            });
        });

        // 검색 기능
        const searchBtn = document.getElementById('searchBtn');
        const searchInput = document.getElementById('searchInput');
        
        searchBtn.addEventListener('click', () => this.performSearch());
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.performSearch();
        });

        // 팀 선택 버튼
        document.querySelectorAll('.team-select-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const team = e.target.dataset.team;
                this.selectTeam(team);
                this.loadTeamMembers(team);
            });
        });

        // 채팅 기능
        const randomAIBtn = document.getElementById('randomAIBtn');
        const sendBtn = document.getElementById('sendBtn');
        const messageInput = document.getElementById('messageInput');

        randomAIBtn.addEventListener('click', () => this.selectRandomAI());
        sendBtn.addEventListener('click', () => this.sendMessage());
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
    }

    // 탭 전환
    switchTab(tabName) {
        // 탭 버튼 활성화
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // 탭 컨텐츠 표시
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabName).classList.add('active');

        this.currentTab = tabName;

        // 탭별 초기 로딩
        if (tabName === 'teams' && !document.querySelector('.team-select-btn.active')) {
            this.loadTeamMembers('CODE1');
        }
    }

    // AI 시스템 초기화
    async initializeSystem() {
        try {
            const response = await fetch('/ai/init');
            const data = await response.json();
            
            if (data.success) {
                console.log(`✅ ${data.count}명 AI 초기화 완료 (${data.initTime}ms)`);
                await this.loadStats();
            }
        } catch (error) {
            console.error('초기화 실패:', error);
            this.showError('AI 시스템 초기화에 실패했습니다.');
        } finally {
            this.hideLoading();
        }
    }

    // 대시보드 로딩
    async loadDashboard() {
        await this.loadStats();
        await this.loadPersonalityStats();
    }

    // 통계 로딩
    async loadStats() {
        try {
            const response = await fetch('/ai/stats');
            const data = await response.json();
            
            if (data.success) {
                const stats = data.data;
                
                // 헤더 통계 업데이트
                document.getElementById('totalAIs').textContent = stats.total.toLocaleString();
                document.getElementById('activeAIs').textContent = stats.byStatus.active?.toLocaleString() || '0';
                
                // 팀별 통계 업데이트
                Object.keys(stats.byTeam).forEach(team => {
                    const element = document.getElementById(`${team.toLowerCase()}-count`);
                    if (element) {
                        element.textContent = stats.byTeam[team].toLocaleString();
                    }
                });
            }
        } catch (error) {
            console.error('통계 로딩 실패:', error);
        }
    }

    // 성격별 통계 로딩
    async loadPersonalityStats() {
        try {
            const response = await fetch('/ai/stats');
            const data = await response.json();
            
            if (data.success && data.data.byPersonality) {
                const personalityGrid = document.getElementById('personalityGrid');
                personalityGrid.innerHTML = '';
                
                const personalities = {
                    'CREATOR': '창조자',
                    'ANALYZER': '분석가', 
                    'LEADER': '리더',
                    'SUPPORTER': '서포터',
                    'EXPLORER': '탐험가',
                    'GUARDIAN': '수호자',
                    'PERFORMER': '연기자',
                    'MEDIATOR': '중재자'
                };
                
                Object.entries(data.data.byPersonality).forEach(([type, count]) => {
                    const item = document.createElement('div');
                    item.className = 'personality-item';
                    item.innerHTML = `
                        <div class="personality-name">${personalities[type] || type}</div>
                        <div class="personality-count">${count.toLocaleString()}</div>
                    `;
                    personalityGrid.appendChild(item);
                });
            }
        } catch (error) {
            console.error('성격 통계 로딩 실패:', error);
        }
    }

    // AI 검색
    async performSearch() {
        const query = document.getElementById('searchInput').value.trim();
        const teamFilter = document.getElementById('teamFilter').value;
        const personalityFilter = document.getElementById('personalityFilter').value;
        
        if (!query && !teamFilter && !personalityFilter) {
            this.showError('검색어 또는 필터를 선택해주세요.');
            return;
        }

        this.showLoading('AI 검색 중...');
        
        try {
            let url = `/ai?limit=20`;
            if (query) url += `&q=${encodeURIComponent(query)}`;
            if (teamFilter) url += `&team=${teamFilter}`;
            if (personalityFilter) url += `&personality=${personalityFilter}`;

            // 검색 API는 별도 구현 필요
            const response = await fetch(`/ai/search?q=${encodeURIComponent(query)}&limit=20`);
            const data = await response.json();
            
            if (data.success) {
                this.displaySearchResults(data.data);
            } else {
                this.showError('검색에 실패했습니다.');
            }
        } catch (error) {
            console.error('검색 실패:', error);
            this.showError('검색 중 오류가 발생했습니다.');
        } finally {
            this.hideLoading();
        }
    }

    // 검색 결과 표시
    displaySearchResults(ais) {
        const resultsContainer = document.getElementById('searchResults');
        
        if (ais.length === 0) {
            resultsContainer.innerHTML = `
                <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
                    <i class="fas fa-search" style="font-size: 3rem; margin-bottom: 20px;"></i>
                    <p>검색 결과가 없습니다.</p>
                </div>
            `;
            return;
        }

        resultsContainer.innerHTML = ais.map(ai => `
            <div class="ai-card" onclick="app.selectAIForChat('${ai.id}')">
                <div class="ai-card-header">
                    <div class="ai-info">
                        <h4>${ai.name}</h4>
                        <div class="ai-meta">${ai.team} • Port ${ai.port}</div>
                    </div>
                    <span class="ai-badge ${ai.status}">${ai.status}</span>
                </div>
                <div class="ai-personality">${this.getPersonalityName(ai.personality)}</div>
                <div class="skills-tags">
                    ${ai.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
                </div>
            </div>
        `).join('');
    }

    // 팀 선택
    selectTeam(team) {
        document.querySelectorAll('.team-select-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-team="${team}"]`).classList.add('active');
    }

    // 팀 멤버 로딩
    async loadTeamMembers(team) {
        this.showLoading(`${team} 팀 로딩 중...`);
        
        try {
            const response = await fetch(`/ai/team/${team}`);
            const data = await response.json();
            
            if (data.success) {
                this.displayTeamMembers(data.data, team);
            }
        } catch (error) {
            console.error('팀 멤버 로딩 실패:', error);
            this.showError('팀 정보를 불러오는데 실패했습니다.');
        } finally {
            this.hideLoading();
        }
    }

    // 팀 멤버 표시
    displayTeamMembers(members, team) {
        const container = document.getElementById('teamMembers');
        
        const teamInfo = {
            'CODE1': { name: 'Frontend Masters', icon: 'fas fa-paint-brush', color: 'code1' },
            'CODE2': { name: 'Backend Engineers', icon: 'fas fa-server', color: 'code2' },
            'CODE3': { name: 'Central Command', icon: 'fas fa-crown', color: 'code3' },
            'CODE4': { name: 'Security Guardians', icon: 'fas fa-shield-alt', color: 'code4' }
        };
        
        const info = teamInfo[team];
        
        container.innerHTML = `
            <div class="team-header-section">
                <h2><i class="${info.icon}"></i> ${team} - ${info.name}</h2>
                <p>${members.length}명의 AI 에이전트</p>
            </div>
            <div class="team-members-grid">
                ${members.slice(0, 50).map(ai => `
                    <div class="ai-card member-card" onclick="app.selectAIForChat('${ai.id}')">
                        <div class="ai-card-header">
                            <div class="ai-info">
                                <h4>${ai.name}</h4>
                                <div class="ai-meta">Port ${ai.port}</div>
                            </div>
                            <span class="ai-badge ${ai.status}">${ai.status}</span>
                        </div>
                        <div class="ai-personality">${this.getPersonalityName(ai.personality)}</div>
                        <div class="skills-tags">
                            ${ai.skills.slice(0, 3).map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
            ${members.length > 50 ? `<div class="load-more">처음 50명만 표시 (총 ${members.length}명)</div>` : ''}
        `;
    }

    // 랜덤 AI 선택
    async selectRandomAI() {
        this.showLoading('랜덤 AI 선택 중...');
        
        try {
            const response = await fetch('/ai/random');
            const data = await response.json();
            
            if (data.success) {
                this.currentAI = data.data;
                this.displaySelectedAI(data.data);
                this.enableChat();
            }
        } catch (error) {
            console.error('랜덤 AI 선택 실패:', error);
            this.showError('AI 선택에 실패했습니다.');
        } finally {
            this.hideLoading();
        }
    }

    // 채팅용 AI 선택 (카드 클릭)
    selectAIForChat(aiId) {
        this.switchTab('chat');
        this.loadAIForChat(aiId);
    }

    // AI 정보 로딩 후 채팅 설정
    async loadAIForChat(aiId) {
        try {
            const response = await fetch(`/ai/${aiId}`);
            const data = await response.json();
            
            if (data.success) {
                this.currentAI = data.data;
                this.displaySelectedAI(data.data);
                this.enableChat();
            }
        } catch (error) {
            console.error('AI 로딩 실패:', error);
        }
    }

    // 선택된 AI 표시
    displaySelectedAI(ai) {
        const container = document.getElementById('selectedAI');
        container.innerHTML = `
            <h4>${ai.name}</h4>
            <div class="ai-details">
                <p><strong>팀:</strong> ${ai.team}</p>
                <p><strong>성격:</strong> ${this.getPersonalityName(ai.personality)}</p>
                <p><strong>포트:</strong> ${ai.port}</p>
                <div class="skills-tags" style="margin-top: 10px;">
                    ${ai.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
                </div>
            </div>
        `;
        
        // 채팅창 초기화
        document.getElementById('chatMessages').innerHTML = `
            <div class="system-message">
                ${ai.name}와의 대화를 시작합니다! 🤖
            </div>
        `;
    }

    // 채팅 활성화
    enableChat() {
        document.getElementById('messageInput').disabled = false;
        document.getElementById('sendBtn').disabled = false;
        document.getElementById('messageInput').placeholder = '메시지를 입력하세요...';
    }

    // 메시지 전송
    async sendMessage() {
        const input = document.getElementById('messageInput');
        const message = input.value.trim();
        
        if (!message || !this.currentAI) return;
        
        // 사용자 메시지 표시
        this.addMessage(message, 'user');
        input.value = '';
        
        try {
            const response = await fetch(`/ai/${this.currentAI.id}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.addMessage(data.data.response, 'ai');
            } else {
                this.addMessage('죄송합니다. 응답에 실패했습니다.', 'ai');
            }
        } catch (error) {
            console.error('메시지 전송 실패:', error);
            this.addMessage('연결에 문제가 발생했습니다.', 'ai');
        }
    }

    // 채팅 메시지 추가
    addMessage(text, sender) {
        const messagesContainer = document.getElementById('chatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${sender}`;
        
        messageDiv.innerHTML = `
            <div class="message-bubble">
                ${text}
            </div>
        `;
        
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // 유틸리티 함수들
    getPersonalityName(type) {
        const names = {
            'CREATOR': '창조자 🎨',
            'ANALYZER': '분석가 🔍',
            'LEADER': '리더 👑',
            'SUPPORTER': '서포터 🤝',
            'EXPLORER': '탐험가 🚀',
            'GUARDIAN': '수호자 🛡️',
            'PERFORMER': '연기자 🎭',
            'MEDIATOR': '중재자 ⚖️'
        };
        return names[type] || type;
    }

    showLoading(message = '로딩 중...') {
        const overlay = document.getElementById('loadingOverlay');
        const text = overlay.querySelector('p');
        if (text) text.textContent = message;
        overlay.style.display = 'flex';
    }

    hideLoading() {
        document.getElementById('loadingOverlay').style.display = 'none';
    }

    showError(message) {
        alert(`❌ ${message}`);
    }
}

// 앱 초기화
const app = new KIMDBApp();

// CSS 추가 스타일
const additionalStyles = `
<style>
.team-header-section {
    text-align: center;
    margin-bottom: 30px;
    padding: 20px;
    background: var(--bg-secondary);
    border-radius: 12px;
}

.team-members-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 20px;
}

.member-card {
    cursor: pointer;
}

.member-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.25);
}

.load-more {
    text-align: center;
    padding: 20px;
    color: var(--text-secondary);
    font-style: italic;
}

.system-message {
    text-align: center;
    color: var(--text-secondary);
    font-style: italic;
    margin-bottom: 20px;
    padding: 15px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
}
</style>
`;

document.head.insertAdjacentHTML('beforeend', additionalStyles);