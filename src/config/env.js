import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const envPath = join(__dirname, '../../.env')

if (existsSync(envPath)) {
    dotenv.config({ path: envPath })
} else {
    console.warn('[Config] .env file not found, using default values')
}

const requiredEnvVars = ['WORLDS_PATH']

const missingVars = requiredEnvVars.filter(varName => !process.env[varName])

if (missingVars.length > 0 && process.env.NODE_ENV === 'production') {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`)
}

export const PORT = parseInt(process.env.PORT, 10) || 3000
export const WORLDS_PATH = process.env.WORLDS_PATH
export const DOCKER_IMAGE = process.env.DOCKER_IMAGE
export const NODE_ENV = process.env.NODE_ENV || 'development'

export const LOG_LEVEL = process.env.LOG_LEVEL || 'info'
export const LOG_TO_FILE = process.env.LOG_TO_FILE === 'true'
export const LOG_FILE_PATH = process.env.LOG_FILE_PATH || './logs'

export const config = {
    port: PORT,
    worldsPath: WORLDS_PATH,
    dockerImage: DOCKER_IMAGE,
    nodeEnv: NODE_ENV,
    isDevelopment: NODE_ENV === 'development',
    isProduction: NODE_ENV === 'production',
    logging: {
        level: LOG_LEVEL,
        enableFile: LOG_TO_FILE,
        filePath: LOG_FILE_PATH
    }
}

export default config