"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const logLevel = process.env['LOG_LEVEL'] || 'info';
const logFormat = process.env['LOG_FORMAT'] || 'json';
const nodeEnv = process.env['NODE_ENV'] || 'development';
const format = winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.default.format.errors({ stack: true }), logFormat === 'pretty'
    ? winston_1.default.format.colorize({ all: true })
    : winston_1.default.format.json(), winston_1.default.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    if (logFormat === 'pretty') {
        const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta, null, 2)}` : '';
        return `${timestamp} [${level}]: ${message}${metaStr}`;
    }
    return JSON.stringify({ timestamp, level, message, ...meta });
}));
const transports = [
    new winston_1.default.transports.Console({
        level: logLevel,
        format,
    }),
];
if (nodeEnv === 'production') {
    transports.push(new winston_1.default.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        format: winston_1.default.format.json(),
    }), new winston_1.default.transports.File({
        filename: 'logs/combined.log',
        format: winston_1.default.format.json(),
    }));
}
exports.logger = winston_1.default.createLogger({
    level: logLevel,
    format,
    transports,
    exitOnError: false,
});
exports.default = exports.logger;
