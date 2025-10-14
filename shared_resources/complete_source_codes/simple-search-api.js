/**
 * 🔍 간단한 검색 API 서버 (포트 27100)
 * 스마트 AI 마을 시스템 빠른 검색
 */

import Fastify from 'fastify';
import Database from 'better-sqlite3';
import { join } from 'path';

const fastify = Fastify({ logger: true });

// 데이터베이스 연결
const dbPath = join('/home/kimjin/바탕화면/kim/shared_database/', 'smart_ai_villages_system.db');
const db = new Database(dbPath);

console.log('🔍 검색 API 서버 시작...');

// 기본 검색
fastify.get('/search', async (request, reply) => {
  const { q, limit = 10 } = request.query;
  
  if (!q || q.trim().length < 2) {
    return { success: false, error: '검색어는 최소 2자 이상이어야 합니다' };
  }

  try {
    const results = db.prepare(`
      SELECT * FROM villages WHERE 
      name LIKE ? OR description LIKE ? OR theme LIKE ?
      LIMIT ?
    `).all(`%${q}%`, `%${q}%`, `%${q}%`, limit);

    return {
      success: true,
      query: q,
      results: results.length,
      data: results
    };
  } catch (error) {
    console.error('검색 오류:', error);
    return { success: false, error: '검색 중 오류가 발생했습니다' };
  }
});

// 시설 검색
fastify.get('/search/facilities', async (request, reply) => {
  const { q, limit = 10 } = request.query;
  
  try {
    if (q) {
      const results = db.prepare(`
        SELECT * FROM village_facilities WHERE 
        facility_name LIKE ? OR facility_type LIKE ?
        LIMIT ?
      `).all(`%${q}%`, `%${q}%`, limit);
      
      return { success: true, results: results.length, data: results };
    } else {
      const results = db.prepare('SELECT * FROM village_facilities LIMIT ?').all(limit);
      return { success: true, results: results.length, data: results };
    }
  } catch (error) {
    console.error('시설 검색 오류:', error);
    return { success: false, error: '시설 검색 중 오류가 발생했습니다' };
  }
});

// 전문분야 검색
fastify.get('/search/specialties', async (request, reply) => {
  try {
    const results = db.prepare('SELECT * FROM village_specialties LIMIT 20').all();
    return { success: true, results: results.length, data: results };
  } catch (error) {
    console.error('전문분야 검색 오류:', error);
    return { success: false, error: '전문분야 검색 중 오류가 발생했습니다' };
  }
});

// 간단한 통계
fastify.get('/stats', async (request, reply) => {
  try {
    const villageCount = db.prepare('SELECT COUNT(*) as count FROM villages').get().count;
    const facilityCount = db.prepare('SELECT COUNT(*) as count FROM village_facilities').get().count;
    const specialtyCount = db.prepare('SELECT COUNT(*) as count FROM village_specialties').get().count;
    
    return {
      success: true,
      data: {
        villages: villageCount,
        facilities: facilityCount,
        specialties: specialtyCount,
        searchable_items: villageCount + facilityCount + specialtyCount
      }
    };
  } catch (error) {
    console.error('통계 오류:', error);
    return { success: false, error: '통계 조회 중 오류가 발생했습니다' };
  }
});

// 검색 인터페이스 HTML
fastify.get('/', async (request, reply) => {
  reply.type('text/html').send(`
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🔍 스마트 AI 마을 검색</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background: #f0f2f5; }
        .container { max-width: 800px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 30px; }
        .search-box { display: flex; gap: 10px; margin-bottom: 20px; }
        .search-input { flex: 1; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 16px; }
        .search-btn { padding: 12px 24px; background: #007bff; color: white; border: none; border-radius: 8px; cursor: pointer; }
        .results { background: white; border-radius: 8px; padding: 20px; margin-top: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .result-item { padding: 15px; border-bottom: 1px solid #eee; }
        .result-item:last-child { border-bottom: none; }
        .result-title { font-weight: bold; color: #333; margin-bottom: 5px; }
        .result-desc { color: #666; font-size: 14px; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 20px; }
        .stat-card { background: white; padding: 20px; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .stat-number { font-size: 24px; font-weight: bold; color: #007bff; }
        .stat-label { color: #666; font-size: 14px; margin-top: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔍 스마트 AI 마을 검색</h1>
            <p>7개 AI 마을의 모든 정보를 빠르게 검색하세요</p>
        </div>
        
        <div id="stats" class="stats"></div>
        
        <div class="search-box">
            <input type="text" id="searchInput" class="search-input" placeholder="검색어를 입력하세요... (마을, 시설, 전문분야)">
            <button onclick="search()" class="search-btn">검색</button>
        </div>
        
        <div id="results" class="results" style="display:none;">
            <div id="resultsContent"></div>
        </div>
    </div>

    <script>
        // 통계 로드
        fetch('/stats')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    document.getElementById('stats').innerHTML = \`
                        <div class="stat-card">
                            <div class="stat-number">\${data.data.villages}</div>
                            <div class="stat-label">마을 수</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number">\${data.data.facilities}</div>
                            <div class="stat-label">시설 수</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number">\${data.data.specialties}</div>
                            <div class="stat-label">전문분야</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-number">\${data.data.searchable_items}</div>
                            <div class="stat-label">검색가능 항목</div>
                        </div>
                    \`;
                }
            });

        function search() {
            const query = document.getElementById('searchInput').value.trim();
            if (query.length < 2) {
                alert('검색어는 최소 2자 이상이어야 합니다');
                return;
            }

            fetch(\`/search?q=\${encodeURIComponent(query)}&limit=20\`)
                .then(response => response.json())
                .then(data => {
                    const resultsDiv = document.getElementById('results');
                    const contentDiv = document.getElementById('resultsContent');
                    
                    if (data.success && data.results > 0) {
                        contentDiv.innerHTML = \`
                            <h3>검색 결과: \${data.results}개</h3>
                            \${data.data.map(item => \`
                                <div class="result-item">
                                    <div class="result-title">\${item.emoji || ''} \${item.name}</div>
                                    <div class="result-desc">테마: \${item.theme} | 포트: \${item.port} | 인구: \${item.population}명</div>
                                    <div class="result-desc">\${item.description || ''}</div>
                                </div>
                            \`).join('')}
                        \`;
                        resultsDiv.style.display = 'block';
                    } else {
                        contentDiv.innerHTML = '<h3>검색 결과가 없습니다</h3>';
                        resultsDiv.style.display = 'block';
                    }
                });
        }

        // Enter 키 검색
        document.getElementById('searchInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                search();
            }
        });
    </script>
</body>
</html>
  `);
});

// 서버 시작
fastify.listen({ port: 27100, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    console.error('서버 시작 오류:', err);
    process.exit(1);
  }
  console.log(`
🔍 스마트 AI 마을 검색 API 서버 시작 완료!
=========================================
🌐 검색 인터페이스: http://localhost:27100
🔍 API 검색: http://localhost:27100/search?q=검색어
🏘️ 시설 검색: http://localhost:27100/search/facilities
🎯 전문분야: http://localhost:27100/search/specialties
📊 통계: http://localhost:27100/stats
=========================================
  `);
});