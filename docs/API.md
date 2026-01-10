# HyCore Agent API Documentation

Complete API reference for the HyCore Agent.

## Base URL

```
http://localhost:3000
```

---

## Health Endpoints

### `GET /health`
Basic health check.

**Response:**
```json
{
  "success": true,
  "status": "ok",
  "agent": "hycore",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "environment": "development"
}
```

---

### `GET /health/detailed`
Detailed system information including CPU, memory, and process stats.

**Response:**
```json
{
  "success": true,
  "status": "ok",
  "agent": "hycore",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "environment": "development",
  "system": {
    "platform": "linux",
    "arch": "x64",
    "hostname": "server-01",
    "cpus": 8,
    "totalMemory": "16.00 GB",
    "freeMemory": "8.50 GB",
    "loadAverage": [0.5, 0.7, 0.6]
  },
  "process": {
    "pid": 12345,
    "nodeVersion": "v20.10.0",
    "memoryUsage": {
      "heapUsed": "45.23 MB",
      "heapTotal": "60.00 MB",
      "rss": "80.12 MB"
    }
  }
}
```

---

## Worlds Endpoints

### `POST /worlds`
Create a new Minecraft world container.

**Request Body:**
```json
{
  "id": "my-world",
  "memory": "2G",
  "cpus": 2,
  "port": 25565
}
```

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| `id` | string | Unique world identifier | ✅ |
| `memory` | string | Memory limit (e.g., "2G", "512M") | ✅ |
| `cpus` | integer | Number of CPU cores | ✅ |
| `port` | integer | External port (1024-65535) | ✅ |

**Response (201):**
```json
{
  "success": true,
  "message": "World created successfully",
  "data": {
    "id": "my-world",
    "memory": "2G",
    "cpus": 2,
    "port": 25565
  }
}
```

**Errors:**
- `400` - Missing or invalid fields
- `409` - World already exists

---

### `POST /worlds/stream`
Create a new world with real-time log streaming (SSE).

**Request Body:** Same as `POST /worlds`

**Response:** Server-Sent Events stream

**Events:**
| Event | Description |
|-------|-------------|
| `status` | Creation status updates |
| `log` | Docker log lines |
| `error` | Error messages |

**Example:**
```bash
curl -N -X POST http://localhost:3000/worlds/stream \
  -H "Content-Type: application/json" \
  -d '{"id": "my-world", "memory": "2G", "cpus": 2, "port": 25565}'
```

---

### `GET /worlds`
List all worlds managed by this agent.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "my-world",
      "name": "hycore-world-my-world",
      "status": "Up 2 hours",
      "ports": "0.0.0.0:25565->25565/tcp"
    }
  ],
  "count": 1
}
```

---

### `GET /worlds/:id`
Get the status of a specific world.

**Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `id` | string | World identifier |

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "my-world",
    "status": "running"
  }
}
```

**Possible status values:**
- `running` - Container is running
- `exited` - Container stopped
- `paused` - Container paused
- `not_found` - Container doesn't exist

---

### `GET /worlds/:id/logs`
Get the last N lines of logs from a world.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `lines` | integer | 100 | Number of lines (1-1000) |

**Example:**
```bash
curl "http://localhost:3000/worlds/my-world/logs?lines=50"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "my-world",
    "logs": "[10:30:00] [Server thread/INFO]: Done (5.234s)!...",
    "lines": 50
  }
}
```

**Errors:**
- `400` - Invalid lines parameter
- `404` - World not found

---

### `GET /worlds/:id/logs/stream`
Stream logs in real-time using Server-Sent Events.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `tail` | integer | 50 | Initial lines to fetch |

**Example:**
```bash
curl -N "http://localhost:3000/worlds/my-world/logs/stream?tail=100"
```

**Events:**
| Event | Data | Description |
|-------|------|-------------|
| `connected` | `{message}` | Connection established |
| `log` | `{timestamp, type, message}` | Log line |
| `error` | `{error}` | Error occurred |

**Event Data Example:**
```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "type": "stdout",
  "message": "[Server thread/INFO]: Player joined the game"
}
```

**JavaScript Client:**
```javascript
const es = new EventSource('/worlds/my-world/logs/stream');

es.addEventListener('log', (e) => {
  const { timestamp, type, message } = JSON.parse(e.data);
  console.log(`[${timestamp}] [${type}] ${message}`);
});

es.addEventListener('error', (e) => {
  console.error('Error:', JSON.parse(e.data).error);
});

// Close when done
es.close();
```

---

### `POST /worlds/:id/start`
Start a stopped world.

**Response:**
```json
{
  "success": true,
  "message": "World started successfully",
  "data": { "id": "my-world" }
}
```

**Errors:**
- `404` - World not found
- `409` - World is already running

---

### `POST /worlds/:id/start/stream`
Start a world with real-time log streaming (SSE).

**Example:**
```bash
curl -N -X POST http://localhost:3000/worlds/my-world/start/stream
```

**Events:**
| Event | Data | Description |
|-------|------|-------------|
| `status` | `{status, message}` | Start progress |
| `log` | `{timestamp, type, message}` | Server logs |
| `error` | `{error, code}` | Error with code |

---

### `POST /worlds/:id/stop`
Stop a running world.

**Response:**
```json
{
  "success": true,
  "message": "World stopped successfully",
  "data": { "id": "my-world" }
}
```

**Errors:**
- `404` - World not found
- `409` - World is not running

---

### `DELETE /worlds/:id`
Delete a world container. Stops the container first if running.

**Response:**
```json
{
  "success": true,
  "message": "World deleted successfully",
  "data": { "id": "my-world" }
}
```

**Errors:**
- `404` - World not found

> ⚠️ **Note:** This only removes the Docker container. World data in `WORLDS_PATH` is preserved.

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "message": "Error description"
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| `200` | Success |
| `201` | Created |
| `400` | Bad Request - Invalid parameters |
| `404` | Not Found - Resource doesn't exist |
| `409` | Conflict - State conflict (already running, etc) |
| `500` | Internal Server Error |

---

## Author

**Francisco Daniel Castro Borrome (Odimsom)**