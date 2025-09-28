import { useState } from 'react'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import { MdDarkMode, MdLightMode, MdPalette, MdSecurity, MdNotifications, MdLanguage, MdStorage, MdBackup, MdDelete, MdDownload, MdUpload, MdRefresh, MdSave, MdSettings, MdVolumeUp, MdVolumeOff, MdEmail, MdLock, MdVisibility, MdVisibilityOff } from 'react-icons/md'
import { useTheme } from '../contexts/ThemeContext'

interface SettingsState {
  notifications: {
    email: boolean
    push: boolean
    desktop: boolean
  }
  privacy: {
    profileVisibility: 'public' | 'private'
    showEmail: boolean
    twoFactor: boolean
  }
  data: {
    autoBackup: boolean
    dataRetention: number
    exportFormat: 'json' | 'csv' | 'pdf'
  }
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const [settings, setSettings] = useState<SettingsState>({
    notifications: {
      email: true,
      push: true,
      desktop: false
    },
    privacy: {
      profileVisibility: 'private',
      showEmail: false,
      twoFactor: false
    },
    data: {
      autoBackup: true,
      dataRetention: 365,
      exportFormat: 'json'
    }
  })

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme)
  }

  const handleNotificationChange = (key: keyof SettingsState['notifications'], value: boolean) => {
    setSettings(prev => ({
      ...prev,
      notifications: { ...prev.notifications, [key]: value }
    }))
  }

  const handlePrivacyChange = (key: keyof SettingsState['privacy'], value: any) => {
    setSettings(prev => ({
      ...prev,
      privacy: { ...prev.privacy, [key]: value }
    }))
  }

  const handleDataChange = (key: keyof SettingsState['data'], value: any) => {
    setSettings(prev => ({
      ...prev,
      data: { ...prev.data, [key]: value }
    }))
  }

  const handleSaveSettings = async () => {
    setLoading(true)
    setMessage(null)
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      setMessage({ type: 'success', text: 'Settings saved successfully' })
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save settings' })
    } finally {
      setLoading(false)
    }
  }

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setMessage({ type: 'error', text: 'Please fill in all password fields' })
      return
    }
    
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' })
      return
    }

    setLoading(true)
    setMessage(null)
    
    try {
      // Here you would call the actual password change API
      await new Promise(resolve => setTimeout(resolve, 1000))
      setMessage({ type: 'success', text: 'Password changed successfully' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.message || 'Failed to change password' })
    } finally {
      setLoading(false)
    }
  }

  const handleExportData = () => {
    // Simulate data export
    const data = {
      exportDate: new Date().toISOString(),
      settings,
      message: 'Your data has been exported successfully'
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `microplate-settings-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleDeleteAccount = () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      // Handle account deletion
      setMessage({ type: 'error', text: 'Account deletion is not implemented in demo' })
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400">Customize your application preferences and security settings</p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-2 ${
          message.type === 'success' 
            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800' 
            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Appearance Settings */}
        <Card className="p-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <MdPalette className="w-5 h-5" />
            Appearance
          </h3>
          
          <div className="space-y-6">
            {/* Theme Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Theme
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => handleThemeChange('light')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    theme === 'light'
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <MdLightMode className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
                  <span className="text-sm font-medium">Light</span>
                </button>
                
                <button
                  onClick={() => handleThemeChange('dark')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    theme === 'dark'
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <MdDarkMode className="w-6 h-6 mx-auto mb-2 text-blue-400" />
                  <span className="text-sm font-medium">Dark</span>
                </button>
                
                <button
                  onClick={() => handleThemeChange('system')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    theme === 'system'
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <MdSettings className="w-6 h-6 mx-auto mb-2 text-gray-500" />
                  <span className="text-sm font-medium">System</span>
                </button>
              </div>
            </div>
          </div>
        </Card>

        {/* Notifications Settings */}
        <Card className="p-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <MdNotifications className="w-5 h-5" />
            Notifications
          </h3>
          
          <div className="space-y-4">
            {Object.entries(settings.notifications).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                    {key === 'email' && 'Email Notifications'}
                    {key === 'push' && 'Push Notifications'}
                    {key === 'desktop' && 'Desktop Notifications'}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {key === 'email' && 'Receive notifications via email'}
                    {key === 'push' && 'Receive push notifications'}
                    {key === 'desktop' && 'Show desktop notifications'}
                  </div>
                </div>
                <button
                  onClick={() => handleNotificationChange(key as keyof SettingsState['notifications'], !value)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    value ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      value ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </Card>

        {/* Privacy Settings */}
        <Card className="p-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <MdSecurity className="w-5 h-5" />
            Privacy & Security
          </h3>
          
          <div className="space-y-4">
            {/* Profile Visibility */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Profile Visibility
              </label>
              <select
                value={settings.privacy.profileVisibility}
                onChange={(e) => handlePrivacyChange('profileVisibility', e.target.value)}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </div>

            {/* Show Email */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">Show Email</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Make your email visible to other users</div>
              </div>
              <button
                onClick={() => handlePrivacyChange('showEmail', !settings.privacy.showEmail)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.privacy.showEmail ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.privacy.showEmail ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Two-Factor Authentication */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">Two-Factor Authentication</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Add an extra layer of security</div>
              </div>
              <button
                onClick={() => handlePrivacyChange('twoFactor', !settings.privacy.twoFactor)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.privacy.twoFactor ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.privacy.twoFactor ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </Card>

        {/* Data Management */}
        <Card className="p-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <MdStorage className="w-5 h-5" />
            Data Management
          </h3>
          
          <div className="space-y-4">
            {/* Auto Backup */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">Auto Backup</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Automatically backup your data</div>
              </div>
              <button
                onClick={() => handleDataChange('autoBackup', !settings.data.autoBackup)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.data.autoBackup ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.data.autoBackup ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Data Retention */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Data Retention (days)
              </label>
              <Input
                type="number"
                value={settings.data.dataRetention}
                onChange={(e) => handleDataChange('dataRetention', parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Export Format */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Export Format
              </label>
              <select
                value={settings.data.exportFormat}
                onChange={(e) => handleDataChange('exportFormat', e.target.value)}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="json">JSON</option>
                <option value="csv">CSV</option>
                <option value="pdf">PDF</option>
              </select>
            </div>
          </div>
        </Card>
      </div>

      {/* Password Change */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <MdLock className="w-5 h-5" />
          Change Password
        </h3>
        
        <div className="grid md:grid-cols-3 gap-4">
          <div className="relative">
            <Input
              type={showPasswords ? 'text' : 'password'}
              placeholder="Current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPasswords(!showPasswords)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPasswords ? <MdVisibilityOff className="w-5 h-5" /> : <MdVisibility className="w-5 h-5" />}
            </button>
          </div>
          
          <div className="relative">
            <Input
              type={showPasswords ? 'text' : 'password'}
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPasswords(!showPasswords)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPasswords ? <MdVisibilityOff className="w-5 h-5" /> : <MdVisibility className="w-5 h-5" />}
            </button>
          </div>
          
          <Button 
            onClick={handleChangePassword} 
            disabled={loading || !currentPassword || !newPassword}
            className="flex items-center gap-2"
          >
            <MdSave className="w-4 h-4" />
            {loading ? 'Changing...' : 'Change Password'}
          </Button>
        </div>
      </Card>

      {/* Data Actions */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <MdBackup className="w-5 h-5" />
          Data Actions
        </h3>
        
        <div className="grid md:grid-cols-3 gap-4">
          <Button 
            onClick={handleExportData}
            variant="outline" 
            className="flex items-center gap-2"
          >
            <MdDownload className="w-4 h-4" />
            Export Data
          </Button>
          
          <Button 
            onClick={handleSaveSettings}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <MdSave className="w-4 h-4" />
            {loading ? 'Saving...' : 'Save All Settings'}
          </Button>
          
          <Button 
            onClick={handleDeleteAccount}
            variant="outline"
            className="flex items-center gap-2 text-red-600 hover:text-red-700 border-red-300 hover:border-red-400"
          >
            <MdDelete className="w-4 h-4" />
            Delete Account
          </Button>
        </div>
      </Card>
    </div>
  )
}
