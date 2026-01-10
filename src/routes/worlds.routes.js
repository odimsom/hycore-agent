import { Router } from 'express'
import * as worldsController from '../controllers/worlds.controller.js'

const router = Router()

router.post('/', worldsController.createWorld)
router.post('/stream', worldsController.createWorldWithStream)
router.get('/', worldsController.listWorlds)
router.get('/:id', worldsController.getWorldStatus)
router.get('/:id/logs', worldsController.getWorldLogs)
router.get('/:id/logs/stream', worldsController.streamWorldLogs)
router.post('/:id/start', worldsController.startWorld)
router.post('/:id/start/stream', worldsController.startWorldWithStream)
router.post('/:id/stop', worldsController.stopWorld)
router.delete('/:id', worldsController.deleteWorld)

export default router