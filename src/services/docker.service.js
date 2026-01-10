import { exec, spawn } from 'child_process'
import { promisify } from 'util'
import { WORLDS_PATH, DOCKER_IMAGE } from '../config/env.js'
import { logger } from '../core/utils/logger.js'

const execAsync = promisify(exec)
const dockerLogger = logger.child('Docker')

const CONTAINER_PREFIX = 'hycore-world'

const runCommand = async (cmd) => {
    try {
        dockerLogger.debug(`Executing: ${cmd.split('\n')[0]}...`)
        const { stdout, stderr } = await execAsync(cmd)
        if (stderr && !stderr.includes('WARNING')) {
            dockerLogger.warn(`stderr: ${stderr}`)
        }
        return stdout.trim()
    } catch (error) {
        const message = error.stderr || error.message
        dockerLogger.error(`Command failed: ${message}`)
        throw new Error(`Docker command failed: ${message}`)
    }
}

const getContainerName = (id) => `${CONTAINER_PREFIX}-${id}`

export const containerExists = async (id) => {
    try {
        const name = getContainerName(id)
        const result = await runCommand(`docker ps -a --filter "name=^${name}$" --format "{{.Names}}"`)
        return result === name
    } catch {
        return false
    }
}

export const getWorldStatus = async (id) => {
    const name = getContainerName(id)
    
    try {
        const result = await runCommand(
            `docker inspect --format='{{.State.Status}}' ${name}`
        )
        return result
    } catch {
        return 'not_found'
    }
}

export const createWorld = async ({ id, memory, cpus, port }) => {
    const name = getContainerName(id)

    if (await containerExists(id)) {
        const err = new Error(`World '${id}' already exists`)
        err.code = 'WORLD_ALREADY_EXISTS'
        throw err
    }

const cmd = `docker run -d \\
        --name ${name} \\
        --memory=${memory} \\
        --cpus="${cpus}" \\
        --restart=unless-stopped \\
        --dns=8.8.8.8 \\
        --dns=8.8.4.4 \\
        -p ${port}:25565 \\
        -e EULA=TRUE \\
        -e MEMORY=${memory} \\
        -v ${WORLDS_PATH}/${id}:/data \\
        ${DOCKER_IMAGE}`

    const containerId = await runCommand(cmd)
    
    dockerLogger.info(`World '${id}' created with container ID: ${containerId.substring(0, 12)}`)
    
    return { containerId, name }
}

export const startWorld = async (id) => {
    const name = getContainerName(id)
    const status = await getWorldStatus(id)

    if (status === 'not_found') {
        const err = new Error(`World '${id}' does not exist`)
        err.code = 'WORLD_NOT_FOUND'
        throw err
    }

    if (status === 'running') {
        const err = new Error(`World '${id}' is already running`)
        err.code = 'WORLD_ALREADY_RUNNING'
        throw err
    }

    await runCommand(`docker start ${name}`)
    dockerLogger.info(`World '${id}' started`)
}

export const stopWorld = async (id) => {
    const name = getContainerName(id)
    const status = await getWorldStatus(id)

    if (status === 'not_found') {
        const err = new Error(`World '${id}' does not exist`)
        err.code = 'WORLD_NOT_FOUND'
        throw err
    }

    if (status !== 'running') {
        const err = new Error(`World '${id}' is not running`)
        err.code = 'WORLD_NOT_RUNNING'
        throw err
    }

    await runCommand(`docker stop ${name}`)
    dockerLogger.info(`World '${id}' stopped`)
}

export const deleteWorld = async (id) => {
    const name = getContainerName(id)
    const status = await getWorldStatus(id)

    if (status === 'not_found') {
        const err = new Error(`World '${id}' does not exist`)
        err.code = 'WORLD_NOT_FOUND'
        throw err
    }

    if (status === 'running') {
        await runCommand(`docker stop ${name}`)
    }

    await runCommand(`docker rm ${name}`)
    dockerLogger.info(`World '${id}' deleted`)
}

export const listWorlds = async () => {
    try {
        const result = await runCommand(
            `docker ps -a --filter "name=^${CONTAINER_PREFIX}" --format "{{.Names}}|{{.Status}}|{{.Ports}}"`
        )

        if (!result) return []

        return result.split('\n').map(line => {
            const [name, status, ports] = line.split('|')
            const id = name.replace(`${CONTAINER_PREFIX}-`, '')
            return { id, name, status, ports }
        })
    } catch {
        return []
    }
}

export const getWorldLogs = async (id, lines = 100) => {
    const name = getContainerName(id)
    const status = await getWorldStatus(id)

    if (status === 'not_found') {
        const err = new Error(`World '${id}' does not exist`)
        err.code = 'WORLD_NOT_FOUND'
        throw err
    }

    return await runCommand(`docker logs --tail ${lines} ${name}`)
}

/**
 * Stream logs in real-time using docker logs -f
 * @param {string} id - World ID
 * @param {function} onData - Callback for each log line
 * @param {function} onError - Callback for errors
 * @param {number} tail - Number of previous lines to include
 * @returns {object} - Object with kill() method to stop streaming
 */
export const streamWorldLogs = async (id, onData, onError, tail = 50) => {
    const name = getContainerName(id)
    const status = await getWorldStatus(id)

    if (status === 'not_found') {
        const err = new Error(`World '${id}' does not exist`)
        err.code = 'WORLD_NOT_FOUND'
        throw err
    }

    dockerLogger.info(`Starting log stream for world '${id}'`)

    const dockerProcess = spawn('docker', ['logs', '-f', '--tail', String(tail), name])

    dockerProcess.stdout.on('data', (data) => {
        const lines = data.toString().split('\n').filter(line => line.trim())
        lines.forEach(line => onData(line, 'stdout'))
    })

    dockerProcess.stderr.on('data', (data) => {
        const lines = data.toString().split('\n').filter(line => line.trim())
        lines.forEach(line => onData(line, 'stderr'))
    })

    dockerProcess.on('error', (error) => {
        dockerLogger.error(`Log stream error for world '${id}':`, error)
        onError(error)
    })

    dockerProcess.on('close', (code) => {
        dockerLogger.debug(`Log stream closed for world '${id}' with code ${code}`)
    })

    return {
        kill: () => {
            dockerLogger.debug(`Stopping log stream for world '${id}'`)
            dockerProcess.kill('SIGTERM')
        },
        process: dockerProcess
    }
}

/**
 * Stream logs during world creation
 * @param {object} config - World configuration
 * @param {function} onData - Callback for each log line
 * @param {function} onError - Callback for errors
 * @returns {Promise<object>} - Container info
 */
export const createWorldWithLogs = async ({ id, memory, cpus, port }, onData, onError) => {
    const name = getContainerName(id)

    if (await containerExists(id)) {
        const err = new Error(`World '${id}' already exists`)
        err.code = 'WORLD_ALREADY_EXISTS'
        throw err
    }

    onData(`Creating world '${id}'...`, 'info')

    const args = [
        'run', '-d',
        '--name', name,
        `--memory=${memory}`,
        `--cpus=${cpus}`,
        '--restart=unless-stopped',
        '--dns=8.8.8.8',
        '--dns=8.8.4.4',
        '-p', `${port}:25565`,
        '-e', 'EULA=TRUE',
        '-e', `MEMORY=${memory}`,
        '-v', `${WORLDS_PATH}/${id}:/data`,
        DOCKER_IMAGE
    ]

    return new Promise((resolve, reject) => {
        const dockerProcess = spawn('docker', args)
        let containerId = ''

        dockerProcess.stdout.on('data', (data) => {
            containerId = data.toString().trim()
        })

        dockerProcess.stderr.on('data', (data) => {
            onData(data.toString().trim(), 'stderr')
        })

        dockerProcess.on('close', async (code) => {
            if (code === 0 && containerId) {
                dockerLogger.info(`World '${id}' created with container ID: ${containerId.substring(0, 12)}`)
                onData(`World '${id}' created successfully!`, 'info')
                resolve({ containerId, name, id })
            } else {
                const err = new Error(`Failed to create world '${id}'`)
                err.code = 'WORLD_CREATE_FAILED'
                reject(err)
            }
        })

        dockerProcess.on('error', (error) => {
            reject(error)
        })
    })
}


