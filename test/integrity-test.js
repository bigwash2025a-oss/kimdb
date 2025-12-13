/**
 * kimdb v6.0.0 데이터 무결성 테스트 (24시간)
 * - CRDT API 사용
 * - 1000개 문서 생성
 * - 지정 시간 동안 읽기/쓰기 반복
 * - 데이터 손실/손상 검증
 */

import WebSocket from 'ws';

const WS_URL = process.env.WS_URL || 'ws://127.0.0.1:40000/ws';
const DOC_COUNT = parseInt(process.env.DOC_COUNT) || 1000;
const TEST_HOURS = parseInt(process.env.TEST_HOURS) || 24;
const TEST_DURATION = TEST_HOURS * 60 * 60 * 1000;
const COLLECTION = 'integrity_test';

const stats = {
  writes: 0,
  reads: 0,
  writeSuccess: 0,
  readSuccess: 0,
  dataMatches: 0,
  dataMismatches: 0,
  errors: 0
};

// 검증용 데이터 저장소
const expectedData = new Map();

function createClient() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL);
    ws.on('open', () => {
      ws.send(JSON.stringify({ type: 'subscribe', collection: COLLECTION }));
      resolve(ws);
    });
    ws.on('error', reject);
    setTimeout(() => reject(new Error('Connection timeout')), 10000);
  });
}

function subscribeDoc(ws, docId) {
  return new Promise((resolve) => {
    const handler = (msg) => {
      try {
        const parsed = JSON.parse(msg.toString());
        if (parsed.docId === docId && parsed.type === 'crdt_state') {
          ws.off('message', handler);
          resolve({ success: true, data: parsed.state });
        }
      } catch (e) {}
    };
    ws.on('message', handler);
    ws.send(JSON.stringify({
      type: 'subscribe_doc',
      collection: COLLECTION,
      docId
    }));
    setTimeout(() => {
      ws.off('message', handler);
      resolve({ success: false, data: null });
    }, 5000);
  });
}

function setData(ws, docId, path, value) {
  return new Promise((resolve) => {
    const handler = (msg) => {
      try {
        const parsed = JSON.parse(msg.toString());
        if (parsed.docId === docId && parsed.type === 'crdt_set_ok') {
          ws.off('message', handler);
          resolve({ success: true, version: parsed.version });
        }
      } catch (e) {}
    };
    ws.on('message', handler);
    ws.send(JSON.stringify({
      type: 'crdt_set',
      collection: COLLECTION,
      docId,
      path,
      value
    }));
    setTimeout(() => {
      ws.off('message', handler);
      resolve({ success: false });
    }, 5000);
  });
}

function getSnapshot(ws, docId) {
  return new Promise((resolve) => {
    const handler = (msg) => {
      try {
        const parsed = JSON.parse(msg.toString());
        if (parsed.docId === docId && parsed.type === 'snapshot') {
          ws.off('message', handler);
          resolve({ success: true, data: parsed.snapshot, version: parsed.version });
        }
      } catch (e) {}
    };
    ws.on('message', handler);
    ws.send(JSON.stringify({
      type: 'get_snapshot',
      collection: COLLECTION,
      docId
    }));
    setTimeout(() => {
      ws.off('message', handler);
      resolve({ success: false, data: null });
    }, 5000);
  });
}

function generateData(docId, version) {
  return {
    id: docId,
    version,
    timestamp: Date.now(),
    checksum: `${docId}_v${version}`,
    numbers: Array.from({ length: 5 }, (_, i) => version * 10 + i),
    text: `Doc ${docId} v${version}`
  };
}

function verifyData(docId, received, expected) {
  if (!received || !expected) return false;
  if (received.id !== expected.id) return false;
  if (received.version !== expected.version) return false;
  if (received.checksum !== expected.checksum) return false;
  return true;
}

async function runTest() {
  console.log('\n' + '='.repeat(60));
  console.log('  kimdb v6.0.0 Data Integrity Test');
  console.log('  Documents: ' + DOC_COUNT);
  console.log('  Duration: ' + TEST_HOURS + ' hours');
  console.log('  Server: ' + WS_URL);
  console.log('='.repeat(60) + '\n');

  let ws;
  try {
    // 1. 연결
    console.log('[Phase 1] Connecting...');
    ws = await createClient();
    console.log('  -> Connected\n');

    // 2. 초기 1000개 문서 생성
    console.log('[Phase 2] Creating ' + DOC_COUNT + ' documents...');
    const createStart = Date.now();

    for (let i = 0; i < DOC_COUNT; i++) {
      const docId = 'doc_' + String(i).padStart(4, '0');
      const data = generateData(docId, 1);
      expectedData.set(docId, data);

      // CRDT set으로 전체 데이터 저장
      const result = await setData(ws, docId, 'data', data);
      stats.writes++;
      if (result.success) {
        stats.writeSuccess++;
      } else {
        stats.errors++;
      }

      if ((i + 1) % 100 === 0) {
        process.stdout.write('\r  -> Created: ' + (i + 1) + '/' + DOC_COUNT);
      }
    }

    const createTime = (Date.now() - createStart) / 1000;
    console.log('\n  -> ' + DOC_COUNT + ' documents created in ' + createTime.toFixed(1) + 's');
    console.log('  -> Write success rate: ' + (stats.writeSuccess / stats.writes * 100).toFixed(1) + '%\n');

    // 3. 장시간 읽기/쓰기 테스트
    console.log('[Phase 3] Running read/write test for ' + TEST_HOURS + ' hours...');
    const testStart = Date.now();
    let lastReport = Date.now();

    while (Date.now() - testStart < TEST_DURATION) {
      // 랜덤 문서 선택
      const docIndex = Math.floor(Math.random() * DOC_COUNT);
      const docId = 'doc_' + String(docIndex).padStart(4, '0');

      // 50% 확률로 읽기 또는 쓰기
      if (Math.random() < 0.5) {
        // 읽기 (스냅샷)
        stats.reads++;
        const result = await getSnapshot(ws, docId);

        if (result.success && result.data) {
          stats.readSuccess++;
          const expected = expectedData.get(docId);
          // CRDT 내부 구조에서 실제 값 추출: root.fields.data.value.value
          const received = result.data?.root?.fields?.data?.value?.value;

          if (verifyData(docId, received, expected)) {
            stats.dataMatches++;
          } else {
            stats.dataMismatches++;
            if (stats.dataMismatches <= 10) {
              console.log('\n  [MISMATCH] ' + docId);
            }
          }
        } else {
          stats.errors++;
        }
      } else {
        // 쓰기 (버전 업데이트)
        stats.writes++;
        const current = expectedData.get(docId);
        const newVersion = current ? current.version + 1 : 1;
        const newData = generateData(docId, newVersion);

        const result = await setData(ws, docId, 'data', newData);
        if (result.success) {
          stats.writeSuccess++;
          expectedData.set(docId, newData);
        } else {
          stats.errors++;
        }
      }

      // 1분마다 진행 상황 보고
      if (Date.now() - lastReport > 60000) {
        const elapsed = Math.floor((Date.now() - testStart) / 60000);
        const remaining = Math.ceil((TEST_DURATION - (Date.now() - testStart)) / 60000);
        const elapsedHours = (elapsed / 60).toFixed(1);
        const remainingHours = (remaining / 60).toFixed(1);

        console.log('\n  [' + elapsedHours + 'h] Reads: ' + stats.reads +
                    ', Writes: ' + stats.writes +
                    ', Matches: ' + stats.dataMatches +
                    ', Mismatches: ' + stats.dataMismatches +
                    ', Errors: ' + stats.errors +
                    ', Remaining: ' + remainingHours + 'h');
        lastReport = Date.now();
      }

      // 약간의 딜레이
      await new Promise(r => setTimeout(r, 100));
    }

    ws.close();

    // 4. 최종 검증
    console.log('\n\n[Phase 4] Final verification...');
    ws = await createClient();

    let finalMatches = 0;
    let finalMismatches = 0;

    for (let i = 0; i < DOC_COUNT; i++) {
      const docId = 'doc_' + String(i).padStart(4, '0');
      const result = await getSnapshot(ws, docId);
      const expected = expectedData.get(docId);

      if (result.success && result.data) {
        const received = result.data?.root?.fields?.data?.value?.value;
        if (verifyData(docId, received, expected)) {
          finalMatches++;
        } else {
          finalMismatches++;
          if (finalMismatches <= 10) {
            console.log('  [FINAL MISMATCH] ' + docId);
          }
        }
      } else {
        finalMismatches++;
      }

      if ((i + 1) % 200 === 0) {
        process.stdout.write('\r  -> Verified: ' + (i + 1) + '/' + DOC_COUNT);
      }
    }

    console.log('\n  -> Final matches: ' + finalMatches + '/' + DOC_COUNT);

    ws.close();

    // 5. 결과
    const totalTime = (Date.now() - testStart) / 3600000; // 시간 단위
    const totalOps = stats.reads + stats.writes;

    console.log('\n' + '='.repeat(60));
    console.log('  RESULTS');
    console.log('='.repeat(60));

    console.log('\n  [Duration]');
    console.log('    ' + totalTime.toFixed(2) + ' hours');

    console.log('\n  [Operations]');
    console.log('    Total: ' + totalOps.toLocaleString());
    console.log('    Reads: ' + stats.reads.toLocaleString() + ' (success: ' + stats.readSuccess.toLocaleString() + ')');
    console.log('    Writes: ' + stats.writes.toLocaleString() + ' (success: ' + stats.writeSuccess.toLocaleString() + ')');
    console.log('    Rate: ' + Math.round(totalOps / (totalTime * 3600)) + ' ops/sec');

    console.log('\n  [Data Integrity]');
    console.log('    Runtime matches: ' + stats.dataMatches.toLocaleString());
    console.log('    Runtime mismatches: ' + stats.dataMismatches);
    console.log('    Final verification: ' + finalMatches + '/' + DOC_COUNT);
    console.log('    Errors: ' + stats.errors);

    const integrityRate = (finalMatches / DOC_COUNT * 100).toFixed(2);
    console.log('\n  [Integrity Rate]');
    console.log('    ' + integrityRate + '%');

    console.log('\n' + '='.repeat(60));
    const success = finalMatches >= DOC_COUNT * 0.99 && stats.dataMismatches < DOC_COUNT * 0.01;
    if (success) {
      console.log('  PASSED - Data integrity verified (' + integrityRate + '%)');
    } else {
      console.log('  FAILED - Data integrity issues detected');
      console.log('    - Final mismatches: ' + finalMismatches);
      console.log('    - Runtime mismatches: ' + stats.dataMismatches);
    }
    console.log('='.repeat(60) + '\n');

    process.exit(success ? 0 : 1);

  } catch (e) {
    console.error('\nTest error:', e.message);
    if (ws) ws.close();
    process.exit(1);
  }
}

runTest();
