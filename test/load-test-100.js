/**
 * kimdb v5.1.0 부하 테스트
 * 100명 동시 접속 시뮬레이션
 */

import WebSocket from 'ws';

const WS_URL = 'ws://127.0.0.1:40000/ws';
const TOTAL_CLIENTS = 100;
const TEST_DURATION = 10000; // 10초

const stats = {
  connected: 0,
  disconnected: 0,
  messagesSent: 0,
  messagesReceived: 0,
  errors: 0,
  presenceJoins: 0,
  presenceUpdates: 0,
  undoCaptures: 0,
  latencies: []
};

const clients = [];

function createClient(id) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL);
    const client = { id, ws, connected: false };

    const timeout = setTimeout(() => {
      if (!client.connected) {
        ws.close();
        reject(new Error(`Client ${id} connection timeout`));
      }
    }, 5000);

    ws.on('open', () => {
      client.connected = true;
      stats.connected++;
      clearTimeout(timeout);

      // Subscribe
      ws.send(JSON.stringify({ type: 'subscribe', collection: 'load_test' }));
      stats.messagesSent++;

      resolve(client);
    });

    ws.on('message', (data) => {
      stats.messagesReceived++;
      const msg = JSON.parse(data);

      if (msg.type === 'presence_join_ok') {
        stats.presenceJoins++;
      } else if (msg.type === 'presence_updated' || msg.type === 'presence_cursor_moved') {
        stats.presenceUpdates++;
      } else if (msg.type === 'undo_capture_ok') {
        stats.undoCaptures++;
      } else if (msg.type === 'pong') {
        const latency = Date.now() - msg.time;
        stats.latencies.push(latency);
      }
    });

    ws.on('error', (err) => {
      stats.errors++;
      console.error(`Client ${id} error:`, err.message);
    });

    ws.on('close', () => {
      stats.disconnected++;
      client.connected = false;
    });

    clients.push(client);
  });
}

async function runLoadTest() {
  console.log(`=== kimdb v5.1.0 Load Test (${TOTAL_CLIENTS} clients) ===\n`);

  const startTime = Date.now();

  // 1. 클라이언트 100개 생성
  console.log(`[Phase 1] Creating ${TOTAL_CLIENTS} connections...`);
  const connectStart = Date.now();

  const connectPromises = [];
  for (let i = 0; i < TOTAL_CLIENTS; i++) {
    connectPromises.push(createClient(i));
    // 연결 폭주 방지
    if (i % 20 === 19) {
      await new Promise(r => setTimeout(r, 100));
    }
  }

  await Promise.allSettled(connectPromises);
  const connectTime = Date.now() - connectStart;
  console.log(`  → ${stats.connected}/${TOTAL_CLIENTS} connected in ${connectTime}ms`);

  if (stats.connected < TOTAL_CLIENTS * 0.9) {
    console.error('  ✗ Too many connection failures');
    process.exit(1);
  }

  // 2. Presence Join
  console.log(`\n[Phase 2] Presence join (${stats.connected} clients)...`);
  const presenceStart = Date.now();

  for (const client of clients) {
    if (client.connected) {
      client.ws.send(JSON.stringify({
        type: 'presence_join',
        collection: 'load_test',
        docId: 'stress_doc',
        user: { name: `User${client.id}`, color: `hsl(${client.id * 3.6}, 70%, 50%)` }
      }));
      stats.messagesSent++;
    }
  }

  await new Promise(r => setTimeout(r, 1000));
  const presenceTime = Date.now() - presenceStart;
  console.log(`  → ${stats.presenceJoins} presence joins in ${presenceTime}ms`);

  // 3. 동시 작업 시뮬레이션
  console.log(`\n[Phase 3] Concurrent operations (${TEST_DURATION/1000}s)...`);
  const opsStart = Date.now();
  let opsCount = 0;

  const operationInterval = setInterval(() => {
    // 각 클라이언트가 랜덤 작업 수행
    for (const client of clients) {
      if (!client.connected) continue;

      const action = Math.random();

      if (action < 0.3) {
        // Cursor 업데이트 (30%)
        client.ws.send(JSON.stringify({
          type: 'presence_cursor',
          collection: 'load_test',
          docId: 'stress_doc',
          position: Math.floor(Math.random() * 1000),
          selection: null
        }));
      } else if (action < 0.5) {
        // Undo capture (20%)
        client.ws.send(JSON.stringify({
          type: 'undo_capture',
          collection: 'load_test',
          docId: 'stress_doc',
          op: { type: 'map_set', path: ['field' + client.id], value: Math.random() },
          previousValue: null
        }));
      } else if (action < 0.6) {
        // Ping (latency 측정) (10%)
        client.ws.send(JSON.stringify({ type: 'ping', time: Date.now() }));
      } else if (action < 0.7) {
        // Presence update (10%)
        client.ws.send(JSON.stringify({
          type: 'presence_update',
          collection: 'load_test',
          docId: 'stress_doc',
          user: { status: 'typing' }
        }));
      }
      // 30% idle

      opsCount++;
      stats.messagesSent++;
    }
  }, 100); // 100ms마다 각 클라이언트 작업

  await new Promise(r => setTimeout(r, TEST_DURATION));
  clearInterval(operationInterval);
  const opsTime = Date.now() - opsStart;
  console.log(`  → ${opsCount} operations in ${opsTime}ms`);
  console.log(`  → ${(opsCount / (opsTime / 1000)).toFixed(0)} ops/sec`);

  // 4. 정리
  console.log(`\n[Phase 4] Cleanup...`);
  for (const client of clients) {
    if (client.connected) {
      client.ws.close();
    }
  }

  await new Promise(r => setTimeout(r, 1000));

  // 5. 결과
  const totalTime = Date.now() - startTime;

  console.log(`\n=== Results ===`);
  console.log(`Total time: ${totalTime}ms`);
  console.log(`\nConnections:`);
  console.log(`  Connected: ${stats.connected}`);
  console.log(`  Disconnected: ${stats.disconnected}`);
  console.log(`  Errors: ${stats.errors}`);
  console.log(`\nMessages:`);
  console.log(`  Sent: ${stats.messagesSent}`);
  console.log(`  Received: ${stats.messagesReceived}`);
  console.log(`  Throughput: ${(stats.messagesReceived / (totalTime / 1000)).toFixed(0)} msg/sec`);
  console.log(`\nFeatures:`);
  console.log(`  Presence joins: ${stats.presenceJoins}`);
  console.log(`  Presence updates: ${stats.presenceUpdates}`);
  console.log(`  Undo captures: ${stats.undoCaptures}`);

  if (stats.latencies.length > 0) {
    stats.latencies.sort((a, b) => a - b);
    const avg = stats.latencies.reduce((a, b) => a + b, 0) / stats.latencies.length;
    const p50 = stats.latencies[Math.floor(stats.latencies.length * 0.5)];
    const p95 = stats.latencies[Math.floor(stats.latencies.length * 0.95)];
    const p99 = stats.latencies[Math.floor(stats.latencies.length * 0.99)];

    console.log(`\nLatency:`);
    console.log(`  Avg: ${avg.toFixed(1)}ms`);
    console.log(`  P50: ${p50}ms`);
    console.log(`  P95: ${p95}ms`);
    console.log(`  P99: ${p99}ms`);
  }

  // 성공 기준
  const success = stats.connected >= TOTAL_CLIENTS * 0.95 && stats.errors < TOTAL_CLIENTS * 0.05;

  console.log(`\n=== ${success ? '✓ PASSED' : '✗ FAILED'} ===`);
  process.exit(success ? 0 : 1);
}

runLoadTest().catch(e => {
  console.error('Load test error:', e);
  process.exit(1);
});
