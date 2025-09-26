import { useState } from 'react';
import { MdExpandMore, MdExpandLess } from 'react-icons/md';
import Card from '../ui/Card';

interface SystemLogsProps {
  logs: any[];
}

export default function SystemLogs({ logs }: SystemLogsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className="col-span-12 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">System Logs</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {logs.length} entries
          </span>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            {isExpanded ? (
              <MdExpandLess className="h-5 w-5 text-gray-500" />
            ) : (
              <MdExpandMore className="h-5 w-5 text-gray-500" />
            )}
          </button>
        </div>
      </div>
      
      {isExpanded && (
        <div className="mt-4 max-h-64 overflow-y-auto">
          {logs.length > 0 ? (
            <div className="space-y-2">
              {logs.map((log, index) => (
                <div 
                  key={index}
                  className="p-2 bg-gray-50 dark:bg-gray-800 rounded text-sm font-mono"
                >
                  <div className="text-gray-600 dark:text-gray-400">
                    [{new Date(log.timestamp).toLocaleTimeString()}] {log.level}
                  </div>
                  <div className="text-gray-900 dark:text-white">
                    {log.message}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500 dark:text-gray-400">
              No logs available
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
