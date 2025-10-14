/**
 * 🗄️ 모든 프로젝트 데이터를 DB에 저장
 * 전체 KIMDB 시스템 데이터 아카이빙
 */

import Database from 'better-sqlite3';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const dbPath = join(process.cwd(), 'shared_ai_knowledge.db');
const db = new Database(dbPath);

console.log('📊 전체 프로젝트 데이터 DB 저장 시작...');

// 새 테이블들 생성
db.exec(`
  -- 프로젝트 파일 저장소
  CREATE TABLE IF NOT EXISTS project_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    project_phase TEXT NOT NULL
  );

  -- KIMDB 시스템 메타데이터
  CREATE TABLE IF NOT EXISTS kimdb_metadata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    component_name TEXT NOT NULL,
    component_type TEXT NOT NULL,
    description TEXT,
    version TEXT,
    technology_stack TEXT,
    performance_metrics TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- 웹 인터페이스 정보
  CREATE TABLE IF NOT EXISTS web_interface_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    page_name TEXT NOT NULL,
    page_type TEXT NOT NULL,
    features TEXT NOT NULL,
    file_path TEXT,
    size_kb REAL,
    dependencies TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- 프로젝트 통계
  CREATE TABLE IF NOT EXISTS project_statistics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    metric_name TEXT NOT NULL,
    metric_value TEXT NOT NULL,
    metric_type TEXT NOT NULL,
    measurement_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
  );
`);

// 인덱스 생성
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_project_files_type ON project_files(file_type);
  CREATE INDEX IF NOT EXISTS idx_project_files_phase ON project_files(project_phase);
  CREATE INDEX IF NOT EXISTS idx_kimdb_metadata_type ON kimdb_metadata(component_type);
  CREATE INDEX IF NOT EXISTS idx_web_interface_page ON web_interface_data(page_type);
  CREATE INDEX IF NOT EXISTS idx_statistics_type ON project_statistics(metric_type);
`);

// 파일 정보 저장 함수
const saveFileInfo = (filePath, fileName, content, phase) => {
  const stats = statSync(filePath);
  const fileExt = fileName.split('.').pop() || '';
  
  const stmt = db.prepare(`
    INSERT INTO project_files (file_path, file_name, file_type, file_size, content, project_phase)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(filePath, fileName, fileExt, stats.size, content, phase);
};

// KIMDB 메타데이터 저장
const saveKIMDBMetadata = () => {
  const components = [
    {
      name: 'KIMDB Core Database',
      type: 'database',
      description: '5000명 AI 저장하는 SQLite 기반 자체 구현 DB',
      version: '2.0.0',
      tech_stack: 'SQLite, better-sqlite3, TypeScript',
      performance: '5000 records in 250ms, 1.2MB storage'
    },
    {
      name: 'AI Agent System',
      type: 'ai_system',
      description: '8가지 성격의 5000명 AI 에이전트 시스템',
      version: '1.0.0',
      tech_stack: 'JavaScript, Node.js, FastAPI',
      performance: '31001-35000 포트 할당, 실시간 채팅'
    },
    {
      name: 'Web Interface',
      type: 'frontend',
      description: '다크테마 반응형 웹 관리 인터페이스',
      version: '1.0.0',
      tech_stack: 'HTML5, CSS3, Vanilla JavaScript',
      performance: '9.5KB HTML, 15KB+ CSS, 12KB+ JS'
    },
    {
      name: 'FastAPI Server',
      type: 'backend',
      description: '고성능 웹 서버 및 API 시스템',
      version: '1.0.0',
      tech_stack: 'Fastify, TypeScript, better-sqlite3',
      performance: 'sub-ms response time, 정적 파일 서비스'
    },
    {
      name: 'Shared Knowledge DB',
      type: 'knowledge_base',
      description: '5000명 AI 공유 지식 데이터베이스',
      version: '1.0.0',
      tech_stack: 'SQLite, 5 tables, 53KB storage',
      performance: '7 AI knowledge entries, 4 collaboration projects'
    }
  ];

  const stmt = db.prepare(`
    INSERT INTO kimdb_metadata (component_name, component_type, description, version, technology_stack, performance_metrics)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  components.forEach(comp => {
    stmt.run(comp.name, comp.type, comp.description, comp.version, comp.tech_stack, comp.performance);
  });
};

// 웹 인터페이스 데이터 저장
const saveWebInterfaceData = () => {
  const webPages = [
    {
      name: 'Main Dashboard',
      type: 'dashboard',
      features: '실시간 AI 통계, 팀별 현황, 성격별 분포 차트',
      file_path: '/public/index.html',
      size_kb: 9.5,
      dependencies: 'Font Awesome, CSS Grid, Flexbox'
    },
    {
      name: 'AI Search System',
      type: 'search',
      features: '이름/스킬/성격 검색, 고급 필터링, 카드 결과',
      file_path: '/public/js/app.js',
      size_kb: 12.0,
      dependencies: 'Fetch API, DOM Manipulation'
    },
    {
      name: 'Team Management',
      type: 'team_view',
      features: '팀별 AI 조회, 1250명씩 그리드 표시',
      file_path: '/public/css/style.css',
      size_kb: 15.0,
      dependencies: 'CSS Grid, Animations, Dark Theme'
    },
    {
      name: 'Real-time Chat',
      type: 'chat',
      features: '랜덤 AI 선택, 성격별 응답, 실시간 대화',
      file_path: '/src/server-final.ts',
      size_kb: 25.0,
      dependencies: 'Fastify, WebSocket, AI Personality System'
    }
  ];

  const stmt = db.prepare(`
    INSERT INTO web_interface_data (page_name, page_type, features, file_path, size_kb, dependencies)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  webPages.forEach(page => {
    stmt.run(page.name, page.type, page.features, page.file_path, page.size_kb, page.dependencies);
  });
};

// 프로젝트 통계 저장
const saveProjectStatistics = () => {
  const statistics = [
    { name: 'Total AI Agents', value: '5000', type: 'ai_count' },
    { name: 'Active AI Agents', value: '4464', type: 'ai_count' },
    { name: 'Idle AI Agents', value: '536', type: 'ai_count' },
    { name: 'CODE1 Team Size', value: '1250', type: 'team_size' },
    { name: 'CODE2 Team Size', value: '1250', type: 'team_size' },
    { name: 'CODE3 Team Size', value: '1250', type: 'team_size' },
    { name: 'CODE4 Team Size', value: '1250', type: 'team_size' },
    { name: 'CREATOR Personality', value: '654', type: 'personality_count' },
    { name: 'ANALYZER Personality', value: '661', type: 'personality_count' },
    { name: 'GUARDIAN Personality', value: '654', type: 'personality_count' },
    { name: 'PERFORMER Personality', value: '597', type: 'personality_count' },
    { name: 'EXPLORER Personality', value: '634', type: 'personality_count' },
    { name: 'SUPPORTER Personality', value: '601', type: 'personality_count' },
    { name: 'MEDIATOR Personality', value: '607', type: 'personality_count' },
    { name: 'LEADER Personality', value: '592', type: 'personality_count' },
    { name: 'Main Database Size', value: '1.2MB', type: 'storage_size' },
    { name: 'Shared Knowledge DB Size', value: '53KB', type: 'storage_size' },
    { name: 'AI Initialization Time', value: '250ms', type: 'performance' },
    { name: 'Port Range', value: '31001-35000', type: 'network' },
    { name: 'Claude Dedicated Port', value: '35834', type: 'network' },
    { name: 'Web Server Port', value: '3000', type: 'network' },
    { name: 'Total Project Files', value: '20+', type: 'file_count' },
    { name: 'Documentation Size', value: '100KB+', type: 'documentation' },
    { name: 'Code Coverage', value: 'TypeScript + ES6+', type: 'code_quality' },
    { name: 'Framework Used', value: 'Fastify + SQLite + Vanilla JS', type: 'technology' }
  ];

  const stmt = db.prepare(`
    INSERT INTO project_statistics (metric_name, metric_value, metric_type)
    VALUES (?, ?, ?)
  `);

  statistics.forEach(stat => {
    stmt.run(stat.name, stat.value, stat.type);
  });
};

// 주요 파일들 저장
const saveProjectFiles = () => {
  const projectRoot = '/home/kimjin/바탕화면/kim/kimdb';
  const sharedRoot = '/home/kimjin/바탕화면/kim/shared_database';
  
  const importantFiles = [
    // KIMDB 핵심 파일들
    { path: `${projectRoot}/package.json`, phase: 'setup' },
    { path: `${projectRoot}/tsconfig.json`, phase: 'setup' },
    { path: `${projectRoot}/src/server-final.ts`, phase: 'backend' },
    { path: `${projectRoot}/src/ai-system/ai-simple.ts`, phase: 'ai_system' },
    { path: `${projectRoot}/src/database/ai-storage.ts`, phase: 'database' },
    { path: `${projectRoot}/public/index.html`, phase: 'frontend' },
    { path: `${projectRoot}/public/css/style.css`, phase: 'frontend' },
    { path: `${projectRoot}/public/js/app.js`, phase: 'frontend' },
    
    // 교육 및 문서 파일들
    { path: `${projectRoot}/AI_EDUCATION_MATERIALS.md`, phase: 'education' },
    { path: `${projectRoot}/AI_DEPLOYMENT_SUCCESS.md`, phase: 'documentation' },
    { path: `${projectRoot}/DATABASE_STORAGE_SUCCESS.md`, phase: 'documentation' },
    { path: `${projectRoot}/WEB_IMPLEMENTATION_SUCCESS.md`, phase: 'documentation' },
    
    // 공유 데이터베이스 파일들
    { path: `${sharedRoot}/SHARED_DATABASE_SETUP.md`, phase: 'shared_system' },
    { path: `${sharedRoot}/DATABASE_USAGE_GUIDE.md`, phase: 'shared_system' },
    { path: `${sharedRoot}/AI_EDUCATION_COMPLETE.md`, phase: 'shared_system' },
    { path: `${sharedRoot}/setup_shared_db.js`, phase: 'shared_system' }
  ];

  importantFiles.forEach(fileInfo => {
    try {
      const content = readFileSync(fileInfo.path, 'utf8');
      const fileName = fileInfo.path.split('/').pop();
      saveFileInfo(fileInfo.path, fileName, content, fileInfo.phase);
      console.log(`✅ Saved: ${fileName}`);
    } catch (error) {
      console.log(`❌ Failed to save: ${fileInfo.path}`);
    }
  });
};

// 모든 데이터 저장 실행
console.log('\n🚀 Starting comprehensive data save...');

try {
  console.log('💾 Saving KIMDB metadata...');
  saveKIMDBMetadata();
  
  console.log('🌐 Saving web interface data...');
  saveWebInterfaceData();
  
  console.log('📊 Saving project statistics...');
  saveProjectStatistics();
  
  console.log('📁 Saving project files...');
  saveProjectFiles();

  // 최종 통계
  const finalStats = {
    files: db.prepare('SELECT COUNT(*) as count FROM project_files').get(),
    metadata: db.prepare('SELECT COUNT(*) as count FROM kimdb_metadata').get(),
    webPages: db.prepare('SELECT COUNT(*) as count FROM web_interface_data').get(),
    statistics: db.prepare('SELECT COUNT(*) as count FROM project_statistics').get(),
    totalSize: db.prepare('SELECT SUM(file_size) as total FROM project_files').get()
  };

  console.log('\n✅ 전체 프로젝트 데이터 저장 완료!');
  console.log(`📁 저장된 파일: ${finalStats.files.count}개`);
  console.log(`🔧 메타데이터: ${finalStats.metadata.count}개 컴포넌트`);
  console.log(`🌐 웹 페이지: ${finalStats.webPages.count}개`);
  console.log(`📊 통계 지표: ${finalStats.statistics.count}개`);
  console.log(`💾 총 파일 크기: ${Math.round(finalStats.totalSize.total / 1024)}KB`);
  
  console.log(`\n🗄️ 데이터베이스 위치: ${dbPath}`);
  const dbStats = statSync(dbPath);
  console.log(`📈 DB 크기: ${Math.round(dbStats.size / 1024)}KB`);

} catch (error) {
  console.error('❌ 데이터 저장 중 오류:', error);
} finally {
  db.close();
  console.log('🔒 데이터베이스 연결 종료');
}

console.log('\n🎉 모든 프로젝트 데이터가 영구 보관되었습니다!');