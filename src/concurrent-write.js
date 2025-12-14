/**
 * kimdb 동시 쓰기 개선 모듈
 * v6.0.0 호환
 */

// ===== Write Queue (동시 쓰기 직렬화) =====
const writeQueue = [];
let isProcessingQueue = false;

export async function enqueueWrite(db, operation) {
  return new Promise((resolve, reject) => {
    writeQueue.push({ db, operation, resolve, reject });
    processWriteQueue();
  });
}

async function processWriteQueue() {
  if (isProcessingQueue || writeQueue.length === 0) return;
  
  isProcessingQueue = true;
  
  while (writeQueue.length > 0) {
    const { db, operation, resolve, reject } = writeQueue.shift();
    
    try {
      const result = await executeWithRetry(db, operation);
      resolve(result);
    } catch (e) {
      reject(e);
    }
  }
  
  isProcessingQueue = false;
}

// ===== Retry Logic =====
const MAX_RETRIES = 3;
const RETRY_DELAY = 50;

async function executeWithRetry(db, operation, retries = 0) {
  try {
    return operation(db);
  } catch (e) {
    if (e.code === 'SQLITE_BUSY' && retries < MAX_RETRIES) {
      await new Promise(r => setTimeout(r, RETRY_DELAY * (retries + 1)));
      return executeWithRetry(db, operation, retries + 1);
    }
    throw e;
  }
}

// ===== Read Pool =====
export function createReadPool(Database, dbPath, size = 4) {
  const pool = [];
  for (let i = 0; i < size; i++) {
    const readDb = new Database(dbPath, { readonly: true });
    readDb.pragma('cache_size = 5000');
    readDb.pragma('mmap_size = 268435456');
    pool.push({ db: readDb, busy: false });
  }
  return pool;
}

export function acquireReader(pool) {
  const conn = pool.find(c => !c.busy);
  if (conn) {
    conn.busy = true;
    return conn;
  }
  return pool[0];
}

export function releaseReader(conn) {
  conn.busy = false;
}

// ===== Batch Operations =====
export function runBatch(db, operations) {
  return enqueueWrite(db, (db) => {
    const tx = db.transaction(() => {
      const results = [];
      for (const op of operations) {
        results.push(op(db));
      }
      return results;
    });
    return tx();
  });
}

export function getQueueLength() {
  return writeQueue.length;
}

export function getQueueStatus() {
  return {
    pending: writeQueue.length,
    processing: isProcessingQueue
  };
}
