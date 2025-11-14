"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateService = exports.requireRole = exports.optionalAuth = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
/**
 * Authentication middleware for Express services
 * Validates JWT tokens and adds user information to request
 */
const authenticateToken = (config) => {
    return (req, res, next) => {
        try {
            const authHeader = req.headers.authorization;
            const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
            if (!token) {
                return res.status(401).json({
                    success: false,
                    error: {
                        code: 'MISSING_TOKEN',
                        message: 'Access token is required'
                    }
                });
            }
            // Verify token
            const decoded = jsonwebtoken_1.default.verify(token, config.jwtSecret, {
                issuer: config.jwtIssuer,
                audience: config.jwtAudience
            });
            // Add user info to request
            req.user = {
                id: decoded.sub || decoded.id,
                email: decoded.email,
                role: decoded.role || 'user',
                iat: decoded.iat,
                exp: decoded.exp
            };
            next();
        }
        catch (error) {
            if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
                return res.status(401).json({
                    success: false,
                    error: {
                        code: 'TOKEN_EXPIRED',
                        message: 'Access token has expired'
                    }
                });
            }
            if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
                return res.status(401).json({
                    success: false,
                    error: {
                        code: 'INVALID_TOKEN',
                        message: 'Invalid access token'
                    }
                });
            }
            return res.status(500).json({
                success: false,
                error: {
                    code: 'AUTH_ERROR',
                    message: 'Authentication error'
                }
            });
        }
    };
};
exports.authenticateToken = authenticateToken;
/**
 * Optional authentication middleware - doesn't fail if no token provided
 */
const optionalAuth = (config) => {
    return (req, res, next) => {
        try {
            const authHeader = req.headers.authorization;
            const token = authHeader && authHeader.split(' ')[1];
            if (token) {
                const decoded = jsonwebtoken_1.default.verify(token, config.jwtSecret, {
                    issuer: config.jwtIssuer,
                    audience: config.jwtAudience
                });
                req.user = {
                    id: decoded.sub || decoded.id,
                    email: decoded.email,
                    role: decoded.role || 'user',
                    iat: decoded.iat,
                    exp: decoded.exp
                };
            }
            next();
        }
        catch (error) {
            // For optional auth, we just continue without user info
            next();
        }
    };
};
exports.optionalAuth = optionalAuth;
/**
 * Role-based authorization middleware
 */
const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'AUTHENTICATION_REQUIRED',
                    message: 'Authentication required'
                }
            });
        }
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'INSUFFICIENT_PERMISSIONS',
                    message: 'Insufficient permissions'
                }
            });
        }
        next();
    };
};
exports.requireRole = requireRole;
/**
 * Service-to-service authentication middleware
 * Validates service tokens for internal communication
 */
const authenticateService = (config) => {
    return (req, res, next) => {
        try {
            const serviceToken = req.headers['x-service-token'];
            if (!serviceToken) {
                return res.status(401).json({
                    success: false,
                    error: {
                        code: 'MISSING_SERVICE_TOKEN',
                        message: 'Service token is required'
                    }
                });
            }
            // Verify service token
            const decoded = jsonwebtoken_1.default.verify(serviceToken, config.jwtSecret);
            if (decoded.type !== 'service') {
                return res.status(401).json({
                    success: false,
                    error: {
                        code: 'INVALID_SERVICE_TOKEN',
                        message: 'Invalid service token type'
                    }
                });
            }
            next();
        }
        catch (error) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'INVALID_SERVICE_TOKEN',
                    message: 'Invalid service token'
                }
            });
        }
    };
};
exports.authenticateService = authenticateService;
