// Mock data for testing InferenceResults
export const mockInferenceResults = {
  123: {
    id: 1,
    runId: 123,
    results: {
      distribution: {
        1: 5,
        2: 8,
        3: 12,
        4: 7,
        5: 15,
        6: 9,
        7: 11,
        8: 6,
        9: 13,
        10: 4,
        11: 10,
        12: 8,
        total: 108
      },
      confidence: 0.85,
      analysis: {
        positive_count: 65,
        negative_count: 43,
        invalid_count: 0
      }
    },
    createdAt: '2024-01-15T10:30:00Z'
  },
  122: {
    id: 2,
    runId: 122,
    results: {
      distribution: {
        1: 3,
        2: 6,
        3: 9,
        4: 5,
        5: 12,
        6: 7,
        7: 8,
        8: 4,
        9: 11,
        10: 3,
        11: 9,
        12: 6,
        total: 83
      },
      confidence: 0.78,
      analysis: {
        positive_count: 52,
        negative_count: 31,
        invalid_count: 0
      }
    },
    createdAt: '2024-01-14T15:20:00Z'
  },
  121: {
    id: 3,
    runId: 121,
    results: {
      distribution: {
        1: 4,
        2: 7,
        3: 10,
        4: 6,
        5: 13,
        6: 8,
        7: 9,
        8: 5,
        9: 12,
        10: 4,
        11: 8,
        12: 7,
        total: 93
      },
      confidence: 0.82,
      analysis: {
        positive_count: 58,
        negative_count: 35,
        invalid_count: 0
      }
    },
    createdAt: '2024-01-13T09:45:00Z'
  }
};

// Mock function to simulate API call
export const getMockInferenceResults = async (runId: number | string): Promise<any[]> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Convert to number if string
  const numericRunId = typeof runId === 'string' ? parseInt(runId) : runId;
  
  // Check if we have specific data for this run
  const result = mockInferenceResults[numericRunId as keyof typeof mockInferenceResults];
  
  if (result) {
    return [result];
  }
  
  // Generate random data for unknown run IDs
  const randomDistribution = Array.from({ length: 12 }, (_, i) => ({
    [i + 1]: Math.floor(Math.random() * 15) + 1
  })).reduce((acc, curr) => ({ ...acc, ...curr }), {});
  
  const total = Object.values(randomDistribution).reduce((sum: number, val: any) => sum + val, 0);
  
  const mockResult = {
    id: Math.floor(Math.random() * 1000) + 1,
    runId: numericRunId,
    results: {
      distribution: {
        ...randomDistribution,
        total
      },
      confidence: Math.random() * 0.3 + 0.7, // 0.7-1.0
      analysis: {
        positive_count: Math.floor(total * 0.6),
        negative_count: Math.floor(total * 0.4),
        invalid_count: 0
      }
    },
    createdAt: new Date().toISOString()
  };
  
  logger.debug(`Generated mock data for run ${numericRunId}:`, mockResult);
  return [mockResult];
};
