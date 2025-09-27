import express from 'express';
import { logStore } from '../services/log.store';

export function registerLogRoutes(app: express.Application) {
  // Get all logs
  app.get('/api/v1/logs', async (req, res) => {
    try {
      const logs = await logStore.all();
      res.json({
        success: true,
        data: {
          logs: logs.slice(0, 100), // Limit to 100 most recent logs
          total: logs.length
        }
      });
    } catch (error) {
      console.error('Error fetching logs:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_LOGS_ERROR',
          message: 'Failed to fetch logs'
        }
      });
    }
  });

  // Get logs by level
  app.get('/api/v1/logs/:level', async (req, res) => {
    try {
      const { level } = req.params;
      const allLogs = await logStore.all();
      const filteredLogs = allLogs.filter(log => log.level === level);
      
      res.json({
        success: true,
        data: {
          logs: filteredLogs.slice(0, 50),
          total: filteredLogs.length,
          level
        }
      });
    } catch (error) {
      console.error('Error fetching logs by level:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_LOGS_BY_LEVEL_ERROR',
          message: 'Failed to fetch logs by level'
        }
      });
    }
  });

  // Clear logs
  app.delete('/api/v1/logs', async (req, res) => {
    try {
      await logStore.clear();
      res.json({
        success: true,
        message: 'Logs cleared successfully'
      });
    } catch (error) {
      console.error('Error clearing logs:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CLEAR_LOGS_ERROR',
          message: 'Failed to clear logs'
        }
      });
    }
  });
}