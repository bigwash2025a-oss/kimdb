/**
 * kimdb Simple REST Client v1.0.0
 *
 * 간단한 get/set API
 * WebSocket 없이 REST만 사용
 *
 * 사용법:
 *   const db = new KimDB('https://db.dclub.kr');
 *   await db.set('users', 'user123', { name: '김철수' });
 *   const user = await db.get('users', 'user123');
 */

class KimDB {
  constructor(url, options = {}) {
    this.baseUrl = url.replace(/\/$/, '');
    this.apiKey = options.apiKey || '';
    this.timeout = options.timeout || 5000;
  }

  // 헤더 생성
  _headers() {
    const headers = { 'Content-Type': 'application/json' };
    if (this.apiKey) headers['x-api-key'] = this.apiKey;
    return headers;
  }

  // HTTP 요청
  async _request(method, path, body = null) {
    const url = `${this.baseUrl}${path}`;
    const options = {
      method,
      headers: this._headers()
    };

    if (body) options.body = JSON.stringify(body);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    options.signal = controller.signal;

    try {
      const res = await fetch(url, options);
      clearTimeout(timeoutId);

      if (!res.ok) {
        const error = await res.text();
        throw new Error(`HTTP ${res.status}: ${error}`);
      }

      return res.json();
    } catch (e) {
      if (e.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw e;
    }
  }

  // ===== 핵심 API =====

  /**
   * 데이터 저장
   * @param {string} collection - 컬렉션 이름 (테이블)
   * @param {string} id - 문서 ID
   * @param {object} data - 저장할 데이터
   * @returns {Promise<{id, _version}>}
   */
  async set(collection, id, data) {
    return this._request('PUT', `/api/c/${collection}/${id}`, { data });
  }

  /**
   * 데이터 조회
   * @param {string} collection - 컬렉션 이름
   * @param {string} id - 문서 ID
   * @returns {Promise<{id, data, _version} | null>}
   */
  async get(collection, id) {
    try {
      return await this._request('GET', `/api/c/${collection}/${id}`);
    } catch (e) {
      if (e.message.includes('404')) return null;
      throw e;
    }
  }

  /**
   * 데이터 삭제
   * @param {string} collection - 컬렉션 이름
   * @param {string} id - 문서 ID
   * @returns {Promise<{deleted: true}>}
   */
  async delete(collection, id) {
    return this._request('DELETE', `/api/c/${collection}/${id}`);
  }

  /**
   * 컬렉션 전체 조회
   * @param {string} collection - 컬렉션 이름
   * @param {object} options - { limit, offset, orderBy, order }
   * @returns {Promise<Array>}
   */
  async list(collection, options = {}) {
    const params = new URLSearchParams();
    if (options.limit) params.set('limit', options.limit);
    if (options.offset) params.set('offset', options.offset);
    if (options.orderBy) params.set('orderBy', options.orderBy);
    if (options.order) params.set('order', options.order);

    const query = params.toString() ? `?${params.toString()}` : '';
    return this._request('GET', `/api/c/${collection}${query}`);
  }

  /**
   * 데이터 생성 (ID 자동 생성)
   * @param {string} collection - 컬렉션 이름
   * @param {object} data - 저장할 데이터
   * @returns {Promise<{id, _version}>}
   */
  async create(collection, data) {
    return this._request('POST', `/api/c/${collection}`, { data });
  }

  /**
   * 데이터 부분 업데이트 (PATCH)
   * @param {string} collection - 컬렉션 이름
   * @param {string} id - 문서 ID
   * @param {object} data - 업데이트할 필드
   * @returns {Promise<{id, _version}>}
   */
  async update(collection, id, data) {
    return this._request('PATCH', `/api/c/${collection}/${id}`, { data });
  }

  // ===== SQL API =====

  /**
   * SQL 쿼리 실행
   * @param {string} sql - SQL 쿼리
   * @param {Array} params - 바인딩 파라미터
   * @returns {Promise<Array>}
   */
  async query(sql, params = []) {
    return this._request('POST', '/api/sql', { sql, params });
  }

  /**
   * SQL 실행 (INSERT/UPDATE/DELETE)
   * @param {string} sql - SQL 쿼리
   * @param {Array} params - 바인딩 파라미터
   * @returns {Promise<{changes, lastInsertRowid}>}
   */
  async execute(sql, params = []) {
    return this._request('POST', '/api/sql/exec', { sql, params });
  }

  // ===== 유틸리티 =====

  /**
   * 서버 상태 확인
   * @returns {Promise<{status, version}>}
   */
  async health() {
    return this._request('GET', '/api/health');
  }

  /**
   * 컬렉션 존재 여부
   * @param {string} collection - 컬렉션 이름
   * @returns {Promise<boolean>}
   */
  async exists(collection, id) {
    const result = await this.get(collection, id);
    return result !== null;
  }

  /**
   * 여러 문서 조회
   * @param {string} collection - 컬렉션 이름
   * @param {Array<string>} ids - 문서 ID 배열
   * @returns {Promise<Array>}
   */
  async getMany(collection, ids) {
    const promises = ids.map(id => this.get(collection, id));
    const results = await Promise.all(promises);
    return results.filter(r => r !== null);
  }

  /**
   * 여러 문서 저장
   * @param {string} collection - 컬렉션 이름
   * @param {Array<{id, data}>} docs - 문서 배열
   * @returns {Promise<Array>}
   */
  async setMany(collection, docs) {
    const promises = docs.map(doc => this.set(collection, doc.id, doc.data));
    return Promise.all(promises);
  }

  /**
   * 검색 (WHERE 조건)
   * @param {string} collection - 컬렉션 이름
   * @param {string} field - 필드명 (JSON 경로 지원: data.name)
   * @param {string} op - 연산자 (=, !=, >, <, >=, <=, LIKE)
   * @param {any} value - 비교 값
   * @returns {Promise<Array>}
   */
  async find(collection, field, op, value) {
    // JSON 필드 경로 처리
    const jsonPath = field.startsWith('data.')
      ? `json_extract(data, '$.${field.slice(5)}')`
      : field;

    const sql = `SELECT * FROM ${collection} WHERE ${jsonPath} ${op} ?`;
    return this.query(sql, [value]);
  }

  /**
   * 카운트
   * @param {string} collection - 컬렉션 이름
   * @returns {Promise<number>}
   */
  async count(collection) {
    const result = await this.query(`SELECT COUNT(*) as cnt FROM ${collection}`);
    return result[0]?.cnt || 0;
  }
}

// ===== 컬렉션 래퍼 =====
class Collection {
  constructor(db, name) {
    this.db = db;
    this.name = name;
  }

  set(id, data) { return this.db.set(this.name, id, data); }
  get(id) { return this.db.get(this.name, id); }
  delete(id) { return this.db.delete(this.name, id); }
  list(options) { return this.db.list(this.name, options); }
  create(data) { return this.db.create(this.name, data); }
  update(id, data) { return this.db.update(this.name, id, data); }
  find(field, op, value) { return this.db.find(this.name, field, op, value); }
  count() { return this.db.count(this.name); }
  exists(id) { return this.db.exists(this.name, id); }
}

// 컬렉션 프록시 추가
KimDB.prototype.collection = function(name) {
  return new Collection(this, name);
};

// ===== Export =====
export { KimDB, Collection };
export default KimDB;

// Browser global
if (typeof window !== 'undefined') {
  window.KimDB = KimDB;
}

// Node.js CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { KimDB, Collection };
}
