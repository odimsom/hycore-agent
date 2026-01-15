import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import hytaleRoutes from './routes/hytaleRoutes.js';
import setupRoutes from './routes/setupRoutes.js';
import hytaleServerManager from './services/hytaleServerManager.js';
import hytaleFilesManager from './services/hytaleFilesManager.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'HyCore Agent',
    version: '2.0.0',
    timestamp: new Date().toISOString()
  });
});

// API Info
app.get('/api', (req, res) => {
  res.json({
    name: 'HyCore Agent API',
    version: '2.0.0',
    description: 'Hytale Dedicated Server Management Agent',
    endpoints: {
      health: 'GET /health',
      setup: {
        status: 'GET /api/v1/setup/status',
        copyFiles: 'POST /api/v1/setup/copy-files',
        createServer: 'POST /api/v1/setup/create-server',
        listServers: 'GET /api/v1/setup/servers',
        paths: 'GET /api/v1/setup/paths',
        checkLauncher: 'GET /api/v1/setup/check-launcher'
      },
      servers: {
        list: 'GET /api/v1/servers',
        start: 'POST /api/v1/servers/:id/start',
        stop: 'POST /api/v1/servers/:id/stop',
        status: 'GET /api/v1/servers/:id/status',
        command: 'POST /api/v1/servers/:id/command',
        logs: 'GET /api/v1/servers/:id/logs',
        auth: 'POST /api/v1/servers/:id/auth'
      },
      config: {
        get: 'GET /api/v1/servers/:id/config',
        update: 'PUT /api/v1/servers/:id/config',
        worlds: 'GET /api/v1/servers/:id/worlds',
        bans: 'GET/POST/DELETE /api/v1/servers/:id/bans',
        whitelist: 'GET/POST/DELETE /api/v1/servers/:id/whitelist'
      },
      files: {
        structure: 'GET /api/v1/servers/:id/structure',
        mods: 'GET/POST/DELETE /api/v1/servers/:id/mods',
        logs: 'GET /api/v1/servers/:id/files/logs',
        backups: 'GET/POST/DELETE /api/v1/servers/:id/backups',
        diskUsage: 'GET /api/v1/servers/:id/disk-usage'
      },
      system: {
        info: 'GET /api/v1/system/info',
        usage: 'GET /api/v1/system/usage',
        requirements: 'GET /api/v1/system/requirements',
        network: 'GET /api/v1/system/network',
        disks: 'GET /api/v1/system/disks',
        javaProcesses: 'GET /api/v1/system/java-processes'
      },
      java: {
        verify: 'GET /api/v1/java/verify'
      }
    }
  });
});

// API Routes
app.use('/api/v1', hytaleRoutes);
app.use('/api/v1/setup', setupRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Server event listeners
hytaleServerManager.on('started', (serverId) => {
  console.log(`[HyCore] Server ${serverId} started successfully`);
});

hytaleServerManager.on('stopped', (serverId, code) => {
  console.log(`[HyCore] Server ${serverId} stopped with code ${code}`);
});

hytaleServerManager.on('authenticated', (serverId) => {
  console.log(`[HyCore] Server ${serverId} authenticated successfully`);
});

hytaleServerManager.on('error', (serverId, error) => {
  console.error(`[HyCore] Server ${serverId} error:`, error.message);
});

// Start server
app.listen(PORT, HOST, () => {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                    HyCore Agent v2.0.0                     ║');
  console.log('║          Hytale Dedicated Server Management                ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(`║  Server running on http://${HOST}:${PORT}                     ║`);
  console.log(`║  API Documentation: http://${HOST}:${PORT}/api               ║`);
  console.log('╚════════════════════════════════════════════════════════════╝');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\n[HyCore] Received SIGTERM, shutting down gracefully...');
  
  // Stop all running servers
  const servers = hytaleServerManager.getAllServers();
  for (const server of servers) {
    console.log(`[HyCore] Stopping server ${server.id}...`);
    await hytaleServerManager.stopServer(server.id, true);
  }
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\n[HyCore] Received SIGINT, shutting down gracefully...');
  
  const servers = hytaleServerManager.getAllServers();
  for (const server of servers) {
    console.log(`[HyCore] Stopping server ${server.id}...`);
    await hytaleServerManager.stopServer(server.id, true);
  }
  
  process.exit(0);
});

export default app;