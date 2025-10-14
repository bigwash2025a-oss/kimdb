/**
 * 🔥 Custom Firestore DB - Rules 시스템 데모
 * 규칙 파서 + 평가 엔진 테스트
 */

import { rulesParser } from '../src/rules/parser.js';
import { rulesEvaluator, RequestContext, ResourceContext } from '../src/rules/evaluator.js';

// 테스트용 규칙 정의
const testRulesText = `
match /dealers/{dealerId}/bookings/{bookingId} {
  allow read, write: if request.auth != null 
                     && request.auth.token.dealerId == dealerId
                     && hasRole('manager');
  
  allow read: if request.auth != null 
              && request.auth.uid == resource.data.customerId;
}

match /dealers/{dealerId}/customers/{customerId} {
  allow read, write: if request.auth != null
                     && request.auth.token.dealerId == dealerId
                     && (hasRole('staff') || hasRole('manager'));
}

match /dealers/{dealerId}/settings/config {
  allow read, write: if request.auth != null
                     && request.auth.token.dealerId == dealerId  
                     && hasRole('admin');
}
`;

async function testRulesSystem() {
  console.log('🔥 Custom Firestore Rules System Demo\n');

  // 1. 규칙 파싱
  console.log('📝 Parsing Rules...');
  const rules = rulesParser.parseRules(testRulesText);
  console.log(`✅ Parsed ${rules.length} rules:`);
  
  rules.forEach((rule, index) => {
    console.log(`   ${index + 1}. ${rule.pathPattern} - [${rule.operations.join(', ')}]`);
  });
  
  // 2. 평가자에 규칙 로드
  console.log('\n🏗️ Loading rules into evaluator...');
  rulesEvaluator.loadRules(rules);
  
  // 3. 테스트 시나리오들
  console.log('\n🎭 Testing Authorization Scenarios:\n');
  
  const scenarios = [
    {
      name: 'Manager reading own dealer booking',
      operation: 'read',
      path: '/dealers/dealer123/bookings/booking456', 
      request: {
        auth: {
          uid: 'user123',
          token: {
            dealerId: 'dealer123',
            roles: ['manager'],
            email: 'manager@dealer123.com'
          }
        },
        method: 'GET' as const,
        path: '/dealers/dealer123/bookings/booking456',
        time: new Date()
      },
      resource: {
        id: 'booking456',
        path: '/dealers/dealer123/bookings/booking456',
        data: {
          customerId: 'customer789',
          service: 'oil-change',
          status: 'confirmed'
        }
      }
    },
    
    {
      name: 'Customer reading own booking',
      operation: 'read',
      path: '/dealers/dealer123/bookings/booking456',
      request: {
        auth: {
          uid: 'customer789',
          token: {
            dealerId: 'dealer456', // 다른 딜러!
            roles: ['customer'],
            email: 'customer@example.com'
          }
        },
        method: 'GET' as const,
        path: '/dealers/dealer123/bookings/booking456',
        time: new Date()
      },
      resource: {
        id: 'booking456', 
        path: '/dealers/dealer123/bookings/booking456',
        data: {
          customerId: 'customer789', // 본인 예약
          service: 'oil-change',
          status: 'confirmed'
        }
      }
    },

    {
      name: 'Staff accessing customer data',
      operation: 'read', 
      path: '/dealers/dealer123/customers/customer789',
      request: {
        auth: {
          uid: 'staff456',
          token: {
            dealerId: 'dealer123',
            roles: ['staff'],
            email: 'staff@dealer123.com'  
          }
        },
        method: 'GET' as const,
        path: '/dealers/dealer123/customers/customer789',
        time: new Date()
      },
      resource: {
        id: 'customer789',
        path: '/dealers/dealer123/customers/customer789', 
        data: {
          name: 'John Doe',
          phone: '555-1234'
        }
      }
    },

    {
      name: 'Unauthorized user accessing settings',
      operation: 'write',
      path: '/dealers/dealer123/settings/config',
      request: {
        auth: {
          uid: 'staff456',
          token: {
            dealerId: 'dealer123', 
            roles: ['staff'], // admin 아님!
            email: 'staff@dealer123.com'
          }
        },
        method: 'PUT' as const,
        path: '/dealers/dealer123/settings/config',
        time: new Date()
      },
      resource: {
        id: 'config',
        path: '/dealers/dealer123/settings/config',
        data: {
          businessHours: '9-17',
          timezone: 'PST'
        }
      }
    },

    {
      name: 'Unauthenticated request',
      operation: 'read',
      path: '/dealers/dealer123/bookings/booking456',
      request: {
        method: 'GET' as const,
        path: '/dealers/dealer123/bookings/booking456', 
        time: new Date()
      },
      resource: {
        id: 'booking456',
        path: '/dealers/dealer123/bookings/booking456',
        data: {
          customerId: 'customer789',
          service: 'oil-change'
        }
      }
    }
  ];

  // 각 시나리오 테스트
  for (let i = 0; i < scenarios.length; i++) {
    const scenario = scenarios[i];
    
    console.log(`${i + 1}. ${scenario.name}`);
    console.log(`   Path: ${scenario.path}`);
    console.log(`   Operation: ${scenario.operation}`);
    console.log(`   Auth: ${scenario.request.auth ? `${scenario.request.auth.token.roles.join(',')} (${scenario.request.auth.token.dealerId})` : 'None'}`);
    
    const result = await rulesEvaluator.evaluate(
      scenario.operation,
      scenario.path, 
      {
        request: scenario.request,
        resource: scenario.resource,
        pathVariables: new Map()
      }
    );
    
    const statusIcon = result.allowed ? '✅' : '❌';
    const timing = `(${result.executionTime}ms)`;
    
    console.log(`   Result: ${statusIcon} ${result.allowed ? 'ALLOWED' : 'DENIED'} ${timing}`);
    if (result.reason) {
      console.log(`   Reason: ${result.reason}`);
    }
    if (result.rule) {
      console.log(`   Rule: ${result.rule.id} - ${result.rule.pathPattern}`);
    }
    console.log('');
  }

  // 4. 성능 통계
  console.log('📊 Performance Stats:');
  const stats = rulesEvaluator.getStats();
  console.log(`   Total evaluations: ${stats.evaluations}`);
  console.log(`   Cache hits: ${stats.cacheHits} (${((stats.cacheHits / stats.evaluations) * 100).toFixed(1)}%)`);
  console.log(`   Average time: ${stats.averageTime.toFixed(2)}ms`);
  console.log(`   Rules loaded: ${stats.rulesCount}`);
  console.log(`   Cache size: ${stats.cacheSize}`);
  console.log(`   Trie depth: ${stats.trieDepth}`);

  // 5. 캐시 효과 테스트
  console.log('\n⚡ Cache Performance Test:');
  const testPath = '/dealers/dealer123/bookings/booking456';
  const testContext = {
    request: scenarios[0].request,
    resource: scenarios[0].resource,
    pathVariables: new Map()
  };

  // 첫 번째 호출 (cache miss)
  const start1 = Date.now();
  await rulesEvaluator.evaluate('read', testPath, testContext);
  const time1 = Date.now() - start1;

  // 두 번째 호출 (cache hit)
  const start2 = Date.now(); 
  await rulesEvaluator.evaluate('read', testPath, testContext);
  const time2 = Date.now() - start2;

  console.log(`   Cache miss: ${time1}ms`);
  console.log(`   Cache hit: ${time2}ms`);
  console.log(`   Speedup: ${(time1 / time2).toFixed(1)}x faster`);
}

// 실행
testRulesSystem().catch(console.error);