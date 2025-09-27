import * as fs from 'fs';
import * as path from 'path';
import { createObjectCsvWriter } from 'csv-writer';
import { prisma } from '../server';
import { createSampleSummaryService, SampleSummaryData } from './sample-summary.service';

export interface CsvRow {
  SAMPLE_NUMBER: string;
  TEST_NUMBER: string;
  REPORTED_NAME: string | number;
  ENTRY: number;
}

export class CsvService {
  private tempDir: string;
  private sampleSummaryService: any;

  constructor() {
    this.tempDir = process.env['TEMP_DIR'] || '/tmp/interface-files';
    this.ensureTempDir();
    
    // Initialize sample summary service
    this.sampleSummaryService = createSampleSummaryService({
      resultApiServiceUrl: process.env['RESULT_API_SERVICE_URL'] || 'http://localhost:6403',
      token: process.env['SERVICE_TOKEN'] || 'default-token',
      timeout: 10000,
    });
  }

  private ensureTempDir(): void {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  async generateInterfaceFile(sampleNo: string): Promise<{
    filePath: string;
    fileName: string;
    fileSize: number;
  }> {
    try {
      // Get sample summary data from result-api-service
      let sampleSummary: SampleSummaryData;
      
      try {
        // Try API first
        sampleSummary = await this.sampleSummaryService.getSampleSummary(sampleNo);
      } catch (apiError) {
        console.warn('API call failed, falling back to direct database access:', apiError);
        
        // Fallback to direct database access
        const dbSummary = await prisma.sampleSummary.findUnique({
          where: { sampleNo },
        });

        if (!dbSummary) {
          throw new Error(`Sample ${sampleNo} not found`);
        }

        sampleSummary = {
          sampleNo: dbSummary.sampleNo,
          summary: dbSummary.summary as any,
          totalRuns: dbSummary.totalRuns,
          lastRunAt: dbSummary.lastRunAt,
          lastRunId: dbSummary.lastRunId,
          createdAt: dbSummary.createdAt,
          updatedAt: dbSummary.updatedAt,
        };
      }

      // Parse summary data
      const summary = sampleSummary.summary;
      const distribution = summary?.distribution || {};

      // Generate CSV data based on interface_sample.csv format
      const csvData = this.generateCsvData(sampleNo, distribution);

      // Create unique filename
      const fileName = `interface_${sampleNo}_${Date.now()}.csv`;
      const filePath = path.join(this.tempDir, fileName);

      // Write CSV file
      const csvWriter = createObjectCsvWriter({
        path: filePath,
        header: [
          { id: 'SAMPLE_NUMBER', title: 'SAMPLE_NUMBER' },
          { id: 'TEST_NUMBER', title: 'TEST_NUMBER' },
          { id: 'REPORTED_NAME', title: 'REPORTED_NAME' },
          { id: 'ENTRY', title: 'ENTRY' },
        ],
      });

      await csvWriter.writeRecords(csvData);

      // Get file size
      const stats = fs.statSync(filePath);
      const fileSize = stats.size;

      console.log(`CSV file generated: ${fileName} (${fileSize} bytes)`);

      return {
        filePath,
        fileName,
        fileSize,
      };
    } catch (error) {
      console.error('Failed to generate CSV file:', error);
      throw error;
    }
  }

  private generateCsvData(sampleNo: string, distribution: any): CsvRow[] {
    const csvData: CsvRow[] = [];
    
    // Extract positive and negative counts
    const positive = distribution.positive || 0;
    const negative = distribution.negative || 0;
    const invalid = distribution.invalid || 0;
    
    // Generate individual well data (assuming 96-well plate: 12 columns x 8 rows)
    const totalWells = 96;
    let wellIndex = 1;
    
    // Add positive wells
    for (let i = 0; i < positive && wellIndex <= totalWells; i++) {
      csvData.push({
        SAMPLE_NUMBER: sampleNo,
        TEST_NUMBER: 'T001',
        REPORTED_NAME: wellIndex,
        ENTRY: 1, // Positive
      });
      wellIndex++;
    }
    
    // Add negative wells
    for (let i = 0; i < negative && wellIndex <= totalWells; i++) {
      csvData.push({
        SAMPLE_NUMBER: sampleNo,
        TEST_NUMBER: 'T001',
        REPORTED_NAME: wellIndex,
        ENTRY: 0, // Negative
      });
      wellIndex++;
    }
    
    // Add invalid wells
    for (let i = 0; i < invalid && wellIndex <= totalWells; i++) {
      csvData.push({
        SAMPLE_NUMBER: sampleNo,
        TEST_NUMBER: 'T001',
        REPORTED_NAME: wellIndex,
        ENTRY: -1, // Invalid
      });
      wellIndex++;
    }
    
    // Fill remaining wells with 0 (empty)
    while (wellIndex <= totalWells) {
      csvData.push({
        SAMPLE_NUMBER: sampleNo,
        TEST_NUMBER: 'T001',
        REPORTED_NAME: wellIndex,
        ENTRY: 0,
      });
      wellIndex++;
    }
    
    // Add summary rows
    const total = positive + negative + invalid;
    const mean = total > 0 ? positive / total : 0;
    const variance = this.calculateVariance(positive, negative, invalid, mean);
    const sd = Math.sqrt(variance);
    const cv = mean > 0 ? sd / mean : 0;
    
    // Add summary data
    csvData.push({
      SAMPLE_NUMBER: `${sampleNo}3`,
      TEST_NUMBER: 'T001',
      REPORTED_NAME: 'total',
      ENTRY: total,
    });
    
    csvData.push({
      SAMPLE_NUMBER: `${sampleNo}4`,
      TEST_NUMBER: 'T001',
      REPORTED_NAME: 'MEAN',
      ENTRY: Math.round(mean * 100) / 100,
    });
    
    csvData.push({
      SAMPLE_NUMBER: `${sampleNo}5`,
      TEST_NUMBER: 'T001',
      REPORTED_NAME: 'SD',
      ENTRY: Math.round(sd * 100) / 100,
    });
    
    csvData.push({
      SAMPLE_NUMBER: `${sampleNo}6`,
      TEST_NUMBER: 'T001',
      REPORTED_NAME: 'CV',
      ENTRY: Math.round(cv * 100000000) / 100000000,
    });
    
    return csvData;
  }

  private calculateVariance(positive: number, negative: number, invalid: number, mean: number): number {
    const total = positive + negative + invalid;
    if (total === 0) return 0;
    
    const values = [
      ...Array(positive).fill(1),
      ...Array(negative).fill(0),
      ...Array(invalid).fill(-1)
    ];
    
    const sumSquaredDiffs = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0);
    return sumSquaredDiffs / total;
  }

  async cleanupFile(filePath: string): Promise<void> {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`Temporary file cleaned up: ${filePath}`);
      }
    } catch (error) {
      console.error(`Failed to cleanup file ${filePath}:`, error);
    }
  }

  async cleanupOldFiles(maxAgeHours: number = 24): Promise<void> {
    try {
      const files = fs.readdirSync(this.tempDir);
      const now = Date.now();
      const maxAge = maxAgeHours * 60 * 60 * 1000;

      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        const stats = fs.statSync(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          fs.unlinkSync(filePath);
          console.log(`Cleaned up old file: ${file}`);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old files:', error);
    }
  }
}

export const csvService = new CsvService();
