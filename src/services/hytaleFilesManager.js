import fs from 'fs/promises';
import { createReadStream, createWriteStream } from 'fs';
import path from 'path';
import os from 'os';

class HytaleFilesManager {
  constructor() {
    // Rutas por defecto dentro del agente
    this.agentRoot = path.resolve(process.cwd());
    this.defaultServerFilesPath = path.join(this.agentRoot, 'hytale-files');
    this.defaultServerPath = path.join(this.defaultServerFilesPath, 'Server');
    this.defaultAssetsPath = path.join(this.defaultServerFilesPath, 'Assets.zip');
    this.defaultServersPath = path.join(this.agentRoot, 'servers');
    this.defaultBackupsPath = path.join(this.agentRoot, 'backups');
  }

  /**
   * Obtener la ruta de instalación del Launcher según el SO
   */
  getLauncherInstallPath() {
    const platform = os.platform();
    const home = os.homedir();

    switch (platform) {
      case 'win32':
        return path.join(process.env.APPDATA || path.join(home, 'AppData', 'Roaming'), 'Hytale', 'install', 'release', 'package', 'game', 'latest');
      case 'darwin':
        return path.join(home, 'Application Support', 'Hytale', 'install', 'release', 'package', 'game', 'latest');
      case 'linux':
      default:
        // Linux: verificar múltiples ubicaciones posibles
        return this.findLinuxLauncherPath(home);
    }
  }

  /**
   * Buscar la ruta del Launcher en Linux (soporta Flatpak y nativo)
   */
  findLinuxLauncherPath(home) {
    const possiblePaths = [
      // Flatpak (común en Linux Mint, Ubuntu, Fedora, etc.)
      path.join(home, '.var', 'app', 'com.hypixel.HytaleLauncher', 'data', 'Hytale', 'install', 'release', 'package', 'game', 'latest'),
      // XDG_DATA_HOME estándar
      path.join(process.env.XDG_DATA_HOME || path.join(home, '.local', 'share'), 'Hytale', 'install', 'release', 'package', 'game', 'latest'),
      // Otra posible ubicación
      path.join(home, '.hytale', 'install', 'release', 'package', 'game', 'latest'),
    ];

    // Verificar sincrónicamente cuál existe
    for (const p of possiblePaths) {
      try {
        const fs = require('fs');
        if (fs.existsSync(path.join(p, 'Server', 'HytaleServer.jar'))) {
          return p;
        }
      } catch {}
    }

    // Retornar la primera opción (Flatpak) como default para Linux Mint
    return possiblePaths[0];
  }

  /**
   * Verificar si los archivos del Launcher existen
   */
  async checkLauncherFiles() {
    const launcherPath = this.getLauncherInstallPath();
    const serverPath = path.join(launcherPath, 'Server');
    const assetsPath = path.join(launcherPath, 'Assets.zip');

    const result = {
      launcherPath,
      exists: false,
      serverExists: false,
      assetsExists: false,
      serverJarExists: false,
      files: []
    };

    try {
      await fs.access(launcherPath);
      result.exists = true;

      // Verificar carpeta Server
      try {
        await fs.access(serverPath);
        result.serverExists = true;
        
        // Verificar HytaleServer.jar dentro de Server
        const serverJarPath = path.join(serverPath, 'HytaleServer.jar');
        try {
          await fs.access(serverJarPath);
          result.serverJarExists = true;
        } catch {}

        // Listar archivos en Server
        const serverFiles = await fs.readdir(serverPath);
        result.files.push(...serverFiles.map(f => `Server/${f}`));
      } catch {}

      // Verificar Assets.zip
      try {
        await fs.access(assetsPath);
        result.assetsExists = true;
        const stat = await fs.stat(assetsPath);
        result.assetsSize = stat.size;
        result.assetsSizeHuman = this.formatBytes(stat.size);
      } catch {}

    } catch {
      result.exists = false;
    }

    return result;
  }

  /**
   * Verificar si los archivos ya están copiados en el agente
   */
  async checkAgentFiles() {
    const result = {
      path: this.defaultServerFilesPath,
      exists: false,
      serverExists: false,
      assetsExists: false,
      serverJarExists: false,
      ready: false
    };

    try {
      await fs.access(this.defaultServerFilesPath);
      result.exists = true;

      // Verificar Server
      try {
        await fs.access(this.defaultServerPath);
        result.serverExists = true;

        const serverJarPath = path.join(this.defaultServerPath, 'HytaleServer.jar');
        try {
          await fs.access(serverJarPath);
          result.serverJarExists = true;
        } catch {}
      } catch {}

      // Verificar Assets
      try {
        await fs.access(this.defaultAssetsPath);
        result.assetsExists = true;
        const stat = await fs.stat(this.defaultAssetsPath);
        result.assetsSize = stat.size;
        result.assetsSizeHuman = this.formatBytes(stat.size);
      } catch {}

      result.ready = result.serverJarExists && result.assetsExists;
    } catch {}

    return result;
  }

  /**
   * Copiar archivos desde el Launcher al agente
   */
  async copyFromLauncher(options = {}) {
    const { force = false } = options;

    // Verificar archivos del launcher
    const launcherCheck = await this.checkLauncherFiles();
    if (!launcherCheck.exists) {
      throw new Error(`Launcher no encontrado en: ${launcherCheck.launcherPath}`);
    }
    if (!launcherCheck.serverExists || !launcherCheck.serverJarExists) {
      throw new Error('Carpeta Server o HytaleServer.jar no encontrada en el Launcher');
    }
    if (!launcherCheck.assetsExists) {
      throw new Error('Assets.zip no encontrado en el Launcher');
    }

    // Verificar si ya existen archivos
    const agentCheck = await this.checkAgentFiles();
    if (agentCheck.ready && !force) {
      return {
        success: true,
        skipped: true,
        message: 'Los archivos ya existen. Usa force=true para sobreescribir.',
        paths: {
          serverPath: this.defaultServerPath,
          assetsPath: this.defaultAssetsPath
        }
      };
    }

    // Crear directorio destino
    await fs.mkdir(this.defaultServerFilesPath, { recursive: true });

    const launcherPath = this.getLauncherInstallPath();
    const sourcePaths = {
      server: path.join(launcherPath, 'Server'),
      assets: path.join(launcherPath, 'Assets.zip')
    };

    const result = {
      success: false,
      copied: [],
      errors: []
    };

    // Copiar carpeta Server
    try {
      await this.copyDirectory(sourcePaths.server, this.defaultServerPath);
      result.copied.push('Server/');
    } catch (error) {
      result.errors.push({ file: 'Server/', error: error.message });
    }

    // Copiar Assets.zip
    try {
      await this.copyFile(sourcePaths.assets, this.defaultAssetsPath);
      result.copied.push('Assets.zip');
    } catch (error) {
      result.errors.push({ file: 'Assets.zip', error: error.message });
    }

    result.success = result.errors.length === 0;
    result.paths = {
      serverPath: this.defaultServerPath,
      assetsPath: this.defaultAssetsPath
    };

    return result;
  }

  /**
   * Copiar un archivo
   */
  async copyFile(source, dest) {
    return new Promise((resolve, reject) => {
      const readStream = createReadStream(source);
      const writeStream = createWriteStream(dest);
      
      readStream.on('error', reject);
      writeStream.on('error', reject);
      writeStream.on('finish', resolve);
      
      readStream.pipe(writeStream);
    });
  }

  /**
   * Copiar un directorio recursivamente
   */
  async copyDirectory(source, dest) {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(source, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(source, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        await this.copyFile(srcPath, destPath);
      }
    }
  }

  /**
   * Crear estructura de directorios para un nuevo servidor
   */
  async createServerInstance(serverName) {
    const serverInstancePath = path.join(this.defaultServersPath, serverName);
    
    // Verificar que los archivos base existen
    const agentCheck = await this.checkAgentFiles();
    if (!agentCheck.ready) {
      throw new Error('Los archivos de Hytale no están disponibles. Ejecuta primero /setup/copy-files');
    }

    // Crear directorio del servidor
    await fs.mkdir(serverInstancePath, { recursive: true });

    // Copiar HytaleServer.jar y HytaleServer.aot si existe
    const filesToCopy = ['HytaleServer.jar', 'HytaleServer.aot'];
    for (const file of filesToCopy) {
      const sourcePath = path.join(this.defaultServerPath, file);
      const destPath = path.join(serverInstancePath, file);
      try {
        await this.copyFile(sourcePath, destPath);
      } catch {
        // HytaleServer.aot es opcional
        if (file === 'HytaleServer.jar') {
          throw new Error('No se pudo copiar HytaleServer.jar');
        }
      }
    }

    // Crear directorios necesarios
    const dirs = ['mods', 'logs', 'universe'];
    for (const dir of dirs) {
      await fs.mkdir(path.join(serverInstancePath, dir), { recursive: true });
    }

    // Crear directorio de backups para este servidor
    const backupDir = path.join(this.defaultBackupsPath, serverName);
    await fs.mkdir(backupDir, { recursive: true });

    return {
      success: true,
      serverPath: serverInstancePath,
      assetsPath: this.defaultAssetsPath,
      backupDir
    };
  }

  /**
   * Obtener rutas por defecto
   */
  getDefaultPaths() {
    return {
      agentRoot: this.agentRoot,
      hytaleFiles: this.defaultServerFilesPath,
      serverFiles: this.defaultServerPath,
      assetsPath: this.defaultAssetsPath,
      serversPath: this.defaultServersPath,
      backupsPath: this.defaultBackupsPath,
      launcherPath: this.getLauncherInstallPath()
    };
  }

  /**
   * Listar servidores creados
   */
  async listServerInstances() {
    try {
      const entries = await fs.readdir(this.defaultServersPath, { withFileTypes: true });
      const servers = [];

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const serverPath = path.join(this.defaultServersPath, entry.name);
          const hasJar = await this.fileExists(path.join(serverPath, 'HytaleServer.jar'));
          
          servers.push({
            name: entry.name,
            path: serverPath,
            ready: hasJar,
            assetsPath: this.defaultAssetsPath,
            backupDir: path.join(this.defaultBackupsPath, entry.name)
          });
        }
      }

      return servers;
    } catch {
      return [];
    }
  }

  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export default new HytaleFilesManager();
