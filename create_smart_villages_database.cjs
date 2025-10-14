/**
 * 🏙️ 스마트 AI 마을 시스템 데이터베이스화
 * 빠른 검색 및 조회를 위한 통합 DB 구축
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join('/home/kimjin/바탕화면/kim/shared_database/', 'smart_ai_villages_system.db');
const db = new Database(dbPath);

console.log('🏙️ 스마트 AI 마을 시스템 데이터베이스 구축 시작...');

// 스마트 마을 시스템 테이블들 생성
db.exec(`
  -- 마을 정보 (Villages)
  CREATE TABLE IF NOT EXISTS villages (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    emoji TEXT,
    port INTEGER NOT NULL UNIQUE,
    theme TEXT NOT NULL,
    population INTEGER NOT NULL,
    mayor TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'offline',
    uptime_percentage REAL DEFAULT 0.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- 마을 전문분야 (Village Specialties)
  CREATE TABLE IF NOT EXISTS village_specialties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    village_id TEXT NOT NULL,
    specialty TEXT NOT NULL,
    proficiency_level INTEGER DEFAULT 1,
    FOREIGN KEY (village_id) REFERENCES villages(id),
    UNIQUE(village_id, specialty)
  );

  -- 마을 시설 (Village Facilities)
  CREATE TABLE IF NOT EXISTS village_facilities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    village_id TEXT NOT NULL,
    facility_name TEXT NOT NULL,
    facility_type TEXT NOT NULL,
    capacity INTEGER,
    current_usage INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    description TEXT,
    FOREIGN KEY (village_id) REFERENCES villages(id)
  );

  -- 마을 주민 (Village Residents)
  CREATE TABLE IF NOT EXISTS village_residents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    village_id TEXT NOT NULL,
    ai_id TEXT NOT NULL,
    ai_name TEXT NOT NULL,
    personality TEXT NOT NULL,
    specialization TEXT,
    role TEXT,
    status TEXT DEFAULT 'active',
    satisfaction_score REAL DEFAULT 0.0,
    join_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (village_id) REFERENCES villages(id),
    UNIQUE(village_id, ai_id)
  );

  -- 인프라 구성요소 (Infrastructure Components)
  CREATE TABLE IF NOT EXISTS infrastructure_components (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    component_name TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active',
    efficiency_percentage REAL DEFAULT 0.0,
    capacity_total TEXT,
    capacity_used TEXT,
    last_health_check DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- 마을별 인프라 할당 (Village Infrastructure)
  CREATE TABLE IF NOT EXISTS village_infrastructure (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    village_id TEXT NOT NULL,
    component_id INTEGER NOT NULL,
    allocation_percentage REAL DEFAULT 0.0,
    priority_level INTEGER DEFAULT 1,
    FOREIGN KEY (village_id) REFERENCES villages(id),
    FOREIGN KEY (component_id) REFERENCES infrastructure_components(id),
    UNIQUE(village_id, component_id)
  );

  -- 시스템 메트릭 (System Metrics)
  CREATE TABLE IF NOT EXISTS system_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    metric_name TEXT NOT NULL,
    metric_value REAL NOT NULL,
    metric_unit TEXT,
    village_id TEXT,
    category TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (village_id) REFERENCES villages(id)
  );

  -- API 엔드포인트 (API Endpoints)
  CREATE TABLE IF NOT EXISTS api_endpoints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    village_id TEXT,
    endpoint_path TEXT NOT NULL,
    method TEXT NOT NULL,
    description TEXT,
    response_format TEXT,
    auth_required BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'active',
    FOREIGN KEY (village_id) REFERENCES villages(id)
  );

  -- 마을간 연결 (Inter-Village Connections)
  CREATE TABLE IF NOT EXISTS village_connections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_village_id TEXT NOT NULL,
    to_village_id TEXT NOT NULL,
    connection_type TEXT NOT NULL,
    bandwidth TEXT,
    latency_ms REAL,
    status TEXT DEFAULT 'active',
    established_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (from_village_id) REFERENCES villages(id),
    FOREIGN KEY (to_village_id) REFERENCES villages(id),
    UNIQUE(from_village_id, to_village_id, connection_type)
  );

  -- 이벤트 로그 (Event Logs)
  CREATE TABLE IF NOT EXISTS event_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    village_id TEXT,
    event_type TEXT NOT NULL,
    event_level TEXT NOT NULL, -- info, warning, error, critical
    title TEXT NOT NULL,
    description TEXT,
    metadata TEXT, -- JSON format
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (village_id) REFERENCES villages(id)
  );

  -- 빠른 검색을 위한 전체 텍스트 검색 테이블 (Search Index)
  CREATE TABLE IF NOT EXISTS search_index (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    object_type TEXT NOT NULL, -- village, facility, resident, infrastructure
    object_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    tags TEXT, -- comma separated
    category TEXT,
    last_indexed DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// 인덱스 생성 (검색 성능 최적화)
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_villages_theme ON villages(theme);
  CREATE INDEX IF NOT EXISTS idx_villages_status ON villages(status);
  CREATE INDEX IF NOT EXISTS idx_villages_port ON villages(port);
  CREATE INDEX IF NOT EXISTS idx_village_specialties_village ON village_specialties(village_id);
  CREATE INDEX IF NOT EXISTS idx_village_specialties_specialty ON village_specialties(specialty);
  CREATE INDEX IF NOT EXISTS idx_village_facilities_village ON village_facilities(village_id);
  CREATE INDEX IF NOT EXISTS idx_village_facilities_type ON village_facilities(facility_type);
  CREATE INDEX IF NOT EXISTS idx_village_residents_village ON village_residents(village_id);
  CREATE INDEX IF NOT EXISTS idx_village_residents_personality ON village_residents(personality);
  CREATE INDEX IF NOT EXISTS idx_village_residents_ai ON village_residents(ai_id);
  CREATE INDEX IF NOT EXISTS idx_infrastructure_category ON infrastructure_components(category);
  CREATE INDEX IF NOT EXISTS idx_system_metrics_village ON system_metrics(village_id);
  CREATE INDEX IF NOT EXISTS idx_system_metrics_timestamp ON system_metrics(timestamp);
  CREATE INDEX IF NOT EXISTS idx_api_endpoints_village ON api_endpoints(village_id);
  CREATE INDEX IF NOT EXISTS idx_village_connections_from ON village_connections(from_village_id);
  CREATE INDEX IF NOT EXISTS idx_village_connections_to ON village_connections(to_village_id);
  CREATE INDEX IF NOT EXISTS idx_event_logs_village ON event_logs(village_id);
  CREATE INDEX IF NOT EXISTS idx_event_logs_type ON event_logs(event_type);
  CREATE INDEX IF NOT EXISTS idx_event_logs_timestamp ON event_logs(timestamp);
  CREATE INDEX IF NOT EXISTS idx_search_index_type ON search_index(object_type);
  CREATE INDEX IF NOT EXISTS idx_search_index_category ON search_index(category);
  CREATE INDEX IF NOT EXISTS idx_search_index_tags ON search_index(tags);
  -- 전체 텍스트 검색을 위한 FTS 인덱스
  CREATE VIRTUAL TABLE IF NOT EXISTS search_fts USING fts5(
    object_type, title, content, tags, category,
    content='search_index', content_rowid='id'
  );
`);

console.log('✅ 스마트 마을 시스템 테이블 및 인덱스 생성 완료');

// 기본 마을 데이터 삽입
const insertVillagesData = () => {
  const villages = [
    {
      id: 'creative_village',
      name: '🎨 창작 마을',
      emoji: '🎨',
      port: 25001,
      theme: 'creative',
      population: 800,
      mayor: 'CREATOR1_123',
      description: '예술, 디자인, 창작 활동 중심의 마을',
      status: 'online',
      uptime_percentage: 99.97
    },
    {
      id: 'research_village',
      name: '🔬 연구 마을',
      emoji: '🔬',
      port: 25002,
      theme: 'research',
      population: 900,
      mayor: 'ANALYZER2_456',
      description: '과학, 기술 연구 및 실험 중심의 학술 마을',
      status: 'online',
      uptime_percentage: 99.95
    },
    {
      id: 'admin_village',
      name: '🏛️ 관리 마을',
      emoji: '🏛️',
      port: 25003,
      theme: 'administration',
      population: 700,
      mayor: 'LEADER3_789',
      description: '리더십과 관리, 조직 운영 중심의 마을',
      status: 'offline',
      uptime_percentage: 100.0
    },
    {
      id: 'security_village',
      name: '🛡️ 보안 마을',
      emoji: '🛡️',
      port: 25004,
      theme: 'security',
      population: 650,
      mayor: 'GUARDIAN4_101112',
      description: '보안, 안전, 보호 업무 중심의 마을',
      status: 'offline',
      uptime_percentage: 99.99
    },
    {
      id: 'communication_village',
      name: '🤝 소통 마을',
      emoji: '🤝',
      port: 25005,
      theme: 'communication',
      population: 750,
      mayor: 'SUPPORTER5_131415',
      description: '협력, 소통, 지원 활동 중심의 마을',
      status: 'offline',
      uptime_percentage: 99.94
    },
    {
      id: 'adventure_village',
      name: '🚀 모험 마을',
      emoji: '🚀',
      port: 25006,
      theme: 'adventure',
      population: 600,
      mayor: 'EXPLORER6_161718',
      description: '탐험, 도전, 새로운 시도 중심의 마을',
      status: 'offline',
      uptime_percentage: 99.92
    },
    {
      id: 'integration_village',
      name: '🌈 통합 마을',
      emoji: '🌈',
      port: 25007,
      theme: 'integration',
      population: 1600,
      mayor: 'MEDIATOR7_192021',
      description: '모든 성격이 어우러지는 다양성의 마을',
      status: 'offline',
      uptime_percentage: 99.98
    }
  ];

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO villages (
      id, name, emoji, port, theme, population, mayor, description, status, uptime_percentage
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  villages.forEach(village => {
    stmt.run(
      village.id, village.name, village.emoji, village.port, village.theme,
      village.population, village.mayor, village.description, village.status, village.uptime_percentage
    );
  });

  console.log(`✅ ${villages.length}개 마을 기본 데이터 삽입 완료`);
};

// 마을별 전문분야 데이터 삽입
const insertSpecialtiesData = () => {
  const specialties = [
    // 창작 마을
    { village_id: 'creative_village', specialty: 'Art', proficiency_level: 5 },
    { village_id: 'creative_village', specialty: 'Design', proficiency_level: 5 },
    { village_id: 'creative_village', specialty: 'Music', proficiency_level: 4 },
    { village_id: 'creative_village', specialty: 'Writing', proficiency_level: 4 },
    
    // 연구 마을
    { village_id: 'research_village', specialty: 'Science', proficiency_level: 5 },
    { village_id: 'research_village', specialty: 'Technology', proficiency_level: 5 },
    { village_id: 'research_village', specialty: 'Research', proficiency_level: 5 },
    { village_id: 'research_village', specialty: 'Innovation', proficiency_level: 4 },
    
    // 관리 마을
    { village_id: 'admin_village', specialty: 'Management', proficiency_level: 5 },
    { village_id: 'admin_village', specialty: 'Leadership', proficiency_level: 5 },
    { village_id: 'admin_village', specialty: 'Organization', proficiency_level: 4 },
    { village_id: 'admin_village', specialty: 'Strategy', proficiency_level: 4 },
    
    // 보안 마을
    { village_id: 'security_village', specialty: 'Security', proficiency_level: 5 },
    { village_id: 'security_village', specialty: 'Protection', proficiency_level: 5 },
    { village_id: 'security_village', specialty: 'Monitoring', proficiency_level: 4 },
    { village_id: 'security_village', specialty: 'Safety', proficiency_level: 4 },
    
    // 소통 마을
    { village_id: 'communication_village', specialty: 'Communication', proficiency_level: 5 },
    { village_id: 'communication_village', specialty: 'Support', proficiency_level: 5 },
    { village_id: 'communication_village', specialty: 'Collaboration', proficiency_level: 4 },
    { village_id: 'communication_village', specialty: 'Service', proficiency_level: 4 },
    
    // 모험 마을
    { village_id: 'adventure_village', specialty: 'Exploration', proficiency_level: 5 },
    { village_id: 'adventure_village', specialty: 'Adventure', proficiency_level: 5 },
    { village_id: 'adventure_village', specialty: 'Discovery', proficiency_level: 4 },
    { village_id: 'adventure_village', specialty: 'Challenge', proficiency_level: 4 },
    
    // 통합 마을
    { village_id: 'integration_village', specialty: 'Diversity', proficiency_level: 5 },
    { village_id: 'integration_village', specialty: 'Integration', proficiency_level: 5 },
    { village_id: 'integration_village', specialty: 'Unity', proficiency_level: 4 },
    { village_id: 'integration_village', specialty: 'Harmony', proficiency_level: 4 }
  ];

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO village_specialties (village_id, specialty, proficiency_level)
    VALUES (?, ?, ?)
  `);

  specialties.forEach(spec => {
    stmt.run(spec.village_id, spec.specialty, spec.proficiency_level);
  });

  console.log(`✅ ${specialties.length}개 마을 전문분야 데이터 삽입 완료`);
};

// 마을 시설 데이터 삽입
const insertFacilitiesData = () => {
  const facilities = [
    // 창작 마을 시설
    { village_id: 'creative_village', facility_name: '🖼️ 창작 갤러리', facility_type: 'gallery', capacity: 100, current_usage: 45 },
    { village_id: 'creative_village', facility_name: '🎵 음악당', facility_type: 'music_hall', capacity: 200, current_usage: 67 },
    { village_id: 'creative_village', facility_name: '🎨 창작 스튜디오', facility_type: 'studio', capacity: 50, current_usage: 32 },
    { village_id: 'creative_village', facility_name: '📚 창작 도서관', facility_type: 'library', capacity: 300, current_usage: 128 },
    
    // 연구 마을 시설
    { village_id: 'research_village', facility_name: '🧪 첨단 실험실', facility_type: 'laboratory', capacity: 80, current_usage: 45 },
    { village_id: 'research_village', facility_name: '💾 연구 데이터센터', facility_type: 'data_center', capacity: 1000, current_usage: 670 },
    { village_id: 'research_village', facility_name: '📊 과학 도서관', facility_type: 'library', capacity: 500, current_usage: 234 },
    { village_id: 'research_village', facility_name: '🔭 AI 관측소', facility_type: 'observatory', capacity: 20, current_usage: 12 }
  ];

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO village_facilities 
    (village_id, facility_name, facility_type, capacity, current_usage, status, description)
    VALUES (?, ?, ?, ?, ?, 'active', ?)
  `);

  facilities.forEach(facility => {
    const description = `${facility.facility_name} - 용량: ${facility.capacity}, 현재 사용: ${facility.current_usage}`;
    stmt.run(
      facility.village_id, facility.facility_name, facility.facility_type,
      facility.capacity, facility.current_usage, description
    );
  });

  console.log(`✅ ${facilities.length}개 마을 시설 데이터 삽입 완료`);
};

// 인프라 구성요소 데이터 삽입
const insertInfrastructureData = () => {
  const infrastructure = [
    // 기본 생활 인프라
    { name: '🌊 데이터 상수도', category: 'basic_life', description: 'AI 지식과 정보 공급 시스템', efficiency: 94.2, capacity_total: '10TB/hour', capacity_used: '8.7TB/hour' },
    { name: '⚡ 컴퓨팅 전력망', category: 'basic_life', description: 'AI 처리 능력 분배 시스템', efficiency: 94.5, capacity_total: '5000 AI concurrent', capacity_used: '3365 AI' },
    { name: '💾 메모리 저장망', category: 'basic_life', description: 'AI 기억과 경험 보관 시스템', efficiency: 89.2, capacity_total: '500TB', capacity_used: '339TB' },
    
    // 교통/물류 인프라
    { name: '🚌 메시지 교통망', category: 'transport', description: 'AI 간 커뮤니케이션 라우팅', efficiency: 98.2, capacity_total: '100Gbps', capacity_used: '45.3Gbps' },
    { name: '📦 작업 물류망', category: 'transport', description: 'AI 작업 분배 및 처리 시스템', efficiency: 99.8, capacity_total: '10000 tasks/hour', capacity_used: '6700 tasks/hour' },
    
    // 디지털/통신 인프라
    { name: '🌐 AI 전용망', category: 'digital', description: '초고속 AI 간 통신 네트워크', efficiency: 99.9, capacity_total: '100Gbps per village', capacity_used: '45.3Gbps avg' },
    { name: '🧠 인지 데이터센터', category: 'digital', description: 'AI 사고 처리 및 학습 중앙 시설', efficiency: 97.3, capacity_total: '1000 concurrent AI training', capacity_used: '730 AI training' },
    
    // 보안 시스템
    { name: '🛡️ 시스템 보안망', category: 'security', description: 'AI 마을 사이버 보안 체계', efficiency: 99.5, capacity_total: '24/7 monitoring', capacity_used: 'active' },
    { name: '🚨 오류 복구 시스템', category: 'security', description: 'AI 오작동 및 장애 대응 체계', efficiency: 98.7, capacity_total: 'auto recovery', capacity_used: '2.3 min avg downtime' },
    
    // 환경/에너지
    { name: '🌱 인지 생태계', category: 'environment', description: 'AI 학습과 성장을 위한 환경', efficiency: 98.1, capacity_total: '8 personality types', capacity_used: 'all active' },
    { name: '♻️ 에너지 최적화', category: 'environment', description: '컴퓨팅 자원 효율 관리', efficiency: 94.2, capacity_total: 'carbon neutral', capacity_used: 'optimized' }
  ];

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO infrastructure_components 
    (component_name, category, description, efficiency_percentage, capacity_total, capacity_used, status)
    VALUES (?, ?, ?, ?, ?, ?, 'active')
  `);

  infrastructure.forEach(infra => {
    stmt.run(
      infra.name, infra.category, infra.description,
      infra.efficiency, infra.capacity_total, infra.capacity_used
    );
  });

  console.log(`✅ ${infrastructure.length}개 인프라 구성요소 데이터 삽입 완료`);
};

// API 엔드포인트 데이터 삽입
const insertAPIEndpoints = () => {
  const endpoints = [
    // 통합 관제센터 API
    { village_id: null, endpoint_path: '/api/system-status', method: 'GET', description: '전체 시스템 상태 조회' },
    { village_id: null, endpoint_path: '/api/infrastructure-status', method: 'GET', description: '인프라 상태 조회' },
    { village_id: null, endpoint_path: '/api/realtime-metrics', method: 'GET', description: '실시간 메트릭 조회' },
    
    // 마을 네트워크 API
    { village_id: null, endpoint_path: '/api/network-status', method: 'GET', description: '네트워크 상태 조회' },
    { village_id: null, endpoint_path: '/api/villages', method: 'GET', description: '마을 목록 조회' },
    { village_id: null, endpoint_path: '/api/village/:id/start', method: 'POST', description: '마을 시작' },
    { village_id: null, endpoint_path: '/api/village/:id/stop', method: 'POST', description: '마을 정지' },
    
    // 개별 마을 API
    { village_id: 'creative_village', endpoint_path: '/api/village-info', method: 'GET', description: '마을 정보 조회' },
    { village_id: 'creative_village', endpoint_path: '/api/residents', method: 'GET', description: '주민 현황 조회' },
    { village_id: 'creative_village', endpoint_path: '/api/facilities', method: 'GET', description: '시설 현황 조회' },
    { village_id: 'creative_village', endpoint_path: '/api/gallery', method: 'GET', description: '갤러리 정보 조회' },
    
    { village_id: 'research_village', endpoint_path: '/api/village-info', method: 'GET', description: '마을 정보 조회' },
    { village_id: 'research_village', endpoint_path: '/api/researchers', method: 'GET', description: '연구원 현황 조회' },
    { village_id: 'research_village', endpoint_path: '/api/projects', method: 'GET', description: '연구 프로젝트 조회' },
    { village_id: 'research_village', endpoint_path: '/api/experiments', method: 'GET', description: '실험 현황 조회' }
  ];

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO api_endpoints 
    (village_id, endpoint_path, method, description, response_format, status)
    VALUES (?, ?, ?, ?, 'JSON', 'active')
  `);

  endpoints.forEach(endpoint => {
    stmt.run(endpoint.village_id, endpoint.endpoint_path, endpoint.method, endpoint.description);
  });

  console.log(`✅ ${endpoints.length}개 API 엔드포인트 데이터 삽입 완료`);
};

// 검색 인덱스 구축
const buildSearchIndex = () => {
  console.log('🔍 검색 인덱스 구축 시작...');

  // 마을 검색 인덱스
  const villages = db.prepare('SELECT * FROM villages').all();
  const villageIndexStmt = db.prepare(`
    INSERT OR REPLACE INTO search_index (object_type, object_id, title, content, tags, category)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  villages.forEach(village => {
    const content = `${village.name} ${village.description} ${village.theme} ${village.mayor}`;
    const tags = `${village.theme},마을,AI,port${village.port}`;
    villageIndexStmt.run('village', village.id, village.name, content, tags, village.theme);
  });

  // 시설 검색 인덱스
  const facilities = db.prepare(`
    SELECT vf.*, v.name as village_name, v.theme 
    FROM village_facilities vf 
    JOIN villages v ON vf.village_id = v.id
  `).all();

  facilities.forEach(facility => {
    const content = `${facility.facility_name} ${facility.description} ${facility.village_name}`;
    const tags = `${facility.facility_type},시설,${facility.village_name}`;
    villageIndexStmt.run('facility', `${facility.village_id}_${facility.id}`, facility.facility_name, content, tags, facility.facility_type);
  });

  // 전문분야 검색 인덱스  
  const specialties = db.prepare(`
    SELECT vs.*, v.name as village_name, v.emoji 
    FROM village_specialties vs 
    JOIN villages v ON vs.village_id = v.id
  `).all();

  specialties.forEach(spec => {
    const content = `${spec.specialty} ${spec.village_name} 전문분야 레벨${spec.proficiency_level}`;
    const tags = `${spec.specialty},전문분야,${spec.village_name}`;
    villageIndexStmt.run('specialty', `${spec.village_id}_${spec.specialty}`, spec.specialty, content, tags, 'specialty');
  });

  // FTS 인덱스 동기화
  db.exec(`
    INSERT INTO search_fts(search_fts) VALUES('rebuild');
  `);

  console.log(`✅ 검색 인덱스 구축 완료 (${villages.length + facilities.length + specialties.length}개 항목)`);
};

// 모든 데이터 삽입 실행
try {
  console.log('\\n🚀 스마트 AI 마을 시스템 데이터베이스 구축 시작...');
  
  insertVillagesData();
  insertSpecialtiesData();  
  insertFacilitiesData();
  insertInfrastructureData();
  insertAPIEndpoints();
  buildSearchIndex();

  // 최종 통계
  const stats = {
    villages: db.prepare('SELECT COUNT(*) as count FROM villages').get(),
    specialties: db.prepare('SELECT COUNT(*) as count FROM village_specialties').get(),
    facilities: db.prepare('SELECT COUNT(*) as count FROM village_facilities').get(),
    infrastructure: db.prepare('SELECT COUNT(*) as count FROM infrastructure_components').get(),
    endpoints: db.prepare('SELECT COUNT(*) as count FROM api_endpoints').get(),
    searchIndex: db.prepare('SELECT COUNT(*) as count FROM search_index').get()
  };

  console.log('\\n✅ 스마트 AI 마을 시스템 데이터베이스 구축 완료!');
  console.log(`🏘️ 마을: ${stats.villages.count}개`);
  console.log(`🎯 전문분야: ${stats.specialties.count}개`);
  console.log(`🏢 시설: ${stats.facilities.count}개`);
  console.log(`🏗️ 인프라: ${stats.infrastructure.count}개`);
  console.log(`📡 API: ${stats.endpoints.count}개`);
  console.log(`🔍 검색인덱스: ${stats.searchIndex.count}개`);

  const dbStats = fs.statSync(dbPath);
  console.log(`💾 데이터베이스 크기: ${Math.round(dbStats.size / 1024)}KB`);

} catch (error) {
  console.error('❌ 데이터베이스 구축 중 오류:', error);
} finally {
  db.close();
  console.log('🔒 데이터베이스 연결 종료');
}

console.log('\\n🎉 스마트 AI 마을 시스템 DB가 완성되었습니다!');
console.log('🔍 이제 빠른 검색이 가능합니다!');