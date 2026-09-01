type LogLevel = 'info' | 'warn' | 'error' | 'debug';

const formatMessage = (level: LogLevel, message: string, context?: string, data?: Record<string, unknown>): string => {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]${context ? ` [${context}]` : ''}:`;
  
  if (data && Object.keys(data).length > 0) {
    return `${prefix} ${message} ${JSON.stringify(data)}`;
  }
  return `${prefix} ${message}`;
};

export const logger = {
  info: (message: string, context?: string, data?: Record<string, unknown>) => {
    console.log(formatMessage('info', message, context, data));
  },
  warn: (message: string, context?: string, data?: Record<string, unknown>) => {
    console.warn(formatMessage('warn', message, context, data));
  },
  error: (message: string, context?: string, data?: Record<string, unknown>) => {
    console.error(formatMessage('error', message, context, data));
  },
  debug: (message: string, context?: string, data?: Record<string, unknown>) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(formatMessage('debug', message, context, data));
    }
  },
};
