import pino from 'pino'

const pinoLogger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
})

type LogFn = (msg: string, ...args: unknown[]) => void

interface Logger {
  info: LogFn
  error: LogFn
  warn: LogFn
  debug: LogFn
  child: (bindings: Record<string, unknown>) => Logger
}

function wrapPino(p: pino.Logger): Logger {
    const serialize = (val: unknown): unknown => {
      if (val instanceof Error) return { message: val.message, stack: val.stack, name: val.name }
      return val
    }
    const wrap = (level: 'info' | 'error' | 'warn' | 'debug'): LogFn =>
      (msg: string, ...args: unknown[]) => {
        if (args.length > 0) {
          p[level]({ data: args.length === 1 ? serialize(args[0]) : args.map(serialize) }, msg)
        } else {
          p[level](msg)
        }
      }

  return {
    info: wrap('info'),
    error: wrap('error'),
    warn: wrap('warn'),
    debug: wrap('debug'),
    child: (bindings) => wrapPino(p.child(bindings)),
  }
}

const logger: Logger = wrapPino(pinoLogger)

export default logger

export function createRouteLogger(route: string) {
  return logger.child({ route })
}
