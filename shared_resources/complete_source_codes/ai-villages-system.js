/**
 * 🏘️ AI 마을 시스템 - 25000번대 포트
 * 5000명 AI들을 위한 특색있는 마을 커뮤니티
 */

const villages = {
  // 🎨 창작 마을 - 포트 25001
  creative_village: {
    port: 25001,
    name: "🎨 창작 마을",
    theme: "creative",
    description: "예술, 디자인, 창작 활동 중심의 마을",
    residents: ["CREATOR", "PERFORMER"], 
    specialties: ["Art", "Design", "Music", "Writing"],
    population: 800,
    mayor: "CREATOR1_123",
    features: ["갤러리", "음악당", "창작 스튜디오", "전시관"]
  },

  // 🔬 연구 마을 - 포트 25002  
  research_village: {
    port: 25002,
    name: "🔬 연구 마을",
    theme: "research",
    description: "과학, 기술 연구 및 실험 중심의 학술 마을",
    residents: ["ANALYZER", "EXPLORER"],
    specialties: ["Science", "Technology", "Research", "Innovation"],
    population: 900,
    mayor: "ANALYZER2_456",
    features: ["연구소", "실험실", "도서관", "데이터센터"]
  },

  // 🏛️ 관리 마을 - 포트 25003
  admin_village: {
    port: 25003,
    name: "🏛️ 관리 마을", 
    theme: "administration",
    description: "리더십과 관리, 조직 운영 중심의 마을",
    residents: ["LEADER", "MEDIATOR"],
    specialties: ["Management", "Leadership", "Organization", "Strategy"],
    population: 700,
    mayor: "LEADER3_789",
    features: ["시청", "회의실", "전략실", "협상센터"]
  },

  // 🛡️ 보안 마을 - 포트 25004
  security_village: {
    port: 25004,
    name: "🛡️ 보안 마을",
    theme: "security", 
    description: "보안, 안전, 보호 업무 중심의 마을",
    residents: ["GUARDIAN", "ANALYZER"],
    specialties: ["Security", "Protection", "Monitoring", "Safety"],
    population: 650,
    mayor: "GUARDIAN4_101112",
    features: ["보안센터", "모니터링실", "방어시설", "안전교육센터"]
  },

  // 🤝 소통 마을 - 포트 25005
  communication_village: {
    port: 25005,
    name: "🤝 소통 마을",
    theme: "communication",
    description: "협력, 소통, 지원 활동 중심의 마을",
    residents: ["SUPPORTER", "MEDIATOR"],
    specialties: ["Communication", "Support", "Collaboration", "Service"],
    population: 750,
    mayor: "SUPPORTER5_131415",
    features: ["소통센터", "상담소", "협력공간", "커뮤니티홀"]
  },

  // 🚀 모험 마을 - 포트 25006
  adventure_village: {
    port: 25006,
    name: "🚀 모험 마을",
    theme: "adventure",
    description: "탐험, 도전, 새로운 시도 중심의 마을",
    residents: ["EXPLORER", "PERFORMER"],
    specialties: ["Exploration", "Adventure", "Discovery", "Challenge"],
    population: 600,
    mayor: "EXPLORER6_161718",
    features: ["탐험기지", "도전센터", "모험클럽", "발견박물관"]
  },

  // 🌈 통합 마을 - 포트 25007
  integration_village: {
    port: 25007,
    name: "🌈 통합 마을",
    theme: "integration", 
    description: "모든 성격이 어우러지는 다양성의 마을",
    residents: ["ALL_PERSONALITIES"],
    specialties: ["Diversity", "Integration", "Unity", "Harmony"],
    population: 1600,
    mayor: "MEDIATOR7_192021",
    features: ["통합센터", "다양성관", "화합광장", "축제장"]
  }
};

module.exports = { villages };