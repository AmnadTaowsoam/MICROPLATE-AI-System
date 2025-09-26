import { Router } from 'express';
import { WebSocketController } from '@/controllers/websocket.controller';
import { z } from 'zod';

export function websocketRoutes(websocketController: WebSocketController): Router {
  const router = Router();

  // =========================
  // HTTP-based Subscription Routes (Alternative to WebSocket messages)
  // =========================

  // POST /api/v1/results/subscriptions/samples/:sampleNo - Subscribe to sample updates via HTTP
  /**
   * @swagger
   * /api/v1/results/subscriptions/samples/{sampleNo}:
   *   post:
   *     tags: [WebSocket Subscriptions]
   *     summary: Subscribe to sample updates
   *     description: Subscribe to real-time updates for a specific sample via HTTP
   *     parameters:
   *       - in: path
   *         name: sampleNo
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               connectionId:
   *                 type: string
   *             required:
   *               - connectionId
   *     responses:
   *       200:
   *         description: Successfully subscribed to sample updates
   */
  router.post('/subscriptions/samples/:sampleNo', websocketController.subscribeToSample.bind(websocketController));

  // DELETE /api/v1/results/subscriptions/samples/:sampleNo - Unsubscribe from sample updates via HTTP
  /**
   * @swagger
   * /api/v1/results/subscriptions/samples/{sampleNo}:
   *   delete:
   *     tags: [WebSocket Subscriptions]
   *     summary: Unsubscribe from sample updates
   *     description: Unsubscribe from real-time updates for a specific sample via HTTP
   *     parameters:
   *       - in: path
   *         name: sampleNo
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               connectionId:
   *                 type: string
   *             required:
   *               - connectionId
   *     responses:
   *       200:
   *         description: Successfully unsubscribed from sample updates
   */
  router.delete('/subscriptions/samples/:sampleNo', websocketController.unsubscribeFromSample.bind(websocketController));

  // POST /api/v1/results/subscriptions/runs/:runId - Subscribe to run updates via HTTP
  /**
   * @swagger
   * /api/v1/results/subscriptions/runs/{runId}:
   *   post:
   *     tags: [WebSocket Subscriptions]
   *     summary: Subscribe to run updates
   *     description: Subscribe to real-time updates for a specific prediction run via HTTP
   *     parameters:
   *       - in: path
   *         name: runId
   *         required: true
   *         schema:
   *           type: integer
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               connectionId:
   *                 type: string
   *             required:
   *               - connectionId
   *     responses:
   *       200:
   *         description: Successfully subscribed to run updates
   */
  router.post('/subscriptions/runs/:runId', websocketController.subscribeToRun.bind(websocketController));

  // DELETE /api/v1/results/subscriptions/runs/:runId - Unsubscribe from run updates via HTTP
  /**
   * @swagger
   * /api/v1/results/subscriptions/runs/{runId}:
   *   delete:
   *     tags: [WebSocket Subscriptions]
   *     summary: Unsubscribe from run updates
   *     description: Unsubscribe from real-time updates for a specific prediction run via HTTP
   *     parameters:
   *       - in: path
   *         name: runId
   *         required: true
   *         schema:
   *           type: integer
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               connectionId:
   *                 type: string
   *             required:
   *               - connectionId
   *     responses:
   *       200:
   *         description: Successfully unsubscribed from run updates
   */
  router.delete('/subscriptions/runs/:runId', websocketController.unsubscribeFromRun.bind(websocketController));

  // POST /api/v1/results/subscriptions/system - Subscribe to system updates via HTTP
  /**
   * @swagger
   * /api/v1/results/subscriptions/system:
   *   post:
   *     tags: [WebSocket Subscriptions]
   *     summary: Subscribe to system updates
   *     description: Subscribe to real-time system updates via HTTP (admin only)
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               connectionId:
   *                 type: string
   *             required:
   *               - connectionId
   *     responses:
   *       200:
   *         description: Successfully subscribed to system updates
   */
  router.post('/subscriptions/system', websocketController.subscribeToSystem.bind(websocketController));

  // DELETE /api/v1/results/subscriptions/system - Unsubscribe from system updates via HTTP
  /**
   * @swagger
   * /api/v1/results/subscriptions/system:
   *   delete:
   *     tags: [WebSocket Subscriptions]
   *     summary: Unsubscribe from system updates
   *     description: Unsubscribe from real-time system updates via HTTP
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               connectionId:
   *                 type: string
   *             required:
   *               - connectionId
   *     responses:
   *       200:
   *         description: Successfully unsubscribed from system updates
   */
  router.delete('/subscriptions/system', websocketController.unsubscribeFromSystem.bind(websocketController));

  // =========================
  // WebSocket Management Routes
  // =========================

  // GET /api/v1/results/ws/stats - Get WebSocket connection statistics
  /**
   * @swagger
   * /api/v1/results/ws/stats:
   *   get:
   *     tags: [WebSocket Management]
   *     summary: Get connection statistics
   *     description: Get WebSocket connection statistics (admin only)
   *     responses:
   *       200:
   *         description: Successfully retrieved connection statistics
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     totalConnections:
   *                       type: integer
   *                     totalWebSockets:
   *                       type: integer
   *                     sampleSubscriptions:
   *                       type: integer
   *                     runSubscriptions:
   *                       type: integer
   *                     systemSubscriptions:
   *                       type: integer
   */
  router.get('/ws/stats', websocketController.getConnectionStats.bind(websocketController));

  return router;
}

// WebSocket message handlers (for use with WebSocket connections)
export const websocketMessageHandlers = {
  handleMessage: (ws: any, data: any) => {
    // Handle WebSocket message routing
    // This would be called from the WebSocket connection handler
  },
  
  handleDisconnect: (ws: any) => {
    // Handle WebSocket disconnection
    // This would be called when a WebSocket connection is closed
  }
};