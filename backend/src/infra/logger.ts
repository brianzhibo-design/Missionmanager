/**
 * 日志模块
 * 开发环境：带颜色的可读输出
 * 生产环境：JSON 格式输出
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  data?: unknown;
}

// ANSI 颜色代码
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

const levelColors: Record<LogLevel, string> = {
  info: colors.green,
  warn: colors.yellow,
  error: colors.red,
  debug: colors.cyan,
};

const levelIcons: Record<LogLevel, string> = {
  info: 'ℹ',
  warn: '⚠',
  error: '✖',
  debug: '🔍',
};

function getTimestamp(): string {
  return new Date().toISOString();
}

function formatForDev(entry: LogEntry): string {
  const color = levelColors[entry.level];
  const icon = levelIcons[entry.level];
  const time = entry.timestamp.split('T')[1].split('.')[0]; // HH:mm:ss
  
  let output = `${colors.gray}${time}${colors.reset} ${color}${icon} ${entry.level.toUpperCase().padEnd(5)}${colors.reset} ${entry.message}`;
  
  if (entry.data !== undefined) {
    const dataStr = typeof entry.data === 'object' 
      ? JSON.stringify(entry.data, null, 2)
      : String(entry.data);
    output += `\n${colors.dim}${dataStr}${colors.reset}`;
  }
  
  return output;
}

function formatForProd(entry: LogEntry): string {
  return JSON.stringify(entry);
}

function log(level: LogLevel, message: string, data?: unknown): void {
  const entry: LogEntry = {
    level,
    message,
    timestamp: getTimestamp(),
    ...(data !== undefined && { data }),
  };

  const isDev = process.env.NODE_ENV !== 'production';
  const formatted = isDev ? formatForDev(entry) : formatForProd(entry);

  switch (level) {
    case 'error':
      console.error(formatted);
      break;
    case 'warn':
      console.warn(formatted);
      break;
    default:
      console.log(formatted);
  }
}

export const logger = {
  info: (message: string, data?: unknown) => log('info', message, data),
  warn: (message: string, data?: unknown) => log('warn', message, data),
  error: (message: string, data?: unknown) => log('error', message, data),
  debug: (message: string, data?: unknown) => {
    if (process.env.NODE_ENV === 'development') {
      log('debug', message, data);
    }
  },
};

export default logger;

