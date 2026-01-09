import * as dockerService from '../services/docker.service.js'
import { logger } from '../core/utils/logger.js'

const controllerLogger = logger.child('WorldsController')

export const createWorld = async (req, res, next) => {
    try {
        const { id, memory, cpus, port } = req.body

        const missingFields = []
        if (!id) missingFields.push('id')
        if (!memory) missingFields.push('memory')
        if (!cpus) missingFields.push('cpus')
        if (!port) missingFields.push('port')

        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields',
                missingFields
            })
        }

        if (typeof id !== 'string' || id.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Invalid id: must be a non-empty string'
            })
        }

        if (!Number.isInteger(port) || port < 1024 || port > 65535) {
            return res.status(400).json({
                success: false,
                message: 'Invalid port: must be an integer between 1024 and 65535'
            })
        }

        if (!Number.isInteger(cpus) || cpus < 1) {
            return res.status(400).json({
                success: false,
                message: 'Invalid cpus: must be a positive integer'
            })
        }

        await dockerService.createWorld({ id: id.trim(), memory, cpus, port })

        res.status(201).json({
            success: true,
            message: 'World created successfully',
            data: { id, memory, cpus, port }
        })
    } catch (error) {
        if (error.code === 'WORLD_ALREADY_EXISTS') {
            return res.status(409).json({
                success: false,
                message: error.message
            })
        }
        next(error)
    }
}

export const startWorld = async (req, res, next) => {
    try {
        const { id } = req.params

        if (!id || id.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'World id is required'
            })
        }

        await dockerService.startWorld(id.trim())

        res.json({
            success: true,
            message: 'World started successfully',
            data: { id }
        })
    } catch (error) {
        if (error.code === 'WORLD_NOT_FOUND') {
            return res.status(404).json({
                success: false,
                message: error.message
            })
        }
        if (error.code === 'WORLD_ALREADY_RUNNING') {
            return res.status(409).json({
                success: false,
                message: error.message
            })
        }
        next(error)
    }
}

export const stopWorld = async (req, res, next) => {
    try {
        const { id } = req.params

        if (!id || id.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'World id is required'
            })
        }

        await dockerService.stopWorld(id.trim())

        res.json({
            success: true,
            message: 'World stopped successfully',
            data: { id }
        })
    } catch (error) {
        if (error.code === 'WORLD_NOT_FOUND') {
            return res.status(404).json({
                success: false,
                message: error.message
            })
        }
        if (error.code === 'WORLD_NOT_RUNNING') {
            return res.status(409).json({
                success: false,
                message: error.message
            })
        }
        next(error)
    }
}

export const getWorldStatus = async (req, res, next) => {
    try {
        const { id } = req.params

        if (!id || id.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'World id is required'
            })
        }

        const status = await dockerService.getWorldStatus(id.trim())

        res.json({
            success: true,
            data: { id, status }
        })
    } catch (error) {
        next(error)
    }
}

export const deleteWorld = async (req, res, next) => {
    try {
        const { id } = req.params

        if (!id || id.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'World id is required'
            })
        }

        await dockerService.deleteWorld(id.trim())

        res.json({
            success: true,
            message: 'World deleted successfully',
            data: { id }
        })
    } catch (error) {
        if (error.code === 'WORLD_NOT_FOUND') {
            return res.status(404).json({
                success: false,
                message: error.message
            })
        }
        next(error)
    }
}

export const listWorlds = async (req, res, next) => {
    try {
        const worlds = await dockerService.listWorlds()

        res.json({
            success: true,
            data: worlds,
            count: worlds.length
        })
    } catch (error) {
        next(error)
    }
}

export const getWorldLogs = async (req, res, next) => {
    try {
        const { id } = req.params
        const { lines = 100 } = req.query

        if (!id || id.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'World id is required'
            })
        }

        const parsedLines = parseInt(lines, 10)
        if (isNaN(parsedLines) || parsedLines < 1 || parsedLines > 1000) {
            return res.status(400).json({
                success: false,
                message: 'Invalid lines: must be between 1 and 1000'
            })
        }

        const logs = await dockerService.getWorldLogs(id.trim(), parsedLines)

        res.json({
            success: true,
            data: { id, logs, lines: parsedLines }
        })
    } catch (error) {
        if (error.code === 'WORLD_NOT_FOUND') {
            return res.status(404).json({
                success: false,
                message: error.message
            })
        }
        next(error)
    }
}