import fs from 'fs/promises';
import path from 'path';
import { createWriteStream, createReadStream } from 'fs';
import archiver from 'archiver';

class FileManager {
  /**
   * Get server directory structure info
   */
  async getServerStructure(serverPath) {
    const structure = {
      cache: await this.dirExists(path.join(serverPath, '.cache')),
      logs: await this.dirExists(path.join(serverPath, 'logs')),
      mods: await this.dirExists(path.join(serverPath, 'mods')),
      universe: await this.dirExists(path.join(serverPath, 'universe')),
      serverJar: await this.fileExists(path.join(serverPath, 'HytaleServer.jar')),
      aotCache: await this.fileExists(path.join(serverPath, 'HytaleServer.aot')),
      config: await this.fileExists(path.join(serverPath, 'config.json'))
    };

    return structure;
  }

  async dirExists(dirPath) {
    try {
      const stat = await fs.stat(dirPath);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  async fileExists(filePath) {
    try {
      const stat = await fs.stat(filePath);
      return stat.isFile();
    } catch {
      return false;
    }
  }

  /**
   * List installed mods
   */
  async listMods(serverPath) {
    const modsPath = path.join(serverPath, 'mods');
    try {
      const files = await fs.readdir(modsPath);
      const mods = [];

      for (const file of files) {
        if (file.endsWith('.zip') || file.endsWith('.jar')) {
          const stat = await fs.stat(path.join(modsPath, file));
          mods.push({
            name: file,
            size: stat.size,
            modified: stat.mtime
          });
        }
      }

      return mods;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Install a mod from buffer
   */
  async installMod(serverPath, modName, modBuffer) {
    const modsPath = path.join(serverPath, 'mods');
    await fs.mkdir(modsPath, { recursive: true });
    
    const modPath = path.join(modsPath, modName);
    await fs.writeFile(modPath, modBuffer);
    
    return { installed: true, path: modPath };
  }

  /**
   * Remove a mod
   */
  async removeMod(serverPath, modName) {
    const modPath = path.join(serverPath, 'mods', modName);
    await fs.unlink(modPath);
    return { removed: true };
  }

  /**
   * List log files
   */
  async listLogs(serverPath) {
    const logsPath = path.join(serverPath, 'logs');
    try {
      const files = await fs.readdir(logsPath);
      const logs = [];

      for (const file of files) {
        const stat = await fs.stat(path.join(logsPath, file));
        logs.push({
          name: file,
          size: stat.size,
          modified: stat.mtime
        });
      }

      return logs.sort((a, b) => b.modified - a.modified);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Read log file content
   */
  async readLog(serverPath, logName, lines = 1000) {
    const logPath = path.join(serverPath, 'logs', logName);
    const content = await fs.readFile(logPath, 'utf-8');
    const allLines = content.split('\n');
    return allLines.slice(-lines).join('\n');
  }

  /**
   * Create manual backup
   */
  async createBackup(serverPath, backupDir) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `backup-${timestamp}.zip`;
    const backupPath = path.join(backupDir, backupName);

    await fs.mkdir(backupDir, { recursive: true });

    return new Promise((resolve, reject) => {
      const output = createWriteStream(backupPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => {
        resolve({
          path: backupPath,
          size: archive.pointer(),
          name: backupName
        });
      });

      archive.on('error', reject);
      archive.pipe(output);

      // Backup universe (worlds and player data)
      archive.directory(path.join(serverPath, 'universe'), 'universe');
      
      // Backup config files
      const configFiles = ['config.json', 'permissions.json', 'bans.json', 'whitelist.json'];
      for (const file of configFiles) {
        const filePath = path.join(serverPath, file);
        archive.file(filePath, { name: file }).catch(() => {});
      }

      archive.finalize();
    });
  }

  /**
   * List available backups
   */
  async listBackups(backupDir) {
    try {
      const files = await fs.readdir(backupDir);
      const backups = [];

      for (const file of files) {
        if (file.startsWith('backup-') && file.endsWith('.zip')) {
          const stat = await fs.stat(path.join(backupDir, file));
          backups.push({
            name: file,
            size: stat.size,
            created: stat.birthtime
          });
        }
      }

      return backups.sort((a, b) => b.created - a.created);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Delete a backup
   */
  async deleteBackup(backupDir, backupName) {
    const backupPath = path.join(backupDir, backupName);
    await fs.unlink(backupPath);
    return { deleted: true };
  }

  /**
   * Get disk usage for server directory
   */
  async getDiskUsage(serverPath) {
    const usage = {
      total: 0,
      universe: 0,
      mods: 0,
      logs: 0,
      cache: 0
    };

    const calculateDirSize = async (dirPath) => {
      try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        let size = 0;
        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);
          if (entry.isDirectory()) {
            size += await calculateDirSize(fullPath);
          } else {
            const stat = await fs.stat(fullPath);
            size += stat.size;
          }
        }
        return size;
      } catch {
        return 0;
      }
    };

    usage.universe = await calculateDirSize(path.join(serverPath, 'universe'));
    usage.mods = await calculateDirSize(path.join(serverPath, 'mods'));
    usage.logs = await calculateDirSize(path.join(serverPath, 'logs'));
    usage.cache = await calculateDirSize(path.join(serverPath, '.cache'));
    usage.total = usage.universe + usage.mods + usage.logs + usage.cache;

    return usage;
  }
}

export default new FileManager();
