# HyCore Agent

**Hytale Dedicated Server Management Agent**

A Node.js-based REST API agent for managing Hytale dedicated game servers. This agent provides comprehensive server lifecycle management, configuration handling, file operations, and system monitoring.

> 📖 **[Guía Completa de Servidores Hytale](docs/HYTALE_SERVER_GUIDE.md)** - Documentación detallada sobre configuración, optimización y operación de servidores Hytale.

## Features

- 🎮 **Server Management**: Start, stop, and monitor Hytale server instances
- 🔐 **Authentication**: Device-based OAuth2 authentication support
- ⚙️ **Configuration**: Manage server configs, world settings, bans, whitelist, and permissions
- 📦 **Mod Management**: Install, list, and remove server mods
- 💾 **Backup System**: Create and manage server backups
- 📊 **System Monitoring**: Track CPU, RAM, disk usage, and Java processes
- 🌐 **RESTful API**: Clean HTTP API for integration with control panels

## Requirements

- Node.js 18+
- Java 25 (Adoptium recommended)
- Hytale Server files (HytaleServer.jar + Assets.zip)
- Minimum 4GB RAM

## Installation

```bash
# Clone or download the agent
cd hycore-agent

# Install dependencies
npm install

# Copy and configure environment
cp .env.example .env

# Start the agent
npm start

# Or for development with auto-reload
npm run dev
```

## API Endpoints

### Health & Info
- `GET /health` - Health check
- `GET /api` - API documentation

### Server Management
- `GET /api/v1/servers` - List running servers
- `POST /api/v1/servers/:id/start` - Start a server
- `POST /api/v1/servers/:id/stop` - Stop a server
- `GET /api/v1/servers/:id/status` - Get server status
- `POST /api/v1/servers/:id/command` - Send console command
- `GET /api/v1/servers/:id/logs` - Get server logs
- `POST /api/v1/servers/:id/auth` - Initiate authentication

### Configuration
- `GET /api/v1/servers/:id/config` - Get server config
- `PUT /api/v1/servers/:id/config` - Update server config
- `GET /api/v1/servers/:id/worlds` - List worlds
- `GET/PUT /api/v1/servers/:id/worlds/:name` - World config
- `GET/POST/DELETE /api/v1/servers/:id/bans` - Ban management
- `GET/POST/DELETE /api/v1/servers/:id/whitelist` - Whitelist management

### File Management
- `GET /api/v1/servers/:id/structure` - Directory structure
- `GET/POST/DELETE /api/v1/servers/:id/mods` - Mod management
- `GET /api/v1/servers/:id/files/logs` - List log files
- `GET/POST/DELETE /api/v1/servers/:id/backups` - Backup management

### System
- `GET /api/v1/system/info` - System information
- `GET /api/v1/system/usage` - Current resource usage
- `GET /api/v1/system/requirements` - Check Hytale requirements
- `GET /api/v1/java/verify` - Verify Java installation

## Usage Examples

### Start a Server

```bash
curl -X POST http://localhost:3000/api/v1/servers/main/start \
  -H "Content-Type: application/json" \
  -d '{
    "serverPath": "/path/to/server",
    "assetsPath": "/path/to/Assets.zip",
    "port": 5520,
    "jvmArgs": ["-Xms2G", "-Xmx4G"],
    "aotCache": true
  }'
```

### Send Command

```bash
curl -X POST http://localhost:3000/api/v1/servers/main/command \
  -H "Content-Type: application/json" \
  -d '{"command": "/auth login device"}'
```

### Check System Requirements

```bash
curl http://localhost:3000/api/v1/system/requirements
```

## Hytale Server Notes

- **Port**: Default is UDP 5520 (QUIC protocol)
- **Authentication**: Required for API access, use device flow
- **AOT Cache**: Enable for faster boot times
- **View Distance**: Limit to 12 chunks for better performance
- **Firewall**: Configure UDP, not TCP

## Documentación

- 📖 [Guía de Servidores Hytale](docs/HYTALE_SERVER_GUIDE.md) - Configuración completa, optimización y troubleshooting
- 🔧 [Hytale Server Manual](https://hytale.com/news/2024/12/hytale-server-manual) - Documentación oficial de Hypixel Studios

## Recursos Externos

- [Adoptium JDK 25](https://adoptium.net/) - Java runtime recomendado
- [Hytale Downloader](https://hytale.com/) - CLI para descargar archivos del servidor

## License

ISC © Francisco Daniel Castro Borrome (Odimsom)