import { NavLink } from 'react-router-dom';
import { MdLogout, MdSettings, MdDashboard, MdScience, MdDescription, MdHistory, MdLightMode, MdDarkMode, MdPerson, MdExpandMore } from 'react-icons/md';
import { useEffect, useState } from 'react';
import { authService } from '../../services/auth.service';

const navigationLinks = [
  { name: 'Dashboard', href: '/capture', icon: MdDashboard },
  { name: 'Results', href: '/results', icon: MdScience },
  { name: 'History', href: '/samples', icon: MdHistory },
  { name: 'Reports', href: '/reports', icon: MdDescription },
];

const userNavigation = [
  { name: 'Your Profile', href: '/settings' },
  { name: 'Sign out', href: '#' },
];

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export default function Navbar() {
  const handleSignOut = () => {
    authService.logout();
    window.location.href = '/auth';
  };

  // Theme toggle (light/dark)
  const [isDark, setIsDark] = useState<boolean>(false);
  
  // Profile dropdown state
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);
  
  // User info from token
  const [userInfo, setUserInfo] = useState<{ email?: string; username?: string }>({});

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = saved ? saved === 'dark' : prefersDark;
    setIsDark(shouldBeDark);
    document.documentElement.classList.toggle('dark', shouldBeDark);
  }, []);

  // Load user info from token
  useEffect(() => {
    const token = authService.getCurrentToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserInfo({
          email: payload.email || payload.sub,
          username: payload.username || payload.name
        });
      } catch (error) {
        console.error('Error parsing token:', error);
      }
    }
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isProfileOpen && !(event.target as Element).closest('.profile-dropdown')) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isProfileOpen]);

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm">
      <div className="container-page">
        <div className="flex h-16 items-center">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3">
              <img 
                src="/HAIlytics.png" 
                alt="HAIlytics Logo" 
                className="h-8 w-8 object-contain"
              />
              <div className="flex flex-col">
                <span className="text-lg font-bold text-gray-800 dark:text-gray-100">HAIlytics</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Analytics-first HI</span>
              </div>
            </div>
          </div>

          {/* Centered navigation */}
          <nav className="flex-1 hidden md:flex justify-center">
            <div className="flex items-baseline space-x-4">
              {navigationLinks.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={({ isActive }) =>
                    classNames(
                      isActive
                        ? 'bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white'
                        : 'text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white',
                      'rounded-md px-3 py-2 text-sm font-medium flex items-center gap-2'
                    )
                  }
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </NavLink>
              ))}
            </div>
          </nav>

          {/* Right actions */}
          <div className="ml-4 flex items-center gap-2">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="rounded-full bg-gray-200 dark:bg-gray-700 p-2 text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white"
              title="Toggle theme"
            >
              {isDark ? <MdLightMode className="h-5 w-5" /> : <MdDarkMode className="h-5 w-5" />}
            </button>

            {/* Profile dropdown */}
            <div className="relative profile-dropdown">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-2 rounded-full bg-gray-200 dark:bg-gray-700 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center">
                  <MdPerson className="h-5 w-5 text-white" />
                </div>
                <MdExpandMore className={`h-4 w-4 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown menu */}
              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                  <div className="py-1">
                    {/* Profile info */}
                    <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {userInfo.username || 'User Profile'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {userInfo.email || 'user@example.com'}
                      </p>
                    </div>
                    
                    {/* Profile link */}
                    <NavLink
                      to="/settings"
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <MdPerson className="h-4 w-4" />
                      Profile
                    </NavLink>
                    
                    {/* Settings link */}
                    <NavLink
                      to="/settings"
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <MdSettings className="h-4 w-4" />
                      Settings
                    </NavLink>
                    
                    {/* Divider */}
                    <div className="border-t border-gray-200 dark:border-gray-700"></div>
                    
                    {/* Logout */}
                    <button
                      onClick={() => {
                        setIsProfileOpen(false);
                        handleSignOut();
                      }}
                      className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <MdLogout className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
