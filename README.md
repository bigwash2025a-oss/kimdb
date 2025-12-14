# kimdb

High-performance document database with CRDT real-time sync.

```bash
npm install kimdb
```

## Features

- **Document Database**: SQLite-based, JSON documents
- **Real-time Sync**: WebSocket + CRDT (Conflict-free Replicated Data Types)
- **Offline-first**: Local-first with automatic sync
- **CRDT Primitives**: VectorClock, LWWSet, LWWMap, RGA, RichText
- **Presence**: Real-time user presence and cursors
- **Undo/Redo**: Built-in undo/redo support
- **TypeScript**: Full TypeScript support
- **Redis Clustering**: Optional multi-server support

## Quick Start

### CLI

```bash
# Initialize project
npx kimdb init

# Start server
npx kimdb start
```

### Server

```typescript
import { KimDBServer } from 'kimdb/server';

const server = new KimDBServer();
await server.start();
// Server running on http://localhost:40000
```

### Client

```typescript
import { KimDBClient } from 'kimdb/client';

const client = new KimDBClient({
  url: 'ws://localhost:40000/ws',
  apiKey: 'your-api-key',
});

await client.connect();

// Subscribe to collection
client.subscribe('posts');

// Open document
const doc = await client.openDocument('posts', 'post-1');

// Set values
client.set('posts', 'post-1', 'title', 'Hello World');
client.set('posts', 'post-1', ['author', 'name'], 'John');

// Listen for sync events
client.onSync = (collection, event, data) => {
  console.log('Sync:', collection, event, data);
};
```

### CRDT Direct Usage

```typescript
import { CRDTDocument, LWWSet, VectorClock } from 'kimdb/crdt';

// Document with automatic conflict resolution
const doc = new CRDTDocument('node1', 'doc-1');
doc.set('title', 'My Document');
doc.listInsert('tags', 0, 'crdt');
doc.setAdd('authors', 'user1');

// Get as plain object
const obj = doc.toObject();

// Serialize for network/storage
const json = doc.toJSON();
const restored = CRDTDocument.fromJSON(json);

// Standalone CRDT types
const set = new LWWSet('node1');
set.add('item1');
set.remove('item2');
```

## Configuration

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `KIMDB_API_KEY` | (required in prod) | API key for authentication |
| `KIMDB_PORT` | 40000 | Server port |
| `KIMDB_HOST` | 0.0.0.0 | Server host |
| `KIMDB_DATA_DIR` | ./data | Data directory |
| `REDIS_ENABLED` | false | Enable Redis for clustering |
| `MARIADB_ENABLED` | false | Enable MariaDB for logging |

## REST API

### Health Check
```
GET /health
```

### Collections
```
GET /api/collections
GET /api/c/:collection
GET /api/c/:collection/:id
```

### SQL API
```
POST /api/sql
{
  "sql": "SELECT * FROM table WHERE id = ?",
  "params": [1],
  "collection": "my_collection"
}
```

## WebSocket API

Connect to `ws://host:port/ws`

### Messages

```typescript
// Subscribe
{ type: 'subscribe', collection: 'posts' }

// Get CRDT state
{ type: 'crdt_get', collection: 'posts', docId: 'post-1' }

// Set value
{ type: 'crdt_set', collection: 'posts', docId: 'post-1', path: 'title', value: 'Hello' }

// Batch operations
{ type: 'crdt_ops', collection: 'posts', docId: 'post-1', operations: [...] }

// Presence
{ type: 'presence_join', collection: 'posts', docId: 'post-1', user: { name: 'John' } }
```

## CRDT Types

### VectorClock
Logical clock for causal ordering.

```typescript
const clock = new VectorClock('node1');
clock.tick();
clock.merge(otherClock);
clock.compare(otherClock); // -1, 0, 1
```

### LWWSet (Last-Writer-Wins Set)
Set with timestamps for conflict resolution.

```typescript
const set = new LWWSet('node1');
set.add('item');
set.remove('item');
set.has('item');
set.toArray();
```

### LWWMap
Map with LWW conflict resolution.

```typescript
const map = new LWWMap('node1');
map.set('key', 'value');
map.get('key');
map.delete('key');
map.toObject();
```

### RGA (Replicated Growable Array)
Ordered list/text with character-level sync.

```typescript
const rga = new RGA('node1');
rga.insert(0, 'a');
rga.insert(1, 'b');
rga.delete(0);
rga.toArray();
rga.toString();
```

### RichText
Rich text with formatting support.

```typescript
const rt = new RichText('node1');
rt.insert(0, 'H', { bold: true });
rt.format(0, 5, { italic: true });
rt.toDelta(); // Quill-compatible
```

## Production Deployment

### PM2

```bash
# Initialize
npx kimdb init

# Start with PM2
pm2 start ecosystem.config.cjs
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
RUN npm install kimdb
COPY .env .
CMD ["npx", "kimdb", "start"]
```

## Clustering

Multi-server synchronization via Redis Pub/Sub:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Server 1   │────▶│    Redis    │◀────│  Server 2   │
│  :40000     │◀────│   Pub/Sub   │────▶│   :40001    │
└─────────────┘     └─────────────┘     └─────────────┘
```

```bash
# Server 1
KIMDB_PORT=40000 REDIS_ENABLED=true REDIS_HOST=redis-server npx kimdb start

# Server 2
KIMDB_PORT=40001 REDIS_ENABLED=true REDIS_HOST=redis-server npx kimdb start
```

## Security

- Set `KIMDB_API_KEY` environment variable (required in production)
- API key is validated on all HTTP and WebSocket requests
- Use HTTPS/WSS in production

## License

MIT
