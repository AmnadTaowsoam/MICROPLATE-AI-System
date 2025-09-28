// Debug utility to inspect run objects
export const debugRunObject = (run: any, index: number) => {
  console.group(`🔍 Debug Run ${index}`);
  console.log('Full run object:', run);
  console.log('Run ID:', run.id, typeof run.id);
  console.log('Run keys:', Object.keys(run));
  console.log('Run values:', Object.values(run));
  
  // Check for common ID fields
  const possibleIdFields = ['id', 'runId', 'run_id', 'ID', 'runID'];
  possibleIdFields.forEach(field => {
    if (run[field] !== undefined) {
      console.log(`Found ${field}:`, run[field], typeof run[field]);
    }
  });
  
  // Check which ID to use
  const actualRunId = run.id || run.runId || run.run_id;
  console.log('Actual Run ID to use:', actualRunId, typeof actualRunId);
  
  console.groupEnd();
};

// Test function to validate run data structure
export const validateRunData = (runs: any[]) => {
  console.group('🔍 Validating Run Data');
  
  if (!Array.isArray(runs)) {
    console.error('❌ Runs is not an array:', runs);
    return false;
  }
  
  if (runs.length === 0) {
    console.warn('⚠️ No runs found');
    return false;
  }
  
  runs.forEach((run, index) => {
    debugRunObject(run, index);
    
    // Check if run has required fields (accept either id or runId)
    const hasId = run.id || run.runId || run.run_id;
    const requiredFields = ['sampleNo', 'predictAt'];
    const missingFields = requiredFields.filter(field => !run[field]);
    
    if (!hasId) {
      console.error(`❌ Run ${index} missing ID field (need id or runId)`);
    }
    
    if (missingFields.length > 0) {
      console.error(`❌ Run ${index} missing fields:`, missingFields);
    } 
    
    if (hasId && missingFields.length === 0) {
      console.log(`✅ Run ${index} has all required fields`);
    }
  });
  
  console.groupEnd();
  return true;
};
