type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogContext = Record<string, unknown>;

const writeLog = (level: LogLevel, message: string, context: LogContext = {}) => {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
  };

  const payload = JSON.stringify(entry);
  if (level === 'error') {
    console.error(payload);
    return;
  }

  if (level === 'warn') {
    console.warn(payload);
    return;
  }

  console.log(payload);
};

export const logger = {
  debug: (message: string, context?: LogContext) => writeLog('debug', message, context),
  info: (message: string, context?: LogContext) => writeLog('info', message, context),
  warn: (message: string, context?: LogContext) => writeLog('warn', message, context),
  error: (message: string, context?: LogContext) => writeLog('error', message, context),
};

export default logger;
