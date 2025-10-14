/**
 * 🔍 스마트 AI 마을 검색 API 서버
 * 포트 27000 - 초고속 검색 및 조회 시스템
 */

import Fastify from 'fastify';
import Database from 'better-sqlite3';
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
const dbPath = join('/home/kimjin/바탕화면/kim/shared_database/', 'smart_ai_villages_system.db');
const db = new Database(dbPath);

console.log('🔍 스마트 AI 마을 검색 API 서버 시작...');

// === 빠른 검색 API들 ===

// 전체 텍스트 검색
fastify.get('/search', async (request, reply) => {
  const { q, category, limit = 20, offset = 0 } = request.query;
  
  if (!q || q.trim().length < 2) {
    return {
      success: false,
      error: '검색어는 최소 2자 이상이어야 합니다'
    };
  }

  try {
    let query = `
      SELECT si.*, 
             snippet(search_fts, 2, '<mark>', '</mark>', '...', 20) as highlight,
             bm25(search_fts) as relevance_score
      FROM search_fts sf
      JOIN search_index si ON sf.rowid = si.id
      WHERE search_fts MATCH ?
    `;
    
    const params = [q];

    if (category) {
      query += ` AND si.category = ?`;
      params.push(category);
    }

    query += ` ORDER BY relevance_score ASC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const results = db.prepare(query).all(...params);

    // 총 결과 수 계산
    let countQuery = `
      SELECT COUNT(*) as total
      FROM search_fts sf
      JOIN search_index si ON sf.rowid = si.id
      WHERE search_fts MATCH ?
    `;
    const countParams = [q];
    
    if (category) {
      countQuery += ` AND si.category = ?`;
      countParams.push(category);
    }

    const totalCount = db.prepare(countQuery).get(...countParams);

    return {
      success: true,
      query: q,
      category: category || 'all',
      results: results,
      pagination: {
        total: totalCount.total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + parseInt(limit)) < totalCount.total
      }
    };

  } catch (error) {
    console.error('검색 오류:', error);
    return {
      success: false,
      error: '검색 중 오류가 발생했습니다'
    };
  }
});

// 마을 검색
fastify.get('/search/villages', async (request, reply) => {
  const { theme, status, name, port } = request.query;
  
  let query = 'SELECT * FROM villages WHERE 1=1';
  const params = [];

  if (theme) {
    query += ' AND theme = ?';
    params.push(theme);
  }
  
  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }
  
  if (name) {
    query += ' AND name LIKE ?';
    params.push(`%${name}%`);
  }
  
  if (port) {
    query += ' AND port = ?';
    params.push(parseInt(port));
  }

  query += ' ORDER BY population DESC';

  try {
    const villages = db.prepare(query).all(...params);
    
    // 각 마을의 전문분야도 함께 조회
    const villagesWithSpecialties = villages.map(village => {
      const specialties = db.prepare(`
        SELECT specialty, proficiency_level 
        FROM village_specialties 
        WHERE village_id = ?
      `).all(village.id);
      
      return {
        ...village,
        specialties
      };
    });

    return {
      success: true,
      data: villagesWithSpecialties,
      total: villagesWithSpecialties.length
    };

  } catch (error) {
    console.error('마을 검색 오류:', error);
    return {
      success: false,
      error: '마을 검색 중 오류가 발생했습니다'
    };
  }
});

// 시설 검색
fastify.get('/search/facilities', async (request, reply) => {
  const { village_id, facility_type, name } = request.query;
  
  let query = `
    SELECT vf.*, v.name as village_name, v.emoji as village_emoji
    FROM village_facilities vf
    JOIN villages v ON vf.village_id = v.id
    WHERE 1=1
  `;
  const params = [];

  if (village_id) {
    query += ' AND vf.village_id = ?';
    params.push(village_id);
  }
  
  if (facility_type) {
    query += ' AND vf.facility_type = ?';
    params.push(facility_type);
  }
  
  if (name) {
    query += ' AND vf.facility_name LIKE ?';
    params.push(`%${name}%`);
  }

  query += ' ORDER BY vf.capacity DESC';

  try {
    const facilities = db.prepare(query).all(...params);

    return {
      success: true,
      data: facilities,
      total: facilities.length
    };

  } catch (error) {
    console.error('시설 검색 오류:', error);
    return {
      success: false,
      error: '시설 검색 중 오류가 발생했습니다'
    };
  }
});

// 전문분야 검색
fastify.get('/search/specialties', async (request, reply) => {
  const { specialty, min_level, village_id } = request.query;
  
  let query = `
    SELECT vs.*, v.name as village_name, v.emoji as village_emoji, v.port
    FROM village_specialties vs
    JOIN villages v ON vs.village_id = v.id
    WHERE 1=1
  `;
  const params = [];

  if (specialty) {
    query += ' AND vs.specialty LIKE ?';
    params.push(`%${specialty}%`);
  }
  
  if (min_level) {
    query += ' AND vs.proficiency_level >= ?';
    params.push(parseInt(min_level));
  }
  
  if (village_id) {
    query += ' AND vs.village_id = ?';
    params.push(village_id);
  }

  query += ' ORDER BY vs.proficiency_level DESC, vs.specialty ASC';

  try {
    const specialties = db.prepare(query).all(...params);

    return {
      success: true,
      data: specialties,
      total: specialties.length
    };

  } catch (error) {
    console.error('전문분야 검색 오류:', error);
    return {
      success: false,
      error: '전문분야 검색 중 오류가 발생했습니다'
    };
  }
});

// 인프라 검색
fastify.get('/search/infrastructure', async (request, reply) => {
  const { category, min_efficiency, name } = request.query;
  
  let query = 'SELECT * FROM infrastructure_components WHERE 1=1';
  const params = [];

  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }
  
  if (min_efficiency) {
    query += ' AND efficiency_percentage >= ?';
    params.push(parseFloat(min_efficiency));
  }
  
  if (name) {
    query += ' AND component_name LIKE ?';
    params.push(`%${name}%`);
  }

  query += ' ORDER BY efficiency_percentage DESC';

  try {
    const infrastructure = db.prepare(query).all(...params);

    return {
      success: true,
      data: infrastructure,
      total: infrastructure.length
    };

  } catch (error) {
    console.error('인프라 검색 오류:', error);
    return {
      success: false,
      error: '인프라 검색 중 오류가 발생했습니다'
    };
  }
});

// API 엔드포인트 검색
fastify.get('/search/api', async (request, reply) => {
  const { village_id, method, path } = request.query;
  
  let query = `
    SELECT ae.*, v.name as village_name, v.emoji as village_emoji, v.port
    FROM api_endpoints ae
    LEFT JOIN villages v ON ae.village_id = v.id
    WHERE 1=1
  `;
  const params = [];

  if (village_id) {
    if (village_id === 'null' || village_id === 'system') {
      query += ' AND ae.village_id IS NULL';
    } else {
      query += ' AND ae.village_id = ?';
      params.push(village_id);
    }
  }
  
  if (method) {
    query += ' AND ae.method = ?';
    params.push(method.toUpperCase());
  }
  
  if (path) {
    query += ' AND ae.endpoint_path LIKE ?';
    params.push(`%${path}%`);
  }

  query += ' ORDER BY ae.village_id, ae.endpoint_path';

  try {
    const apis = db.prepare(query).all(...params);

    return {
      success: true,
      data: apis,
      total: apis.length
    };

  } catch (error) {
    console.error('API 검색 오류:', error);
    return {
      success: false,
      error: 'API 검색 중 오류가 발생했습니다'
    };
  }
});

// === 통계 및 대시보드 API ===

// 시스템 통계
fastify.get('/stats', async (request, reply) => {
  try {
    const stats = {
      villages: {
        total: db.prepare('SELECT COUNT(*) as count FROM villages').get().count,
        offline: db.prepare('SELECT COUNT(*) as count FROM villages WHERE status = "offline"').get().count,
        by_theme: db.prepare(`
          SELECT theme, COUNT(*) as count 
          FROM villages 
          GROUP BY theme 
          ORDER BY count DESC
        `).all()
      },
      specialties: {
        total: db.prepare('SELECT COUNT(*) as count FROM village_specialties').get().count,
        by_level: db.prepare(`
          SELECT proficiency_level, COUNT(*) as count 
          FROM village_specialties 
          GROUP BY proficiency_level 
          ORDER BY proficiency_level DESC
        `).all(),
        top_specialties: db.prepare(`
          SELECT specialty, COUNT(*) as village_count, AVG(proficiency_level) as avg_level
          FROM village_specialties 
          GROUP BY specialty 
          ORDER BY village_count DESC, avg_level DESC
          LIMIT 10
        `).all()
      },
      facilities: {
        total: db.prepare('SELECT COUNT(*) as count FROM village_facilities').get().count,
        by_type: db.prepare(`
          SELECT facility_type, COUNT(*) as count 
          FROM village_facilities 
          GROUP BY facility_type 
          ORDER BY count DESC
        `).all(),
        capacity_stats: db.prepare(`
          SELECT 
            SUM(capacity) as total_capacity,
            SUM(current_usage) as total_usage,
            ROUND(AVG(CAST(current_usage AS FLOAT) / capacity * 100), 2) as avg_utilization
          FROM village_facilities
        `).get()
      },
      infrastructure: {
        total: db.prepare('SELECT COUNT(*) as count FROM infrastructure_components').get().count,
        by_category: db.prepare(`
          SELECT category, COUNT(*) as count, AVG(efficiency_percentage) as avg_efficiency
          FROM infrastructure_components 
          GROUP BY category 
          ORDER BY avg_efficiency DESC
        `).all(),
        efficiency_stats: db.prepare(`
          SELECT 
            MIN(efficiency_percentage) as min_efficiency,
            MAX(efficiency_percentage) as max_efficiency,
            AVG(efficiency_percentage) as avg_efficiency
          FROM infrastructure_components
        `).get()
      }
    };

    return {
      success: true,
      data: stats,
      generated_at: new Date()
    };

  } catch (error) {
    console.error('통계 조회 오류:', error);
    return {
      success: false,
      error: '통계 조회 중 오류가 발생했습니다'
    };
  }
});

// 검색 인덱스 재구축
fastify.post('/admin/reindex', async (request, reply) => {
  try {
    // 검색 인덱스 초기화
    db.prepare('DELETE FROM search_index').run();
    
    // 마을 재인덱싱
    const villages = db.prepare('SELECT * FROM villages').all();
    const indexStmt = db.prepare(`
      INSERT INTO search_index (object_type, object_id, title, content, tags, category)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    villages.forEach(village => {
      const content = `${village.name} ${village.description} ${village.theme} ${village.mayor}`;
      const tags = `${village.theme},마을,AI,port${village.port}`;
      indexStmt.run('village', village.id, village.name, content, tags, village.theme);
    });

    // 시설 재인덱싱
    const facilities = db.prepare(`
      SELECT vf.*, v.name as village_name, v.theme 
      FROM village_facilities vf 
      JOIN villages v ON vf.village_id = v.id
    `).all();

    facilities.forEach(facility => {
      const content = `${facility.facility_name} ${facility.description} ${facility.village_name}`;
      const tags = `${facility.facility_type},시설,${facility.village_name}`;
      indexStmt.run('facility', `${facility.village_id}_${facility.id}`, facility.facility_name, content, tags, facility.facility_type);
    });

    // FTS 인덱스 재구축
    db.exec(`DELETE FROM search_fts WHERE search_fts MATCH '*'`);
    db.exec(`INSERT INTO search_fts(search_fts) VALUES('rebuild')`);

    const indexCount = db.prepare('SELECT COUNT(*) as count FROM search_index').get().count;

    return {
      success: true,
      message: '검색 인덱스가 재구축되었습니다',
      indexed_items: indexCount
    };

  } catch (error) {
    console.error('인덱스 재구축 오류:', error);
    return {
      success: false,
      error: '인덱스 재구축 중 오류가 발생했습니다'
    };
  }
});

// === 메인 검색 인터페이스 ===
fastify.get('/', async (request, reply) => {
  return reply.type('text/html').send(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>🔍 스마트 AI 마을 검색 시스템</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
                color: white;
                font-family: 'Arial', sans-serif;
                min-height: 100vh;
                padding: 20px;
            }
            
            .search-container {
                max-width: 1200px;
                margin: 0 auto;
            }
            
            .header {
                text-align: center;
                margin-bottom: 40px;
            }
            
            .header h1 {
                font-size: 2.5rem;
                margin-bottom: 10px;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
            }
            
            .search-box {
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(10px);
                border-radius: 15px;
                padding: 30px;
                margin-bottom: 30px;
                border: 1px solid rgba(255, 255, 255, 0.2);
            }
            
            .search-form {
                display: grid;
                grid-template-columns: 1fr auto auto;
                gap: 15px;
                align-items: center;
            }
            
            .search-input {
                padding: 15px 20px;
                border: none;
                border-radius: 10px;
                background: rgba(255, 255, 255, 0.9);
                font-size: 1.1rem;
                color: #333;
            }
            
            .search-input::placeholder {
                color: #666;
            }
            
            .search-select {
                padding: 15px;
                border: none;
                border-radius: 10px;
                background: rgba(255, 255, 255, 0.9);
                color: #333;
                cursor: pointer;
            }
            
            .search-btn {
                padding: 15px 30px;
                border: none;
                border-radius: 10px;
                background: #00ff88;
                color: #333;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s;
            }
            
            .search-btn:hover {
                background: #00cc6a;
                transform: translateY(-2px);
            }
            
            .quick-filters {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 15px;
                margin-bottom: 30px;
            }
            
            .filter-card {
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(10px);
                border-radius: 10px;
                padding: 20px;
                text-align: center;
                cursor: pointer;
                transition: all 0.3s;
                border: 1px solid rgba(255, 255, 255, 0.2);
            }
            
            .filter-card:hover {
                transform: translateY(-3px);
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
                border-color: #00ff88;
            }
            
            .filter-card h3 {
                margin-bottom: 10px;
                font-size: 1.2rem;
            }
            
            .results-section {
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(10px);
                border-radius: 15px;
                padding: 30px;
                border: 1px solid rgba(255, 255, 255, 0.2);
            }
            
            .result-item {
                background: rgba(255, 255, 255, 0.05);
                border-radius: 10px;
                padding: 20px;
                margin-bottom: 15px;
                border-left: 4px solid #00ff88;
            }
            
            .result-title {
                font-size: 1.3rem;
                font-weight: bold;
                margin-bottom: 8px;
                color: #00ff88;
            }
            
            .result-content {
                margin-bottom: 10px;
                line-height: 1.6;
            }
            
            .result-meta {
                display: flex;
                gap: 15px;
                font-size: 0.9rem;
                color: rgba(255, 255, 255, 0.7);
            }
            
            .highlight {
                background: #ffd700;
                color: #333;
                padding: 2px 4px;
                border-radius: 3px;
            }
            
            .no-results {
                text-align: center;
                padding: 40px;
                color: rgba(255, 255, 255, 0.7);
            }
            
            .stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                gap: 15px;
                margin-bottom: 30px;
            }
            
            .stat-card {
                background: rgba(255, 255, 255, 0.1);
                border-radius: 10px;
                padding: 15px;
                text-align: center;
            }
            
            .stat-value {
                font-size: 1.8rem;
                font-weight: bold;
                color: #00ff88;
                display: block;
            }
            
            .stat-label {
                font-size: 0.9rem;
                color: rgba(255, 255, 255, 0.8);
            }
            
            @media (max-width: 768px) {
                .search-form {
                    grid-template-columns: 1fr;
                }
                
                .quick-filters {
                    grid-template-columns: 1fr;
                }
            }
        </style>
    </head>
    <body>
        <div class="search-container">
            <div class="header">
                <h1>🔍 스마트 AI 마을 검색 시스템</h1>
                <p>7개 마을, 43개 항목을 초고속으로 검색하세요!</p>
            </div>
            
            <!-- 통계 카드 -->
            <div class="stats-grid" id="statsGrid">
                <!-- 통계 로딩 중... -->
            </div>
            
            <!-- 검색 박스 -->
            <div class="search-box">
                <div class="search-form">
                    <input type="text" id="searchInput" class="search-input" placeholder="마을, 시설, 전문분야, API 등 무엇이든 검색하세요...">
                    <select id="categoryFilter" class="search-select">
                        <option value="">모든 카테고리</option>
                        <option value="creative">창작</option>
                        <option value="research">연구</option>
                        <option value="administration">관리</option>
                        <option value="security">보안</option>
                        <option value="communication">소통</option>
                        <option value="adventure">모험</option>
                        <option value="integration">통합</option>
                    </select>
                    <button class="search-btn" onclick="performSearch()">🔍 검색</button>
                </div>
            </div>
            
            <!-- 빠른 필터 -->
            <div class="quick-filters">
                <div class="filter-card" onclick="quickSearch('villages')">
                    <h3>🏘️ 마을 검색</h3>
                    <p>7개 특화 마을</p>
                </div>
                <div class="filter-card" onclick="quickSearch('facilities')">
                    <h3>🏢 시설 검색</h3>
                    <p>갤러리, 연구소 등</p>
                </div>
                <div class="filter-card" onclick="quickSearch('specialties')">
                    <h3>🎯 전문분야</h3>
                    <p>28개 전문분야</p>
                </div>
                <div class="filter-card" onclick="quickSearch('infrastructure')">
                    <h3>🏗️ 인프라</h3>
                    <p>11개 핵심 인프라</p>
                </div>
                <div class="filter-card" onclick="quickSearch('api')">
                    <h3>📡 API</h3>
                    <p>15개 엔드포인트</p>
                </div>
            </div>
            
            <!-- 검색 결과 -->
            <div class="results-section" id="resultsSection" style="display: none;">
                <h2>🔍 검색 결과</h2>
                <div id="searchResults"></div>
            </div>
        </div>
        
        <script>
            // 통계 로드
            async function loadStats() {
                try {
                    const response = await fetch('/stats');
                    const data = await response.json();
                    
                    if (data.success) {
                        const statsGrid = document.getElementById('statsGrid');
                        statsGrid.innerHTML = \`
                            <div class="stat-card">
                                <span class="stat-value">\${data.data.villages.total}</span>
                                <span class="stat-label">마을</span>
                            </div>
                            <div class="stat-card">
                                <span class="stat-value">\${data.data.villages.online}</span>
                                <span class="stat-label">온라인</span>
                            </div>
                            <div class="stat-card">
                                <span class="stat-value">\${data.data.specialties.total}</span>
                                <span class="stat-label">전문분야</span>
                            </div>
                            <div class="stat-card">
                                <span class="stat-value">\${data.data.facilities.total}</span>
                                <span class="stat-label">시설</span>
                            </div>
                            <div class="stat-card">
                                <span class="stat-value">\${data.data.infrastructure.total}</span>
                                <span class="stat-label">인프라</span>
                            </div>
                            <div class="stat-card">
                                <span class="stat-value">\${Math.round(data.data.infrastructure.efficiency_stats.avg_efficiency)}%</span>
                                <span class="stat-label">평균 효율</span>
                            </div>
                        \`;
                    }
                } catch (error) {
                    console.error('통계 로드 실패:', error);
                }
            }
            
            // 검색 수행
            async function performSearch() {
                const query = document.getElementById('searchInput').value.trim();
                const category = document.getElementById('categoryFilter').value;
                
                if (query.length < 2) {
                    alert('검색어는 최소 2자 이상 입력하세요.');
                    return;
                }
                
                try {
                    const params = new URLSearchParams({ q: query, limit: 20 });
                    if (category) params.append('category', category);
                    
                    const response = await fetch('/search?' + params);
                    const data = await response.json();
                    
                    displayResults(data, query);
                } catch (error) {
                    console.error('검색 실패:', error);
                }
            }
            
            // 빠른 검색
            async function quickSearch(type) {
                try {
                    const response = await fetch(\`/search/\${type}\`);
                    const data = await response.json();
                    
                    displayResults(data, type + ' 전체 목록');
                } catch (error) {
                    console.error('빠른 검색 실패:', error);
                }
            }
            
            // 결과 표시
            function displayResults(data, query) {
                const resultsSection = document.getElementById('resultsSection');
                const searchResults = document.getElementById('searchResults');
                
                resultsSection.style.display = 'block';
                
                if (data.success && data.data && data.data.length > 0) {
                    const results = data.results || data.data;
                    searchResults.innerHTML = \`
                        <p style="margin-bottom: 20px; color: #00ff88;">
                            "\${query}" 검색 결과 \${results.length}개 발견
                        </p>
                        \${results.map(result => \`
                            <div class="result-item">
                                <div class="result-title">\${result.title || result.name || result.facility_name || result.component_name}</div>
                                <div class="result-content">\${result.highlight || result.content || result.description || '설명 없음'}</div>
                                <div class="result-meta">
                                    <span>📍 카테고리: \${result.category || result.object_type || result.theme || '미분류'}</span>
                                    \${result.village_name ? \`<span>🏘️ \${result.village_name}</span>\` : ''}
                                    \${result.port ? \`<span>🔌 포트: \${result.port}</span>\` : ''}
                                    \${result.efficiency_percentage ? \`<span>⚡ 효율: \${result.efficiency_percentage}%</span>\` : ''}
                                </div>
                            </div>
                        \`).join('')}
                    \`;
                } else {
                    searchResults.innerHTML = \`
                        <div class="no-results">
                            <h3>🤷‍♀️ 검색 결과가 없습니다</h3>
                            <p>다른 검색어를 시도해보세요.</p>
                        </div>
                    \`;
                }
            }
            
            // Enter 키로 검색
            document.getElementById('searchInput').addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    performSearch();
                }
            });
            
            // 페이지 로드 시 통계 로드
            loadStats();
        </script>
    </body>
    </html>
  `);
});

// 서버 시작
const start = async () => {
  try {
    await fastify.listen({ port: 27000, host: '0.0.0.0' });
    
    console.log('\\n🔍 스마트 AI 마을 검색 API 서버 시작!');
    console.log('=========================================');
    console.log('🔍 검색 인터페이스: http://localhost:27000');
    console.log('📡 전체 텍스트 검색: /search?q=검색어');
    console.log('🏘️ 마을 검색: /search/villages');
    console.log('🏢 시설 검색: /search/facilities');
    console.log('🎯 전문분야 검색: /search/specialties');
    console.log('🏗️ 인프라 검색: /search/infrastructure');
    console.log('📊 시스템 통계: /stats');
    console.log('=========================================\\n');
    
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

// 종료 시 데이터베이스 연결 해제
process.on('SIGINT', () => {
  db.close();
  process.exit(0);
});

start();