import * as fs from 'fs';
import * as path from 'path';
import { createObjectCsvWriter } from 'csv-writer';
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
      
      // Get sample summary data from result-api-service
      sampleSummary = await this.sampleSummaryService.getSampleSummary(sampleNo);

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
    
    // Generate data for 12 rows from summary distribution
    for (let row = 1; row <= 12; row++) {
      const rowValue = distribution[row.toString()] || 0;
      csvData.push({
        SAMPLE_NUMBER: sampleNo,
        TEST_NUMBER: 'T001',
        REPORTED_NAME: row,
        ENTRY: rowValue,
      });
    }
    
    // Calculate statistics from the 12 row values
    const values = Object.keys(distribution)
      .filter(key => key !== 'total')
      .map(key => distribution[key] || 0);
    
    const total = values.reduce((sum, val) => sum + val, 0);
    
    // Calculate GMT: Sum{(REPORTED_NAME-row1 x ENTRYrow-1) + ...} / Sum(ENTRY)
    let gmtNumerator = 0;
    for (let i = 0; i < values.length; i++) {
      const reportedName = i + 1; // REPORTED_NAME values are 1, 2, 3, ..., 12
      const entry = values[i]; // ENTRY values from distribution
      gmtNumerator += reportedName * entry;
    }
    const gmt = total > 0 ? gmtNumerator / total : 0;
    
    const mean = values.length > 0 ? total / values.length : 0;
    const variance = this.calculateVarianceFromValues(values, mean);
    const sd = Math.sqrt(variance);
    const cv = mean > 0 ? sd / mean : 0;
    
    // Add summary data
    csvData.push({
      SAMPLE_NUMBER: sampleNo,
      TEST_NUMBER: 'T001',
      REPORTED_NAME: 'GMT',
      ENTRY: Math.round(gmt * 100) / 100,
    });
    
    csvData.push({
      SAMPLE_NUMBER: sampleNo,
      TEST_NUMBER: 'T001',
      REPORTED_NAME: 'MEAN',
      ENTRY: Math.round(mean * 100) / 100,
    });
    
    csvData.push({
      SAMPLE_NUMBER: sampleNo,
      TEST_NUMBER: 'T001',
      REPORTED_NAME: 'SD',
      ENTRY: Math.round(sd * 100) / 100,
    });
    
    csvData.push({
      SAMPLE_NUMBER: sampleNo,
      TEST_NUMBER: 'T001',
      REPORTED_NAME: 'CV',
      ENTRY: Math.round(cv * 100000000) / 100000000,
    });
    
    return csvData;
  }

  private calculateVarianceFromValues(values: number[], mean: number): number {
    if (values.length === 0) return 0;
    
    const sumSquaredDiffs = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0);
    return sumSquaredDiffs / values.length;
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
