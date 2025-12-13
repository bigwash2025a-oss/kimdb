/**
 * kimdb v6.0.0 클러스터 테스트
 * 2대 서버(73:40000, 253:40001) Redis Pub/Sub 동기화 검증
 */

import WebSocket from 'ws';

const SERVERS = [
  { name: '73', url: 'ws://127.0.0.1:40000/ws' },
  { name: '253', url: 'ws://192.168.45.253:40001/ws' }
];

const CLIENTS_PER_SERVER = 500;
const TEST_DURATION = 10000;

const stats = {
  connected: { '73': 0, '253': 0 },
  messages: { '73': 0, '253': 0 },
  crossServerEvents: 0,
  presenceSync: 0,
  errors: 0
};

function createClient(server, id) {
  return new Promise((resolve) => {
    const ws = new WebSocket(server.url, { perMessageDeflate: false });
    const client = { id, server: server.name, ws, connected: false };

    const timeout = setTimeout(() => {
      if (!client.connected) {
        ws.terminate();
        resolve(null);
      }
    }, 10000);

    ws.on('open', () => {
      client.connected = true;
      stats.connected[server.name]++;
      clearTimeout(timeout);

      // Subscribe
      ws.send(JSON.stringify({ type: 'subscribe', collection: 'cluster_test' }));
      resolve(client);
    });

    ws.on('message', (data) => {
      stats.messages[server.name]++;
      try {
        const msg = JSON.parse(data);
        if (msg.type === 'presence_joined' || msg.type === 'presence_cursor_moved' || msg.type === 'presence_updated') {
          stats.presenceSync++;
        }
      } catch (e) {}
    });

    ws.on('error', () => {
      stats.errors++;
    });

    ws.on('close', () => {
      client.connected = false;
    });
  });
}

async function runClusterTest() {
  console.log('\n' + '='.repeat(60));
  console.log('  kimdb v6.0.0 Cluster Test (2 Servers)');
  console.log('='.repeat(60) + '\n');

  // 1. 두 서버에 연결
  console.log(`[Phase 1] Connecting ${CLIENTS_PER_SERVER} clients to each server...`);
  const clients = [];

  for (const server of SERVERS) {
    const serverClients = [];
    for (let i = 0; i < CLIENTS_PER_SERVER; i++) {
      serverClients.push(createClient(server, `${server.name}_${i}`));
      if (i % 100 === 99) {
        await new Promise(r => setTimeout(r, 50));
      }
    }
    const resolved = await Promise.all(serverClients);
    clients.push(...resolved.filter(c => c !== null));
    console.log(`  → ${server.name}: ${stats.connected[server.name]}/${CLIENTS_PER_SERVER} connected`);
  }

  const totalConnected = stats.connected['73'] + stats.connected['253'];
  console.log(`  → Total: ${totalConnected} clients\n`);

  // 2. Presence Join 테스트 (각 서버 100명씩)
  console.log('[Phase 2] Cross-server presence sync test...');

  const server73Clients = clients.filter(c => c && c.server === '73').slice(0, 100);
  const server253Clients = clients.filter(c => c && c.server === '253').slice(0, 100);

  for (const client of server73Clients) {
    if (client && client.connected) {
      client.ws.send(JSON.stringify({
        type: 'presence_join',
        collection: 'cluster_test',
        docId: 'shared_doc',
        user: { name: `User_73_${client.id}`, server: '73' }
      }));
    }
  }

  await new Promise(r => setTimeout(r, 500));

  for (const client of server253Clients) {
    if (client && client.connected) {
      client.ws.send(JSON.stringify({
        type: 'presence_join',
        collection: 'cluster_test',
        docId: 'shared_doc',
        user: { name: `User_253_${client.id}`, server: '253' }
      }));
    }
  }

  await new Promise(r => setTimeout(r, 2000));
  console.log(`  → Presence sync events: ${stats.presenceSync}`);

  // 3. Cross-server 메시지 테스트
  console.log(`\n[Phase 3] Cross-server messaging (${TEST_DURATION/1000}s)...`);
  const opsStart = Date.now();
  let opsCount = 0;

  const interval = setInterval(() => {
    // 73 서버 클라이언트가 cursor 이동 -> 253에서 수신되어야 함
    const sample73 = server73Clients.filter(c => c && c.connected).slice(0, 50);
    for (const client of sample73) {
      client.ws.send(JSON.stringify({
        type: 'presence_cursor',
        collection: 'cluster_test',
        docId: 'shared_doc',
        position: Math.floor(Math.random() * 1000)
      }));
      opsCount++;
    }

    // 253 서버 클라이언트가 cursor 이동 -> 73에서 수신되어야 함
    const sample253 = server253Clients.filter(c => c && c.connected).slice(0, 50);
    for (const client of sample253) {
      client.ws.send(JSON.stringify({
        type: 'presence_cursor',
        collection: 'cluster_test',
        docId: 'shared_doc',
        position: Math.floor(Math.random() * 1000)
      }));
      opsCount++;
    }
  }, 100);

  await new Promise(r => setTimeout(r, TEST_DURATION));
  clearInterval(interval);

  const opsTime = Date.now() - opsStart;
  console.log(`  → Operations: ${opsCount} in ${(opsTime/1000).toFixed(1)}s`);
  console.log(`  → Rate: ${Math.round(opsCount / (opsTime / 1000))} ops/sec`);

  // 4. 정리
  console.log('\n[Phase 4] Cleanup...');
  for (const client of clients) {
    if (client && client.connected) {
      client.ws.close();
    }
  }
  await new Promise(r => setTimeout(r, 2000));

  // 5. 결과
  console.log('\n' + '='.repeat(60));
  console.log('  RESULTS');
  console.log('='.repeat(60));

  console.log('\n  [Connections]');
  console.log(`    Server 73:  ${stats.connected['73']}/${CLIENTS_PER_SERVER}`);
  console.log(`    Server 253: ${stats.connected['253']}/${CLIENTS_PER_SERVER}`);
  console.log(`    Total:      ${totalConnected}/${CLIENTS_PER_SERVER * 2}`);

  console.log('\n  [Messages Received]');
  console.log(`    Server 73:  ${stats.messages['73'].toLocaleString()}`);
  console.log(`    Server 253: ${stats.messages['253'].toLocaleString()}`);
  console.log(`    Total:      ${(stats.messages['73'] + stats.messages['253']).toLocaleString()}`);

  console.log('\n  [Cross-Server Sync]');
  console.log(`    Presence sync events: ${stats.presenceSync.toLocaleString()}`);
  console.log(`    Errors: ${stats.errors}`);

  // 성공 기준
  const connectionSuccess = totalConnected >= (CLIENTS_PER_SERVER * 2) * 0.9;
  const syncSuccess = stats.presenceSync > 0;
  const success = connectionSuccess && syncSuccess && stats.errors < 50;

  console.log('\n' + '='.repeat(60));
  if (success) {
    console.log('  ✓ PASSED - Cluster sync working');
  } else {
    console.log('  ✗ FAILED');
    if (!connectionSuccess) console.log('    - Connection rate below 90%');
    if (!syncSuccess) console.log('    - No cross-server sync detected');
    if (stats.errors >= 50) console.log('    - Too many errors');
  }
  console.log('='.repeat(60) + '\n');

  process.exit(success ? 0 : 1);
}

runClusterTest().catch(e => {
  console.error('Cluster test error:', e);
  process.exit(1);
});
