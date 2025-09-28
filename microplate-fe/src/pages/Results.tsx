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
  MdFileDownload,
  MdClose,
  MdPreview,
  MdImage,
  MdZoomOut
} from 'react-icons/md';
import { resultsService, type RunDetails, type InterfaceFile } from '../services/results.service';
import { resultsServiceNew } from '../services/results.service.new';
import { resultsServiceDirect } from '../services/results.service.direct';
import { labwareService, type CsvPreviewData } from '../services/labware.service';
import { getMockInferenceResults } from '../utils/mockData';
import { debugRunObject, validateRunData } from '../utils/debugRuns';
import Card from '../components/ui/Card';
import Spinner from '../components/ui/Spinner';
// import WellGrid from '../components/results/WellGrid';
// import ConfidenceChart from '../components/results/ConfidenceChart';

interface ExpandedSample {
  sampleNo: string;
  runs: RunDetails[];
  interfaceFiles: InterfaceFile[];
  inferenceResults: Map<number, any>; // Map of runId to inference results
  isLoadingRuns: boolean;
  isLoadingFiles: boolean;
  isLoadingInference: boolean;
}

export default function Results() {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedSamples, setExpandedSamples] = useState<Map<string, ExpandedSample>>(new Map());
  // const [selectedSample, setSelectedSample] = useState<string | null>(null);
  const [csvPreview, setCsvPreview] = useState<string | null>(null);
  const [showCsvPreview, setShowCsvPreview] = useState(false);
  const [interfaceFiles, setInterfaceFiles] = useState<Map<string, any[]>>(new Map());
  const [isGeneratingInterface, setIsGeneratingInterface] = useState<Set<string>>(new Set());
  const [selectedImageUrl, setSelectedImageUrl] = useState<string>('');
  const [showImageModal, setShowImageModal] = useState(false);

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
        inferenceResults: new Map(),
        isLoadingRuns: true,
        isLoadingFiles: true,
        isLoadingInference: true,
      });
      setExpandedSamples(newExpanded);

      try {
        // Fetch runs using direct service (interface files removed)
        console.log('Using direct service to fetch runs for sample:', sampleNo);
        const runsResponse = await resultsServiceDirect.getSampleRuns(sampleNo, { page: 1, limit: 50 });
        console.log('🔍 Raw runsResponse:', runsResponse);
        console.log('🔍 runsResponse.data:', runsResponse.data);
        console.log('🔍 runsResponse.data?.data:', runsResponse.data?.data);
        const runs = runsResponse.data?.data || [];

        // Fetch existing interface files for this sample
        try {
          const interfaceFilesResponse = await labwareService.getInterfaceFiles(sampleNo);
          if (interfaceFilesResponse.success) {
            setInterfaceFiles(prev => {
              const newMap = new Map(prev);
              newMap.set(sampleNo, interfaceFilesResponse.data);
              return newMap;
            });
          }
        } catch (interfaceError) {
          console.warn('Failed to fetch interface files:', interfaceError);
          // Don't fail the whole operation if interface files can't be fetched
        }
        const inferenceResultsMap = new Map<number, any>();

        // Debug: Validate runs data
        validateRunData(runs);

        // Extract inference results from runs data (they should already be included)
        runs.forEach((run: any) => {
          const actualRunId = run.id || run.runId || run.run_id;
          
          if (!actualRunId || actualRunId === 'undefined') {
            console.warn(`Invalid run ID for run:`, run);
            return;
          }

          // Check if run already has inferenceResults
          if (run.inferenceResults && Array.isArray(run.inferenceResults) && run.inferenceResults.length > 0) {
            console.log(`Found existing inference results for run ${actualRunId}:`, run.inferenceResults[0]);
            inferenceResultsMap.set(actualRunId, run.inferenceResults[0]);
          } else {
            console.log(`No inference results found for run ${actualRunId} in runs data`);
            console.log(`Run object keys:`, Object.keys(run));
            console.log(`Run object:`, run);
            // Set to null if no inference results
            inferenceResultsMap.set(actualRunId, null);
          }

          // Debug: Log image paths
          console.log(`Run ${actualRunId} image paths:`, {
            rawImagePath: run.rawImagePath,
            annotatedImagePath: run.annotatedImagePath,
            rawImageUrl: run.rawImagePath ? resultsServiceDirect.getRawImageUrl(run) : 'N/A',
            annotatedImageUrl: run.annotatedImagePath ? resultsServiceDirect.getAnnotatedImageUrl(run) : 'N/A'
          });
        });

        newExpanded.set(sampleNo, {
          sampleNo,
          runs,
          interfaceFiles: [], // Interface files removed
          inferenceResults: inferenceResultsMap,
          isLoadingRuns: false,
          isLoadingFiles: false,
          isLoadingInference: false,
        });
        setExpandedSamples(new Map(newExpanded));
      } catch (error) {
        console.error('Failed to fetch sample details:', error);
        newExpanded.set(sampleNo, {
          sampleNo,
          runs: [],
          interfaceFiles: [],
          inferenceResults: new Map(),
          isLoadingRuns: false,
          isLoadingFiles: false,
          isLoadingInference: false,
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

  const handleInterfaceClick = async (sampleNo: string, runId: number) => {
    const key = `${sampleNo}-${runId}`;
    console.log('🎯 handleInterfaceClick called for:', { sampleNo, runId });
    
    try {
      setIsGeneratingInterface(prev => new Set([...prev, key]));
      
      // Generate interface CSV
      const response = await labwareService.generateInterfaceCsv(sampleNo);
      
      if (response.success) {
        // Get the generated file details
        const fileDetails = await labwareService.getInterfaceFile(response.data.id);
        
        if (fileDetails.success) {
          // Update interface files state
          setInterfaceFiles(prev => {
            const newMap = new Map(prev);
            const files = newMap.get(sampleNo) || [];
            newMap.set(sampleNo, [...files, fileDetails.data]);
            return newMap;
          });
          
          // Show success message or preview
          console.log('Interface CSV generated successfully:', fileDetails.data);
          
          // Optionally auto-preview the CSV
          if (fileDetails.data.downloadUrl) {
            try {
              const csvResponse = await fetch(fileDetails.data.downloadUrl);
              const csvContent = await csvResponse.text();
              setCsvPreview(csvContent);
              setShowCsvPreview(true);
            } catch (previewError) {
              console.error('Failed to preview generated CSV:', previewError);
            }
          }
        }
      } else {
        console.error('Failed to generate interface CSV:', response.error);
        alert(`Failed to generate interface CSV: ${response.error?.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error generating interface CSV:', error);
      alert('Error generating interface CSV. Please try again.');
    } finally {
      setIsGeneratingInterface(prev => {
        const newSet = new Set(prev);
        newSet.delete(key);
        return newSet;
      });
    }
  };

  const handleDownloadCsv = async (downloadUrl: string, fileName: string) => {
    try {
      await labwareService.downloadCsvFile(downloadUrl, fileName);
    } catch (error) {
      console.error('Failed to download CSV:', error);
      alert('Failed to download CSV file. Please try again.');
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
                          📊 Overall Sample Distribution
                        </h4>
                        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                          <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                              <tr>
                                {Array.from({ length: 12 }, (_, i) => i + 1).map((row) => (
                                  <th key={row} className="px-3 py-2 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider border-r border-gray-200 dark:border-gray-600">
                                    Row {row}
                                  </th>
                                ))}
                                <th className="px-3 py-2 text-center text-xs font-medium text-blue-700 dark:text-blue-300 uppercase tracking-wider border-r border-gray-200 dark:border-gray-600">
                                  Total
                                </th>
                                <th className="px-3 py-2 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                {Array.from({ length: 12 }, (_, i) => i + 1).map((row) => (
                                  <td key={row} className="px-3 py-2 text-center text-sm font-semibold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-600">
                                    {distribution[row] || 0}
                                  </td>
                                ))}
                                <td className="px-3 py-2 text-center text-sm font-bold text-blue-600 dark:text-blue-400 border-r border-gray-200 dark:border-gray-600">
                                  {distribution.total || Array.from({ length: 12 }, (_, index) => distribution[index + 1] || 0).reduce((sum, value) => sum + value, 0)}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      onClick={() => handleInterfaceClick(sample.sampleNo, 0)}
                                      disabled={isGeneratingInterface.has(`${sample.sampleNo}-0`)}
                                      className="flex items-center justify-center gap-1 px-2 py-1 text-xs font-medium text-purple-600 bg-purple-50 border border-purple-200 rounded-md hover:bg-purple-100 disabled:opacity-50 disabled:cursor-not-allowed dark:text-purple-400 dark:bg-purple-900/20 dark:border-purple-700 dark:hover:bg-purple-900/30"
                                      title="Generate Interface CSV for this sample"
                                    >
                                      {isGeneratingInterface.has(`${sample.sampleNo}-0`) ? (
                                        <>
                                          <Spinner size="xs" />
                                          Generating...
                                        </>
                                      ) : (
                                        <>
                                          📄 Interface
                                        </>
                                      )}
                                    </button>
                                    
                                    {/* Preview button - always visible */}
                                    <button
                                      onClick={async () => {
                                        try {
                                          // First try to get files from state
                                          const existingFiles = interfaceFiles.get(sample.sampleNo);
                                          
                                          if (existingFiles && existingFiles.length > 0) {
                                            // Use existing file from state
                                            const latestFile = existingFiles[existingFiles.length - 1];
                                            if (latestFile.downloadUrl) {
                                              const response = await fetch(latestFile.downloadUrl);
                                              const csvContent = await response.text();
                                              setCsvPreview(csvContent);
                                              setShowCsvPreview(true);
                                              return;
                                            }
                                          }
                                          
                                          // If no files in state, fetch from API
                                          const interfaceFilesResponse = await labwareService.getInterfaceFiles(sample.sampleNo);
                                          if (interfaceFilesResponse.success && interfaceFilesResponse.data.length > 0) {
                                            const latestFile = interfaceFilesResponse.data[interfaceFilesResponse.data.length - 1];
                                            
                                            // Update state
                                            setInterfaceFiles(prev => {
                                              const newMap = new Map(prev);
                                              newMap.set(sample.sampleNo, interfaceFilesResponse.data);
                                              return newMap;
                                            });
                                            
                                            if (latestFile.downloadUrl) {
                                              const response = await fetch(latestFile.downloadUrl);
                                              const csvContent = await response.text();
                                              setCsvPreview(csvContent);
                                              setShowCsvPreview(true);
                                            } else {
                                              alert('No download URL available for this file.');
                                            }
                                          } else {
                                            alert('No interface CSV files found for this sample. Please generate one first.');
                                          }
                                        } catch (error) {
                                          console.error('Failed to preview CSV:', error);
                                          alert('Failed to load CSV preview. Please try again.');
                                        }
                                      }}
                                      className="flex items-center justify-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 dark:text-blue-400 dark:bg-blue-900/20 dark:border-blue-700 dark:hover:bg-blue-900/30"
                                      title="Preview Interface CSV files"
                                    >
                                      👁️ Preview
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>


                      {/* Runs Section */}
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-md font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <MdBarChart className="h-5 w-5" />
                            🔬 Individual Analysis Runs
                          </h4>
                        </div>
                        {expandedData.isLoadingRuns || expandedData.isLoadingInference ? (
                          <div className="flex items-center justify-center py-8">
                            <Spinner size="md" />
                            <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                              Loading analysis data...
                            </span>
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
                                      <th key={`row-${index + 1}`} className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Row {index + 1}
                                      </th>
                                    ))}
                                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                      Total
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                      Actions
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                  {expandedData.runs.map((run, runIndex) => {
                                    // Use runId if id is not available
                                    const actualRunId = run.id || run.runId || run.run_id;
                                    
                                    // Get distribution from inference_results using the new service
                                    const inferenceResult = expandedData.inferenceResults.get(actualRunId);
                                    const distribution = inferenceResult?.results?.distribution || {};
                                    
                                    // Debug logging
                                    console.log(`Run ${actualRunId} inference result:`, inferenceResult);
                                    console.log(`Run ${actualRunId} distribution:`, distribution);
                                    console.log(`Run ${actualRunId} annotatedImagePath:`, run.annotatedImagePath);
                                    
                                    return (
                                      <tr key={`run-${actualRunId}-${runIndex}`} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                          #{actualRunId}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                          {formatDate(run.predictAt)}
                                        </td>
                                        {Array.from({ length: 12 }, (_, colIndex) => {
                                          const columnNumber = colIndex + 1;
                                          const columnValue = distribution[columnNumber] || 0;
                                          
                                          return (
                                            <td key={`row-${columnNumber}`} className="px-3 py-4 text-center text-sm font-semibold text-gray-900 dark:text-white">
                                              {columnValue}
                                            </td>
                                          );
                                        })}
                                        <td className="px-3 py-4 text-center text-sm font-bold text-blue-600 dark:text-blue-400">
                                          {inferenceResult?.results?.distribution?.total || 0}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-center">
                                          {run.annotatedImagePath ? (
                                            <button
                                              onClick={() => {
                                                const imageUrl = resultsServiceDirect.getAnnotatedImageUrl(run);
                                                console.log('Image button clicked:', {
                                                  runId: actualRunId,
                                                  annotatedImagePath: run.annotatedImagePath,
                                                  imageUrl
                                                });
                                                setSelectedImageUrl(imageUrl);
                                                setShowImageModal(true);
                                              }}
                                              className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-green-600 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 dark:text-green-400 dark:bg-green-900/20 dark:border-green-700 dark:hover:bg-green-900/30"
                                              title="View Annotated Image"
                                            >
                                              📷 Image
                                            </button>
                                          ) : (
                                            <span className="text-xs text-gray-400 dark:text-gray-500">
                                              No Image
                                            </span>
                                          )}
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
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-6xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <MdPreview className="h-5 w-5" />
                Interface CSV Preview
              </h3>
              <button
                onClick={() => setShowCsvPreview(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <MdClose className="h-6 w-6" />
              </button>
            </div>
            
            {/* CSV Table Preview */}
            <div className="p-6 overflow-auto max-h-[50vh]">
              {(() => {
                const parsed = labwareService.parseCsvContent(csvPreview);
                return (
                  <div className="overflow-x-auto">
                    <table className="min-w-full border border-gray-200 dark:border-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          {parsed.headers.map((header, index) => (
                            <th key={index} className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-600">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {parsed.rows.map((row, rowIndex) => (
                          <tr key={rowIndex}>
                            {row.map((cell, cellIndex) => (
                              <td key={cellIndex} className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
            
            <div className="flex justify-between items-center p-6 border-t border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Total rows: {labwareService.parseCsvContent(csvPreview).rows.length}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const blob = new Blob([csvPreview], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `interface-${new Date().toISOString().split('T')[0]}.csv`;
                    link.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  <MdFileDownload className="h-4 w-4" />
                  Download CSV
                </button>
                <button
                  onClick={() => setShowCsvPreview(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {showImageModal && selectedImageUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <MdImage className="h-5 w-5" />
                Annotated Image
              </h3>
              <button
                onClick={() => setShowImageModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <MdClose className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 overflow-auto max-h-[70vh] flex items-center justify-center">
              <div className="relative max-w-full max-h-full">
                <img
                  src={selectedImageUrl}
                  alt="Annotated Image"
                  className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                  onError={(e) => {
                    console.error('Failed to load image:', selectedImageUrl);
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling.style.display = 'flex';
                  }}
                />
                <div 
                  className="hidden items-center justify-center w-full h-64 bg-gray-100 dark:bg-gray-700 rounded-lg"
                  style={{ display: 'none' }}
                >
                  <div className="text-center">
                    <MdZoomOut className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500 dark:text-gray-400">Failed to load image</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">URL: {selectedImageUrl}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end items-center p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowImageModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
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
