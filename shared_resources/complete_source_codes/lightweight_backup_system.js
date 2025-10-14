/**
 * 📝 경량화 백업 시스템
 * 시스템 부하를 최소화한 간단한 1시간 간격 백업 시스템
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import cron from 'node-cron';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('📝 경량화 백업 시스템 시작\n');

// 데이터베이스 연결
const db = new Database(join(__dirname, 'shared_database', 'code_team_ai.db'));

// 간단한 백업 테이블 (최소한의 정보만)
db.exec(`
  CREATE TABLE IF NOT EXISTS simple_backup_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    backup_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    total_ais INTEGER,
    active_communications INTEGER,
    master_ai_count INTEGER,
    backup_size_kb INTEGER,
    notes TEXT
  );
  
  CREATE INDEX IF NOT EXISTS idx_simple_backup_time ON simple_backup_history(backup_timestamp);
`);

// 백업 디렉토리 생성
const backupDir = join(__dirname, 'simple_backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// 경량 백업 수행 (리소스 최소 사용)
function performLightweightBackup() {
  const timestamp = new Date().toISOString().slice(0, 16).replace(/[:.]/g, '-');
  
  console.log(`\n📝 [${new Date().toLocaleString()}] 경량 백업 시작...`);
  
  try {
    // 1. 기본 통계만 수집 (무거운 쿼리 피함)
    const totalAIs = db.prepare('SELECT COUNT(DISTINCT ai_id) as count FROM ai_communication_info').get();
    const activeCommunications = db.prepare('SELECT COUNT(*) as count FROM communication_activity WHERE hour_group = strftime(\'%Y-%m-%d %H\', \'now\')').get();
    const masterAIs = db.prepare('SELECT COUNT(*) as count FROM master_ai_systems').get();
    
    // 2. 간단한 텍스트 백업 생성 (DB 복사 대신)
    const backupData = {
      timestamp: new Date().toISOString(),
      stats: {
        total_ais: totalAIs.count || 0,
        active_communications: activeCommunications.count || 0,
        master_ai_count: masterAIs.count || 0
      },
      system_info: {
        memory_usage: Math.round(process.memoryUsage().rss / 1024 / 1024),
        uptime_minutes: Math.round(process.uptime() / 60)
      }
    };
    
    // 3. JSON 파일로 저장 (가벼움)
    const backupFileName = `backup_${timestamp}.json`;
    const backupPath = join(backupDir, backupFileName);
    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
    
    const backupSizeKB = Math.round(fs.statSync(backupPath).size / 1024);
    
    // 4. 백업 기록 저장
    db.prepare(`
      INSERT INTO simple_backup_history (
        total_ais, active_communications, master_ai_count, backup_size_kb, notes
      ) VALUES (?, ?, ?, ?, ?)
    `).run(
      backupData.stats.total_ais,
      backupData.stats.active_communications,
      backupData.stats.master_ai_count,
      backupSizeKB,
      `경량 백업 (${backupSizeKB}KB)`
    );
    
    console.log(`✅ 경량 백업 완료: ${backupSizeKB}KB`);
    console.log(`   AI: ${backupData.stats.total_ais}명, 통신: ${backupData.stats.active_communications}건`);
    
  } catch (error) {
    console.error('❌ 백업 오류:', error.message);
    
    db.prepare(`
      INSERT INTO simple_backup_history (notes) VALUES (?)
    `).run(`백업 실패: ${error.message}`);
  }
}

// 오래된 백업 정리 (10개만 유지)
function cleanupOldBackups() {
  try {
    const files = fs.readdirSync(backupDir)
      .filter(f => f.endsWith('.json'))
      .sort()
      .reverse();
    
    // 10개 초과시 삭제
    if (files.length > 10) {
      const filesToDelete = files.slice(10);
      for (const file of filesToDelete) {
        fs.unlinkSync(join(backupDir, file));
      }
      console.log(`🧹 오래된 백업 ${filesToDelete.length}개 정리`);
    }
    
    // DB에서도 오래된 기록 정리
    db.prepare(`
      DELETE FROM simple_backup_history 
      WHERE id NOT IN (
        SELECT id FROM simple_backup_history 
        ORDER BY backup_timestamp DESC 
        LIMIT 20
      )
    `).run();
    
  } catch (error) {
    console.error('정리 오류:', error.message);
  }
}

// 백업 현황 출력
function showBackupStatus() {
  const recent = db.prepare(`
    SELECT backup_timestamp, total_ais, active_communications, backup_size_kb
    FROM simple_backup_history
    ORDER BY backup_timestamp DESC
    LIMIT 5
  `).all();
  
  console.log('\n📊 최근 백업 현황:');
  for (const backup of recent) {
    const time = new Date(backup.backup_timestamp).toLocaleString();
    console.log(`  ${time} | AI: ${backup.total_ais}명 | 통신: ${backup.active_communications}건 | ${backup.backup_size_kb}KB`);
  }
}

// 즉시 백업 실행 (테스트)
console.log('🔄 초기 백업 실행...');
performLightweightBackup();

// 1시간마다 백업 (부하 최소화)
console.log('\n⏰ 1시간 간격 경량 백업 스케줄 시작...');
cron.schedule('0 * * * *', () => {
  performLightweightBackup();
  cleanupOldBackups();
});

// 6시간마다 현황 출력 (최소한으로)
cron.schedule('0 */6 * * *', () => {
  showBackupStatus();
});

console.log('\n✅ 경량 백업 시스템 가동 완료!');
console.log('📁 백업 위치:', backupDir);
console.log('⚡ 시스템 부하 최소화, 1시간 간격 실행');
console.log('💾 JSON 형태로 가벼운 백업 저장');