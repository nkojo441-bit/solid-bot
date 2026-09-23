import pino from 'pino'
import settings from '../../settings.js'

export const logger = pino({
  level: settings.logLevel,
  base: { name: settings.botName },
  timestamp: pino.stdTimeFunctions.isoTime,
})

logger.boot = (msg) => logger.info(`🟢 ${msg}`)
logger.ok = (msg) => logger.info(`✓ ${msg}`)