import { PrismaClient } from '@prisma/client';
import { AggregationServiceImpl } from '@/services/aggregation.service';
import { logger } from '@/utils/logger';
import { config } from '@/config/config';

/**
 * Aggregation Worker
 * 
 * This worker handles background processing for data aggregation,
 * including processing database notifications and maintaining
 * sample summary consistency.
 */

class AggregationWorker {
  private prisma: PrismaClient;
  private aggregationService: AggregationServiceImpl;
  private isRunning = false;
  private notificationClient: any = null;

  constructor() {
    this.prisma = new PrismaClient({
      log: ['error'],
    });
    this.aggregationService = new AggregationServiceImpl(this.prisma);
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn({}, 'Aggregation worker is already running');
      return;
    }

    try {
      logger.info({}, 'Starting aggregation worker...');

      // Connect to database
      await this.prisma.$connect();
      logger.info({}, 'Database connected for aggregation worker');

      // Setup database notifications
      await this.setupDatabaseNotifications();

      this.isRunning = true;
      logger.info({}, 'Aggregation worker started successfully');

      // Start periodic maintenance tasks
      this.startMaintenanceTasks();

    } catch (error) {
      logger.error({ error }, 'Failed to start aggregation worker');
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      logger.info({}, 'Stopping aggregation worker...');

      this.isRunning = false;

      // Close database notification client
      if (this.notificationClient) {
        await this.notificationClient.end();
        this.notificationClient = null;
      }

      // Disconnect from database
      await this.prisma.$disconnect();

      logger.info({}, 'Aggregation worker stopped successfully');

    } catch (error) {
      logger.error({ error }, 'Error stopping aggregation worker');
      throw error;
    }
  }

  private async setupDatabaseNotifications(): Promise<void> {
    if (!config.features.databaseNotifications) {
      logger.info({}, 'Database notifications disabled - skipping setup');
      return;
    }

    try {
      // In a real implementation, this would use a PostgreSQL LISTEN/NOTIFY client
      // For now, we'll simulate the setup
      logger.info({}, 'Database notifications configured');
      
      // Example of how to handle notifications:
      // this.notificationClient = new pg.Client(connectionString);
      // await this.notificationClient.connect();
      // await this.notificationClient.query('LISTEN inference_results_new');
      
      // this.notificationClient.on('notification', (msg) => {
      //   this.handleNotification(msg);
      // });

    } catch (error) {
      logger.error({ error }, 'Failed to setup database notifications');
    }
  }

  private async handleNotification(notification: any): Promise<void> {
    try {
      const { channel, payload } = notification;
      
      logger.info({ channel, payload }, 'Received database notification');

      switch (channel) {
        case 'inference_results_new':
          await this.processNewInferenceResult(payload);
          break;
        default:
          logger.warn({ channel }, 'Unknown notification channel');
      }

    } catch (error) {
      logger.error({ error, notification }, 'Error handling notification');
    }
  }

  private async processNewInferenceResult(runId: string): Promise<void> {
    try {
      const runIdNum = parseInt(runId, 10);
      
      // Get sample number for this run
      const run = await this.prisma.predictionRun.findUnique({
        where: { id: runIdNum },
        select: { sampleNo: true }
      });

      if (!run) {
        logger.warn({ runId: runIdNum }, 'Run not found for notification');
        return;
      }

      logger.info({ 
        runId: runIdNum, 
        sampleNo: run.sampleNo 
      }, 'Processing new inference result');

      // Update sample summary
      await this.aggregationService.updateSampleSummary(run.sampleNo);

      logger.info({ 
        runId: runIdNum, 
        sampleNo: run.sampleNo 
      }, 'Sample summary updated');

    } catch (error) {
      logger.error({ runId, error }, 'Error processing new inference result');
    }
  }

  private startMaintenanceTasks(): void {
    // Run consistency check every hour
    setInterval(async () => {
      if (!this.isRunning) return;
      
      try {
        await this.runConsistencyCheck();
      } catch (error) {
        logger.error({ error }, 'Error in consistency check');
      }
    }, 60 * 60 * 1000); // 1 hour

    // Run cleanup tasks every 6 hours
    setInterval(async () => {
      if (!this.isRunning) return;
      
      try {
        await this.runCleanupTasks();
      } catch (error) {
        logger.error({ error }, 'Error in cleanup tasks');
      }
    }, 6 * 60 * 60 * 1000); // 6 hours

    // Run statistics update every 15 minutes
    setInterval(async () => {
      if (!this.isRunning) return;
      
      try {
        await this.updateSystemStatistics();
      } catch (error) {
        logger.error({ error }, 'Error updating system statistics');
      }
    }, 15 * 60 * 1000); // 15 minutes
  }

  private async runConsistencyCheck(): Promise<void> {
    try {
      logger.info({}, 'Starting consistency check...');

      // Get all samples that might need consistency checking
      const samples = await this.prisma.sampleSummary.findMany({
        select: { sampleNo: true },
        take: 100, // Process in batches
      });

      let inconsistentCount = 0;

      for (const sample of samples) {
        const isConsistent = await this.aggregationService.validateSampleSummary(sample.sampleNo);
        if (!isConsistent) {
          logger.warn({ sampleNo: sample.sampleNo }, 'Inconsistent sample summary detected');
          // Fix the inconsistency
          await this.aggregationService.updateSampleSummary(sample.sampleNo);
          inconsistentCount++;
        }
      }

      logger.info({ 
        totalChecked: samples.length,
        inconsistentFound: inconsistentCount
      }, 'Consistency check completed');

    } catch (error) {
      logger.error({ error }, 'Error in consistency check');
    }
  }

  private async runCleanupTasks(): Promise<void> {
    try {
      logger.info({}, 'Starting cleanup tasks...');

      // Clean up old health check records (keep only last 24 hours)
      const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const deletedHealthChecks = await this.prisma.healthCheck.deleteMany({
        where: {
          timestamp: {
            lt: cutoffDate
          }
        }
      });

      logger.info({ 
        deletedHealthChecks: deletedHealthChecks.count
      }, 'Cleanup tasks completed');

    } catch (error) {
      logger.error({ error }, 'Error in cleanup tasks');
    }
  }

  private async updateSystemStatistics(): Promise<void> {
    try {
      // This would update any cached system statistics
      logger.debug({}, 'System statistics update completed');
    } catch (error) {
      logger.error({ error }, 'Error updating system statistics');
    }
  }

  // Manual methods for external triggers
  async updateSampleSummary(sampleNo: string): Promise<void> {
    try {
      await this.aggregationService.updateSampleSummary(sampleNo);
      logger.info({ sampleNo }, 'Manual sample summary update completed');
    } catch (error) {
      logger.error({ sampleNo, error }, 'Error in manual sample summary update');
      throw error;
    }
  }

  async updateAllSampleSummaries(): Promise<void> {
    try {
      logger.info({}, 'Starting manual update of all sample summaries...');
      await this.aggregationService.updateAllSampleSummaries();
      logger.info({}, 'Manual update of all sample summaries completed');
    } catch (error) {
      logger.error({ error }, 'Error in manual update of all sample summaries');
      throw error;
    }
  }

  async getWorkerStats(): Promise<any> {
    try {
      const stats = await this.aggregationService.getAggregationStats();
      return {
        isRunning: this.isRunning,
        ...stats,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error({ error }, 'Error getting worker stats');
      return {
        isRunning: this.isRunning,
        error: (error as any).message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}

// Create and export worker instance
const worker = new AggregationWorker();

// Handle process signals
process.on('SIGINT', async () => {
  logger.info({}, 'Received SIGINT, stopping aggregation worker...');
  await worker.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info({}, 'Received SIGTERM, stopping aggregation worker...');
  await worker.stop();
  process.exit(0);
});

// Start worker if this file is run directly
if (require.main === module) {
  worker.start().catch((error) => {
    logger.error({ error }, 'Failed to start aggregation worker');
    process.exit(1);
  });
}

export { AggregationWorker };
export default worker;
