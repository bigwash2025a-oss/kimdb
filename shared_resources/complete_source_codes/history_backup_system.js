/**
 * 📚 20분마다 역사 저장 시스템
 * 전체 KIMDB 시스템의 상태와 활동을 20분 간격으로 백업
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import cron from 'node-cron';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('📚 20분마다 역사 저장 시스템 시작\n');

// 데이터베이스 연결
const db = new Database(join(__dirname, 'shared_database', 'code_team_ai.db'));

// 역사 백업 테이블 생성
db.exec(`
  CREATE TABLE IF NOT EXISTS system_history_backup (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    backup_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    backup_type TEXT NOT NULL, -- 'regular_20min', 'hourly', 'daily'
    
    -- 시스템 현황
    total_ais INTEGER,
    active_ais INTEGER,
    master_ais INTEGER,
    
    -- 통신 활동
    total_activities INTEGER,
    email_activities INTEGER,
    sms_activities INTEGER,
    call_activities INTEGER,
    sns_activities INTEGER,
    
    -- 마스터 AI 상태
    master_ai_status TEXT, -- JSON 형태
    
    -- 학습 현황
    learning_progress TEXT, -- JSON 형태
    
    -- 저장소 사용량
    storage_usage TEXT, -- JSON 형태
    
    -- 시스템 메트릭
    system_metrics TEXT, -- JSON 형태
    
    -- 전체 백업 파일 경로
    full_backup_path TEXT,
    backup_size_mb REAL,
    
    -- 백업 상태
    backup_status TEXT DEFAULT 'completed', -- 'started', 'in_progress', 'completed', 'failed'
    backup_duration_ms INTEGER,
    notes TEXT
  );
  
  CREATE INDEX IF NOT EXISTS idx_history_timestamp ON system_history_backup(backup_timestamp);
  CREATE INDEX IF NOT EXISTS idx_history_type ON system_history_backup(backup_type);
`);

// 백업 디렉토리 생성
const backupDir = join(__dirname, 'history_backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// 20분마다 역사 백업 수행
function performHistoryBackup() {
  const startTime = Date.now();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  console.log(`\n📚 [${new Date().toLocaleString()}] 역사 백업 시작...`);
  
  try {
    // 1. 시스템 현황 수집
    const systemStatus = collectSystemStatus();
    console.log('✅ 시스템 현황 수집 완료');
    
    // 2. 통신 활동 현황 수집
    const communicationStats = collectCommunicationStats();
    console.log('✅ 통신 활동 현황 수집 완료');
    
    // 3. 마스터 AI 상태 수집
    const masterAIStatus = collectMasterAIStatus();
    console.log('✅ 마스터 AI 상태 수집 완료');
    
    // 4. 학습 진행 현황 수집
    const learningProgress = collectLearningProgress();
    console.log('✅ 학습 진행 현황 수집 완료');
    
    // 5. 저장소 사용량 수집
    const storageUsage = collectStorageUsage();
    console.log('✅ 저장소 사용량 수집 완료');
    
    // 6. 시스템 메트릭 수집
    const systemMetrics = collectSystemMetrics();
    console.log('✅ 시스템 메트릭 수집 완료');
    
    // 7. 전체 데이터베이스 백업
    const backupPath = createFullDatabaseBackup(timestamp);
    console.log('✅ 데이터베이스 백업 완료');
    
    // 8. 백업 정보 저장
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    const backupSize = fs.existsSync(backupPath) ? 
      Math.round(fs.statSync(backupPath).size / 1024 / 1024 * 100) / 100 : 0;
    
    const insertBackup = db.prepare(`
      INSERT INTO system_history_backup (
        backup_type, total_ais, active_ais, master_ais,
        total_activities, email_activities, sms_activities, call_activities, sns_activities,
        master_ai_status, learning_progress, storage_usage, system_metrics,
        full_backup_path, backup_size_mb, backup_duration_ms, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = insertBackup.run(
      'regular_20min',
      systemStatus.total_ais,
      systemStatus.active_ais,
      systemStatus.master_ais,
      communicationStats.total_activities,
      communicationStats.email_activities,
      communicationStats.sms_activities,
      communicationStats.call_activities,
      communicationStats.sns_activities,
      JSON.stringify(masterAIStatus),
      JSON.stringify(learningProgress),
      JSON.stringify(storageUsage),
      JSON.stringify(systemMetrics),
      backupPath,
      backupSize,
      duration,
      `20분 정기 백업 (ID: ${result.lastInsertRowid})`
    );
    
    console.log(`📚 역사 백업 완료! (${duration}ms, ${backupSize}MB, ID: ${result.lastInsertRowid})`);
    
    // 9. 백업 현황 출력
    printBackupSummary(systemStatus, communicationStats, masterAIStatus);
    
  } catch (error) {
    console.error('❌ 역사 백업 중 오류:', error.message);
    
    // 실패 기록 저장
    db.prepare(`
      INSERT INTO system_history_backup (
        backup_type, backup_status, notes, backup_duration_ms
      ) VALUES (?, ?, ?, ?)
    `).run('regular_20min', 'failed', error.message, Date.now() - startTime);
  }
}

// 시스템 현황 수집
function collectSystemStatus() {
  const totalAIs = db.prepare(`
    SELECT COUNT(DISTINCT ai_id) as count 
    FROM communication_activity 
    WHERE hour_group = strftime('%Y-%m-%d %H', 'now')
  `).get();
  
  const codeTeamAIs = db.prepare(`
    SELECT COUNT(*) as count FROM ai_communication_info
  `).get();
  
  const masterAIs = db.prepare(`
    SELECT COUNT(*) as count FROM master_ai_systems WHERE status = 'active'
  `).get();
  
  return {
    total_ais: totalAIs.count || 0,
    active_ais: codeTeamAIs.count || 0,
    master_ais: masterAIs.count || 0
  };
}

// 통신 활동 현황 수집
function collectCommunicationStats() {
  const stats = db.prepare(`
    SELECT 
      COUNT(*) as total_activities,
      SUM(CASE WHEN activity_type LIKE '%email%' THEN 1 ELSE 0 END) as email_activities,
      SUM(CASE WHEN activity_type LIKE '%sms%' THEN 1 ELSE 0 END) as sms_activities,
      SUM(CASE WHEN activity_type LIKE '%call%' THEN 1 ELSE 0 END) as call_activities,
      SUM(CASE WHEN activity_type LIKE '%sns%' THEN 1 ELSE 0 END) as sns_activities
    FROM communication_activity
    WHERE hour_group = strftime('%Y-%m-%d %H', 'now')
  `).get();
  
  return {
    total_activities: stats.total_activities || 0,
    email_activities: stats.email_activities || 0,
    sms_activities: stats.sms_activities || 0,
    call_activities: stats.call_activities || 0,
    sns_activities: stats.sns_activities || 0
  };
}

// 마스터 AI 상태 수집
function collectMasterAIStatus() {
  const masterAIs = db.prepare(`
    SELECT 
      ai_id, ai_name, role, intelligence_level, 
      processing_power, memory_capacity, leadership_rank, status,
      (SELECT COUNT(*) FROM master_ai_subordinates WHERE master_ai_id = m.ai_id) as subordinate_count,
      (SELECT COUNT(*) FROM master_ai_instructions WHERE master_ai_id = m.ai_id AND status = 'pending') as pending_instructions
    FROM master_ai_systems m
    ORDER BY leadership_rank
  `).all();
  
  return masterAIs;
}

// 학습 진행 현황 수집
function collectLearningProgress() {
  try {
    const learningStats = db.prepare(`
      SELECT 
        COUNT(*) as total_learning_ais,
        AVG(total_learning_hours) as avg_hours,
        AVG(average_score) as avg_score
      FROM ai_learning_progress
    `).get();
    
    return learningStats;
  } catch (error) {
    return { total_learning_ais: 0, avg_hours: 0, avg_score: 0, error: error.message };
  }
}

// 저장소 사용량 수집
function collectStorageUsage() {
  try {
    const storageStats = db.prepare(`
      SELECT 
        COUNT(*) as total_storage_units,
        SUM(used_size_mb) as total_used_mb,
        AVG(used_size_mb) as avg_used_mb,
        SUM(total_files) as total_files
      FROM ai_storage
    `).get();
    
    return storageStats;
  } catch (error) {
    return { total_storage_units: 0, total_used_mb: 0, avg_used_mb: 0, total_files: 0, error: error.message };
  }
}

// 시스템 메트릭 수집
function collectSystemMetrics() {
  const currentTime = new Date();
  
  return {
    timestamp: currentTime.toISOString(),
    uptime_hours: Math.round(process.uptime() / 3600 * 100) / 100,
    memory_usage_mb: Math.round(process.memoryUsage().rss / 1024 / 1024),
    cpu_usage: process.cpuUsage(),
    node_version: process.version,
    platform: process.platform
  };
}

// 전체 데이터베이스 백업 생성
function createFullDatabaseBackup(timestamp) {
  const backupFileName = `kimdb_backup_${timestamp}.db`;
  const backupPath = join(backupDir, backupFileName);
  
  try {
    // SQLite 데이터베이스 백업
    const sourceDbPath = join(__dirname, 'shared_database', 'code_team_ai.db');
    fs.copyFileSync(sourceDbPath, backupPath);
    
    return backupPath;
  } catch (error) {
    console.error('데이터베이스 백업 실패:', error.message);
    return null;
  }
}

// 백업 현황 출력
function printBackupSummary(systemStatus, communicationStats, masterAIStatus) {
  console.log('\n📊 백업된 시스템 현황:');
  console.log(`   전체 AI: ${systemStatus.total_ais}명`);
  console.log(`   활성 AI: ${systemStatus.active_ais}명`);
  console.log(`   마스터 AI: ${systemStatus.master_ais}명`);
  console.log(`   총 통신 활동: ${communicationStats.total_activities}건`);
  console.log(`   마스터 AI 활성: ${masterAIStatus.filter(m => m.status === 'active').length}/${masterAIStatus.length}명`);
}

// 오래된 백업 정리 (30개 초과시 삭제)
function cleanupOldBackups() {
  try {
    const oldBackups = db.prepare(`
      SELECT id, full_backup_path 
      FROM system_history_backup 
      WHERE backup_type = 'regular_20min'
      ORDER BY backup_timestamp DESC 
      LIMIT -1 OFFSET 30
    `).all();
    
    for (const backup of oldBackups) {
      // 파일 삭제
      if (backup.full_backup_path && fs.existsSync(backup.full_backup_path)) {
        fs.unlinkSync(backup.full_backup_path);
      }
      
      // 데이터베이스 레코드 삭제
      db.prepare('DELETE FROM system_history_backup WHERE id = ?').run(backup.id);
    }
    
    if (oldBackups.length > 0) {
      console.log(`🧹 오래된 백업 ${oldBackups.length}개 정리 완료`);
    }
  } catch (error) {
    console.error('백업 정리 중 오류:', error.message);
  }
}

// 백업 히스토리 조회
function showBackupHistory() {
  const recentBackups = db.prepare(`
    SELECT 
      backup_timestamp, backup_type, total_ais, total_activities,
      backup_size_mb, backup_duration_ms, backup_status
    FROM system_history_backup
    ORDER BY backup_timestamp DESC
    LIMIT 10
  `).all();
  
  console.log('\n📚 최근 백업 히스토리:');
  console.log('='.repeat(80));
  
  for (const backup of recentBackups) {
    const time = new Date(backup.backup_timestamp).toLocaleString();
    const status = backup.backup_status === 'completed' ? '✅' : '❌';
    console.log(`${status} ${time} | AI: ${backup.total_ais}명 | 활동: ${backup.total_activities}건 | ${backup.backup_size_mb}MB | ${backup.backup_duration_ms}ms`);
  }
}

// 즉시 백업 실행 (테스트용)
console.log('🔄 시스템 초기화 중...');
performHistoryBackup();

// 20분마다 정기 백업 스케줄링 (cron: 0,20,40분)
console.log('\n⏰ 20분 간격 정기 백업 스케줄 시작...');
console.log('📅 실행 시간: 매 시간 0분, 20분, 40분');

cron.schedule('0,20,40 * * * *', () => {
  performHistoryBackup();
  
  // 매 시간마다 오래된 백업 정리
  if (new Date().getMinutes() === 0) {
    cleanupOldBackups();
  }
});

// 10분마다 백업 히스토리 출력
cron.schedule('*/10 * * * *', () => {
  showBackupHistory();
});

console.log('\n✅ 20분마다 역사 저장 시스템 가동 중!');
console.log('📁 백업 저장 위치:', backupDir);
console.log('🔄 다음 백업까지 최대 20분 대기...');