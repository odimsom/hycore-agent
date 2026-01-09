import app from './app.js'
import { PORT, NODE_ENV } from './config/env.js'
import { logger } from './core/utils/logger.js'

const server = app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`)
    logger.info(`Environment: ${NODE_ENV}`)
    logger.debug('Debug mode enabled')
})

server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${PORT} is already in use`)
    } else {
        logger.error('Server error:', error)
    }
    process.exit(1)
})

const gracefulShutdown = (signal) => {
    logger.warn(`${signal} received. Shutting down gracefully...`)
    server.close(() => {
        logger.info('Server closed')
        process.exit(0)
    })

    setTimeout(() => {
        logger.error('Forced shutdown after timeout')
        process.exit(1)
    }, 10000)
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error)
    process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason)
})