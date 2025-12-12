/**
 * kimdb v5.0.0 - Production-Ready Real-time Database
 *
 * 외부 의존: fastify, @fastify/cors, @fastify/websocket, better-sqlite3
 *
 * 특징:
 * - CRDT v2 엔진 (LWW-Set, 3-way merge, Rich Text)
 * - Op batching + Delta compression
 * - Snapshot 기반 초기 로드
 * - Collaborative Cursor
 * - 자동 충돌 해결 (UI 팝업 없음)
 * - 100만 유저 대응 설계
 */

import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import Database from "better-sqlite3";
import crypto from "crypto";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { mkdirSync, existsSync, readdirSync, statSync, unlinkSync } from "fs";
import {
  VectorClock,
  CRDTDocument,
  OpBatcher,
  SnapshotManager,
  LWWMap,
  UndoManager,
  PresenceManager
} from "./crdt/v2/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 40000;
const VERSION = "5.1.0";
const API_KEY = process.env.KIMDB_API_KEY || "kimdb-dev-key-2025";

const DB_DIR = join(__dirname, "..", "shared_database");
const DB_PATH = join(DB_DIR, "code_team_ai.db");
const BACKUP_DIR = join(__dirname, "..", "backups");

if (!existsSync(DB_DIR)) mkdirSync(DB_DIR, { recursive: true });
if (!existsSync(BACKUP_DIR)) mkdirSync(BACKUP_DIR, { recursive: true });

// ===== Database Setup =====
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("synchronous = NORMAL");
db.pragma("cache_size = 10000");
db.pragma("temp_store = MEMORY");
db.pragma("mmap_size = 268435456");
db.pragma("busy_timeout = 5000");
db.pragma("wal_autocheckpoint = 1000");

// ===== 메트릭 =====
const metrics = {
  startTime: Date.now(),
  requests: { total: 0, success: 0, error: 0 },
  websocket: { connections: 0, messages: 0, broadcasts: 0 },
  sync: { operations: 0, conflicts: 0 },
  backups: { total: 0, lastAt: null },
  checkpoints: { total: 0, lastAt: null }
};

// ===== WebSocket 클라이언트 관리 =====
const clients = new Map(); // clientId -> { socket, subscriptions: Set<collection>, clock: VectorClock }
const subscriptions = new Map(); // collection -> Set<clientId>

// ===== Presence 관리 =====
const presenceManagers = new Map(); // collection:docId -> PresenceManager
const clientPresence = new Map(); // clientId -> { collection, docId, nodeId }

function getPresenceManager(collection, docId) {
  const key = `${collection}:${docId}`;
  if (!presenceManagers.has(key)) {
    presenceManagers.set(key, new PresenceManager(`server_${key}`, {
      heartbeatInterval: 10000,
      timeout: 30000
    }));
  }
  return presenceManagers.get(key);
}

// ===== Undo 매니저 관리 (클라이언트별) =====
const clientUndoManagers = new Map(); // clientId:collection:docId -> UndoManager

function getClientUndoManager(clientId, collection, docId) {
  const key = `${clientId}:${collection}:${docId}`;
  if (!clientUndoManagers.has(key)) {
    clientUndoManagers.set(key, new UndoManager({
      maxHistory: 100,
      captureTimeout: 500
    }));
  }
  return clientUndoManagers.get(key);
}

// ===== CRDT 문서 관리 =====
const crdtDocs = new Map(); // docId -> CRDTDocument
const docSnapshots = new Map(); // docId -> SnapshotManager

// 서버 노드 ID
const SERVER_NODE_ID = `server_${crypto.randomBytes(4).toString("hex")}`;

// Op Batcher (클라이언트별)
const clientBatchers = new Map(); // clientId -> OpBatcher

function getOpBatcher(clientId, socket) {
  if (!clientBatchers.has(clientId)) {
    clientBatchers.set(clientId, new OpBatcher({
      batchSize: 50,
      batchTimeout: 100,
      onFlush: (ops) => {
        if (socket.readyState === 1) {
          socket.send(JSON.stringify({
            type: 'batch_ops',
            ops: OpBatcher.serialize(ops),
            timestamp: Date.now()
          }));
        }
      }
    }));
  }
  return clientBatchers.get(clientId);
}

function getCRDTDoc(collection, docId) {
  const key = `${collection}:${docId}`;
  if (!crdtDocs.has(key)) {
    // DB에서 복원 시도
    const saved = loadCRDTFromDB(collection, docId);
    if (saved) {
      crdtDocs.set(key, CRDTDocument.fromJSON(saved));
    } else {
      crdtDocs.set(key, new CRDTDocument(SERVER_NODE_ID, docId));
    }
  }
  return crdtDocs.get(key);
}

function loadCRDTFromDB(collection, docId) {
  try {
    const col = ensureCollection(collection);
    const row = db.prepare(`SELECT crdt_state FROM ${col} WHERE id = ?`).get(docId);
    if (row && row.crdt_state) {
      return JSON.parse(row.crdt_state);
    }
  } catch (e) {}
  return null;
}

function saveCRDTToDB(collection, docId, doc) {
  try {
    const col = ensureCollection(collection);
    const data = JSON.stringify(doc.toObject());
    const crdtState = JSON.stringify(doc.toJSON());

    db.prepare(`
      INSERT INTO ${col} (id, data, crdt_state, _version, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        data = excluded.data,
        crdt_state = excluded.crdt_state,
        _version = _version + 1,
        updated_at = CURRENT_TIMESTAMP
    `).run(docId, data, crdtState, doc.version);
  } catch (e) {
    console.error("[kimdb] CRDT save error:", e.message);
  }
}

function generateClientId() {
  return crypto.randomBytes(8).toString("hex");
}

function broadcast(collection, event, data, excludeClient = null) {
  const subs = subscriptions.get(collection);
  if (!subs) return 0;

  let count = 0;
  const message = JSON.stringify({
    type: "sync",
    collection,
    event,
    data,
    timestamp: Date.now()
  });

  for (const clientId of subs) {
    if (clientId === excludeClient) continue;
    const client = clients.get(clientId);
    if (client && client.socket.readyState === 1) {
      client.socket.send(message);
      count++;
    }
  }

  metrics.websocket.broadcasts++;
  return count;
}

// Op batching을 사용한 브로드캐스트
function broadcastOp(collection, op, excludeClient = null) {
  const subs = subscriptions.get(collection);
  if (!subs) return 0;

  let count = 0;
  for (const clientId of subs) {
    if (clientId === excludeClient) continue;
    const client = clients.get(clientId);
    if (client && client.socket.readyState === 1) {
      const batcher = getOpBatcher(clientId, client.socket);
      batcher.add(op);
      count++;
    }
  }

  metrics.websocket.broadcasts++;
  return count;
}

// Snapshot 기반 초기 로드
function getDocWithSnapshot(collection, docId) {
  const doc = getCRDTDoc(collection, docId);
  const key = `${collection}:${docId}`;

  if (!docSnapshots.has(key)) {
    docSnapshots.set(key, new SnapshotManager({ snapshotInterval: 500 }));
  }

  const sm = docSnapshots.get(key);
  const snapshot = sm.getLatestSnapshot();

  return { doc, snapshot, snapshotManager: sm };
}

// ===== 테이블 자동 생성 =====
function ensureSchema() {
  db.exec(`
    -- 시스템 테이블
    CREATE TABLE IF NOT EXISTS _collections (
      name TEXT PRIMARY KEY,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS _sync_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      collection TEXT NOT NULL,
      doc_id TEXT NOT NULL,
      operation TEXT NOT NULL,
      data TEXT,
      client_id TEXT,
      timestamp INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_sync_log_collection ON _sync_log(collection, timestamp);
    CREATE INDEX IF NOT EXISTS idx_sync_log_doc ON _sync_log(collection, doc_id);

    CREATE TABLE IF NOT EXISTS _conflicts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      collection TEXT NOT NULL,
      doc_id TEXT NOT NULL,
      local_data TEXT,
      remote_data TEXT,
      resolved INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- 기존 테이블
    CREATE TABLE IF NOT EXISTS search_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      query TEXT,
      results_count INTEGER,
      search_time_ms INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS master_ai_systems (
      id TEXT PRIMARY KEY,
      name TEXT,
      type TEXT,
      config TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ai_storage (
      id TEXT PRIMARY KEY,
      system_id TEXT,
      key TEXT,
      value TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS wiki_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      icon TEXT,
      display_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS wiki_documents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      content TEXT NOT NULL,
      summary TEXT,
      display_order INTEGER DEFAULT 0,
      views INTEGER DEFAULT 0,
      category_id TEXT,
      parent_id TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      _version INTEGER DEFAULT 1,
      _updated_by TEXT
    );

    CREATE TABLE IF NOT EXISTS wiki_edit_requests (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      author_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      summary TEXT,
      edit_summary TEXT NOT NULL,
      status TEXT DEFAULT 'PENDING',
      reviewed_by_id TEXT,
      review_note TEXT,
      reviewed_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS glossary_terms (
      id TEXT PRIMARY KEY,
      term TEXT NOT NULL,
      definition TEXT NOT NULL,
      category TEXT,
      related_terms TEXT,
      unit TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS api_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      method TEXT,
      path TEXT,
      status INTEGER,
      duration_ms INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  try {
    db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS fts_documents USING fts5(
        doc_id, title, content, tags, category,
        tokenize='unicode61'
      );
    `);
  } catch (e) {}

  console.log("[kimdb] Schema ensured");
}
ensureSchema();

// ===== Prepared Statements =====
const stmt = {
  // Sync
  insertSyncLog: db.prepare(`
    INSERT INTO _sync_log (collection, doc_id, operation, data, client_id, timestamp)
    VALUES (?, ?, ?, ?, ?, ?)
  `),
  getSyncLogAfter: db.prepare(`
    SELECT * FROM _sync_log WHERE collection = ? AND timestamp > ? ORDER BY timestamp
  `),
  getLatestSync: db.prepare(`
    SELECT MAX(timestamp) as ts FROM _sync_log WHERE collection = ?
  `),

  // Collections (동적 컬렉션)
  listCollections: db.prepare(`SELECT name FROM _collections ORDER BY name`),
  insertCollection: db.prepare(`INSERT OR IGNORE INTO _collections (name) VALUES (?)`),

  // Search
  ftsSearch: db.prepare(`
    SELECT doc_id, title, content, tags, category, bm25(fts_documents) as score
    FROM fts_documents WHERE fts_documents MATCH ? ORDER BY score LIMIT 20
  `),
  insertSearchLog: db.prepare(`
    INSERT INTO search_logs (query, results_count, search_time_ms) VALUES (?, ?, ?)
  `),
  ftsUpsert: db.prepare(`
    INSERT OR REPLACE INTO fts_documents (doc_id, title, content, tags, category) VALUES (?, ?, ?, ?, ?)
  `),
  ftsDelete: db.prepare(`DELETE FROM fts_documents WHERE doc_id = ?`),

  // AI
  getAiSystems: db.prepare(`SELECT * FROM master_ai_systems`),
  getAiStorage: db.prepare(`SELECT * FROM ai_storage LIMIT ? OFFSET ?`),
  countAiStorage: db.prepare(`SELECT COUNT(*) as c FROM ai_storage`),

  // Wiki
  getCategories: db.prepare(`SELECT * FROM wiki_categories ORDER BY display_order`),
  insertCategory: db.prepare(`
    INSERT INTO wiki_categories (id, name, slug, icon, display_order) VALUES (?, ?, ?, ?, ?)
  `),
  getDocuments: db.prepare(`SELECT * FROM wiki_documents ORDER BY display_order LIMIT ? OFFSET ?`),
  getDocumentsByCategory: db.prepare(`
    SELECT * FROM wiki_documents WHERE category_id = ? ORDER BY display_order LIMIT ? OFFSET ?
  `),
  getDocumentBySlug: db.prepare(`SELECT * FROM wiki_documents WHERE slug = ?`),
  getDocumentById: db.prepare(`SELECT * FROM wiki_documents WHERE id = ?`),
  getCategoryById: db.prepare(`SELECT * FROM wiki_categories WHERE id = ?`),
  getChildDocuments: db.prepare(`
    SELECT id, title, slug FROM wiki_documents WHERE parent_id = ? ORDER BY display_order
  `),
  incrementViews: db.prepare(`UPDATE wiki_documents SET views = views + 1 WHERE slug = ?`),
  insertDocument: db.prepare(`
    INSERT INTO wiki_documents (id, title, slug, content, summary, category_id, parent_id, display_order, _version, _updated_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
  `),
  updateDocument: db.prepare(`
    UPDATE wiki_documents SET title = COALESCE(?, title), content = COALESCE(?, content),
    summary = COALESCE(?, summary), display_order = COALESCE(?, display_order),
    updated_at = CURRENT_TIMESTAMP, _version = _version + 1, _updated_by = ? WHERE slug = ?
  `),
  deleteDocument: db.prepare(`DELETE FROM wiki_documents WHERE slug = ?`),

  // Edit Requests
  getEditRequests: db.prepare(`
    SELECT * FROM wiki_edit_requests WHERE status = ? ORDER BY created_at DESC
  `),
  getEditRequestById: db.prepare(`SELECT * FROM wiki_edit_requests WHERE id = ?`),
  insertEditRequest: db.prepare(`
    INSERT INTO wiki_edit_requests (id, document_id, author_id, title, content, summary, edit_summary)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `),
  updateEditRequest: db.prepare(`
    UPDATE wiki_edit_requests SET status = ?, reviewed_by_id = ?, review_note = ?,
    reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `),
  applyEditRequest: db.prepare(`
    UPDATE wiki_documents SET title = ?, content = ?, summary = ?, updated_at = CURRENT_TIMESTAMP, _version = _version + 1 WHERE id = ?
  `),

  // Glossary
  getGlossary: db.prepare(`SELECT * FROM glossary_terms ORDER BY term`),
  getGlossaryByCategory: db.prepare(`SELECT * FROM glossary_terms WHERE category = ? ORDER BY term`),
  insertGlossary: db.prepare(`
    INSERT INTO glossary_terms (id, term, definition, category, related_terms, unit) VALUES (?, ?, ?, ?, ?, ?)
  `),

  // Logging
  insertApiLog: db.prepare(`
    INSERT INTO api_logs (method, path, status, duration_ms) VALUES (?, ?, ?, ?)
  `),
};

console.log("[kimdb] v" + VERSION + " init");

// ===== WAL Checkpoint =====
let checkpointInterval;
function runCheckpoint() {
  try {
    const result = db.pragma("wal_checkpoint(PASSIVE)");
    metrics.checkpoints.total++;
    metrics.checkpoints.lastAt = new Date().toISOString();
    return result;
  } catch (e) {
    console.error("[kimdb] Checkpoint error:", e.message);
    return null;
  }
}
checkpointInterval = setInterval(runCheckpoint, 10 * 60 * 1000);

// ===== 핫백업 =====
async function createBackup() {
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const backupPath = join(BACKUP_DIR, "kimdb_" + ts + ".db");

  try {
    await db.backup(backupPath);
    metrics.backups.total++;
    metrics.backups.lastAt = new Date().toISOString();

    const backups = readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith("kimdb_") && f.endsWith(".db"))
      .sort().reverse();

    if (backups.length > 10) {
      for (const old of backups.slice(10)) {
        unlinkSync(join(BACKUP_DIR, old));
      }
    }

    return { success: true, path: backupPath, timestamp: ts };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ===== SQL 보안 =====
const BLOCKED_PATTERNS = [
  /sqlite_master/i, /sqlite_version/i, /pragma/i,
  /attach/i, /detach/i, /\.databases/i, /\.tables/i
];

function isQuerySafe(sql) {
  if (!sql.trim().toUpperCase().startsWith("SELECT")) {
    return { safe: false, reason: "SELECT only" };
  }
  for (const p of BLOCKED_PATTERNS) {
    if (p.test(sql)) return { safe: false, reason: "Forbidden pattern" };
  }
  return { safe: true };
}

// ===== 동적 컬렉션 CRUD =====
function ensureCollection(name) {
  const safeName = name.replace(/[^a-zA-Z0-9_]/g, "");
  if (safeName !== name || safeName.startsWith("_") || safeName.startsWith("sqlite")) {
    throw new Error("Invalid collection name");
  }

  const exists = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(safeName);
  if (!exists) {
    db.exec(`
      CREATE TABLE ${safeName} (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        crdt_state TEXT,
        _version INTEGER DEFAULT 1,
        _deleted INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
    stmt.insertCollection.run(safeName);
    console.log("[kimdb] Collection created:", safeName);
  } else {
    // crdt_state 컬럼 추가 (기존 테이블 호환)
    try {
      db.exec(`ALTER TABLE ${safeName} ADD COLUMN crdt_state TEXT`);
    } catch (e) {} // 이미 존재하면 무시
  }
  return safeName;
}

function collectionInsert(collection, id, data, clientId = null) {
  const col = ensureCollection(collection);
  const docId = id || crypto.randomUUID();
  const now = Date.now();

  db.prepare(`INSERT INTO ${col} (id, data, _version, created_at, updated_at) VALUES (?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`)
    .run(docId, JSON.stringify(data));

  stmt.insertSyncLog.run(col, docId, "insert", JSON.stringify(data), clientId, now);
  metrics.sync.operations++;

  broadcast(col, "insert", { id: docId, data, _version: 1 }, clientId);

  return { id: docId, _version: 1 };
}

function collectionUpdate(collection, id, data, clientId = null, clientTimestamp = null) {
  const col = ensureCollection(collection);
  const now = Date.now();
  const ts = clientTimestamp || now;

  const existing = db.prepare(`SELECT * FROM ${col} WHERE id = ? AND _deleted = 0`).get(id);
  if (!existing) throw new Error("Document not found");

  const existingData = JSON.parse(existing.data);
  const existingTs = existingData._ts || 0;

  // CRDT LWW: 타임스탬프 비교로 충돌 해결
  if (ts < existingTs) {
    // 클라이언트 데이터가 더 오래됨 - 서버 데이터 유지, 충돌 로그 기록
    metrics.sync.conflicts++;
    return { id, _version: existing._version, conflict: true, serverData: existingData };
  }

  const newVersion = existing._version + 1;
  const merged = { ...existingData, ...data, _ts: ts };

  db.prepare(`UPDATE ${col} SET data = ?, _version = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
    .run(JSON.stringify(merged), newVersion, id);

  stmt.insertSyncLog.run(col, id, "update", JSON.stringify(merged), clientId, now);
  metrics.sync.operations++;

  broadcast(col, "update", { id, data: merged, _version: newVersion, _ts: ts }, clientId);

  return { id, _version: newVersion, _ts: ts };
}

// CRDT 필드별 병합 (LWW-Map)
function collectionMerge(collection, id, fields, clientId = null) {
  const col = ensureCollection(collection);
  const now = Date.now();

  const existing = db.prepare(`SELECT * FROM ${col} WHERE id = ? AND _deleted = 0`).get(id);
  if (!existing) throw new Error("Document not found");

  const existingData = JSON.parse(existing.data);
  const existingFields = existingData._fields || {};
  let hasChanges = false;

  // 필드별 LWW 병합
  // fields: { fieldName: { value: any, ts: number } }
  for (const [key, { value, ts }] of Object.entries(fields)) {
    const existingField = existingFields[key] || { ts: 0 };
    if (ts > existingField.ts) {
      existingData[key] = value;
      existingFields[key] = { ts };
      hasChanges = true;
    } else if (ts < existingField.ts) {
      metrics.sync.conflicts++;
    }
  }

  if (!hasChanges) {
    return { id, _version: existing._version, merged: false };
  }

  existingData._fields = existingFields;
  const newVersion = existing._version + 1;

  db.prepare(`UPDATE ${col} SET data = ?, _version = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
    .run(JSON.stringify(existingData), newVersion, id);

  stmt.insertSyncLog.run(col, id, "merge", JSON.stringify(existingData), clientId, now);
  metrics.sync.operations++;

  broadcast(col, "update", { id, data: existingData, _version: newVersion }, clientId);

  return { id, _version: newVersion, merged: true, data: existingData };
}

function collectionDelete(collection, id, clientId = null) {
  const col = ensureCollection(collection);
  const now = Date.now();

  // Soft delete
  db.prepare(`UPDATE ${col} SET _deleted = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(id);

  stmt.insertSyncLog.run(col, id, "delete", null, clientId, now);
  metrics.sync.operations++;

  broadcast(col, "delete", { id }, clientId);

  return { id, deleted: true };
}

function collectionGet(collection, id) {
  const col = ensureCollection(collection);
  const row = db.prepare(`SELECT * FROM ${col} WHERE id = ? AND _deleted = 0`).get(id);
  if (!row) return null;
  return { id: row.id, data: JSON.parse(row.data), _version: row._version, updated_at: row.updated_at };
}

function collectionList(collection, limit = 50, offset = 0) {
  const col = ensureCollection(collection);
  const rows = db.prepare(`SELECT * FROM ${col} WHERE _deleted = 0 ORDER BY updated_at DESC LIMIT ? OFFSET ?`).all(limit, offset);
  return rows.map(r => ({ id: r.id, data: JSON.parse(r.data), _version: r._version, updated_at: r.updated_at }));
}

function collectionSync(collection, since = 0) {
  const col = ensureCollection(collection);
  const logs = stmt.getSyncLogAfter.all(col, since);
  return logs.map(l => ({
    doc_id: l.doc_id,
    operation: l.operation,
    data: l.data ? JSON.parse(l.data) : null,
    timestamp: l.timestamp
  }));
}

// ===== Fastify Setup =====
const fastify = Fastify({ logger: false });
await fastify.register(cors, { origin: true });
await fastify.register(websocket);

// ===== Request Hooks =====
fastify.addHook("onRequest", async (req) => {
  req.startTime = Date.now();
  metrics.requests.total++;
});

fastify.addHook("onResponse", async (req, reply) => {
  const duration = Date.now() - req.startTime;
  if (reply.statusCode < 400) metrics.requests.success++;
  else metrics.requests.error++;
  if (duration > 1000) console.warn("[kimdb] Slow:", req.method, req.url, duration + "ms");
});

// ===== Auth Middleware =====
const publicPaths = ["/health", "/docs", "/api/stats", "/api/metrics", "/api/collections", "/ws"];
const publicGetPaths = ["/api/wiki/", "/api/search", "/api/ai/"];

fastify.addHook("preHandler", async (req, reply) => {
  const path = req.url.split("?")[0];

  if (publicPaths.some(p => path.startsWith(p))) return;
  if (req.method === "GET" && publicGetPaths.some(p => path.startsWith(p))) return;

  if (["POST", "PUT", "DELETE"].includes(req.method)) {
    const apiKey = req.headers["x-api-key"];
    if (apiKey !== API_KEY) {
      return reply.code(401).send({ success: false, error: "Invalid API key" });
    }
  }
});

// ===== WebSocket Endpoint =====
fastify.register(async function (fastify) {
  fastify.get("/ws", { websocket: true }, (socket, req) => {
    const clientId = generateClientId();
    clients.set(clientId, { socket, subscriptions: new Set() });
    metrics.websocket.connections++;

    console.log("[kimdb] WS connected:", clientId);

    socket.send(JSON.stringify({ type: "connected", clientId }));

    socket.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        metrics.websocket.messages++;

        switch (msg.type) {
          case "subscribe": {
            const col = msg.collection;
            if (!subscriptions.has(col)) subscriptions.set(col, new Set());
            subscriptions.get(col).add(clientId);
            clients.get(clientId).subscriptions.add(col);
            socket.send(JSON.stringify({ type: "subscribed", collection: col }));
            break;
          }

          case "unsubscribe": {
            const col = msg.collection;
            if (subscriptions.has(col)) subscriptions.get(col).delete(clientId);
            clients.get(clientId).subscriptions.delete(col);
            socket.send(JSON.stringify({ type: "unsubscribed", collection: col }));
            break;
          }

          case "sync": {
            const col = msg.collection;
            const since = msg.since || 0;
            const changes = collectionSync(col, since);
            const latest = stmt.getLatestSync.get(col);
            socket.send(JSON.stringify({
              type: "sync_response",
              collection: col,
              changes,
              serverTime: latest?.ts || Date.now()
            }));
            break;
          }

          case "insert": {
            try {
              const result = collectionInsert(msg.collection, msg.id, msg.data, clientId);
              socket.send(JSON.stringify({ type: "insert_ok", ...result }));
            } catch (e) {
              socket.send(JSON.stringify({ type: "error", message: e.message }));
            }
            break;
          }

          case "update": {
            try {
              const result = collectionUpdate(msg.collection, msg.id, msg.data, clientId, msg.timestamp);
              socket.send(JSON.stringify({ type: "update_ok", ...result }));
            } catch (e) {
              socket.send(JSON.stringify({ type: "error", message: e.message }));
            }
            break;
          }

          case "merge": {
            // CRDT 필드별 병합
            try {
              const result = collectionMerge(msg.collection, msg.id, msg.fields, clientId);
              socket.send(JSON.stringify({ type: "merge_ok", ...result }));
            } catch (e) {
              socket.send(JSON.stringify({ type: "error", message: e.message }));
            }
            break;
          }

          case "batch_sync": {
            // 오프라인 큐 일괄 동기화
            const results = [];
            for (const op of msg.operations || []) {
              try {
                let result;
                switch (op.type) {
                  case "insert":
                    result = collectionInsert(op.collection, op.id, op.data, clientId);
                    break;
                  case "update":
                    result = collectionUpdate(op.collection, op.id, op.data, clientId, op.timestamp);
                    break;
                  case "merge":
                    result = collectionMerge(op.collection, op.id, op.fields, clientId);
                    break;
                  case "delete":
                    result = collectionDelete(op.collection, op.id, clientId);
                    break;
                }
                results.push({ success: true, ...result, opId: op.opId });
              } catch (e) {
                results.push({ success: false, error: e.message, opId: op.opId });
              }
            }
            socket.send(JSON.stringify({ type: "batch_sync_ok", results }));
            break;
          }

          case "delete": {
            try {
              const result = collectionDelete(msg.collection, msg.id, clientId);
              socket.send(JSON.stringify({ type: "delete_ok", ...result }));
            } catch (e) {
              socket.send(JSON.stringify({ type: "error", message: e.message }));
            }
            break;
          }

          case "ping":
            socket.send(JSON.stringify({ type: "pong", time: Date.now() }));
            break;

          // ===== CRDT v4 Operations =====
          case "crdt_ops": {
            // 클라이언트에서 CRDT 작업 수신
            try {
              const { collection, docId, operations } = msg;
              const doc = getCRDTDoc(collection, docId);

              // 인과적 순서로 작업 적용
              const applied = doc.applyRemoteBatch(operations);
              saveCRDTToDB(collection, docId, doc);

              // 다른 클라이언트에게 브로드캐스트
              const broadcastMsg = JSON.stringify({
                type: "crdt_sync",
                collection,
                docId,
                operations,
                serverTime: Date.now()
              });

              const subs = subscriptions.get(collection);
              if (subs) {
                for (const cid of subs) {
                  if (cid === clientId) continue;
                  const c = clients.get(cid);
                  if (c && c.socket.readyState === 1) {
                    c.socket.send(broadcastMsg);
                  }
                }
              }

              metrics.sync.operations += applied;
              socket.send(JSON.stringify({
                type: "crdt_ops_ok",
                docId,
                applied,
                version: doc.version
              }));
            } catch (e) {
              socket.send(JSON.stringify({ type: "error", message: e.message }));
            }
            break;
          }

          case "crdt_get": {
            // CRDT 문서 전체 상태 요청
            try {
              const { collection, docId } = msg;
              const doc = getCRDTDoc(collection, docId);

              socket.send(JSON.stringify({
                type: "crdt_state",
                collection,
                docId,
                state: doc.toJSON(),
                data: doc.toObject()
              }));
            } catch (e) {
              socket.send(JSON.stringify({ type: "error", message: e.message }));
            }
            break;
          }

          case "crdt_set": {
            // CRDT 필드 설정
            try {
              const { collection, docId, path, value } = msg;
              const doc = getCRDTDoc(collection, docId);
              const op = doc.set(path, value);
              saveCRDTToDB(collection, docId, doc);

              // 브로드캐스트
              const broadcastMsg = JSON.stringify({
                type: "crdt_sync",
                collection,
                docId,
                operations: [op],
                serverTime: Date.now()
              });

              const subs = subscriptions.get(collection);
              if (subs) {
                for (const cid of subs) {
                  if (cid === clientId) continue;
                  const c = clients.get(cid);
                  if (c && c.socket.readyState === 1) {
                    c.socket.send(broadcastMsg);
                  }
                }
              }

              metrics.sync.operations++;
              socket.send(JSON.stringify({
                type: "crdt_set_ok",
                docId,
                op,
                version: doc.version
              }));
            } catch (e) {
              socket.send(JSON.stringify({ type: "error", message: e.message }));
            }
            break;
          }

          case "crdt_list_insert": {
            // CRDT 리스트 삽입
            try {
              const { collection, docId, path, index, value } = msg;
              const doc = getCRDTDoc(collection, docId);
              const op = doc.listInsert(path, index, value);
              saveCRDTToDB(collection, docId, doc);

              // 브로드캐스트
              const broadcastMsg = JSON.stringify({
                type: "crdt_sync",
                collection,
                docId,
                operations: [op],
                serverTime: Date.now()
              });

              const subs = subscriptions.get(collection);
              if (subs) {
                for (const cid of subs) {
                  if (cid === clientId) continue;
                  const c = clients.get(cid);
                  if (c && c.socket.readyState === 1) {
                    c.socket.send(broadcastMsg);
                  }
                }
              }

              metrics.sync.operations++;
              socket.send(JSON.stringify({
                type: "crdt_list_insert_ok",
                docId,
                op
              }));
            } catch (e) {
              socket.send(JSON.stringify({ type: "error", message: e.message }));
            }
            break;
          }

          case "crdt_list_delete": {
            // CRDT 리스트 삭제
            try {
              const { collection, docId, path, index } = msg;
              const doc = getCRDTDoc(collection, docId);
              const op = doc.listDelete(path, index);
              if (op) {
                saveCRDTToDB(collection, docId, doc);

                // 브로드캐스트
                const broadcastMsg = JSON.stringify({
                  type: "crdt_sync",
                  collection,
                  docId,
                  operations: [op],
                  serverTime: Date.now()
                });

                const subs = subscriptions.get(collection);
                if (subs) {
                  for (const cid of subs) {
                    if (cid === clientId) continue;
                    const c = clients.get(cid);
                    if (c && c.socket.readyState === 1) {
                      c.socket.send(broadcastMsg);
                    }
                  }
                }

                metrics.sync.operations++;
              }
              socket.send(JSON.stringify({
                type: "crdt_list_delete_ok",
                docId,
                op
              }));
            } catch (e) {
              socket.send(JSON.stringify({ type: "error", message: e.message }));
            }
            break;
          }

          // ===== v5.0.0 Features =====
          case "get_snapshot": {
            // Snapshot 기반 초기 로드
            try {
              const { collection, docId } = msg;
              const { doc, snapshot, snapshotManager } = getDocWithSnapshot(collection, docId);

              socket.send(JSON.stringify({
                type: "snapshot",
                collection,
                docId,
                snapshot: snapshot ? snapshot.state : doc.toJSON(),
                version: snapshot ? snapshot.version : doc.version,
                timestamp: Date.now()
              }));
            } catch (e) {
              socket.send(JSON.stringify({ type: "error", message: e.message }));
            }
            break;
          }

          case "rich_insert": {
            // Rich Text 삽입
            try {
              const { collection, docId, path, index, char, format } = msg;
              const doc = getCRDTDoc(collection, docId);
              const op = doc.richInsert(path, index, char, format || {});
              saveCRDTToDB(collection, docId, doc);
              broadcastOp(collection, op, clientId);
              socket.send(JSON.stringify({ type: "rich_insert_ok", docId, op }));
            } catch (e) {
              socket.send(JSON.stringify({ type: "error", message: e.message }));
            }
            break;
          }

          case "rich_delete": {
            // Rich Text 삭제
            try {
              const { collection, docId, path, index } = msg;
              const doc = getCRDTDoc(collection, docId);
              const op = doc.richDelete(path, index);
              if (op) {
                saveCRDTToDB(collection, docId, doc);
                broadcastOp(collection, op, clientId);
              }
              socket.send(JSON.stringify({ type: "rich_delete_ok", docId, op }));
            } catch (e) {
              socket.send(JSON.stringify({ type: "error", message: e.message }));
            }
            break;
          }

          case "rich_format": {
            // Rich Text 서식 적용
            try {
              const { collection, docId, path, start, end, format } = msg;
              const doc = getCRDTDoc(collection, docId);
              const ops = doc.richFormat(path, start, end, format);
              saveCRDTToDB(collection, docId, doc);
              for (const op of ops) broadcastOp(collection, op, clientId);
              socket.send(JSON.stringify({ type: "rich_format_ok", docId, ops }));
            } catch (e) {
              socket.send(JSON.stringify({ type: "error", message: e.message }));
            }
            break;
          }

          case "rich_embed": {
            // Rich Text 임베드 삽입
            try {
              const { collection, docId, path, index, embedType, embedData } = msg;
              const doc = getCRDTDoc(collection, docId);
              const op = doc.richInsertEmbed(path, index, embedType, embedData);
              saveCRDTToDB(collection, docId, doc);
              broadcastOp(collection, op, clientId);
              socket.send(JSON.stringify({ type: "rich_embed_ok", docId, op }));
            } catch (e) {
              socket.send(JSON.stringify({ type: "error", message: e.message }));
            }
            break;
          }

          case "rich_get": {
            // Rich Text Delta 가져오기
            try {
              const { collection, docId, path } = msg;
              const doc = getCRDTDoc(collection, docId);
              const delta = doc.richGetDelta(path);
              const text = doc.richGetText(path);
              socket.send(JSON.stringify({ type: "rich_data", docId, path, delta, text }));
            } catch (e) {
              socket.send(JSON.stringify({ type: "error", message: e.message }));
            }
            break;
          }

          case "cursor_update": {
            // 커서 위치 업데이트
            try {
              const { collection, docId, position, selection, color, name } = msg;
              const doc = getCRDTDoc(collection, docId);
              const op = doc.setCursor(position, selection);
              op.color = color;
              op.name = name;

              // 커서는 batching 없이 즉시 브로드캐스트
              const cursorMsg = JSON.stringify({
                type: "cursor_sync",
                collection,
                docId,
                cursor: op
              });

              const subs = subscriptions.get(collection);
              if (subs) {
                for (const cid of subs) {
                  if (cid === clientId) continue;
                  const c = clients.get(cid);
                  if (c && c.socket.readyState === 1) {
                    c.socket.send(cursorMsg);
                  }
                }
              }
            } catch (e) {
              socket.send(JSON.stringify({ type: "error", message: e.message }));
            }
            break;
          }

          case "get_cursors": {
            // 현재 활성 커서들 가져오기
            try {
              const { collection, docId } = msg;
              const doc = getCRDTDoc(collection, docId);
              const cursors = doc.getRemoteCursors();
              socket.send(JSON.stringify({ type: "cursors", collection, docId, cursors }));
            } catch (e) {
              socket.send(JSON.stringify({ type: "error", message: e.message }));
            }
            break;
          }

          case "set_add": {
            // LWW-Set 추가
            try {
              const { collection, docId, path, value } = msg;
              const doc = getCRDTDoc(collection, docId);
              const op = doc.setAdd(path, value);
              saveCRDTToDB(collection, docId, doc);
              broadcastOp(collection, op, clientId);
              socket.send(JSON.stringify({ type: "set_add_ok", docId, op }));
            } catch (e) {
              socket.send(JSON.stringify({ type: "error", message: e.message }));
            }
            break;
          }

          case "set_remove": {
            // LWW-Set 제거
            try {
              const { collection, docId, path, value } = msg;
              const doc = getCRDTDoc(collection, docId);
              const op = doc.setRemove(path, value);
              saveCRDTToDB(collection, docId, doc);
              broadcastOp(collection, op, clientId);
              socket.send(JSON.stringify({ type: "set_remove_ok", docId, op }));
            } catch (e) {
              socket.send(JSON.stringify({ type: "error", message: e.message }));
            }
            break;
          }

          case "set_get": {
            // LWW-Set 조회
            try {
              const { collection, docId, path } = msg;
              const doc = getCRDTDoc(collection, docId);
              const values = doc.setGet(path);
              socket.send(JSON.stringify({ type: "set_data", docId, path, values }));
            } catch (e) {
              socket.send(JSON.stringify({ type: "error", message: e.message }));
            }
            break;
          }

          case "merge_remote": {
            // 3-way merge (오프라인 복귀 시)
            try {
              const { collection, docId, remoteState } = msg;
              const doc = getCRDTDoc(collection, docId);
              const remoteDoc = CRDTDocument.fromJSON(remoteState);
              doc.merge(remoteDoc);
              saveCRDTToDB(collection, docId, doc);

              socket.send(JSON.stringify({
                type: "merge_ok",
                docId,
                state: doc.toJSON(),
                version: doc.version
              }));
            } catch (e) {
              socket.send(JSON.stringify({ type: "error", message: e.message }));
            }
            break;
          }

          // ===== Undo/Redo Operations =====
          case "undo_capture": {
            // Undo 스택에 작업 저장
            try {
              const { collection, docId, op, previousValue } = msg;
              const undoMgr = getClientUndoManager(clientId, collection, docId);
              undoMgr.capture(op, previousValue);
              socket.send(JSON.stringify({
                type: "undo_capture_ok",
                state: undoMgr.state
              }));
            } catch (e) {
              socket.send(JSON.stringify({ type: "error", message: e.message }));
            }
            break;
          }

          case "undo": {
            // Undo 실행
            try {
              const { collection, docId } = msg;
              const undoMgr = getClientUndoManager(clientId, collection, docId);
              const inverseOps = undoMgr.undo();

              if (!inverseOps || inverseOps.length === 0) {
                socket.send(JSON.stringify({ type: "undo_empty" }));
                break;
              }

              // 역연산 적용 - clock과 opId가 없으면 생성
              const doc = getCRDTDoc(collection, docId);
              for (const op of inverseOps) {
                // clock이 없으면 현재 문서의 clock 사용
                if (!op.clock) {
                  op.clock = doc.clock.tick().toJSON();
                }
                // opId가 없으면 생성
                if (!op.opId) {
                  op.opId = `undo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
                }
                doc.applyRemote(op);
              }
              saveCRDTToDB(collection, docId, doc);

              // 브로드캐스트 (다른 클라이언트에게 역연산 전파)
              const broadcastMsg = JSON.stringify({
                type: "crdt_sync",
                collection,
                docId,
                operations: inverseOps,
                source: "undo",
                serverTime: Date.now()
              });

              const subs = subscriptions.get(collection);
              if (subs) {
                for (const cid of subs) {
                  if (cid === clientId) continue;
                  const c = clients.get(cid);
                  if (c && c.socket.readyState === 1) {
                    c.socket.send(broadcastMsg);
                  }
                }
              }

              socket.send(JSON.stringify({
                type: "undo_ok",
                docId,
                operations: inverseOps,
                state: undoMgr.state,
                docVersion: doc.version
              }));
            } catch (e) {
              socket.send(JSON.stringify({ type: "error", message: e.message }));
            }
            break;
          }

          case "redo": {
            // Redo 실행
            try {
              const { collection, docId } = msg;
              const undoMgr = getClientUndoManager(clientId, collection, docId);
              const ops = undoMgr.redo();

              if (!ops || ops.length === 0) {
                socket.send(JSON.stringify({ type: "redo_empty" }));
                break;
              }

              // 원래 작업 재적용 - clock과 opId가 없으면 생성
              const doc = getCRDTDoc(collection, docId);
              for (const op of ops) {
                if (!op.clock) {
                  op.clock = doc.clock.tick().toJSON();
                }
                if (!op.opId) {
                  op.opId = `redo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
                }
                doc.applyRemote(op);
              }
              saveCRDTToDB(collection, docId, doc);

              // 브로드캐스트
              const broadcastMsg = JSON.stringify({
                type: "crdt_sync",
                collection,
                docId,
                operations: ops,
                source: "redo",
                serverTime: Date.now()
              });

              const subs = subscriptions.get(collection);
              if (subs) {
                for (const cid of subs) {
                  if (cid === clientId) continue;
                  const c = clients.get(cid);
                  if (c && c.socket.readyState === 1) {
                    c.socket.send(broadcastMsg);
                  }
                }
              }

              socket.send(JSON.stringify({
                type: "redo_ok",
                docId,
                operations: ops,
                state: undoMgr.state,
                docVersion: doc.version
              }));
            } catch (e) {
              socket.send(JSON.stringify({ type: "error", message: e.message }));
            }
            break;
          }

          case "undo_state": {
            // Undo/Redo 상태 조회
            try {
              const { collection, docId } = msg;
              const undoMgr = getClientUndoManager(clientId, collection, docId);
              socket.send(JSON.stringify({
                type: "undo_state",
                docId,
                canUndo: undoMgr.canUndo(),
                canRedo: undoMgr.canRedo(),
                state: undoMgr.state
              }));
            } catch (e) {
              socket.send(JSON.stringify({ type: "error", message: e.message }));
            }
            break;
          }

          case "undo_clear": {
            // Undo 히스토리 클리어
            try {
              const { collection, docId } = msg;
              const undoMgr = getClientUndoManager(clientId, collection, docId);
              undoMgr.clear();
              socket.send(JSON.stringify({ type: "undo_clear_ok" }));
            } catch (e) {
              socket.send(JSON.stringify({ type: "error", message: e.message }));
            }
            break;
          }

          // ===== Presence Operations =====
          case "presence_join": {
            // 문서에 참여 (Presence 시작)
            try {
              const { collection, docId, user } = msg;
              const pm = getPresenceManager(collection, docId);

              // 클라이언트 presence 정보 저장
              const nodeId = `client_${clientId}`;
              clientPresence.set(clientId, { collection, docId, nodeId });

              // 유저 정보 추가
              pm.users.set(nodeId, {
                ...user,
                nodeId,
                lastSeen: Date.now()
              });

              // 현재 온라인 유저 목록 전송
              const onlineUsers = [];
              for (const [nid, u] of pm.users) {
                onlineUsers.push({ nodeId: nid, ...u });
              }

              // 다른 클라이언트들에게 알림
              const joinMsg = JSON.stringify({
                type: "presence_joined",
                collection,
                docId,
                user: { nodeId, ...user },
                timestamp: Date.now()
              });

              const subs = subscriptions.get(collection);
              if (subs) {
                for (const cid of subs) {
                  if (cid === clientId) continue;
                  const c = clients.get(cid);
                  if (c && c.socket.readyState === 1) {
                    c.socket.send(joinMsg);
                  }
                }
              }

              socket.send(JSON.stringify({
                type: "presence_join_ok",
                nodeId,
                users: onlineUsers
              }));
            } catch (e) {
              socket.send(JSON.stringify({ type: "error", message: e.message }));
            }
            break;
          }

          case "presence_update": {
            // Presence 업데이트 (heartbeat 포함)
            try {
              const { collection, docId, user, cursor } = msg;
              const pm = getPresenceManager(collection, docId);
              const presence = clientPresence.get(clientId);

              if (!presence) {
                socket.send(JSON.stringify({ type: "error", message: "Not joined" }));
                break;
              }

              const userInfo = pm.users.get(presence.nodeId);
              if (userInfo) {
                Object.assign(userInfo, user, { cursor, lastSeen: Date.now() });
              }

              // 브로드캐스트
              const updateMsg = JSON.stringify({
                type: "presence_updated",
                collection,
                docId,
                nodeId: presence.nodeId,
                user: { ...userInfo },
                timestamp: Date.now()
              });

              const subs = subscriptions.get(collection);
              if (subs) {
                for (const cid of subs) {
                  if (cid === clientId) continue;
                  const c = clients.get(cid);
                  if (c && c.socket.readyState === 1) {
                    c.socket.send(updateMsg);
                  }
                }
              }

              socket.send(JSON.stringify({ type: "presence_update_ok" }));
            } catch (e) {
              socket.send(JSON.stringify({ type: "error", message: e.message }));
            }
            break;
          }

          case "presence_cursor": {
            // 커서 위치만 업데이트 (고빈도)
            try {
              const { collection, docId, position, selection } = msg;
              const pm = getPresenceManager(collection, docId);
              const presence = clientPresence.get(clientId);

              if (!presence) break;

              const userInfo = pm.users.get(presence.nodeId);
              if (userInfo) {
                userInfo.cursor = { position, selection };
                userInfo.lastSeen = Date.now();
              }

              // 커서는 즉시 브로드캐스트 (batching 없음)
              const cursorMsg = JSON.stringify({
                type: "presence_cursor_moved",
                collection,
                docId,
                nodeId: presence.nodeId,
                cursor: { position, selection },
                timestamp: Date.now()
              });

              const subs = subscriptions.get(collection);
              if (subs) {
                for (const cid of subs) {
                  if (cid === clientId) continue;
                  const c = clients.get(cid);
                  if (c && c.socket.readyState === 1) {
                    c.socket.send(cursorMsg);
                  }
                }
              }
            } catch (e) {
              // 커서 업데이트 실패는 무시 (고빈도 작업)
            }
            break;
          }

          case "presence_leave": {
            // 문서에서 나가기
            try {
              const { collection, docId } = msg;
              const pm = getPresenceManager(collection, docId);
              const presence = clientPresence.get(clientId);

              if (presence) {
                pm.users.delete(presence.nodeId);
                clientPresence.delete(clientId);

                // 브로드캐스트
                const leaveMsg = JSON.stringify({
                  type: "presence_left",
                  collection,
                  docId,
                  nodeId: presence.nodeId,
                  timestamp: Date.now()
                });

                const subs = subscriptions.get(collection);
                if (subs) {
                  for (const cid of subs) {
                    if (cid === clientId) continue;
                    const c = clients.get(cid);
                    if (c && c.socket.readyState === 1) {
                      c.socket.send(leaveMsg);
                    }
                  }
                }
              }

              socket.send(JSON.stringify({ type: "presence_leave_ok" }));
            } catch (e) {
              socket.send(JSON.stringify({ type: "error", message: e.message }));
            }
            break;
          }

          case "presence_get": {
            // 현재 접속자 목록 조회
            try {
              const { collection, docId } = msg;
              const pm = getPresenceManager(collection, docId);

              // 타임아웃된 유저 정리
              const now = Date.now();
              for (const [nodeId, user] of pm.users) {
                if (now - user.lastSeen > pm.timeout) {
                  pm.users.delete(nodeId);
                }
              }

              const users = [];
              for (const [nodeId, user] of pm.users) {
                users.push({ nodeId, ...user });
              }

              socket.send(JSON.stringify({
                type: "presence_users",
                collection,
                docId,
                users,
                count: users.length
              }));
            } catch (e) {
              socket.send(JSON.stringify({ type: "error", message: e.message }));
            }
            break;
          }
        }
      } catch (e) {
        socket.send(JSON.stringify({ type: "error", message: e.message }));
      }
    });

    socket.on("close", () => {
      const client = clients.get(clientId);
      if (client) {
        for (const col of client.subscriptions) {
          if (subscriptions.has(col)) subscriptions.get(col).delete(clientId);
        }
      }
      clients.delete(clientId);

      // Op batcher 정리
      const batcher = clientBatchers.get(clientId);
      if (batcher) {
        batcher.flush(); // 남은 ops 전송
        clientBatchers.delete(clientId);
      }

      // Presence 정리 - 연결 종료 시 자동으로 나감 처리
      const presence = clientPresence.get(clientId);
      if (presence) {
        const pm = getPresenceManager(presence.collection, presence.docId);
        pm.users.delete(presence.nodeId);
        clientPresence.delete(clientId);

        // 다른 클라이언트들에게 나감 알림
        const leaveMsg = JSON.stringify({
          type: "presence_left",
          collection: presence.collection,
          docId: presence.docId,
          nodeId: presence.nodeId,
          timestamp: Date.now()
        });

        const subs = subscriptions.get(presence.collection);
        if (subs) {
          for (const cid of subs) {
            const c = clients.get(cid);
            if (c && c.socket.readyState === 1) {
              c.socket.send(leaveMsg);
            }
          }
        }
      }

      // Undo 매니저 정리
      for (const key of clientUndoManagers.keys()) {
        if (key.startsWith(`${clientId}:`)) {
          clientUndoManagers.delete(key);
        }
      }

      metrics.websocket.connections--;
      console.log("[kimdb] WS disconnected:", clientId);
    });
  });
});

// ===== System API =====
fastify.get("/health", async () => ({
  status: "ok", version: VERSION,
  uptime: Math.floor((Date.now() - metrics.startTime) / 1000),
  connections: metrics.websocket.connections
}));

fastify.get("/api/metrics", async () => {
  const dbSize = statSync(DB_PATH).size;
  const walPath = DB_PATH + "-wal";
  const walSize = existsSync(walPath) ? statSync(walPath).size : 0;

  return {
    success: true, version: VERSION,
    uptime_seconds: Math.floor((Date.now() - metrics.startTime) / 1000),
    requests: metrics.requests,
    websocket: metrics.websocket,
    sync: metrics.sync,
    backups: metrics.backups,
    database: { size_mb: (dbSize / 1024 / 1024).toFixed(2), wal_size_mb: (walSize / 1024 / 1024).toFixed(2) }
  };
});

fastify.get("/docs", async (req, reply) => {
  reply.type("text/html").send(`<!DOCTYPE html><html><head><title>kimdb API v${VERSION}</title>
<style>body{font-family:system-ui;max-width:900px;margin:0 auto;padding:20px;background:#1a1a2e;color:#eee}
h1{color:#00d9ff}h2{color:#0abde3;margin-top:30px}.ep{background:#16213e;padding:10px 15px;margin:5px 0;border-radius:6px;font-family:monospace}
.auth{color:#ff6b6b;font-size:12px;margin-left:10px}.new{color:#00ff88;font-size:12px;margin-left:10px}
pre{background:#0a0a14;padding:15px;border-radius:8px;overflow-x:auto;font-size:13px}</style></head>
<body><h1>kimdb v${VERSION}</h1>
<p>실시간 동기화 데이터베이스</p>

<h2>WebSocket</h2>
<div class="ep">ws://host/ws<span class="new">REALTIME</span></div>
<pre>
// 연결
const ws = new WebSocket("wss://db.dclub.kr/ws");

// 구독
ws.send(JSON.stringify({ type: "subscribe", collection: "todos" }));

// 동기화 요청
ws.send(JSON.stringify({ type: "sync", collection: "todos", since: 0 }));

// 데이터 삽입
ws.send(JSON.stringify({ type: "insert", collection: "todos", data: { title: "할일" } }));

// 데이터 수정
ws.send(JSON.stringify({ type: "update", collection: "todos", id: "xxx", data: { done: true } }));

// 실시간 수신
ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  if (msg.type === "sync") {
    // 다른 클라이언트의 변경사항
    console.log(msg.event, msg.data);
  }
};
</pre>

<h2>Collections (동적)</h2>
<div class="ep">GET /api/collections</div>
<div class="ep">GET /api/c/:collection</div>
<div class="ep">GET /api/c/:collection/:id</div>
<div class="ep">POST /api/c/:collection<span class="auth">AUTH</span></div>
<div class="ep">PUT /api/c/:collection/:id<span class="auth">AUTH</span></div>
<div class="ep">DELETE /api/c/:collection/:id<span class="auth">AUTH</span></div>
<div class="ep">GET /api/c/:collection/sync?since=timestamp</div>

<h2>System</h2>
<div class="ep">GET /health</div>
<div class="ep">GET /api/metrics</div>
<div class="ep">POST /api/backup<span class="auth">AUTH</span></div>

<h2>Search</h2>
<div class="ep">GET /api/search?q=검색어</div>

<h2>Wiki (레거시)</h2>
<div class="ep">GET /api/wiki/categories</div>
<div class="ep">GET /api/wiki/documents</div>
<div class="ep">GET /api/wiki/documents/:slug</div>
</body></html>`);
});

// ===== Collections REST API =====
fastify.get("/api/collections", async () => {
  const cols = stmt.listCollections.all();
  return { success: true, collections: cols.map(c => c.name) };
});

fastify.get("/api/c/:collection", async (req) => {
  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;
  try {
    const data = collectionList(req.params.collection, limit, offset);
    return { success: true, count: data.length, data };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

fastify.get("/api/c/:collection/:id", async (req) => {
  try {
    const doc = collectionGet(req.params.collection, req.params.id);
    if (!doc) return { success: false, error: "Not found" };
    return { success: true, ...doc };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

fastify.post("/api/c/:collection", async (req) => {
  try {
    const { id, ...data } = req.body || {};
    const result = collectionInsert(req.params.collection, id, data);
    return { success: true, ...result };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

fastify.put("/api/c/:collection/:id", async (req) => {
  try {
    const result = collectionUpdate(req.params.collection, req.params.id, req.body || {});
    return { success: true, ...result };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

fastify.delete("/api/c/:collection/:id", async (req) => {
  try {
    const result = collectionDelete(req.params.collection, req.params.id);
    return { success: true, ...result };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

fastify.get("/api/c/:collection/sync", async (req) => {
  const since = parseInt(req.query.since) || 0;
  try {
    const changes = collectionSync(req.params.collection, since);
    const latest = stmt.getLatestSync.get(req.params.collection);
    return { success: true, changes, serverTime: latest?.ts || Date.now() };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// ===== Legacy APIs (Wiki, Search, etc.) =====
fastify.get("/api/stats", async () => {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '\\_%' ESCAPE '\\'").all();
  const stats = {};
  for (const t of tables) {
    try { stats[t.name] = db.prepare("SELECT COUNT(*) as c FROM " + t.name).get().c; } catch {}
  }
  return { success: true, version: VERSION, tables: stats };
});

fastify.post("/api/backup", async () => await createBackup());

fastify.get("/api/backups", async () => {
  try {
    const files = readdirSync(BACKUP_DIR).filter(f => f.endsWith(".db")).map(f => {
      const s = statSync(join(BACKUP_DIR, f));
      return { name: f, size_mb: (s.size / 1024 / 1024).toFixed(2), created: s.mtime };
    }).sort((a, b) => new Date(b.created) - new Date(a.created));
    return { success: true, count: files.length, backups: files };
  } catch (e) { return { success: false, error: e.message }; }
});

fastify.get("/api/search", async (req) => {
  const q = req.query.q;
  if (!q) return { success: false, error: "query required" };
  const start = Date.now();
  try {
    const data = stmt.ftsSearch.all(q);
    const ms = Date.now() - start;
    stmt.insertSearchLog.run(q, data.length, ms);
    return { success: true, query: q, count: data.length, time_ms: ms, data };
  } catch (e) { return { success: false, error: e.message }; }
});

fastify.get("/api/wiki/categories", async () => {
  const data = stmt.getCategories.all();
  return { success: true, count: data.length, data };
});

fastify.get("/api/wiki/documents", async (req) => {
  const categoryId = req.query.category_id;
  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;
  const data = categoryId
    ? stmt.getDocumentsByCategory.all(categoryId, limit, offset)
    : stmt.getDocuments.all(limit, offset);
  return { success: true, count: data.length, data };
});

fastify.get("/api/wiki/documents/:slug", async (req) => {
  const slug = req.params.slug;
  const doc = stmt.getDocumentBySlug.get(slug);
  if (!doc) return { success: false, error: "not found" };
  stmt.incrementViews.run(slug);
  const category = stmt.getCategoryById.get(doc.category_id);
  const children = stmt.getChildDocuments.all(doc.id);
  return { success: true, data: { ...doc, category, children } };
});

// ===== Graceful Shutdown =====
const shutdown = async (sig) => {
  console.log("[kimdb]", sig, "received");
  clearInterval(checkpointInterval);

  // Close all WebSocket connections
  for (const [id, client] of clients) {
    try { client.socket.close(); } catch {}
  }

  try {
    await fastify.close();
    db.pragma("wal_checkpoint(TRUNCATE)");
    db.close();
    console.log("[kimdb] Shutdown complete");
  } catch (e) {
    console.error("[kimdb] Shutdown error:", e.message);
  }
  process.exit(0);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("uncaughtException", (e) => console.error("[kimdb] Error:", e.message));

await fastify.listen({ port: PORT, host: "0.0.0.0" });
console.log("[kimdb] v" + VERSION + " running on port " + PORT);
console.log("[kimdb] WebSocket: ws://0.0.0.0:" + PORT + "/ws");
