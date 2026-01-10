# HyCore Agent

Node.js agent for managing Hytale worlds via Docker containers.

## Features

- Docker-based world management
- Advanced logging system with file rotation
- Security with Helmet & CORS
- Health monitoring endpoints
- Real-time log streaming (SSE)

## Installation

```bash
npm install
cp .env.example .env
# Edit .env with your configuration
npm start
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment (development/production) | `development` |
| `WORLDS_PATH` | Path to store world data | Required |
| `DOCKER_IMAGE` | Hytale Docker image | Required |
| `LOG_LEVEL` | Log level (error/warn/info/debug/trace) | `info` |
| `LOG_TO_FILE` | Enable file logging | `false` |
| `LOG_FILE_PATH` | Directory for log files | `./logs` |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/health/detailed` | Detailed system info |
| `POST` | `/worlds` | Create world |
| `POST` | `/worlds/stream` | Create world + real-time logs |
| `GET` | `/worlds` | List all worlds |
| `GET` | `/worlds/:id` | Get world status |
| `GET` | `/worlds/:id/logs` | Get last N log lines |
| `GET` | `/worlds/:id/logs/stream` | Stream logs in real-time |
| `POST` | `/worlds/:id/start` | Start world |
| `POST` | `/worlds/:id/start/stream` | Start world + real-time logs |
| `POST` | `/worlds/:id/stop` | Stop world |
| `DELETE` | `/worlds/:id` | Delete world |

 **Full API Documentation:** [docs/API.md](docs/API.md)

## Quick Start

```bash
# Create a world
curl -X POST http://localhost:3000/worlds \
  -H "Content-Type: application/json" \
  -d '{"id": "survival", "memory": "2G", "cpus": 2, "port": 25565}'

# Stream logs in real-time
curl -N http://localhost:3000/worlds/survival/logs/stream

# Connect to Minecraft: localhost:25565
```

## Logger Usage

```javascript
import { logger } from './core/utils/logger.js'

logger.info('Message')
logger.error('Error', error)
logger.debug('Debug', { data: 'value' })

// Child logger
const dbLogger = logger.child('Database')
dbLogger.info('Connected')
```

## License

ISC

---

**Author:** Francisco Daniel Castro Borrome (Odimsom)
