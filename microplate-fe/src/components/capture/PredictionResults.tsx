import { useState } from 'react';
import { useSampleResult } from '../../hooks/useResults';
import Card from '../ui/Card';
import Button from '../ui/Button';

interface PredictionResultsProps {
  sampleNo: string;
  predictionData?: any;
  isPredicting: boolean;
}

export default function PredictionResults({ 
  sampleNo, 
  predictionData, 
  isPredicting 
}: PredictionResultsProps) {
  const [activeTab, setActiveTab] = useState<'results' | 'summary'>('results');
  const { data: sampleResult, isLoading: isLoadingSample } = useSampleResult(sampleNo || undefined);

  return (
    <Card className="col-span-12 md:col-span-3 xl:col-span-2 p-5">
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
        <button
          onClick={() => setActiveTab('results')}
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'results'
              ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Prediction Results
        </button>
        <button
          onClick={() => setActiveTab('summary')}
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'summary'
              ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Summary
        </button>
      </div>

      {activeTab === 'results' ? (
        <div className="space-y-4">
          {isPredicting ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Running prediction...</p>
            </div>
          ) : predictionData ? (
            <div className="space-y-3">
              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">Prediction Complete</h4>
                <p className="text-sm text-green-600 dark:text-green-300">
                  Confidence: {predictionData.confidence || 'N/A'}%
                </p>
              </div>
              <div className="space-y-2">
                <h5 className="font-medium text-gray-900 dark:text-white">Results:</h5>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  {JSON.stringify(predictionData, null, 2)}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">No prediction data available</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                Upload an image and run prediction to see results
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {isLoadingSample ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Loading sample data...</p>
            </div>
          ) : sampleResult ? (
            <div className="space-y-3">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Sample Data</h4>
                <p className="text-sm text-blue-600 dark:text-blue-300">
                  Sample: {sampleResult.sampleNo}
                </p>
                {sampleResult.submissionNo && (
                  <p className="text-sm text-blue-600 dark:text-blue-300">
                    Submission: {sampleResult.submissionNo}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <h5 className="font-medium text-gray-900 dark:text-white">Details:</h5>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  {JSON.stringify(sampleResult, null, 2)}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">Press Enter to load sample results</p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
