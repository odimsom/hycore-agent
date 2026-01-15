import { spawn, execSync } from 'child_process';
import { EventEmitter } from 'events';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import os from 'os';
import hytaleFilesManager from './hytaleFilesManager.js';

class HytaleServerManager extends EventEmitter {
  constructor() {
    super();
    this.servers = new Map();
    this.defaultPort = 5520;
    this.defaultJvmArgs = ['-Xms2G', '-Xmx4G'];
    this.javaPath = this.findJava25Path();
  }

  /**
   * Find Java 25 path - checks SDKMAN, system paths, and common locations
   */
  findJava25Path() {
    const home = os.homedir();
    
    // Possible Java 25 locations
    const possiblePaths = [
      // SDKMAN paths
      path.join(home, '.sdkman', 'candidates', 'java', 'current', 'bin', 'java'),
      path.join(home, '.sdkman', 'candidates', 'java', '25-open', 'bin', 'java'),
      path.join(home, '.sdkman', 'candidates', 'java', '25.0.1-open', 'bin', 'java'),
      path.join(home, '.sdkman', 'candidates', 'java', '25.0.1-tem', 'bin', 'java'),
      // System paths
      '/opt/java/jdk-25/bin/java',
      '/usr/lib/jvm/java-25-openjdk/bin/java',
      '/usr/lib/jvm/temurin-25-jdk/bin/java',
      // Default (system java)
      'java'
    ];

    for (const javaPath of possiblePaths) {
      try {
        if (javaPath === 'java' || existsSync(javaPath)) {
          // Verify it's Java 25+
          const version = execSync(`"${javaPath}" -version 2>&1`, { encoding: 'utf8' });
          if (version.includes('25.') || version.includes('version "25')) {
            console.log(`[HytaleServerManager] Found Java 25 at: ${javaPath}`);
            return javaPath;
          }
        }
      } catch (e) {
        // Continue to next path
      }
    }

    console.warn('[HytaleServerManager] Java 25 not found, using system java');
    return 'java';
  }

  /**
   * Obtener rutas por defecto para un servidor
   */
  getDefaultServerPaths(serverId) {
    const defaults = hytaleFilesManager.getDefaultPaths();
    return {
      serverPath: path.join(defaults.serversPath, serverId),
      assetsPath: defaults.assetsPath,
      backupDir: path.join(defaults.backupsPath, serverId)
    };
  }

  /**
   * Verify Java installation
   */
  async verifyJava() {
    return new Promise((resolve, reject) => {
      const javaCmd = this.javaPath;
      const process = spawn(javaCmd, ['--version'], { shell: true });
      let output = '';

      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.stderr.on('data', (data) => {
        output += data.toString();
      });

      process.on('close', (code) => {
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
  async startServer(serverId, config = {}) {
    if (this.servers.has(serverId)) {
      throw new Error(`Server ${serverId} is already running`);
    }

    // Obtener rutas por defecto si no se proporcionan
    const defaultPaths = this.getDefaultServerPaths(serverId);

    const {
      serverPath = defaultPaths.serverPath,
      assetsPath = defaultPaths.assetsPath,
      port = this.defaultPort,
      jvmArgs = this.defaultJvmArgs,
      authMode = 'authenticated',
      aotCache = true,
      disableSentry = false,
      backup = false,
      backupDir = defaultPaths.backupDir,
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

    if (backup && backupDir) {
      args.push('--backup');
      args.push('--backup-dir', backupDir);
      args.push('--backup-frequency', backupFrequency.toString());
    }

    // Spawn the server process using found Java 25 path
    const process = spawn(this.javaPath, args, {
      cwd: serverPath,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    const serverInstance = {
      id: serverId,
      process: process,
      config,
      port,
      startTime: Date.now(),
      status: 'starting',
      logs: []
    };

    process.stdout.on('data', (data) => {
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

    process.stderr.on('data', (data) => {
      const log = data.toString();
      serverInstance.logs.push({ type: 'stderr', message: log, timestamp: Date.now() });
      this.emit('log', serverId, 'stderr', log);
    });

    process.on('close', (code) => {
      serverInstance.status = 'stopped';
      serverInstance.exitCode = code;
      this.servers.delete(serverId);
      this.emit('stopped', serverId, code);
    });

    process.on('error', (err) => {
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
