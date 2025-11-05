import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import logger from '../utils/logger';
import { 
  MdSearch, 
  MdExpandMore, 
  MdExpandLess, 
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
import { resultsServiceDirect } from '../services/results.service.direct';
import { labwareService } from '../services/labware.service';
import { validateRunData } from '../utils/debugRuns';
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
      logger.debug('🔍 Fetching samples with params:', { currentPage, limit, searchTerm });
      logger.debug('🔍 Now using resultsApi (port 6404) - result-api-service gets data from prediction_result.sample_summary');
      const response = await resultsService.getSamples(
        currentPage,
        limit,
        'updatedAt',
        'desc',
        searchTerm || undefined
      );
      logger.debug('🔍 Raw samples API response:', response);
      logger.debug('🔍 Extracted samples data:', response.data);
      
      // Debug: Check each sample's summary data
      if (response.data?.data) {
        response.data.data.forEach((sample: any) => {
          logger.debug(`🔍 Sample ${sample.sampleNo} summary:`, sample.summary);
          if (sample.summary?.distribution) {
            logger.debug(`🔍 Sample ${sample.sampleNo} distribution:`, sample.summary.distribution);
            
            // Check if we're now getting correct data from prediction_result.sample_summary via result-api-service
            if (sample.sampleNo === 'TEST006') {
              logger.debug('🔍 TEST006 - API response from result-api-service (gets data from prediction_result.sample_summary):', sample.summary.distribution);
              logger.debug('🔍 TEST006 - Expected from DB: {"1":0,"2":2,"3":0,"4":4,"5":6,"6":4,"7":0,"8":0,"9":0,"10":0,"11":0,"12":0,"total":16}');
              logger.debug('🔍 TEST006 - Values match:', JSON.stringify(sample.summary.distribution) === '{"1":0,"2":2,"3":0,"4":4,"5":6,"6":4,"7":0,"8":0,"9":0,"10":0,"11":0,"12":0,"total":16}');
              
              // Debug: Check individual well values
              const expected = {"1":0,"2":2,"3":0,"4":4,"5":6,"6":4,"7":0,"8":0,"9":0,"10":0,"11":0,"12":0,"total":16} as any;
              const actual = sample.summary.distribution;
              logger.debug('🔍 TEST006 - Well-by-well comparison:');
              for (let i = 1; i <= 12; i++) {
                const well = i.toString();
                logger.debug(`🔍   Well ${i}: Expected ${expected[well]}, Actual ${(actual as any)[well]}, Match: ${expected[well] === (actual as any)[well]}`);
              }
              logger.debug(`🔍   Total: Expected ${expected.total}, Actual ${(actual as any).total}, Match: ${expected.total === (actual as any).total}`);
            }
          } else {
            logger.warn(`❌ Sample ${sample.sampleNo} has no summary.distribution`);
          }
        });
      }
      
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
        // Fetch runs using direct service (gets data from prediction_result.inference_results via direct endpoint)
        logger.debug('Using direct service to fetch runs for sample:', sampleNo);
        const runsResponse = await resultsServiceDirect.getSampleRuns(sampleNo, { page: 1, limit: 50 });
        logger.debug('🔍 Raw runsResponse from direct service:', runsResponse);
        logger.debug('🔍 runsResponse structure:', JSON.stringify(runsResponse, null, 2));
        
        // Debug: Check if this is TEST006 and log detailed API response
        if (sampleNo === 'TEST006') {
          logger.debug('🔍 TEST006 - Raw API response from direct service (gets data from prediction_result.inference_results):', runsResponse);
          if (runsResponse && runsResponse.data && (runsResponse.data as any).data && Array.isArray((runsResponse.data as any).data)) {
            logger.debug('🔍 TEST006 - API runs data from direct service:', (runsResponse.data as any).data);
            (runsResponse.data as any).data.forEach((run: any, index: number) => {
              logger.debug(`🔍 TEST006 - API Run ${index + 1}:`, {
                id: run.id,
                runId: run.runId,
                sampleNo: run.sampleNo,
                predictAt: run.predictAt,
                status: run.status,
                inferenceResults: run.inferenceResults,
                inferenceResultsLength: run.inferenceResults?.length || 0
              });
              
              if (run.inferenceResults && run.inferenceResults.length > 0) {
                logger.debug(`🔍 TEST006 - API Run ${run.id} inference results:`, run.inferenceResults[0]);
                if (run.inferenceResults[0].results) {
                  logger.debug(`🔍 TEST006 - API Run ${run.id} results:`, run.inferenceResults[0].results);
                  if (run.inferenceResults[0].results.distribution) {
                    logger.debug(`🔍 TEST006 - API Run ${run.id} distribution:`, run.inferenceResults[0].results.distribution);
                  }
                }
              } else {
                logger.warn(`❌ TEST006 - API Run ${run.id} has no inference results!`);
              }
            });
          }
        }
        
        // Handle direct service response structure
        let runs = [];
        if (runsResponse && runsResponse.data) {
          const responseData = runsResponse.data as any;
          if (responseData.data && Array.isArray(responseData.data)) {
            runs = responseData.data;
          } else if (Array.isArray(responseData)) {
            runs = responseData;
          }
        }
        logger.debug('🔍 Final runs array:', runs);
        
        // Debug: Log runs data for TEST006
        if (sampleNo === 'TEST006') {
          logger.debug('🔍 TEST006 - Final runs array:', runs);
          logger.debug('🔍 TEST006 - Number of runs:', runs.length);
          runs.forEach((run: any, index: number) => {
            logger.debug(`🔍 TEST006 - Run ${index + 1}:`, {
              id: run.id,
              runId: run.runId,
              sampleNo: run.sampleNo,
              predictAt: run.predictAt,
              status: run.status,
              inferenceResults: run.inferenceResults,
              inferenceResultsLength: run.inferenceResults?.length || 0
            });
            
            if (run.inferenceResults && Array.isArray(run.inferenceResults) && run.inferenceResults.length > 0) {
              logger.debug(`🔍 TEST006 - Run ${run.id} inference results:`, run.inferenceResults[0]);
              if (run.inferenceResults[0].results) {
                logger.debug(`🔍 TEST006 - Run ${run.id} results:`, run.inferenceResults[0].results);
                if (run.inferenceResults[0].results.distribution) {
                  logger.debug(`🔍 TEST006 - Run ${run.id} distribution:`, run.inferenceResults[0].results.distribution);
                }
              }
            } else {
              logger.warn(`❌ TEST006 - Run ${run.id} has no inference results`);
            }
          });
        }

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
          logger.warn('Failed to fetch interface files:', interfaceError);
          // Don't fail the whole operation if interface files can't be fetched
        }
        const inferenceResultsMap = new Map<number, any>();

        // Debug: Validate runs data
        validateRunData(runs);
        
        // Debug: Log runs data for TEST006
        if (sampleNo === 'TEST006') {
          logger.debug('🔍 TEST006 - Runs data:', runs);
          logger.debug('🔍 TEST006 - Number of runs:', runs.length);
          runs.forEach((run: any, index: number) => {
            logger.debug(`🔍 TEST006 - Run ${index + 1}:`, {
              id: run.id,
              runId: run.runId,
              sampleNo: run.sampleNo,
              predictAt: run.predictAt,
              status: run.status,
              inferenceResults: run.inferenceResults,
              inference_results: run.inference_results,
              results: run.results
            });
            
            // Debug: Check inference results structure
            if (run.inferenceResults && Array.isArray(run.inferenceResults) && run.inferenceResults.length > 0) {
              logger.debug(`🔍 TEST006 - Run ${run.id} inference results:`, run.inferenceResults[0]);
              if (run.inferenceResults[0].results) {
                logger.debug(`🔍 TEST006 - Run ${run.id} results:`, run.inferenceResults[0].results);
                if (run.inferenceResults[0].results.distribution) {
                  logger.debug(`🔍 TEST006 - Run ${run.id} distribution:`, run.inferenceResults[0].results.distribution);
                }
              }
            } else {
              logger.warn(`❌ TEST006 - Run ${run.id} has no inference results`);
            }
          });
        }

        // Extract inference results from runs data (they should already be included)
        logger.debug('🔍 Processing runs for inference results...');
        const inferencePromises = [];
        
        for (let index = 0; index < runs.length; index++) {
          const run = runs[index];
          logger.debug(`🔍 Processing run ${index}:`, run);
          const actualRunId = run.id || run.runId || run.run_id;
          
          if (!actualRunId || actualRunId === 'undefined') {
            logger.warn(`Invalid run ID for run:`, run);
            continue;
          }

          // Check if run already has inferenceResults
          if (run.inferenceResults && Array.isArray(run.inferenceResults) && run.inferenceResults.length > 0) {
            logger.debug(`✅ Found existing inference results for run ${actualRunId}:`, run.inferenceResults[0]);
            inferenceResultsMap.set(actualRunId, run.inferenceResults[0]);
            
            // Debug: Log inference result details for TEST006
            if (sampleNo === 'TEST006') {
              logger.debug(`🔍 TEST006 - Run ${actualRunId} inference result:`, {
                runId: actualRunId,
                results: run.inferenceResults[0].results,
                distribution: run.inferenceResults[0].results?.distribution
              });
            }
          } else {
            logger.warn(`❌ No inference results found for run ${actualRunId} in runs data, trying to fetch separately...`);
            
            // Try to fetch inference results separately using direct service
            const fetchInferencePromise = resultsServiceDirect.getRunDetails(actualRunId)
              .then((runDetails: any) => {
                logger.debug(`🔍 Fetched run details for ${actualRunId} from direct service:`, runDetails);
                
                // Look for inference results in different possible locations
                let inferenceResult = null;
                if (runDetails.inferenceResults && Array.isArray(runDetails.inferenceResults) && runDetails.inferenceResults.length > 0) {
                  inferenceResult = runDetails.inferenceResults[0];
                } else if (runDetails.inference_results && Array.isArray(runDetails.inference_results) && runDetails.inference_results.length > 0) {
                  inferenceResult = runDetails.inference_results[0];
                } else if (runDetails.results) {
                  inferenceResult = runDetails.results;
                }
                
                if (inferenceResult) {
                  logger.debug(`✅ Found inference result for run ${actualRunId} from direct service:`, inferenceResult);
                  inferenceResultsMap.set(actualRunId, inferenceResult);
                } else {
                  logger.warn(`❌ Still no inference result found for run ${actualRunId} from direct service`);
                  inferenceResultsMap.set(actualRunId, null);
                }
              })
              .catch((error) => {
                logger.error(`❌ Failed to fetch run details for ${actualRunId}:`, error);
                inferenceResultsMap.set(actualRunId, null);
              });
            
            inferencePromises.push(fetchInferencePromise);
          }

          // Debug: Log image paths
          logger.debug(`🔍 Run ${actualRunId} image paths:`, {
            rawImagePath: run.rawImagePath,
            annotatedImagePath: run.annotatedImagePath,
            rawImageUrl: run.rawImagePath ? resultsServiceDirect.getRawImageUrl(run) : 'N/A',
            annotatedImageUrl: run.annotatedImagePath ? resultsServiceDirect.getAnnotatedImageUrl(run) : 'N/A'
          });
        }
        
        // Wait for all inference results to be fetched
        if (inferencePromises.length > 0) {
          logger.debug(`🔍 Waiting for ${inferencePromises.length} inference results to be fetched...`);
          await Promise.all(inferencePromises);
        }
        
        logger.debug('🔍 Final inferenceResultsMap:', inferenceResultsMap);
        
        // Debug: Check if this is TEST006 and log inference results map
        if (sampleNo === 'TEST006') {
          logger.debug('🔍 TEST006 - Final inference results map:', inferenceResultsMap);
          logger.debug('🔍 TEST006 - Inference results map entries:');
          for (const [runId, inferenceResult] of inferenceResultsMap.entries()) {
            logger.debug(`🔍 TEST006 - Map entry ${runId}:`, inferenceResult);
            if (inferenceResult?.results?.distribution) {
              logger.debug(`🔍 TEST006 - Map entry ${runId} distribution:`, inferenceResult.results.distribution);
            }
          }
        }

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
        logger.error('Failed to fetch sample details:', error);
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


  const handleInterfaceClick = async (sampleNo: string, runId: number) => {
    const key = `${sampleNo}-${runId}`;
    logger.debug('🎯 handleInterfaceClick called for:', { sampleNo, runId });
    
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
          logger.info('Interface CSV generated successfully:', fileDetails.data);
          
          // Optionally auto-preview the CSV
          if (fileDetails.data.downloadUrl) {
            try {
              const csvResponse = await fetch(fileDetails.data.downloadUrl);
              const csvContent = await csvResponse.text();
              setCsvPreview(csvContent);
              setShowCsvPreview(true);
            } catch (previewError) {
              logger.error('Failed to preview generated CSV:', previewError);
            }
          }
        }
      } else {
        logger.error('Failed to generate interface CSV:', response.error);
        alert(`Failed to generate interface CSV: ${response.error?.message || 'Unknown error'}`);
      }
    } catch (error) {
      logger.error('Error generating interface CSV:', error);
      alert('Error generating interface CSV. Please try again.');
    } finally {
      setIsGeneratingInterface(prev => {
        const newSet = new Set(prev);
        newSet.delete(key);
        return newSet;
      });
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

  // Calculate statistics functions
  const calculateStatistics = (distribution: any) => {
    logger.debug('🔍 calculateStatistics input distribution:', distribution);
    
    const values = Object.keys(distribution)
      .filter(key => !isNaN(Number(key)) && Number(key) >= 1 && Number(key) <= 12)
      .map(key => distribution[key] || 0);
    
    logger.debug('🔍 calculateStatistics filtered values:', values);
    
    const total = values.reduce((sum, val) => sum + val, 0);
    
    // Calculate GMT: Sum{(REPORTED_NAME-row1 x ENTRYrow-1) + ...} / Sum(ENTRY)
    let gmtNumerator = 0;
    for (let i = 0; i < values.length; i++) {
      const reportedName = i + 1; // REPORTED_NAME values are 1, 2, 3, ..., 12
      const entry = values[i]; // ENTRY values from distribution
      gmtNumerator += reportedName * entry;
    }
    const gmt = total > 0 ? gmtNumerator / total : 0;
    
    // Calculate MEAN
    const mean = values.length > 0 ? total / values.length : 0;
    
    // Calculate SD (Standard Deviation)
    const variance = values.length > 0 ? values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length : 0;
    const sd = Math.sqrt(variance);
    
    // Calculate CV (Coefficient of Variation)
    const cv = mean > 0 ? sd / mean : 0;
    
    const result = {
      total,
      gmt: Math.round(gmt * 100) / 100,
      mean: Math.round(mean * 100) / 100,
      sd: Math.round(sd * 100) / 100,
      cv: Math.round(cv * 100000000) / 100000000
    };
    
    logger.debug('🔍 calculateStatistics result:', result);
    return result;
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
            // Use sample summary distribution initially, will be updated when runs are loaded
            let distribution = sample.summary?.distribution || {};
            
            // Calculate total if missing
            if (distribution && Object.keys(distribution).length > 0 && distribution.total === undefined) {
              const calculatedTotal = Object.keys(distribution)
                .filter(key => !isNaN(Number(key)) && Number(key) >= 1 && Number(key) <= 12)
                .reduce((sum, key) => sum + (distribution[key] || 0), 0);
              distribution = { ...distribution, total: calculatedTotal };
              logger.debug(`🔍 Sample ${sample.sampleNo} calculated missing total: ${calculatedTotal}`);
            }
            
            let stats = calculateStatistics(distribution);
            
            // Debug: Log sample summary data
            logger.debug(`🔍 Sample ${sample.sampleNo} summary data:`, sample.summary);
            logger.debug(`🔍 Sample ${sample.sampleNo} distribution:`, distribution);
            logger.debug(`🔍 Sample ${sample.sampleNo} calculated stats:`, stats);
            
            // Debug: Check if we're now getting correct data from prediction_result.sample_summary via result-api-service
            if (sample.sampleNo === 'TEST006') {
              logger.debug('🔍 TEST006 - Now using result-api-service (gets data from prediction_result.sample_summary):', distribution);
              logger.debug('🔍 TEST006 - Expected from DB: {"1":0,"2":2,"3":0,"4":4,"5":6,"6":4,"7":0,"8":0,"9":0,"10":0,"11":0,"12":0,"total":16}');
              logger.debug('🔍 TEST006 - Should now match:', JSON.stringify(distribution) === '{"1":0,"2":2,"3":0,"4":4,"5":6,"6":4,"7":0,"8":0,"9":0,"10":0,"11":0,"12":0,"total":16}');
              
              // Debug: Show what will be displayed in the table
              logger.debug('🔍 TEST006 - Values that will be displayed in table:');
              for (let i = 1; i <= 12; i++) {
                logger.debug(`🔍   Well ${i}: ${distribution[i] || 0}`);
              }
              logger.debug(`🔍   Total: ${stats.total}`);
              logger.debug(`🔍   GMT: ${stats.gmt}`);
              logger.debug(`🔍   MEAN: ${stats.mean}`);
              logger.debug(`🔍   SD: ${stats.sd}`);
              logger.debug(`🔍   CV: ${stats.cv}`);
            }
            
            // If expanded and we have runs data, calculate from actual runs instead
            if (isExpanded && expandedData && expandedData.runs.length > 0) {
              logger.debug('🔍 Recalculating statistics from individual runs...');
              
              // Calculate aggregated distribution from individual runs
              const aggregatedDistribution: Record<string, number> = {};
              let totalRunsWithData = 0;
              
              expandedData.runs.forEach((run: any) => {
                const actualRunId = run.id;
                const inferenceResult = expandedData.inferenceResults.get(actualRunId);
                const runDistribution = inferenceResult?.results?.distribution || {};
                
                if (Object.keys(runDistribution).length > 0) {
                  totalRunsWithData++;
                  Object.keys(runDistribution).forEach(key => {
                    if (key !== 'total') {
                      aggregatedDistribution[key] = (aggregatedDistribution[key] || 0) + (runDistribution[key] || 0);
                    }
                  });
                }
              });
              
              if (totalRunsWithData > 0) {
                logger.debug('🔍 Aggregated distribution from runs:', aggregatedDistribution);
                distribution = aggregatedDistribution;
                stats = calculateStatistics(distribution);
              } else {
                logger.debug('🔍 No runs with distribution data, using sample summary');
              }
            }

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
                          Total: {stats.total}
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
                                    Well {row}
                                  </th>
                                ))}
                                <th className="px-3 py-2 text-center text-xs font-medium text-blue-700 dark:text-blue-300 uppercase tracking-wider border-r border-gray-200 dark:border-gray-600">
                                  Total
                                </th>
                                <th className="px-3 py-2 text-center text-xs font-medium text-purple-700 dark:text-purple-300 uppercase tracking-wider border-r border-gray-200 dark:border-gray-600">
                                  GMT
                                </th>
                                <th className="px-3 py-2 text-center text-xs font-medium text-green-700 dark:text-green-300 uppercase tracking-wider border-r border-gray-200 dark:border-gray-600">
                                  MEAN
                                </th>
                                <th className="px-3 py-2 text-center text-xs font-medium text-orange-700 dark:text-orange-300 uppercase tracking-wider border-r border-gray-200 dark:border-gray-600">
                                  SD
                                </th>
                                <th className="px-3 py-2 text-center text-xs font-medium text-red-700 dark:text-red-300 uppercase tracking-wider border-r border-gray-200 dark:border-gray-600">
                                  CV
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
                                  {stats.total}
                                </td>
                                <td className="px-3 py-2 text-center text-sm font-bold text-purple-600 dark:text-purple-400 border-r border-gray-200 dark:border-gray-600">
                                  {stats.gmt}
                                </td>
                                <td className="px-3 py-2 text-center text-sm font-bold text-green-600 dark:text-green-400 border-r border-gray-200 dark:border-gray-600">
                                  {stats.mean}
                                </td>
                                <td className="px-3 py-2 text-center text-sm font-bold text-orange-600 dark:text-orange-400 border-r border-gray-200 dark:border-gray-600">
                                  {stats.sd}
                                </td>
                                <td className="px-3 py-2 text-center text-sm font-bold text-red-600 dark:text-red-400 border-r border-gray-200 dark:border-gray-600">
                                  {stats.cv}
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
                                          <Spinner size="sm" />
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
                                          logger.error('Failed to preview CSV:', error);
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
                        ) : (() => {
                          logger.debug('🔍 Checking runs display condition:');
                          logger.debug('🔍 expandedData.runs:', expandedData.runs);
                          logger.debug('🔍 expandedData.runs.length:', expandedData.runs.length);
                          logger.debug('🔍 expandedData.isLoadingRuns:', expandedData.isLoadingRuns);
                          logger.debug('🔍 expandedData.isLoadingInference:', expandedData.isLoadingInference);
                          return expandedData.runs.length > 0;
                        })() ? (
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
                                        Well {index + 1}
                                      </th>
                                    ))}
                                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                      Total
                                    </th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                      Actions
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                  {expandedData.runs.map((run, runIndex) => {
                                    // Debug: Log run object for TEST006
                                    if (sample.sampleNo === 'TEST006') {
                                      logger.debug(`🔍 TEST006 - Run ${runIndex + 1} object:`, run);
                                      logger.debug(`🔍 TEST006 - Run ${runIndex + 1} keys:`, Object.keys(run));
                                      logger.debug(`🔍 TEST006 - Run ${runIndex + 1} id:`, (run as any).id);
                                      logger.debug(`🔍 TEST006 - Run ${runIndex + 1} runId:`, (run as any).runId);
                                    }
                                    
                                    // Use runId if id is not available
                                    const actualRunId = (run as any).id || (run as any).runId;
                                    
                                    // Get distribution from inference_results using the new service
                                    const inferenceResult = expandedData.inferenceResults.get(actualRunId);
                                    let distribution = inferenceResult?.results?.distribution || {};
                                    
                                    // Calculate total if missing
                                    if (distribution && Object.keys(distribution).length > 0 && distribution.total === undefined) {
                                      const calculatedTotal = Object.keys(distribution)
                                        .filter(key => !isNaN(Number(key)) && Number(key) >= 1 && Number(key) <= 12)
                                        .reduce((sum, key) => sum + (distribution[key] || 0), 0);
                                      distribution = { ...distribution, total: calculatedTotal };
                                      logger.debug(`🔍 Run ${actualRunId} calculated missing total: ${calculatedTotal}`);
                                    }
                                    
                                    // Fallback: if no distribution from inference result, try to use sample summary distribution
                                    if (Object.keys(distribution).length === 0 && sample.summary?.distribution) {
                                      logger.debug(`🔍 Run ${actualRunId} using fallback distribution from sample summary`);
                                      distribution = sample.summary.distribution;
                                    }
                                    
                                    // Debug: Check if this is TEST006 and log the issue
                                    if (sample.sampleNo === 'TEST006') {
                                      logger.debug(`🔍 TEST006 - Run ${actualRunId} display logic:`);
                                      logger.debug(`🔍 TEST006 - Run ${actualRunId} inference result:`, inferenceResult);
                                      logger.debug(`🔍 TEST006 - Run ${actualRunId} distribution from inference:`, inferenceResult?.results?.distribution);
                                      logger.debug(`🔍 TEST006 - Run ${actualRunId} distribution keys length:`, Object.keys(distribution).length);
                                      
                                      if (Object.keys(distribution).length === 0) {
                                        logger.warn(`❌ TEST006 - Run ${actualRunId} has no distribution from inference result!`);
                                        logger.warn(`❌ TEST006 - Run ${actualRunId} will use fallback from sample summary:`, sample.summary?.distribution);
                                      } else {
                                        logger.debug(`✅ TEST006 - Run ${actualRunId} has distribution from inference result:`, distribution);
                                      }
                                    }
                                    
                                    // Debug logging
                                    logger.debug(`🔍 Run ${actualRunId} inference result:`, inferenceResult);
                                    logger.debug(`🔍 Run ${actualRunId} distribution:`, distribution);
                                    logger.debug(`🔍 Run ${actualRunId} rawImagePath:`, (run as any).rawImagePath);
                                    
                                    // Additional debug for distribution structure
                                    if (inferenceResult) {
                                      logger.debug(`🔍 Run ${actualRunId} inferenceResult structure:`, JSON.stringify(inferenceResult, null, 2));
                                    } else {
                                      logger.warn(`❌ Run ${actualRunId} has no inference result`);
                                    }
                                    
                                    // Debug: Check if this is TEST006
                                    if (sample.sampleNo === 'TEST006') {
                                      logger.debug(`🔍 TEST006 - Individual Run ${actualRunId} display data:`, {
                                        runId: actualRunId,
                                        distribution: distribution,
                                        expectedDistribution: actualRunId === 13 ? 
                                          {"1":0,"2":1,"3":0,"4":2,"5":3,"6":2,"7":0,"8":0,"9":0,"10":0,"11":0,"12":0,"total":8} :
                                          {"1":0,"2":1,"3":0,"4":2,"5":3,"6":2,"7":0,"8":0,"9":0,"10":0,"11":0,"12":0,"total":8}
                                      });
                                      
                                      // Calculate total for this run
                                      const runTotal = Object.keys(distribution)
                                        .filter(key => !isNaN(Number(key)) && Number(key) >= 1 && Number(key) <= 12)
                                        .reduce((sum, key) => sum + (distribution[key] || 0), 0);
                                      
                                      logger.debug(`🔍 TEST006 - Run ${actualRunId} calculated total:`, runTotal);
                                    }
                                    
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
                                          {(() => {
                                            // Calculate total from individual well values
                                            const runTotal = Object.keys(distribution)
                                              .filter(key => !isNaN(Number(key)) && Number(key) >= 1 && Number(key) <= 12)
                                              .reduce((sum, key) => sum + (distribution[key] || 0), 0);
                                            
                                            // Debug: Log total calculation for TEST006
                                            if (sample.sampleNo === 'TEST006') {
                                              logger.debug(`🔍 TEST006 - Run ${actualRunId} total calculation:`, {
                                                distribution: distribution,
                                                calculatedTotal: runTotal,
                                                distributionTotal: distribution.total
                                              });
                                            }
                                            
                                            return runTotal;
                                          })()}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-center">
                                          <div className="flex items-center justify-center gap-2">
                                            {(run as any).annotatedImagePath || (run as any).rawImagePath ? (
                                              <button
                                                onClick={async () => {
                                                  try {
                                                    // Prefer annotated image, fallback to raw image
                                                    const imagePath = (run as any).annotatedImagePath || (run as any).rawImagePath;
                                                    const isAnnotated = !!(run as any).annotatedImagePath;
                                                    
                                                    logger.debug('Image button clicked:', {
                                                      runId: actualRunId,
                                                      imagePath,
                                                      isAnnotated
                                                    });
                                                    
                                                    // Generate signed URL for the image
                                                    const signedUrl = await resultsServiceDirect.getSignedImageUrl(
                                                      imagePath,
                                                      isAnnotated
                                                    );
                                                    
                                                    logger.debug('Generated signed URL:', signedUrl);
                                                    setSelectedImageUrl(signedUrl);
                                                    setShowImageModal(true);
                                                  } catch (error) {
                                                    logger.error('Failed to generate signed URL:', error);
                                                    alert('Failed to load image. Please try again.');
                                                  }
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
                                            
                                            {/* Delete button */}
                                            <button
                                              onClick={async () => {
                                                if (!window.confirm(`Are you sure you want to delete Run #${actualRunId}?\n\nThis will permanently remove this analysis run and recalculate the sample summary.`)) {
                                                  return;
                                                }
                                                
                                                try {
                                                  logger.debug('Deleting run:', actualRunId);
                                                  
                                                  // Call delete API
                                                  const response = await resultsServiceDirect.deleteRun(actualRunId);
                                                  
                                                  if (response) {
                                                    logger.info('Run deleted successfully');
                                                    alert('Run deleted successfully. The page will refresh.');
                                                    
                                                    // Refresh the page data
                                                    refetch();
                                                    
                                                    // Collapse and re-expand to reload data
                                                    setExpandedSamples(new Map());
                                                  }
                                                } catch (error) {
                                                  logger.error('Failed to delete run:', error);
                                                  alert('Failed to delete run. Please try again.');
                                                }
                                              }}
                                              className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 dark:text-red-400 dark:bg-red-900/20 dark:border-red-700 dark:hover:bg-red-900/30"
                                              title="Delete this run"
                                            >
                                              🗑️ Delete
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
                    logger.error('Failed to load image:', selectedImageUrl);
                    e.currentTarget.style.display = 'none';
                    const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                    if (nextElement) {
                      nextElement.style.display = 'flex';
                    }
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
