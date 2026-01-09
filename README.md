# HyCore Agent

Node.js agent for managing Minecraft worlds via Docker containers.

## Features

-  Docker-based world management
-  Advanced logging system with file rotation
-  Security with Helmet & CORS
-  Health monitoring endpoints

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
| `DOCKER_IMAGE` | Minecraft Docker image | Required |
| `LOG_LEVEL` | Log level (error/warn/info/debug/trace) | `info` |
| `LOG_TO_FILE` | Enable file logging | `false` |
| `LOG_FILE_PATH` | Directory for log files | `./logs` |

## API Endpoints

### Health
- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed system info

### Worlds
- `POST /worlds` - Create a new world
- `GET /worlds` - List all worlds
- `GET /worlds/:id` - Get world status
- `GET /worlds/:id/logs` - Get world logs
- `POST /worlds/:id/start` - Start a world
- `POST /worlds/:id/stop` - Stop a world
- `DELETE /worlds/:id` - Delete a world

## Logger Usage

```javascript
import { logger } from './core/utils/logger.js'

logger.info('Server started')
logger.error('Something went wrong', error)
logger.debug('Debug info', { data: 'value' })

const dbLogger = logger.child('Database')
dbLogger.info('Connected') 

const timer = logger.time('operation')

timer.end() 
```

## License

ISC