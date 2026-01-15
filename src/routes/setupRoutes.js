import { Router } from 'express';
import hytaleFilesManager from '../services/hytaleFilesManager.js';

const router = Router();

/**
 * GET /setup/status - Ver estado de los archivos de Hytale
 */
router.get('/status', async (req, res, next) => {
  try {
    const [launcherCheck, agentCheck, defaultPaths] = await Promise.all([
      hytaleFilesManager.checkLauncherFiles(),
      hytaleFilesManager.checkAgentFiles(),
      Promise.resolve(hytaleFilesManager.getDefaultPaths())
    ]);

    res.json({
      launcher: launcherCheck,
      agent: agentCheck,
      defaultPaths,
      ready: agentCheck.ready,
      nextStep: !agentCheck.ready 
        ? 'Ejecuta POST /api/v1/setup/copy-files para copiar los archivos del Launcher'
        : 'Los archivos están listos. Puedes crear servidores con POST /api/v1/setup/create-server'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /setup/copy-files - Copiar archivos desde el Launcher al agente
 */
router.post('/copy-files', async (req, res, next) => {
  try {
    const { force = false } = req.body;
    const result = await hytaleFilesManager.copyFromLauncher({ force });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /setup/create-server - Crear una nueva instancia de servidor
 */
router.post('/create-server', async (req, res, next) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Se requiere el nombre del servidor (name)' });
    }

    // Validar nombre
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      return res.status(400).json({ 
        error: 'Nombre inválido. Solo se permiten letras, números, guiones y guiones bajos.' 
      });
    }

    const result = await hytaleFilesManager.createServerInstance(name);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /setup/servers - Listar servidores creados
 */
router.get('/servers', async (req, res, next) => {
  try {
    const servers = await hytaleFilesManager.listServerInstances();
    res.json({ servers });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /setup/paths - Obtener rutas por defecto
 */
router.get('/paths', (req, res) => {
  const paths = hytaleFilesManager.getDefaultPaths();
  res.json(paths);
});

/**
 * GET /setup/check-launcher - Verificar archivos del Launcher
 */
router.get('/check-launcher', async (req, res, next) => {
  try {
    const result = await hytaleFilesManager.checkLauncherFiles();
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
