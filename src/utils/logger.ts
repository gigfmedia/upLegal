interface LogContext {
  [key: string]: any;
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'trace';

class Logger {
  private static instance: Logger;
  private isProduction: boolean;
  private logLevels: Record<LogLevel, number> = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
    trace: 4
  };
  private currentLogLevel: number;
  private readonly SENSITIVE_KEYS = [
    'password', 'token', 'apiKey', 'secret', 'authorization', 'key',
    'access_token', 'refresh_token', 'email', 'phone', 'address',
    'credit_card', 'cvv', 'expiry', 'ssn', 'rut'
  ];

  private constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.currentLogLevel = this.isProduction 
      ? this.logLevels.error 
      : this.logLevels.debug;
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private shouldLog(level: LogLevel): boolean {
    return this.logLevels[level] <= this.currentLogLevel;
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(this.redactSensitiveData(context), null, this.isProduction ? 0 : 2)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
  }

  private redactSensitiveData(data: any): any {
    if (!data || typeof data !== 'object') return data;

    const redacted = Array.isArray(data) ? [] : {};

    for (const [key, value] of Object.entries(data)) {
      const isSensitive = this.SENSITIVE_KEYS.some(k => 
        key.toLowerCase().includes(k.toLowerCase())
      );
      
      if (isSensitive) {
        redacted[key] = '[REDACTED]';
      } else if (value && typeof value === 'object') {
        redacted[key] = this.redactSensitiveData(value);
      } else if (typeof value === 'string' && this.looksLikeSensitiveData(value)) {
        redacted[key] = this.redactString(value);
      } else {
        redacted[key] = value;
      }
    }

    return redacted;
  }

  private looksLikeSensitiveData(value: string): boolean {
    if (!value) return false;
    
    // Check for common patterns
    const sensitivePatterns = [
      /^[0-9]{16}$/, // Credit card
      /^[0-9]{3,4}$/, // CVV
      /^[0-9]{1,2}\/[0-9]{2,4}$/, // Expiry date
      /^[0-9]{9,12}$/, // RUT without verification digit
      /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/ // Email
    ];

    return sensitivePatterns.some(pattern => pattern.test(value));
  }

  private redactString(value: string): string {
    if (value.length <= 8) return '[REDACTED]';
    return `${value.substring(0, 2)}...${value.substring(value.length - 2)}`;
  }

  public setLogLevel(level: LogLevel): void {
    this.currentLogLevel = this.logLevels[level] ?? this.logLevels.info;
  }

  public trace(message: string, context?: LogContext): void {
    if (this.shouldLog('trace')) {
      console.trace(this.formatMessage('trace', message, context));
    }
  }

  public debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  public info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message, context));
    }
  }

  public warn(message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, context));
    }
  }

  public error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorContext = {
      ...context,
      ...(error instanceof Error ? {
        error: {
          name: error.name,
          message: error.message,
          stack: this.isProduction ? undefined : error.stack,
          ...(error.cause && { cause: this.redactSensitiveData(error.cause) })
        }
      } : { error: this.redactSensitiveData(error) })
    };

    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message, errorContext));
    }
  }

  // For request/response logging
  public request(method: string, url: string, meta: Record<string, any> = {}) {
    this.info(`→ ${method} ${url}`, {
      request: {
        method,
        url,
        ...this.redactSensitiveData(meta)
      }
    });
  }

  public response(method: string, url: string, status: number, meta: Record<string, any> = {}) {
    const logMethod = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
    this[logMethod](`← ${method} ${url} ${status}`, {
      response: {
        status,
        ...this.redactSensitiveData(meta)
      }
    });
  }
}

export const logger = Logger.getInstance();

export const withContext = (context: Record<string, any>) => ({
  debug: (message: string, extra: Record<string, any> = {}) => 
    logger.debug(message, { ...context, ...extra }),
  info: (message: string, extra: Record<string, any> = {}) => 
    logger.info(message, { ...context, ...extra }),
  warn: (message: string, extra: Record<string, any> = {}) => 
    logger.warn(message, { ...context, ...extra }),
  error: (message: string, error?: Error | unknown, extra: Record<string, any> = {}) => 
    logger.error(message, error, { ...context, ...extra }),
  trace: (message: string, extra: Record<string, any> = {}) => 
    logger.trace(message, { ...context, ...extra })
});
