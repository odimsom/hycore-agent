import { Router } from 'express';
import hytaleServerManager from '../services/hytaleServerManager.js';
import configManager from '../services/configManager.js';
import fileManager from '../services/fileManager.js';
import systemMonitor from '../services/systemMonitor.js';

const router = Router();

// ============== Server Management ==============

/**
 * POST /servers/:id/start - Start a Hytale server
 */
router.post('/servers/:id/start', async (req, res, next) => {
  try {
    const { id } = req.params;
    const config = req.body;
    
    const server = await hytaleServerManager.startServer(id, config);
    res.status(201).json({
      success: true,
      server: {
        id: server.id,
        status: server.status,
        port: server.port
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /servers/:id/stop - Stop a running server
 */
router.post('/servers/:id/stop', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { graceful = true } = req.body;
    
    const result = await hytaleServerManager.stopServer(id, graceful);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /servers/:id/status - Get server status
 */
router.get('/servers/:id/status', (req, res) => {
  const { id } = req.params;
  const status = hytaleServerManager.getServerStatus(id);
  res.json(status);
});

/**
 * GET /servers - List all running servers
 */
router.get('/servers', (req, res) => {
  const servers = hytaleServerManager.getAllServers();
  res.json({ servers });
});

/**
 * POST /servers/:id/command - Send command to server console
 */
router.post('/servers/:id/command', (req, res, next) => {
  try {
    const { id } = req.params;
    const { command } = req.body;
    
    if (!command) {
      return res.status(400).json({ error: 'Command is required' });
    }
    
    hytaleServerManager.sendCommand(id, command);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /servers/:id/logs - Get server logs
 */
router.get('/servers/:id/logs', (req, res, next) => {
  try {
    const { id } = req.params;
    const { limit = 100 } = req.query;
    
    const logs = hytaleServerManager.getLogs(id, parseInt(limit));
    res.json({ logs });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /servers/:id/auth - Initiate device authentication
 */
router.post('/servers/:id/auth', async (req, res, next) => {
  try {
    const { id } = req.params;
    await hytaleServerManager.initiateAuth(id);
    res.json({ success: true, message: 'Authentication initiated. Check server logs for device code.' });
  } catch (error) {
    next(error);
  }
});

// ============== Configuration Management ==============

/**
 * GET /servers/:id/config - Get server configuration
 */
router.get('/servers/:id/config', async (req, res, next) => {
  try {
    const { serverPath } = req.query;
    const config = await configManager.readConfig(serverPath);
    res.json({ config });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /servers/:id/config - Update server configuration
 */
router.put('/servers/:id/config', async (req, res, next) => {
  try {
    const { serverPath, config } = req.body;
    await configManager.writeConfig(serverPath, 'config.json', config);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /servers/:id/worlds - List worlds
 */
router.get('/servers/:id/worlds', async (req, res, next) => {
  try {
    const { serverPath } = req.query;
    const worlds = await configManager.listWorlds(serverPath);
    res.json({ worlds });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /servers/:id/worlds/:worldName - Get world config
 */
router.get('/servers/:id/worlds/:worldName', async (req, res, next) => {
  try {
    const { worldName } = req.params;
    const { serverPath } = req.query;
    const config = await configManager.readWorldConfig(serverPath, worldName);
    res.json({ config });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /servers/:id/worlds/:worldName - Update world config
 */
router.put('/servers/:id/worlds/:worldName', async (req, res, next) => {
  try {
    const { worldName } = req.params;
    const { serverPath, updates } = req.body;
    const config = await configManager.updateWorldConfig(serverPath, worldName, updates);
    res.json({ config });
  } catch (error) {
    next(error);
  }
});

// ============== Bans & Whitelist ==============

router.get('/servers/:id/bans', async (req, res, next) => {
  try {
    const { serverPath } = req.query;
    const bans = await configManager.getBans(serverPath);
    res.json({ bans });
  } catch (error) {
    next(error);
  }
});

router.post('/servers/:id/bans', async (req, res, next) => {
  try {
    const { serverPath, playerUuid, reason } = req.body;
    const bans = await configManager.addBan(serverPath, playerUuid, reason);
    res.json({ bans });
  } catch (error) {
    next(error);
  }
});

router.delete('/servers/:id/bans/:uuid', async (req, res, next) => {
  try {
    const { uuid } = req.params;
    const { serverPath } = req.query;
    const bans = await configManager.removeBan(serverPath, uuid);
    res.json({ bans });
  } catch (error) {
    next(error);
  }
});

router.get('/servers/:id/whitelist', async (req, res, next) => {
  try {
    const { serverPath } = req.query;
    const whitelist = await configManager.getWhitelist(serverPath);
    res.json({ whitelist });
  } catch (error) {
    next(error);
  }
});

router.post('/servers/:id/whitelist', async (req, res, next) => {
  try {
    const { serverPath, playerUuid, playerName } = req.body;
    const whitelist = await configManager.addToWhitelist(serverPath, playerUuid, playerName);
    res.json({ whitelist });
  } catch (error) {
    next(error);
  }
});

router.delete('/servers/:id/whitelist/:uuid', async (req, res, next) => {
  try {
    const { uuid } = req.params;
    const { serverPath } = req.query;
    const whitelist = await configManager.removeFromWhitelist(serverPath, uuid);
    res.json({ whitelist });
  } catch (error) {
    next(error);
  }
});

// ============== File Management ==============

/**
 * GET /servers/:id/structure - Get server directory structure
 */
router.get('/servers/:id/structure', async (req, res, next) => {
  try {
    const { serverPath } = req.query;
    const structure = await fileManager.getServerStructure(serverPath);
    res.json({ structure });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /servers/:id/mods - List installed mods
 */
router.get('/servers/:id/mods', async (req, res, next) => {
  try {
    const { serverPath } = req.query;
    const mods = await fileManager.listMods(serverPath);
    res.json({ mods });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /servers/:id/mods - Install a mod
 */
router.post('/servers/:id/mods', async (req, res, next) => {
  try {
    const { serverPath, modName, modData } = req.body;
    const buffer = Buffer.from(modData, 'base64');
    const result = await fileManager.installMod(serverPath, modName, buffer);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /servers/:id/mods/:modName - Remove a mod
 */
router.delete('/servers/:id/mods/:modName', async (req, res, next) => {
  try {
    const { modName } = req.params;
    const { serverPath } = req.query;
    const result = await fileManager.removeMod(serverPath, modName);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /servers/:id/files/logs - List log files
 */
router.get('/servers/:id/files/logs', async (req, res, next) => {
  try {
    const { serverPath } = req.query;
    const logs = await fileManager.listLogs(serverPath);
    res.json({ logs });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /servers/:id/files/logs/:logName - Read log file
 */
router.get('/servers/:id/files/logs/:logName', async (req, res, next) => {
  try {
    const { logName } = req.params;
    const { serverPath, lines = 1000 } = req.query;
    const content = await fileManager.readLog(serverPath, logName, parseInt(lines));
    res.json({ content });
  } catch (error) {
    next(error);
  }
});

// ============== Backup Management ==============

/**
 * POST /servers/:id/backups - Create manual backup
 */
router.post('/servers/:id/backups', async (req, res, next) => {
  try {
    const { serverPath, backupDir } = req.body;
    const backup = await fileManager.createBackup(serverPath, backupDir);
    res.json({ backup });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /servers/:id/backups - List backups
 */
router.get('/servers/:id/backups', async (req, res, next) => {
  try {
    const { backupDir } = req.query;
    const backups = await fileManager.listBackups(backupDir);
    res.json({ backups });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /servers/:id/backups/:backupName - Delete backup
 */
router.delete('/servers/:id/backups/:backupName', async (req, res, next) => {
  try {
    const { backupName } = req.params;
    const { backupDir } = req.query;
    const result = await fileManager.deleteBackup(backupDir, backupName);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /servers/:id/disk-usage - Get disk usage
 */
router.get('/servers/:id/disk-usage', async (req, res, next) => {
  try {
    const { serverPath } = req.query;
    const usage = await fileManager.getDiskUsage(serverPath);
    res.json({ usage });
  } catch (error) {
    next(error);
  }
});

// ============== System Monitoring ==============

/**
 * GET /system/info - Get system information
 */
router.get('/system/info', async (req, res, next) => {
  try {
    const info = await systemMonitor.getSystemInfo();
    res.json(info);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /system/usage - Get current resource usage
 */
router.get('/system/usage', async (req, res, next) => {
  try {
    const usage = await systemMonitor.getCurrentUsage();
    res.json(usage);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /system/requirements - Check system requirements for Hytale
 */
router.get('/system/requirements', async (req, res, next) => {
  try {
    const requirements = await systemMonitor.checkRequirements();
    res.json(requirements);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /system/network - Get network interfaces
 */
router.get('/system/network', async (req, res, next) => {
  try {
    const network = await systemMonitor.getNetworkInfo();
    res.json({ interfaces: network });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /system/disks - Get disk information
 */
router.get('/system/disks', async (req, res, next) => {
  try {
    const disks = await systemMonitor.getDiskInfo();
    res.json({ disks });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /system/java-processes - Get Java processes
 */
router.get('/system/java-processes', async (req, res, next) => {
  try {
    const processes = await systemMonitor.getJavaProcesses();
    res.json({ processes });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /java/verify - Verify Java installation
 */
router.get('/java/verify', async (req, res, next) => {
  try {
    const result = await hytaleServerManager.verifyJava();
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
