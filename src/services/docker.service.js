import { exec } from 'child_process'
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

    const cmd = `docker run -d \
        --name ${name} \
        --memory=${memory} \
        --cpus="${cpus}" \
        --restart=unless-stopped \
        -p ${port}:25565 \
        -e EULA=TRUE \
        -e MEMORY=${memory} \
        -v ${WORLDS_PATH}/${id}:/data \
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


