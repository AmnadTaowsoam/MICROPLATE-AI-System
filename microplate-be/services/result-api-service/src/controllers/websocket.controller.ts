import { FastifyRequest, FastifyReply } from 'fastify';
import { WebSocketService } from '@/services/websocket.service';
import { logger } from '@/utils/logger';
import { createError } from '@/utils/errors';
import { AuthenticatedRequest } from '@/middleware/auth.middleware';

export class WebSocketController {
  constructor(private websocketService: WebSocketService) {}

  async handleConnection(request: FastifyRequest, reply: FastifyReply) {
    try {
      // Upgrade to WebSocket connection
      const { socket } = await reply.raw.upgrade();
      
      // Generate connection ID
      const connectionId = this.generateConnectionId(request);
      
      // Add connection to service
      this.websocketService.addConnection(connectionId, socket);
      
      logger.info('WebSocket connection established', { 
        connectionId,
        ip: request.ip,
        userAgent: request.headers['user-agent']
      });

      // Send welcome message
      socket.send(JSON.stringify({
        type: 'connected',
        data: {
          connectionId,
          timestamp: new Date().toISOString(),
        }
      }));

    } catch (error) {
      logger.error('Failed to establish WebSocket connection', { error });
      throw createError.websocket('Failed to establish WebSocket connection', { error });
    }
  }

  async handleAuthenticatedConnection(request: FastifyRequest, reply: FastifyReply) {
    try {
      // Verify authentication
      const user = (request as AuthenticatedRequest).user;
      if (!user) {
        throw createError.unauthorized('Authentication required for WebSocket connection');
      }

      // Upgrade to WebSocket connection
      const { socket } = await reply.raw.upgrade();
      
      // Generate connection ID with user context
      const connectionId = this.generateAuthenticatedConnectionId(user.id);
      
      // Add connection to service
      this.websocketService.addConnection(connectionId, socket);
      
      logger.info('Authenticated WebSocket connection established', { 
        connectionId,
        userId: user.id,
        username: user.username,
        ip: request.ip
      });

      // Send welcome message with user context
      socket.send(JSON.stringify({
        type: 'connected',
        data: {
          connectionId,
          userId: user.id,
          username: user.username,
          timestamp: new Date().toISOString(),
        }
      }));

    } catch (error) {
      logger.error('Failed to establish authenticated WebSocket connection', { error });
      throw createError.websocket('Failed to establish authenticated WebSocket connection', { error });
    }
  }

  // Handle subscription requests via HTTP (alternative to WebSocket messages)
  async subscribeToSample(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as AuthenticatedRequest).user;
      if (!user) {
        throw createError.unauthorized('Authentication required');
      }

      const { sampleNo } = request.params as { sampleNo: string };
      const { connectionId } = request.body as { connectionId: string };

      this.websocketService.subscribeToSample(connectionId, sampleNo);

      logger.info('Sample subscription created via HTTP', { 
        connectionId,
        userId: user.id,
        sampleNo
      });

      return reply.send({
        success: true,
        data: {
          message: 'Subscribed to sample updates',
          sampleNo,
          connectionId
        }
      });

    } catch (error) {
      logger.error('Failed to subscribe to sample via HTTP', { error });
      return reply.status(400).send({
        success: false,
        error: {
          code: 'SUBSCRIPTION_FAILED',
          message: 'Failed to subscribe to sample updates',
        }
      });
    }
  }

  async unsubscribeFromSample(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as AuthenticatedRequest).user;
      if (!user) {
        throw createError.unauthorized('Authentication required');
      }

      const { sampleNo } = request.params as { sampleNo: string };
      const { connectionId } = request.body as { connectionId: string };

      this.websocketService.unsubscribeFromSample(connectionId, sampleNo);

      logger.info('Sample unsubscription created via HTTP', { 
        connectionId,
        userId: user.id,
        sampleNo
      });

      return reply.send({
        success: true,
        data: {
          message: 'Unsubscribed from sample updates',
          sampleNo,
          connectionId
        }
      });

    } catch (error) {
      logger.error('Failed to unsubscribe from sample via HTTP', { error });
      return reply.status(400).send({
        success: false,
        error: {
          code: 'UNSUBSCRIPTION_FAILED',
          message: 'Failed to unsubscribe from sample updates',
        }
      });
    }
  }

  async subscribeToRun(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as AuthenticatedRequest).user;
      if (!user) {
        throw createError.unauthorized('Authentication required');
      }

      const { runId } = request.params as { runId: number };
      const { connectionId } = request.body as { connectionId: string };

      this.websocketService.subscribeToRun(connectionId, runId);

      logger.info('Run subscription created via HTTP', { 
        connectionId,
        userId: user.id,
        runId
      });

      return reply.send({
        success: true,
        data: {
          message: 'Subscribed to run updates',
          runId,
          connectionId
        }
      });

    } catch (error) {
      logger.error('Failed to subscribe to run via HTTP', { error });
      return reply.status(400).send({
        success: false,
        error: {
          code: 'SUBSCRIPTION_FAILED',
          message: 'Failed to subscribe to run updates',
        }
      });
    }
  }

  async unsubscribeFromRun(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as AuthenticatedRequest).user;
      if (!user) {
        throw createError.unauthorized('Authentication required');
      }

      const { runId } = request.params as { runId: number };
      const { connectionId } = request.body as { connectionId: string };

      this.websocketService.unsubscribeFromRun(connectionId, runId);

      logger.info('Run unsubscription created via HTTP', { 
        connectionId,
        userId: user.id,
        runId
      });

      return reply.send({
        success: true,
        data: {
          message: 'Unsubscribed from run updates',
          runId,
          connectionId
        }
      });

    } catch (error) {
      logger.error('Failed to unsubscribe from run via HTTP', { error });
      return reply.status(400).send({
        success: false,
        error: {
          code: 'UNSUBSCRIPTION_FAILED',
          message: 'Failed to unsubscribe from run updates',
        }
      });
    }
  }

  async subscribeToSystem(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as AuthenticatedRequest).user;
      if (!user) {
        throw createError.unauthorized('Authentication required');
      }

      // Only allow admin users to subscribe to system updates
      if (!user.roles.includes('admin')) {
        throw createError.forbidden('Admin role required for system subscriptions');
      }

      const { connectionId } = request.body as { connectionId: string };

      this.websocketService.subscribeToSystem(connectionId);

      logger.info('System subscription created via HTTP', { 
        connectionId,
        userId: user.id
      });

      return reply.send({
        success: true,
        data: {
          message: 'Subscribed to system updates',
          connectionId
        }
      });

    } catch (error) {
      logger.error('Failed to subscribe to system via HTTP', { error });
      return reply.status(400).send({
        success: false,
        error: {
          code: 'SUBSCRIPTION_FAILED',
          message: 'Failed to subscribe to system updates',
        }
      });
    }
  }

  async unsubscribeFromSystem(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as AuthenticatedRequest).user;
      if (!user) {
        throw createError.unauthorized('Authentication required');
      }

      const { connectionId } = request.body as { connectionId: string };

      this.websocketService.unsubscribeFromSystem(connectionId);

      logger.info('System unsubscription created via HTTP', { 
        connectionId,
        userId: user.id
      });

      return reply.send({
        success: true,
        data: {
          message: 'Unsubscribed from system updates',
          connectionId
        }
      });

    } catch (error) {
      logger.error('Failed to unsubscribe from system via HTTP', { error });
      return reply.status(400).send({
        success: false,
        error: {
          code: 'UNSUBSCRIPTION_FAILED',
          message: 'Failed to unsubscribe from system updates',
        }
      });
    }
  }

  async getConnectionStats(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as AuthenticatedRequest).user;
      if (!user) {
        throw createError.unauthorized('Authentication required');
      }

      // Only allow admin users to view connection stats
      if (!user.roles.includes('admin')) {
        throw createError.forbidden('Admin role required to view connection stats');
      }

      const stats = this.websocketService.getConnectionStats();

      logger.info('Connection stats retrieved', { 
        userId: user.id,
        stats
      });

      return reply.send({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error('Failed to get connection stats', { error });
      return reply.status(400).send({
        success: false,
        error: {
          code: 'STATS_FAILED',
          message: 'Failed to get connection statistics',
        }
      });
    }
  }

  // Helper methods
  private generateConnectionId(request: FastifyRequest): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    const ip = request.ip?.replace(/[.:]/g, '') || 'unknown';
    
    return `ws_${timestamp}_${random}_${ip}`;
  }

  private generateAuthenticatedConnectionId(userId: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    
    return `ws_auth_${userId}_${timestamp}_${random}`;
  }

  // Broadcast methods for external use
  async broadcastSampleUpdate(sampleNo: string, data: any): Promise<void> {
    try {
      await this.websocketService.broadcastSampleUpdate(sampleNo, data);
      logger.info('Sample update broadcasted', { sampleNo });
    } catch (error) {
      logger.error('Failed to broadcast sample update', { sampleNo, error });
    }
  }

  async broadcastRunUpdate(runId: number, data: any): Promise<void> {
    try {
      await this.websocketService.broadcastRunUpdate(runId, data);
      logger.info('Run update broadcasted', { runId });
    } catch (error) {
      logger.error('Failed to broadcast run update', { runId, error });
    }
  }

  async broadcastSystemUpdate(data: any): Promise<void> {
    try {
      await this.websocketService.broadcastSystemUpdate(data);
      logger.info('System update broadcasted');
    } catch (error) {
      logger.error('Failed to broadcast system update', { error });
    }
  }
}
