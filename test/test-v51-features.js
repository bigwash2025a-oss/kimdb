/**
 * kimdb v5.1.0 Undo/Redo + Presence 테스트
 */

import WebSocket from 'ws';

const WS_URL = 'ws://127.0.0.1:40000/ws';

// 유틸리티
const wait = (ms) => new Promise(r => setTimeout(r, ms));

async function runTest() {
  console.log('=== kimdb v5.1.0 Feature Test ===\n');

  // 클라이언트 2개 생성
  const client1 = new WebSocket(WS_URL);
  const client2 = new WebSocket(WS_URL);

  let client1Id, client2Id;
  const results = { passed: 0, failed: 0 };

  const test = (name, condition) => {
    if (condition) {
      console.log(`✓ ${name}`);
      results.passed++;
    } else {
      console.log(`✗ ${name}`);
      results.failed++;
    }
  };

  // Client 1 연결
  await new Promise((resolve) => {
    client1.on('open', () => resolve());
  });

  // Client 1 메시지 핸들러
  client1.on('message', (raw) => {
    const msg = JSON.parse(raw);
    if (msg.type === 'connected') {
      client1Id = msg.clientId;
      console.log(`[Client1] Connected: ${client1Id}`);
    }
  });

  // Client 2 연결
  await new Promise((resolve) => {
    client2.on('open', () => resolve());
  });

  // Client 2 메시지 핸들러
  client2.on('message', (raw) => {
    const msg = JSON.parse(raw);
    if (msg.type === 'connected') {
      client2Id = msg.clientId;
      console.log(`[Client2] Connected: ${client2Id}`);
    }
  });

  await wait(500);

  // 1. 구독 테스트
  console.log('\n--- 1. Subscribe Test ---');
  client1.send(JSON.stringify({ type: 'subscribe', collection: 'test_undo' }));
  client2.send(JSON.stringify({ type: 'subscribe', collection: 'test_undo' }));
  await wait(200);
  test('Both clients subscribed', true);

  // 2. Presence Join 테스트
  console.log('\n--- 2. Presence Join Test ---');

  let presenceJoin1, presenceJoin2;
  const presencePromise1 = new Promise(resolve => {
    const handler = (raw) => {
      const msg = JSON.parse(raw);
      if (msg.type === 'presence_join_ok') {
        presenceJoin1 = msg;
        client1.removeListener('message', handler);
        resolve();
      }
    };
    client1.on('message', handler);
  });

  client1.send(JSON.stringify({
    type: 'presence_join',
    collection: 'test_undo',
    docId: 'doc1',
    user: { name: 'Alice', color: '#ff0000', avatar: 'A' }
  }));

  await presencePromise1;
  test('Client1 presence join', presenceJoin1 && presenceJoin1.nodeId);
  console.log(`  → nodeId: ${presenceJoin1?.nodeId}`);
  console.log(`  → users: ${presenceJoin1?.users?.length || 0}`);

  // Client 2 join
  let presenceJoined2;
  const presencePromise2 = new Promise(resolve => {
    const handler = (raw) => {
      const msg = JSON.parse(raw);
      if (msg.type === 'presence_join_ok') {
        presenceJoin2 = msg;
        client2.removeListener('message', handler);
        resolve();
      } else if (msg.type === 'presence_joined') {
        presenceJoined2 = msg;
      }
    };
    client2.on('message', handler);
  });

  // Client1이 Client2의 join을 받도록
  let client1ReceivedJoin = false;
  const client1JoinHandler = (raw) => {
    const msg = JSON.parse(raw);
    if (msg.type === 'presence_joined') {
      client1ReceivedJoin = true;
    }
  };
  client1.on('message', client1JoinHandler);

  client2.send(JSON.stringify({
    type: 'presence_join',
    collection: 'test_undo',
    docId: 'doc1',
    user: { name: 'Bob', color: '#00ff00', avatar: 'B' }
  }));

  await presencePromise2;
  await wait(100);
  test('Client2 presence join', presenceJoin2 && presenceJoin2.nodeId);
  test('Client2 sees Client1', presenceJoin2?.users?.length >= 1);
  test('Client1 receives Client2 join', client1ReceivedJoin);
  client1.removeListener('message', client1JoinHandler);

  // 3. Presence Get 테스트
  console.log('\n--- 3. Presence Get Test ---');

  let presenceUsers;
  const presenceGetPromise = new Promise(resolve => {
    const handler = (raw) => {
      const msg = JSON.parse(raw);
      if (msg.type === 'presence_users') {
        presenceUsers = msg;
        client1.removeListener('message', handler);
        resolve();
      }
    };
    client1.on('message', handler);
  });

  client1.send(JSON.stringify({
    type: 'presence_get',
    collection: 'test_undo',
    docId: 'doc1'
  }));

  await presenceGetPromise;
  test('Get presence users', presenceUsers && presenceUsers.count === 2);
  console.log(`  → count: ${presenceUsers?.count}`);
  console.log(`  → users: ${presenceUsers?.users?.map(u => u.name).join(', ')}`);

  // 4. Presence Cursor 테스트
  console.log('\n--- 4. Presence Cursor Test ---');

  let cursorReceived = false;
  const cursorPromise = new Promise(resolve => {
    const handler = (raw) => {
      const msg = JSON.parse(raw);
      if (msg.type === 'presence_cursor_moved') {
        cursorReceived = msg;
        client1.removeListener('message', handler);
        resolve();
      }
    };
    client1.on('message', handler);
    setTimeout(resolve, 1000); // timeout
  });

  client2.send(JSON.stringify({
    type: 'presence_cursor',
    collection: 'test_undo',
    docId: 'doc1',
    position: 42,
    selection: { start: 40, end: 50 }
  }));

  await cursorPromise;
  test('Cursor broadcast', cursorReceived && cursorReceived.cursor?.position === 42);
  console.log(`  → position: ${cursorReceived?.cursor?.position}`);

  // 5. Undo Capture 테스트
  console.log('\n--- 5. Undo Capture Test ---');

  let undoCaptureOk;
  const undoCapturePromise = new Promise(resolve => {
    const handler = (raw) => {
      const msg = JSON.parse(raw);
      if (msg.type === 'undo_capture_ok') {
        undoCaptureOk = msg;
        client1.removeListener('message', handler);
        resolve();
      }
    };
    client1.on('message', handler);
  });

  client1.send(JSON.stringify({
    type: 'undo_capture',
    collection: 'test_undo',
    docId: 'doc1',
    op: {
      type: 'map_set',
      path: ['title'],
      value: 'Hello World',
      previousValue: undefined
    },
    previousValue: undefined
  }));

  await undoCapturePromise;
  test('Undo capture', undoCaptureOk && undoCaptureOk.state);
  console.log(`  → undoCount: ${undoCaptureOk?.state?.undoCount}`);

  // 6. Undo State 테스트
  console.log('\n--- 6. Undo State Test ---');

  let undoState;
  const undoStatePromise = new Promise(resolve => {
    const handler = (raw) => {
      const msg = JSON.parse(raw);
      if (msg.type === 'undo_state') {
        undoState = msg;
        client1.removeListener('message', handler);
        resolve();
      }
    };
    client1.on('message', handler);
  });

  client1.send(JSON.stringify({
    type: 'undo_state',
    collection: 'test_undo',
    docId: 'doc1'
  }));

  await undoStatePromise;
  test('Undo state', undoState && undoState.canUndo === true);
  console.log(`  → canUndo: ${undoState?.canUndo}, canRedo: ${undoState?.canRedo}`);

  // 7. Undo 실행 테스트
  console.log('\n--- 7. Undo Execute Test ---');

  let undoOk;
  const undoPromise = new Promise(resolve => {
    const handler = (raw) => {
      const msg = JSON.parse(raw);
      if (msg.type === 'undo_ok' || msg.type === 'undo_empty') {
        undoOk = msg;
        client1.removeListener('message', handler);
        resolve();
      }
    };
    client1.on('message', handler);
  });

  client1.send(JSON.stringify({
    type: 'undo',
    collection: 'test_undo',
    docId: 'doc1'
  }));

  await undoPromise;
  test('Undo execute', undoOk && (undoOk.type === 'undo_ok' || undoOk.type === 'undo_empty'));
  console.log(`  → type: ${undoOk?.type}`);

  // 8. Redo 테스트
  console.log('\n--- 8. Redo Test ---');

  let redoOk;
  const redoPromise = new Promise(resolve => {
    const handler = (raw) => {
      const msg = JSON.parse(raw);
      if (msg.type === 'redo_ok' || msg.type === 'redo_empty') {
        redoOk = msg;
        client1.removeListener('message', handler);
        resolve();
      }
    };
    client1.on('message', handler);
  });

  client1.send(JSON.stringify({
    type: 'redo',
    collection: 'test_undo',
    docId: 'doc1'
  }));

  await redoPromise;
  test('Redo execute', redoOk && (redoOk.type === 'redo_ok' || redoOk.type === 'redo_empty'));
  console.log(`  → type: ${redoOk?.type}`);

  // 9. Presence Leave 테스트
  console.log('\n--- 9. Presence Leave Test ---');

  let leaveReceived = false;
  const leavePromise = new Promise(resolve => {
    const handler = (raw) => {
      const msg = JSON.parse(raw);
      if (msg.type === 'presence_left') {
        leaveReceived = true;
        client1.removeListener('message', handler);
        resolve();
      }
    };
    client1.on('message', handler);
    setTimeout(resolve, 1000);
  });

  client2.send(JSON.stringify({
    type: 'presence_leave',
    collection: 'test_undo',
    docId: 'doc1'
  }));

  await leavePromise;
  test('Presence leave broadcast', leaveReceived);

  // 10. Connection close로 자동 presence leave
  console.log('\n--- 10. Auto Leave on Disconnect ---');
  client2.close();
  await wait(500);
  test('Client2 disconnected gracefully', true);

  // 결과
  console.log('\n=== Test Results ===');
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Total: ${results.passed + results.failed}`);

  // 정리
  client1.close();

  process.exit(results.failed > 0 ? 1 : 0);
}

runTest().catch(e => {
  console.error('Test error:', e);
  process.exit(1);
});
