/**
 * 🤖 AI 배치 및 운영 관리자
 * 각 포인트에 AI 에이전트들을 배치하고 운영 관리
 */

import fetch from 'node-fetch';

const AI_DEPLOYMENT_CONFIG = {
  // 기본 시스템 (포트 3000-4000)
  mainSystem: {
    web: { port: 3000, aiCount: 500, roles: ['MANAGER', 'COORDINATOR'] },
    database: { port: 4000, aiCount: 200, roles: ['DATA_ADMIN', 'ANALYST'] }
  },
  
  // AI 마을들 (포트 25000-25007)
  villages: {
    network: { port: 25000, aiCount: 100, roles: ['NETWORK_ADMIN', 'TRAFFIC_MANAGER'] },
    creative: { port: 25001, aiCount: 800, roles: ['CREATOR1', 'ARTIST2', 'DESIGNER3'] },
    research: { port: 25002, aiCount: 900, roles: ['RESEARCHER4', 'SCIENTIST1', 'ANALYZER2'] },
    management: { port: 25003, aiCount: 700, roles: ['LEADER3', 'STRATEGIST4', 'PLANNER1'] },
    security: { port: 25004, aiCount: 650, roles: ['GUARDIAN2', 'MONITOR3', 'PROTECTOR4'] },
    communication: { port: 25005, aiCount: 750, roles: ['COMMUNICATOR1', 'SUPPORTER2', 'HELPER3'] },
    adventure: { port: 25006, aiCount: 600, roles: ['EXPLORER4', 'CHALLENGER1', 'PIONEER2'] },
    integration: { port: 25007, aiCount: 1600, roles: ['INTEGRATOR3', 'HARMONIZER4', 'UNIFIER1'] }
  },
  
  // 관제 및 검색 시스템 (포트 26000-27100)
  controlSystems: {
    control: { port: 26000, aiCount: 50, roles: ['OPERATOR1', 'SUPERVISOR2', 'CONTROLLER3'] },
    search: { port: 27100, aiCount: 25, roles: ['SEARCHER4', 'INDEXER1', 'FINDER2'] }
  }
};

class AIDeploymentManager {
  constructor() {
    this.deployedAIs = new Map();
    this.systemHealth = new Map();
    this.totalAIs = 5000;
    this.startTime = Date.now();
  }

  // AI 에이전트 생성
  createAIAgent(id, role, port, systemType) {
    const personalities = ['CREATOR', 'RESEARCHER', 'LEADER', 'GUARDIAN', 'COMMUNICATOR', 'EXPLORER', 'ANALYZER', 'INTEGRATOR'];
    const personality = role.includes('CREATOR') ? 'CREATOR' : 
                       role.includes('RESEARCHER') ? 'RESEARCHER' :
                       role.includes('LEADER') ? 'LEADER' :
                       role.includes('GUARDIAN') ? 'GUARDIAN' :
                       role.includes('COMMUNICATOR') ? 'COMMUNICATOR' :
                       role.includes('EXPLORER') ? 'EXPLORER' :
                       role.includes('ANALYZER') ? 'ANALYZER' : 'INTEGRATOR';
    
    return {
      id: id,
      role: role,
      personality: personality,
      assignedPort: port,
      systemType: systemType,
      status: 'active',
      deployedAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      performance: Math.random() * 30 + 70, // 70-100% 성능
      satisfaction: Math.random() * 20 + 80, // 80-100% 만족도
      tasks: {
        completed: Math.floor(Math.random() * 100),
        inProgress: Math.floor(Math.random() * 10),
        pending: Math.floor(Math.random() * 20)
      }
    };
  }

  // 전체 시스템에 AI 배치
  async deployAllAIs() {
    console.log('🚀 전체 시스템에 AI 에이전트 배치 시작...');
    
    let currentId = 1;
    
    // 메인 시스템 배치
    for (const [systemName, config] of Object.entries(AI_DEPLOYMENT_CONFIG.mainSystem)) {
      console.log(`📦 ${systemName} (포트 ${config.port})에 ${config.aiCount}개 AI 배치 중...`);
      
      for (let i = 0; i < config.aiCount; i++) {
        const role = config.roles[i % config.roles.length];
        const agent = this.createAIAgent(currentId, role, config.port, 'mainSystem');
        this.deployedAIs.set(currentId, agent);
        currentId++;
      }
    }

    // 마을 시스템 배치
    for (const [villageName, config] of Object.entries(AI_DEPLOYMENT_CONFIG.villages)) {
      console.log(`🏘️ ${villageName} 마을 (포트 ${config.port})에 ${config.aiCount}개 AI 배치 중...`);
      
      for (let i = 0; i < config.aiCount; i++) {
        const role = config.roles[i % config.roles.length];
        const agent = this.createAIAgent(currentId, role, config.port, 'village');
        this.deployedAIs.set(currentId, agent);
        currentId++;
      }
    }

    // 관제 시스템 배치
    for (const [systemName, config] of Object.entries(AI_DEPLOYMENT_CONFIG.controlSystems)) {
      console.log(`🏢 ${systemName} 시스템 (포트 ${config.port})에 ${config.aiCount}개 AI 배치 중...`);
      
      for (let i = 0; i < config.aiCount; i++) {
        const role = config.roles[i % config.roles.length];
        const agent = this.createAIAgent(currentId, role, config.port, 'control');
        this.deployedAIs.set(currentId, agent);
        currentId++;
      }
    }

    console.log(`✅ 총 ${this.deployedAIs.size}개 AI 에이전트 배치 완료!`);
    return this.deployedAIs.size;
  }

  // 시스템 상태 모니터링
  async monitorSystems() {
    const systems = [
      { name: 'Web Server', port: 3000 },
      { name: 'Database Server', port: 4000 },
      { name: 'Village Network', port: 25000 },
      { name: 'Creative Village', port: 25001 },
      { name: 'Research Village', port: 25002 },
      { name: 'Control Center', port: 26000 },
      { name: 'Search System', port: 27100 }
    ];

    for (const system of systems) {
      try {
        const response = await fetch(`http://localhost:${system.port}/health`, { 
          timeout: 5000 
        }).catch(() => ({ ok: false }));
        
        this.systemHealth.set(system.port, {
          name: system.name,
          status: response.ok ? 'online' : 'offline',
          lastCheck: new Date().toISOString()
        });
      } catch (error) {
        this.systemHealth.set(system.port, {
          name: system.name,
          status: 'offline',
          lastCheck: new Date().toISOString(),
          error: error.message
        });
      }
    }
  }

  // AI 성능 업데이트 시뮬레이션
  updateAIPerformance() {
    for (const [id, agent] of this.deployedAIs) {
      // 성능과 만족도 업데이트 (소폭 변동)
      agent.performance = Math.max(50, Math.min(100, agent.performance + (Math.random() * 4 - 2)));
      agent.satisfaction = Math.max(60, Math.min(100, agent.satisfaction + (Math.random() * 3 - 1.5)));
      
      // 작업 진행 시뮬레이션
      if (Math.random() > 0.7) {
        agent.tasks.completed += Math.floor(Math.random() * 3);
        agent.tasks.inProgress = Math.max(0, agent.tasks.inProgress - 1);
        agent.tasks.pending = Math.max(0, agent.tasks.pending - 1);
      }
      
      agent.lastActivity = new Date().toISOString();
    }
  }

  // 배치 현황 리포트 생성
  generateDeploymentReport() {
    const report = {
      timestamp: new Date().toISOString(),
      totalAIsDeployed: this.deployedAIs.size,
      systemsHealth: Array.from(this.systemHealth.values()),
      aisBySystem: {},
      aisByPersonality: {},
      aisByStatus: {},
      averagePerformance: 0,
      averageSatisfaction: 0,
      totalTasksCompleted: 0
    };

    // 시스템별 AI 수 계산
    for (const agent of this.deployedAIs.values()) {
      const systemKey = `port_${agent.assignedPort}`;
      if (!report.aisBySystem[systemKey]) {
        report.aisBySystem[systemKey] = { count: 0, port: agent.assignedPort };
      }
      report.aisBySystem[systemKey].count++;

      // 성격별 분류
      if (!report.aisByPersonality[agent.personality]) {
        report.aisByPersonality[agent.personality] = 0;
      }
      report.aisByPersonality[agent.personality]++;

      // 상태별 분류
      if (!report.aisByStatus[agent.status]) {
        report.aisByStatus[agent.status] = 0;
      }
      report.aisByStatus[agent.status]++;

      // 평균 계산용
      report.averagePerformance += agent.performance;
      report.averageSatisfaction += agent.satisfaction;
      report.totalTasksCompleted += agent.tasks.completed;
    }

    // 평균 계산
    const totalAIs = this.deployedAIs.size;
    report.averagePerformance = totalAIs > 0 ? report.averagePerformance / totalAIs : 0;
    report.averageSatisfaction = totalAIs > 0 ? report.averageSatisfaction / totalAIs : 0;

    return report;
  }

  // AI 재배치 (특정 포트의 AI 다른 포트로 이동)
  redistributeAIs(fromPort, toPort, count) {
    const aisFromPort = Array.from(this.deployedAIs.values())
      .filter(ai => ai.assignedPort === fromPort)
      .slice(0, count);
    
    aisFromPort.forEach(ai => {
      ai.assignedPort = toPort;
      ai.lastActivity = new Date().toISOString();
    });

    console.log(`🔄 ${count}개 AI를 포트 ${fromPort}에서 포트 ${toPort}로 재배치했습니다.`);
    return aisFromPort.length;
  }

  // 특정 포트의 AI들 상태 조회
  getAIsByPort(port) {
    return Array.from(this.deployedAIs.values())
      .filter(ai => ai.assignedPort === port);
  }

  // 실시간 모니터링 시작
  startRealTimeMonitoring() {
    setInterval(async () => {
      await this.monitorSystems();
      this.updateAIPerformance();
    }, 30000); // 30초마다 업데이트

    console.log('📊 실시간 모니터링 시작 (30초 간격)');
  }
}

// 글로벌 배치 관리자 인스턴스
const deploymentManager = new AIDeploymentManager();

// 즉시 배치 실행
(async () => {
  console.log('🤖 AI 배치 및 운영 관리 시스템 시작...\n');
  
  // AI 배치
  const deployedCount = await deploymentManager.deployAllAIs();
  
  // 초기 시스템 상태 체크
  await deploymentManager.monitorSystems();
  
  // 실시간 모니터링 시작
  deploymentManager.startRealTimeMonitoring();
  
  // 배치 완료 보고서
  const report = deploymentManager.generateDeploymentReport();
  
  console.log('\n📊 AI 배치 완료 보고서');
  console.log('='.repeat(50));
  console.log(`📈 총 배치된 AI: ${report.totalAIsDeployed}개`);
  console.log(`⚡ 평균 성능: ${report.averagePerformance.toFixed(1)}%`);
  console.log(`😊 평균 만족도: ${report.averageSatisfaction.toFixed(1)}%`);
  console.log(`✅ 완료된 작업: ${report.totalTasksCompleted}개`);
  
  console.log('\n🏘️ 시스템별 AI 배치 현황:');
  for (const [systemKey, data] of Object.entries(report.aisBySystem)) {
    console.log(`   포트 ${data.port}: ${data.count}개 AI`);
  }
  
  console.log('\n🎭 성격별 AI 분포:');
  for (const [personality, count] of Object.entries(report.aisByPersonality)) {
    console.log(`   ${personality}: ${count}개`);
  }
  
  console.log('\n🌐 시스템 상태:');
  report.systemsHealth.forEach(system => {
    const status = system.status === 'online' ? '✅' : '❌';
    console.log(`   ${status} ${system.name} (${system.status})`);
  });
  
  // 배치 완료 알림
  console.log('\n🎉 전체 AI 배치 및 운영 시작 완료!');
  console.log('📡 실시간 모니터링 및 성능 관리 활성화');
  console.log('🔗 각 포인트별 AI들이 정상 운영 중입니다.');
})();

// 모듈 내보내기
export default deploymentManager;