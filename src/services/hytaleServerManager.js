import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import fs from 'fs/promises';
import path from 'path';

class HytaleServerManager extends EventEmitter {
  constructor() {
    super();
    this.servers = new Map();
    this.defaultPort = 5520;
    this.defaultJvmArgs = ['-Xms2G', '-Xmx4G'];
  }

  /**
   * Verify Java 25 installation
   */
  async verifyJava() {
    return new Promise((resolve, reject) => {
      const java = spawn('java', ['--version']);
      let output = '';

      java.stdout.on('data', (data) => {
        output += data.toString();
      });

      java.stderr.on('data', (data) => {
        output += data.toString();
      });

      java.on('close', (code) => {
        if (code !== 0) {
          return reject(new Error('Java not found. Please install Java 25 (Adoptium recommended).'));
        }

        const versionMatch = output.match(/openjdk (\d+)/);
        if (versionMatch && parseInt(versionMatch[1]) >= 25) {
          resolve({
            installed: true,
            version: output.trim(),
            compatible: true
          });
        } else {
          reject(new Error('Java 25 or higher required. Found: ' + output));
        }
      });
    });
  }

  /**
   * Start a Hytale server instance
   */
  async startServer(serverId, config) {
    if (this.servers.has(serverId)) {
      throw new Error(`Server ${serverId} is already running`);
    }

    const {
      serverPath,
      assetsPath,
      port = this.defaultPort,
      jvmArgs = this.defaultJvmArgs,
      authMode = 'authenticated',
      aotCache = true,
      disableSentry = false,
      backup = false,
      backupDir,
      backupFrequency = 30
    } = config;

    // Verify paths exist
    const jarPath = path.join(serverPath, 'HytaleServer.jar');
    await fs.access(jarPath);
    await fs.access(assetsPath);

    // Build command arguments
    const args = [...jvmArgs];

    // Add AOT cache if enabled
    if (aotCache) {
      const aotPath = path.join(serverPath, 'HytaleServer.aot');
      try {
        await fs.access(aotPath);
        args.push(`-XX:AOTCache=${aotPath}`);
      } catch {
        // AOT cache not available, skip
      }
    }

    args.push('-jar', jarPath);
    args.push('--assets', assetsPath);
    args.push('--bind', `0.0.0.0:${port}`);
    args.push('--auth-mode', authMode);

    if (disableSentry) {
      args.push('--disable-sentry');
    }

    if (backup) {
      args.push('--backup');
      if (backupDir) {
        args.push('--backup-dir', backupDir);
      }
      args.push('--backup-frequency', backupFrequency.toString());
    }

    // Spawn server process
    const serverProcess = spawn('java', args, {
      cwd: serverPath,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    const serverInstance = {
      id: serverId,
      process: serverProcess,
      config,
      port,
      startTime: Date.now(),
      status: 'starting',
      logs: []
    };

    serverProcess.stdout.on('data', (data) => {
      const log = data.toString();
      serverInstance.logs.push({ type: 'stdout', message: log, timestamp: Date.now() });
      this.emit('log', serverId, 'stdout', log);
      
      if (log.includes('Authentication successful')) {
        serverInstance.status = 'authenticated';
        this.emit('authenticated', serverId);
      }
      if (log.includes('Server started') || log.includes('Done')) {
        serverInstance.status = 'running';
        this.emit('started', serverId);
      }
    });

    serverProcess.stderr.on('data', (data) => {
      const log = data.toString();
      serverInstance.logs.push({ type: 'stderr', message: log, timestamp: Date.now() });
      this.emit('log', serverId, 'stderr', log);
    });

    serverProcess.on('close', (code) => {
      serverInstance.status = 'stopped';
      serverInstance.exitCode = code;
      this.servers.delete(serverId);
      this.emit('stopped', serverId, code);
    });

    serverProcess.on('error', (err) => {
      serverInstance.status = 'error';
      this.emit('error', serverId, err);
    });

    this.servers.set(serverId, serverInstance);
    return serverInstance;
  }

  /**
   * Stop a running server
   */
  async stopServer(serverId, graceful = true) {
    const server = this.servers.get(serverId);
    if (!server) {
      throw new Error(`Server ${serverId} is not running`);
    }

    if (graceful) {
      // Send stop command through stdin
      server.process.stdin.write('/stop\n');
      
      // Wait for graceful shutdown with timeout
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          server.process.kill('SIGKILL');
          resolve({ graceful: false });
        }, 30000);

        server.process.on('close', () => {
          clearTimeout(timeout);
          resolve({ graceful: true });
        });
      });
    } else {
      server.process.kill('SIGKILL');
      return { graceful: false };
    }
  }

  /**
   * Send command to server console
   */
  sendCommand(serverId, command) {
    const server = this.servers.get(serverId);
    if (!server) {
      throw new Error(`Server ${serverId} is not running`);
    }

    server.process.stdin.write(command + '\n');
    return true;
  }

  /**
   * Get server status
   */
  getServerStatus(serverId) {
    const server = this.servers.get(serverId);
    if (!server) {
      return { status: 'stopped' };
    }

    return {
      id: server.id,
      status: server.status,
      port: server.port,
      uptime: Date.now() - server.startTime,
      logsCount: server.logs.length
    };
  }

  /**
   * Get all running servers
   */
  getAllServers() {
    const servers = [];
    for (const [id, server] of this.servers) {
      servers.push(this.getServerStatus(id));
    }
    return servers;
  }

  /**
   * Get recent logs for a server
   */
  getLogs(serverId, limit = 100) {
    const server = this.servers.get(serverId);
    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }

    return server.logs.slice(-limit);
  }

  /**
   * Initiate device authentication
   */
  async initiateAuth(serverId) {
    return this.sendCommand(serverId, '/auth login device');
  }
}

export default new HytaleServerManager();
