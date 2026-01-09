import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOG_LEVELS = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
    trace: 4
};

const COLORS = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    green: '\x1b[32m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m',
    white: '\x1b[37m',
    gray: '\x1b[90m'
};

const LEVEL_COLORS = {
    error: COLORS.red,
    warn: COLORS.yellow,
    info: COLORS.green,
    debug: COLORS.cyan,
    trace: COLORS.gray
};

const LEVEL_ICONS = {
    error: 'X',
    warn: '!!!',
    info: 'ℹℹℹ',
    debug: '🔧',
    trace: '🔍'
};

class Logger {
    constructor(options = {}) {
        this.level = options.level || process.env.LOG_LEVEL || 'info';
        this.enableColors = options.enableColors !== false;
        this.enableTimestamp = options.enableTimestamp !== false;
        this.enableFile = options.enableFile || process.env.LOG_TO_FILE === 'true';
        this.logDir = options.logDir || process.env.LOG_FILE_PATH || './logs';
        this.prefix = options.prefix || 'HyCore';
        this.maxFileSize = options.maxFileSize || 5 * 1024 * 1024;
        
        if (this.enableFile) {
            this._ensureLogDirectory();
        }
    }

    _ensureLogDirectory() {
        const absolutePath = path.isAbsolute(this.logDir) 
            ? this.logDir 
            : path.join(process.cwd(), this.logDir);
        
        if (!fs.existsSync(absolutePath)) {
            fs.mkdirSync(absolutePath, { recursive: true });
        }
        this.logDir = absolutePath;
    }

    _getTimestamp() {
        const now = new Date();
        return now.toISOString();
    }

    _formatMessage(level, message, ...args) {
        const timestamp = this.enableTimestamp ? `[${this._getTimestamp()}]` : '';
        const levelStr = level.toUpperCase().padEnd(5);
        const prefix = `[${this.prefix}]`;
        
        const formattedArgs = args.map(arg => {
            if (arg instanceof Error) {
                return `\n${arg.stack || arg.message}`;
            }
            if (typeof arg === 'object') {
                try {
                    return JSON.stringify(arg, null, 2);
                } catch {
                    return String(arg);
                }
            }
            return String(arg);
        }).join(' ');

        return {
            plain: `${timestamp} ${prefix} [${levelStr}] ${message} ${formattedArgs}`.trim(),
            colored: this.enableColors
                ? `${COLORS.gray}${timestamp}${COLORS.reset} ${COLORS.magenta}${prefix}${COLORS.reset} ${LEVEL_COLORS[level]}[${levelStr}]${COLORS.reset} ${LEVEL_ICONS[level]} ${message} ${formattedArgs}`.trim()
                : `${timestamp} ${prefix} [${levelStr}] ${message} ${formattedArgs}`.trim()
        };
    }

    _shouldLog(level) {
        return LOG_LEVELS[level] <= LOG_LEVELS[this.level];
    }

    _writeToFile(formattedMessage) {
        if (!this.enableFile) return;

        const date = new Date().toISOString().split('T')[0];
        const logFile = path.join(this.logDir, `hycore-${date}.log`);

        try {
            if (fs.existsSync(logFile)) {
                const stats = fs.statSync(logFile);
                if (stats.size > this.maxFileSize) {
                    const rotatedFile = path.join(this.logDir, `hycore-${date}-${Date.now()}.log`);
                    fs.renameSync(logFile, rotatedFile);
                }
            }
            
            fs.appendFileSync(logFile, formattedMessage + '\n');
        } catch (err) {
            console.error('Error writing to log file:', err);
        }
    }

    _log(level, message, ...args) {
        if (!this._shouldLog(level)) return;

        const { plain, colored } = this._formatMessage(level, message, ...args);
        
        const consoleMethod = level === 'error' ? console.error 
            : level === 'warn' ? console.warn 
            : console.log;
        
        consoleMethod(colored);
        
        this._writeToFile(plain);
    }

    error(message, ...args) {
        this._log('error', message, ...args);
    }

    warn(message, ...args) {
        this._log('warn', message, ...args);
    }

    info(message, ...args) {
        this._log('info', message, ...args);
    }

    debug(message, ...args) {
        this._log('debug', message, ...args);
    }

    trace(message, ...args) {
        this._log('trace', message, ...args);
    }

    child(context) {
        return new Logger({
            level: this.level,
            enableColors: this.enableColors,
            enableTimestamp: this.enableTimestamp,
            enableFile: this.enableFile,
            logDir: this.logDir,
            prefix: `${this.prefix}:${context}`
        });
    }

    time(label) {
        const start = performance.now();
        return {
            end: () => {
                const duration = performance.now() - start;
                this.debug(`${label}: ${duration.toFixed(2)}ms`);
                return duration;
            }
        };
    }

    group(label) {
        if (this.enableColors) {
            console.group(`${COLORS.bright}${label}${COLORS.reset}`);
        } else {
            console.group(label);
        }
    }

    groupEnd() {
        console.groupEnd();
    }

    table(data, columns) {
        if (this._shouldLog('info')) {
            console.table(data, columns);
        }
    }

    setLevel(level) {
        if (LOG_LEVELS[level] !== undefined) {
            this.level = level;
            this.info(`Log level cambiado a: ${level}`);
        }
    }

    enableFileLogging(enable = true) {
        this.enableFile = enable;
        if (enable) {
            this._ensureLogDirectory();
        }
    }
}

export const logger = new Logger();
export { Logger, LOG_LEVELS };
export default logger;