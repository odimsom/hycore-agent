import fs from 'fs/promises';
import path from 'path';

class ConfigManager {
  constructor() {
    this.configFiles = ['config.json', 'permissions.json', 'bans.json', 'whitelist.json'];
  }

  /**
   * Read server configuration file
   */
  async readConfig(serverPath, configFile = 'config.json') {
    const filePath = path.join(serverPath, configFile);
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Write server configuration file
   */
  async writeConfig(serverPath, configFile, data) {
    const filePath = path.join(serverPath, configFile);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  }

  /**
   * Read world configuration
   */
  async readWorldConfig(serverPath, worldName = 'default') {
    const worldPath = path.join(serverPath, 'universe', 'worlds', worldName, 'config.json');
    try {
      const content = await fs.readFile(worldPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Update world configuration
   */
  async updateWorldConfig(serverPath, worldName, updates) {
    const worldPath = path.join(serverPath, 'universe', 'worlds', worldName, 'config.json');
    const current = await this.readWorldConfig(serverPath, worldName);
    
    if (!current) {
      throw new Error(`World ${worldName} not found`);
    }

    const updated = { ...current, ...updates };
    await fs.writeFile(worldPath, JSON.stringify(updated, null, 2), 'utf-8');
    return updated;
  }

  /**
   * List all worlds in a server
   */
  async listWorlds(serverPath) {
    const worldsPath = path.join(serverPath, 'universe', 'worlds');
    try {
      const entries = await fs.readdir(worldsPath, { withFileTypes: true });
      const worlds = [];

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const config = await this.readWorldConfig(serverPath, entry.name);
          worlds.push({
            name: entry.name,
            config
          });
        }
      }

      return worlds;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Manage bans list
   */
  async getBans(serverPath) {
    return await this.readConfig(serverPath, 'bans.json') || [];
  }

  async addBan(serverPath, playerUuid, reason) {
    const bans = await this.getBans(serverPath);
    bans.push({
      uuid: playerUuid,
      reason,
      created: new Date().toISOString()
    });
    await this.writeConfig(serverPath, 'bans.json', bans);
    return bans;
  }

  async removeBan(serverPath, playerUuid) {
    const bans = await this.getBans(serverPath);
    const filtered = bans.filter(b => b.uuid !== playerUuid);
    await this.writeConfig(serverPath, 'bans.json', filtered);
    return filtered;
  }

  /**
   * Manage whitelist
   */
  async getWhitelist(serverPath) {
    return await this.readConfig(serverPath, 'whitelist.json') || [];
  }

  async addToWhitelist(serverPath, playerUuid, playerName) {
    const whitelist = await this.getWhitelist(serverPath);
    whitelist.push({
      uuid: playerUuid,
      name: playerName,
      added: new Date().toISOString()
    });
    await this.writeConfig(serverPath, 'whitelist.json', whitelist);
    return whitelist;
  }

  async removeFromWhitelist(serverPath, playerUuid) {
    const whitelist = await this.getWhitelist(serverPath);
    const filtered = whitelist.filter(p => p.uuid !== playerUuid);
    await this.writeConfig(serverPath, 'whitelist.json', filtered);
    return filtered;
  }

  /**
   * Manage permissions
   */
  async getPermissions(serverPath) {
    return await this.readConfig(serverPath, 'permissions.json') || {};
  }

  async setPermission(serverPath, playerUuid, permissions) {
    const perms = await this.getPermissions(serverPath);
    perms[playerUuid] = permissions;
    await this.writeConfig(serverPath, 'permissions.json', perms);
    return perms;
  }
}

export default new ConfigManager();
