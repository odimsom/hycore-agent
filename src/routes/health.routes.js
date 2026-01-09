import { Router } from 'express'
import os from 'os'

const router = Router()

router.get('/', (req, res) => {
    const healthcheck = {
        success: true,
        status: 'ok',
        agent: 'hycore',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV
    }

    res.json(healthcheck)
})

router.get('/detailed', (req, res) => {
    const memoryUsage = process.memoryUsage()

    const healthcheck = {
        success: true,
        status: 'ok',
        agent: 'hycore',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
        system: {
            platform: os.platform(),
            arch: os.arch(),
            hostname: os.hostname(),
            cpus: os.cpus().length,
            totalMemory: `${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB`,
            freeMemory: `${(os.freemem() / 1024 / 1024 / 1024).toFixed(2)} GB`,
            loadAverage: os.loadavg()
        },
        process: {
            pid: process.pid,
            nodeVersion: process.version,
            memoryUsage: {
                heapUsed: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
                heapTotal: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
                rss: `${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`
            }
        }
    }

    res.json(healthcheck)
})

export default router