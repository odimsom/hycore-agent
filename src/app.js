import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import healtRoutes from './routes/health.routes.js'
import worldsRoutes from './routes/worlds.routes.js'
import { logger } from './core/utils/logger.js'

const app = express()

app.use(helmet())
app.use(cors())

const morganStream = {
    write: (message) => logger.info(message.trim())
}
app.use(morgan('dev', { stream: morganStream }))

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

if (process.env.NODE_ENV !== 'production') {
    app.set('json spaces', 2)
}

app.use('/health', healtRoutes)
app.use('/worlds', worldsRoutes)

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.originalUrl} not found`
    })
})

app.use((err, req, res, next) => {
    logger.error(`${req.method} ${req.originalUrl} - ${err.message}`, err)
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    })
})

export default app