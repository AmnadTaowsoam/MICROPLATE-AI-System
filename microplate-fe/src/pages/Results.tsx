import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  MdSearch, 
  MdExpandMore, 
  MdExpandLess, 
  MdDownload, 
  MdVisibility, 
  MdImageNotSupported,
  MdRefresh,
  MdFilterList,
  MdChevronLeft,
  MdChevronRight,
  MdBarChart,
  MdFileDownload
} from 'react-icons/md';
import { resultsService, type RunDetails, type InterfaceFile } from '../services/results.service';
import Card from '../components/ui/Card';
import Spinner from '../components/ui/Spinner';
// import WellGrid from '../components/results/WellGrid';
// import ConfidenceChart from '../components/results/ConfidenceChart';

interface ExpandedSample {
  sampleNo: string;
  runs: RunDetails[];
  interfaceFiles: InterfaceFile[];
  isLoadingRuns: boolean;
  isLoadingFiles: boolean;
}

export default function Results() {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedSamples, setExpandedSamples] = useState<Map<string, ExpandedSample>>(new Map());
  // const [selectedSample, setSelectedSample] = useState<string | null>(null);
  const [csvPreview, setCsvPreview] = useState<string | null>(null);
  const [showCsvPreview, setShowCsvPreview] = useState(false);

  const limit = 15;

  // Fetch samples with pagination and search
  const { data: samplesData, isLoading: isLoadingSamples, refetch } = useQuery({
    queryKey: ['samples', currentPage, searchTerm],
    queryFn: async () => {
      const response = await resultsService.getSamples(
        currentPage,
        limit,
        'updatedAt',
        'desc',
        searchTerm || undefined
      );
      return response.data; // Extract data from the response wrapper
    },
    placeholderData: (previousData) => previousData,
  });

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const toggleSampleExpansion = async (sampleNo: string) => {
    const isExpanded = expandedSamples.has(sampleNo);
    
    if (isExpanded) {
      // Collapse
      const newExpanded = new Map(expandedSamples);
      newExpanded.delete(sampleNo);
      setExpandedSamples(newExpanded);
    } else {
      // Expand - fetch runs and interface files
      const newExpanded = new Map(expandedSamples);
      newExpanded.set(sampleNo, {
        sampleNo,
        runs: [],
        interfaceFiles: [],
        isLoadingRuns: true,
        isLoadingFiles: true,
      });
      setExpandedSamples(newExpanded);

      try {
        // Fetch runs and interface files in parallel
        const [runsResponse, filesResponse] = await Promise.all([
          resultsService.getSampleRuns(sampleNo, 1, 10),
          resultsService.getInterfaceFiles(sampleNo)
        ]);

        newExpanded.set(sampleNo, {
          sampleNo,
          runs: runsResponse.data?.data || [],
          interfaceFiles: filesResponse.data?.data || [],
          isLoadingRuns: false,
          isLoadingFiles: false,
        });
        setExpandedSamples(new Map(newExpanded));
      } catch (error) {
        console.error('Failed to fetch sample details:', error);
        newExpanded.set(sampleNo, {
          sampleNo,
          runs: [],
          interfaceFiles: [],
          isLoadingRuns: false,
          isLoadingFiles: false,
        });
        setExpandedSamples(new Map(newExpanded));
      }
    }
  };

  const handleCsvDownload = async (sampleNo: string) => {
    try {
      const csvBlob = await resultsService.downloadInterfaceFile(sampleNo);
      const url = URL.createObjectURL(csvBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `interface_${sampleNo}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download CSV:', error);
    }
  };

  const handleCsvPreview = async (sampleNo: string) => {
    try {
      const csvBlob = await resultsService.downloadInterfaceFile(sampleNo);
      const text = await csvBlob.text();
      setCsvPreview(text);
      setShowCsvPreview(true);
    } catch (error) {
      console.error('Failed to preview CSV:', error);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('th-TH', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      case 'processing':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (isLoadingSamples && !samplesData) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Analysis Results</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            View and manage sample analysis results with detailed insights
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <MdRefresh className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <MdSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by sample number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              <MdFilterList className="h-4 w-4" />
              Filters
            </button>
          </div>
        </div>
      </Card>

      {/* Results */}
      {!samplesData?.data?.length ? (
        <Card className="p-12 text-center">
          <MdSearch className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Results Found</h3>
          <p className="text-gray-500 dark:text-gray-400">
            {searchTerm ? 'Try adjusting your search criteria' : 'No samples have been analyzed yet'}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {samplesData.data.map((sample) => {
            const isExpanded = expandedSamples.has(sample.sampleNo);
            const expandedData = expandedSamples.get(sample.sampleNo);
            const distribution = sample.summary?.distribution || {};
            // Calculate totals from row distribution (1-12)
            const rowTotals = Object.entries(distribution)
              .filter(([key]) => !isNaN(Number(key)) && Number(key) >= 1 && Number(key) <= 12)
              .reduce((acc, [, value]) => acc + (value as number), 0);
            const total = rowTotals;

            return (
              <Card key={sample.sampleNo} className="overflow-hidden">
                {/* Sample Header */}
                <div 
                  className="p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  onClick={() => toggleSampleExpansion(sample.sampleNo)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <MdExpandLess className="h-5 w-5 text-gray-500" />
                        ) : (
                          <MdExpandMore className="h-5 w-5 text-gray-500" />
                        )}
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Sample {sample.sampleNo}
                        </h3>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <span>Runs: {sample.totalRuns}</span>
                        <span>Last Run: {formatDate(sample.lastRunAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {/* Summary Stats */}
                      <div className="flex items-center gap-4 text-sm">
                        <div className="text-gray-600">
                          Total: {total}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && expandedData && (
                  <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30">
                    <div className="p-6 space-y-6">
                      {/* Sample Summary Table */}
                      <div>
                        <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4">
                          Sample Summary (Row Distribution)
                        </h4>
                        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                          <div className="grid grid-cols-12 gap-0">
                            {Array.from({ length: 12 }, (_, i) => i + 1).map((row) => (
                              <div key={row} className="border-r border-gray-200 dark:border-gray-700 last:border-r-0">
                                <div className="bg-gray-50 dark:bg-gray-700 px-3 py-2 text-center text-xs font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-600">
                                  Row {row}
                                </div>
                                <div className="px-3 py-2 text-center text-sm font-semibold text-gray-900 dark:text-white">
                                  {distribution[row] || 0}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Interface Files Section */}
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-md font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <MdFileDownload className="h-5 w-5" />
                            Interface Files
                          </h4>
                        </div>
                        {expandedData.isLoadingFiles ? (
                          <div className="flex items-center justify-center py-8">
                            <Spinner size="md" />
                          </div>
                        ) : expandedData.interfaceFiles.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {expandedData.interfaceFiles.map((file) => (
                              <div key={file.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                                    {file.fileName}
                                  </span>
                                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(file.status)}`}>
                                    {file.status}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                                  Size: {file.fileSize} | Generated: {formatDate(file.generatedAt)}
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleCsvPreview(sample.sampleNo)}
                                    className="flex items-center gap-1 px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                                  >
                                    <MdVisibility className="h-3 w-3" />
                                    Preview
                                  </button>
                                  <button
                                    onClick={() => handleCsvDownload(sample.sampleNo)}
                                    className="flex items-center gap-1 px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                                  >
                                    <MdDownload className="h-3 w-3" />
                                    Download
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            No interface files available for this sample
                          </div>
                        )}
                      </div>

                      {/* Runs Section */}
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-md font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <MdBarChart className="h-5 w-5" />
                            Analysis Runs
                          </h4>
                        </div>
                        {expandedData.isLoadingRuns ? (
                          <div className="flex items-center justify-center py-8">
                            <Spinner size="md" />
                          </div>
                        ) : expandedData.runs.length > 0 ? (
                          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                            <div className="overflow-x-auto">
                              <table className="w-full">
                                <thead className="bg-gray-50 dark:bg-gray-700">
                                  <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                      Run ID
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                      Date
                                    </th>
                                    {Array.from({ length: 12 }, (_, index) => (
                                      <th key={`col-${index + 1}`} className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Column {index + 1}
                                      </th>
                                    ))}
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                      Actions
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                  {expandedData.runs.map((run, runIndex) => {
                                    // Get distribution from inference_results
                                    const distribution = run.inferenceResults?.[0]?.results?.distribution || {};
                                    
                                    return (
                                      <tr key={`run-${run.id}-${runIndex}`} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                          #{run.id}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                          {formatDate(run.predictAt)}
                                        </td>
                                        {Array.from({ length: 12 }, (_, colIndex) => {
                                          const columnNumber = colIndex + 1;
                                          const columnValue = distribution[columnNumber] || 0;
                                          
                                          return (
                                            <td key={`col-${columnNumber}`} className="px-3 py-4 text-center text-sm font-semibold text-gray-900 dark:text-white">
                                              {columnValue}
                                            </td>
                                          );
                                        })}
                                        <td className="px-4 py-4 whitespace-nowrap text-sm">
                                          <div className="flex items-center gap-2">
                                            <button
                                              onClick={() => {/* Handle view details */}}
                                              className="text-blue-600 hover:text-blue-800 text-xs"
                                            >
                                              View Details
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            No analysis runs found for this sample
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {samplesData?.pagination && samplesData.pagination.totalPages > 1 && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700 dark:text-gray-300">
              Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, samplesData.pagination.total)} of {samplesData.pagination.total} results
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={!samplesData.pagination.hasPrev}
                className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <MdChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <span className="px-3 py-2 text-sm font-medium text-gray-700">
                Page {currentPage} of {samplesData.pagination.totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={!samplesData.pagination.hasNext}
                className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <MdChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* CSV Preview Modal */}
      {showCsvPreview && csvPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">CSV Preview</h3>
              <button
                onClick={() => setShowCsvPreview(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <MdImageNotSupported className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 overflow-auto max-h-[60vh]">
              <pre className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap font-mono">
                {csvPreview}
              </pre>
            </div>
            <div className="flex justify-end gap-2 p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowCsvPreview(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
