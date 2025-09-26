import { MdScience, MdEmail, MdPhone, MdLocationOn } from 'react-icons/md';

export default function Footer() {
  return (
    <footer className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border-t border-gray-200 dark:border-gray-700 mt-auto">
      <div className="container-page">
        {/* Main footer content */}
        <div className="py-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand section */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <img 
                src="/HAIlytics.png" 
                alt="HAIlytics Logo" 
                className="h-10 w-10 object-contain"
              />
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">HAIlytics</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Analytics-first Hemagglutination Inhibition</p>
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed max-w-md">
              Advanced AI-powered platform for precise hemagglutination inhibition analysis, 
              delivering professional-grade insights for research and clinical applications.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4">Platform</h4>
            <ul className="space-y-2">
              <li><a href="/capture" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 text-sm">Dashboard</a></li>
              <li><a href="/results" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 text-sm">Results</a></li>
              <li><a href="/samples" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 text-sm">History</a></li>
              <li><a href="/settings" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 text-sm">Settings</a></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4">Support</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-gray-600 dark:text-gray-300 text-sm">
                <MdEmail className="h-4 w-4 text-blue-600" />
                <span>support@hailytics.com</span>
              </li>
              <li className="flex items-center gap-2 text-gray-600 dark:text-gray-300 text-sm">
                <MdPhone className="h-4 w-4 text-blue-600" />
                <span>+1 (555) 123-4567</span>
              </li>
              <li className="flex items-center gap-2 text-gray-600 dark:text-gray-300 text-sm">
                <MdLocationOn className="h-4 w-4 text-blue-600" />
                <span>Research Center, Lab District</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="py-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              &copy; {new Date().getFullYear()} HAIlytics. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
              <a href="#" className="hover:text-blue-600 dark:hover:text-blue-400">Privacy Policy</a>
              <a href="#" className="hover:text-blue-600 dark:hover:text-blue-400">Terms of Service</a>
              <a href="#" className="hover:text-blue-600 dark:hover:text-blue-400">Documentation</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
