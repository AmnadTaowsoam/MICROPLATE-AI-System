import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { 
  MdSearch, 
  MdGridOn, 
  MdCheckCircle, 
  MdCancel, 
  MdWarning,
  MdRefresh,
  MdDownload,
  MdViewList,
  MdScience,
  MdAnalytics,
  MdTimeline,
  MdInfo
} from 'react-icons/md';
import Card from '../components/ui/Card';
import Spinner from '../components/ui/Spinner';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

// Types based on the Prisma schema
interface PredictionRun {
  id: number;
  sampleNo: string;
  submissionNo?: string;
  description?: string;
  predictAt: string;
  annotatedImagePath?: string;
  rawImagePath?: string;
  modelVersion?: string;
  status: string;
  errorMsg?: string;
  processingTimeMs?: number;
  confidenceThreshold?: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  rowCounts: RowCounts[];
  inferenceResults: InferenceResult[];
  wellPredictions: WellPrediction[];
}

interface RowCounts {
  id: number;
  runId: number;
  counts: {
    positive: number;
    negative: number;
    invalid: number;
  };
  createdAt: string;
}

interface InferenceResult {
  id: number;
  runId: number;
  results: unknown; // JSON data
  createdAt: string;
}

interface WellPrediction {
  id: number;
  runId: number;
  wellId: string;
  label: string;
  class_: string;
  confidence: number;
  bbox: {
    xmin: number;
    ymin: number;
    xmax: number;
    ymax: number;
  };
  createdAt: string;
}

interface SampleSummary {
  sampleNo: string;
  summary: {
    distribution: {
      positive: number;
      negative: number;
      invalid: number;
    };
  };
  totalRuns: number;
  lastRunAt?: string;
  lastRunId?: number;
  createdAt: string;
  updatedAt: string;
}

export default function ResultsPageNew() {
  const { sampleNo } = useParams<{ sampleNo: string }>();
  const [activeTab, setActiveTab] = useState<'overview' | 'runs' | 'wells' | 'analysis'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('predictAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Mock data - will be replaced with actual API calls
  const [isLoading] = useState(false);
  const [sampleSummary] = useState<SampleSummary | null>({
    sampleNo: sampleNo || '',
    summary: {
      distribution: {
        positive: 37,
        negative: 59,
        invalid: 0
      }
    },
    totalRuns: 3,
    lastRunAt: '2024-01-15T10:30:00Z',
    lastRunId: 123,
    createdAt: '2024-01-10T09:00:00Z',
    updatedAt: '2024-01-15T10:30:00Z'
  });

  const [predictionRuns] = useState<PredictionRun[]>([
    {
      id: 123,
      sampleNo: sampleNo || '',
      submissionNo: 'SUB001',
      description: 'Initial test run',
      predictAt: '2024-01-15T10:30:00Z',
      annotatedImagePath: '/images/annotated_123.jpg',
      rawImagePath: '/images/raw_123.jpg',
      modelVersion: 'v2.1.0',
      status: 'completed',
      processingTimeMs: 2500,
      confidenceThreshold: 0.7,
      createdAt: '2024-01-15T10:25:00Z',
      updatedAt: '2024-01-15T10:30:00Z',
      rowCounts: [
        {
          id: 1,
          runId: 123,
          counts: { positive: 37, negative: 59, invalid: 0 },
          createdAt: '2024-01-15T10:30:00Z'
        }
      ],
      inferenceResults: [
        {
          id: 1,
          runId: 123,
          results: { distribution: { positive: 37, negative: 59 }, confidence: 0.85 },
          createdAt: '2024-01-15T10:30:00Z'
        }
      ],
      wellPredictions: []
    }
  ]);

  if (!sampleNo) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <MdSearch className="h-16 w-16 text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200">Select a Sample</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-2">Choose a sample from the history to view its detailed results.</p>
      </div>
    );
  }

  const filteredRuns = predictionRuns.filter(run => {
    const matchesSearch = run.submissionNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         run.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || run.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const sortedRuns = [...filteredRuns].sort((a, b) => {
    const aValue = a[sortBy as keyof PredictionRun];
    const bValue = b[sortBy as keyof PredictionRun];
    
    if (aValue === undefined || bValue === undefined) return 0;
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100 dark:bg-green-900/30';
      case 'processing': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30';
      case 'failed': return 'text-red-600 bg-red-100 dark:bg-red-900/30';
      case 'pending': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/30';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Analysis Results</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Sample ID: <span className="font-semibold text-primary-600">{sampleNo}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex items-center gap-2">
            <MdDownload className="h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" className="flex items-center gap-2">
            <MdRefresh className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Sample Summary Card */}
      {sampleSummary && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <MdAnalytics className="h-6 w-6 text-primary-600" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Sample Summary</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <MdCheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Positive</span>
              </div>
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                {sampleSummary.summary.distribution.positive}
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <MdCancel className="h-5 w-5 text-red-600" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Negative</span>
              </div>
              <div className="text-2xl font-bold text-red-700 dark:text-red-300">
                {sampleSummary.summary.distribution.negative}
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <MdWarning className="h-5 w-5 text-yellow-600" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Invalid</span>
              </div>
              <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                {sampleSummary.summary.distribution.invalid}
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <MdTimeline className="h-5 w-5 text-purple-600" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Runs</span>
              </div>
              <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                {sampleSummary.totalRuns}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Main Content */}
      <Card className="overflow-hidden">
        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex gap-1 -mb-px px-6">
            <TabButton 
              icon={MdInfo} 
              label="Overview" 
              isActive={activeTab === 'overview'} 
              onClick={() => setActiveTab('overview')} 
            />
            <TabButton 
              icon={MdViewList} 
              label="Prediction Runs" 
              isActive={activeTab === 'runs'} 
              onClick={() => setActiveTab('runs')} 
            />
            <TabButton 
              icon={MdGridOn} 
              label="Well Predictions" 
              isActive={activeTab === 'wells'} 
              onClick={() => setActiveTab('wells')} 
            />
            <TabButton 
              icon={MdScience} 
              label="Analysis" 
              isActive={activeTab === 'analysis'} 
              onClick={() => setActiveTab('analysis')} 
            />
          </nav>
        </div>

        <div className="p-6 bg-gray-50 dark:bg-gray-800/50">
          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <Spinner size="lg" />
            </div>
          ) : (
            <>
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="text-center py-12">
                    <div className="text-4xl mb-4">📊</div>
                    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Sample Overview
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400">
                      Complete analysis summary and key metrics for {sampleNo}
                    </p>
                  </div>
                </div>
              )}

              {/* Prediction Runs Tab */}
              {activeTab === 'runs' && (
                <div className="space-y-6">
                  {/* Filters */}
                  <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                    <div className="flex gap-4">
                      <Input
                        placeholder="Search runs..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-64"
                      />
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      >
                        <option value="all">All Status</option>
                        <option value="completed">Completed</option>
                        <option value="processing">Processing</option>
                        <option value="pending">Pending</option>
                        <option value="failed">Failed</option>
                      </select>
                    </div>
                    
                    <div className="flex gap-2">
                      <select
                        value={`${sortBy}-${sortOrder}`}
                        onChange={(e) => {
                          const [field, order] = e.target.value.split('-');
                          setSortBy(field);
                          setSortOrder(order as 'asc' | 'desc');
                        }}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      >
                        <option value="predictAt-desc">Date (Newest)</option>
                        <option value="predictAt-asc">Date (Oldest)</option>
                        <option value="status-desc">Status</option>
                        <option value="processingTimeMs-desc">Processing Time</option>
                      </select>
                    </div>
                  </div>

                  {/* Runs Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Run ID</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Submission</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Status</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Model Version</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Processing Time</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Predict At</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedRuns.map((run) => (
                          <tr key={run.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="py-3 px-4">
                              <span className="font-mono text-sm text-gray-600 dark:text-gray-400">#{run.id}</span>
                            </td>
                            <td className="py-3 px-4">
                              <div>
                                <div className="font-medium text-gray-900 dark:text-white">
                                  {run.submissionNo || 'N/A'}
                                </div>
                                {run.description && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {run.description}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(run.status)}`}>
                                {run.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                              {run.modelVersion || 'N/A'}
                            </td>
                            <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                              {run.processingTimeMs ? `${(run.processingTimeMs / 1000).toFixed(2)}s` : 'N/A'}
                            </td>
                            <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                              {new Date(run.predictAt).toLocaleString()}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex gap-2">
                                <Button variant="ghost">
                                  View
                                </Button>
                                <Button variant="ghost">
                                  <MdDownload className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Well Predictions Tab */}
              {activeTab === 'wells' && (
                <div className="space-y-6">
                  <div className="text-center py-12">
                    <div className="text-4xl mb-4">🧪</div>
                    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Well Predictions Grid
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400">
                      Detailed well-by-well analysis and predictions
                    </p>
                  </div>
                </div>
              )}

              {/* Analysis Tab */}
              {activeTab === 'analysis' && (
                <div className="space-y-6">
                  <div className="text-center py-12">
                    <div className="text-4xl mb-4">📈</div>
                    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Analysis & Insights
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400">
                      Statistical analysis and inference results
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </Card>
    </div>
  );
}

function TabButton({ 
  icon: Icon, 
  label, 
  isActive, 
  onClick 
}: { 
  icon: React.ElementType; 
  label: string; 
  isActive: boolean; 
  onClick: () => void; 
}) {
  return (
    <button
      className={`flex items-center gap-2 py-4 px-4 text-sm font-medium border-b-2 transition-colors ${
        isActive
          ? 'border-primary-500 text-primary-600 dark:text-primary-400'
          : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
      }`}
      onClick={onClick}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}
