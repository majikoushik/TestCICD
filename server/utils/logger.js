'use strict';

const winston = require('winston');
const path = require('path');
const fs = require('fs');

const LOG_DIR = path.join(__dirname, '../../logs');

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

const { combine, timestamp, printf, colorize, errors, json, splat } = winston.format;

// Human-readable console format — shows full stack trace
const consoleFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  splat(),
  printf(({ level, message, timestamp: ts, stack, ...meta }) => {
    let line = `${ts} [${level}]: ${message}`;
    if (stack) line += `\n${stack}`;
    const keys = Object.keys(meta).filter((k) => k !== 'service');
    if (keys.length) {
      const metaStr = JSON.stringify(
        keys.reduce((o, k) => { o[k] = meta[k]; return o; }, {}),
        null,
        2
      );
      line += `\n${metaStr}`;
    }
    return line;
  })
);

// JSON format for log files — structured, machine-parseable, production-ready
const fileFormat = combine(
  timestamp(),
  errors({ stack: true }),
  splat(),
  json()
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  defaultMeta: { service: 'vibecoding-api' },
  transports: [
    new winston.transports.Console({
      format: consoleFormat,
      handleExceptions: true,
      handleRejections: true,
    }),
    // error.log — errors only, easier to grep in production
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 10 * 1024 * 1024, // 10 MB
      maxFiles: 5,
      tailable: true,
      handleExceptions: true,
      handleRejections: true,
    }),
    // app.log — all levels (info and above in production, debug in dev)
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'app.log'),
      format: fileFormat,
      maxsize: 20 * 1024 * 1024, // 20 MB
      maxFiles: 10,
      tailable: true,
    }),
  ],
  exitOnError: false,
});

/**
 * Build a context object from an Express request for structured error logs.
 * Attach this as the second argument to logger.error() inside route handlers:
 *   logger.error('Something failed', reqCtx(req, error));
 */
logger.reqCtx = function reqCtx(req, error) {
  const ctx = {
    method: req.method,
    path: req.path,
    ip: (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip,
  };
  if (req.user) ctx.userId = req.user.id || req.user._id;
  if (error) {
    ctx.error = error.message || String(error);
    ctx.stack = error.stack;
    if (error.code) ctx.code = error.code;
    if (error.name) ctx.errorType = error.name;
  }
  return ctx;
};

module.exports = logger;
