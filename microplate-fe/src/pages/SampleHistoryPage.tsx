import Card from '../components/ui/Card';
import Spinner from '../components/ui/Spinner';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MdHistory, MdSearch, MdChevronRight } from 'react-icons/md';
import Input from '../components/ui/Input';

export default function SampleHistoryPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [samples, setSamples] = useState<Array<{ id: string; sampleNo: string; createdAt: string; submissionNo: string; status: 'Completed' | 'Processing' | 'Failed' }>>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Faked API call for demonstration
  useState(() => {
    setTimeout(() => {
      setSamples([
        { id: '1', sampleNo: 'SAM-001-A', submissionNo: 'SUB-ALPHA', createdAt: new Date().toISOString(), status: 'Completed' },
        { id: '2', sampleNo: 'SAM-002-B', submissionNo: 'SUB-BRAVO', createdAt: new Date(Date.now() - 86400000).toISOString(), status: 'Completed' },
        { id: '3', sampleNo: 'SAM-003-C', submissionNo: 'SUB-CHARLIE', createdAt: new Date(Date.now() - 172800000).toISOString(), status: 'Processing' },
        { id: '4', sampleNo: 'SAM-004-D', submissionNo: 'SUB-DELTA', createdAt: new Date(Date.now() - 259200000).toISOString(), status: 'Failed' },
      ]);
      setIsLoading(false);
    }, 1000);
  });

  const filteredSamples = samples.filter(s => 
    s.sampleNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.submissionNo.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const getStatusChip = (status: 'Completed' | 'Processing' | 'Failed') => {
    switch(status) {
        case 'Completed': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Completed</span>;
        case 'Processing': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Processing</span>;
        case 'Failed': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Failed</span>;
    }
  }

  return (
    <div className="space-y-8">
       <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Sample History</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">View and manage all analyzed samples.</p>
      </div>

      <Card>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
                <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input 
                    placeholder="Search by Sample or Submission No..." 
                    className="pl-10 w-full md:w-1/3"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Spinner size="lg" />
          </div>
        ) : filteredSamples.length === 0 ? (
          <div className="text-center py-24 text-gray-500 dark:text-gray-400">
            <MdHistory className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium">No Samples Found</h3>
            <p>Your analyzed samples will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Sample No</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Submission No</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                {filteredSamples.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{s.sampleNo}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{s.submissionNo}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{getStatusChip(s.status)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{new Date(s.createdAt).toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <Link to={`/results/${encodeURIComponent(s.sampleNo)}`} className="group text-primary-600 hover:text-primary-700 dark:text-primary-400 flex items-center justify-end gap-1">
                        View Results <MdChevronRight className="h-4 w-4 transform transition-transform group-hover:translate-x-1" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}


