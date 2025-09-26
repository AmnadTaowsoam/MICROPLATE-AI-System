import { useEffect, useState } from 'react'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import { authService } from '../services/auth.service'

export default function ProfileSettingsPage() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('theme') as 'light' | 'dark') || 'light')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
    localStorage.setItem('theme', theme)
    
    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: theme }))
  }, [theme])

  const handleUpdateProfile = async () => {
    if (!email && !username) return
    setLoading(true)
    try {
      const res = await authService.updateProfile({ email, username })
      setMessage(res.message)
    } catch (e: any) {
      setMessage(e?.message || 'Update failed')
    } finally {
      setLoading(false)
    }
  }

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) return
    setLoading(true)
    try {
      const res = await authService.changePassword({ currentPassword, newPassword })
      setMessage(res.message)
      setCurrentPassword('')
      setNewPassword('')
    } catch (e: any) {
      setMessage(e?.message || 'Password change failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Profile</h2>
        <div className="space-y-3">
          <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
          <Button onClick={handleUpdateProfile} disabled={loading || (!email && !username)}>
            {loading ? 'Saving...' : 'Save Profile'}
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Appearance</h2>
        <div className="flex items-center gap-3">
          <Button variant={theme==='light' ? 'primary' : 'outline'} onClick={() => setTheme('light')}>Light</Button>
          <Button variant={theme==='dark' ? 'primary' : 'outline'} onClick={() => setTheme('dark')}>Dark</Button>
        </div>
      </Card>

      <Card className="p-6 md:col-span-2">
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Change Password</h2>
        <div className="grid md:grid-cols-3 gap-3">
          <Input placeholder="Current password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          <Input placeholder="New password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          <Button onClick={handleChangePassword} disabled={loading || !currentPassword || !newPassword}>
            {loading ? 'Updating...' : 'Update Password'}
          </Button>
        </div>
        {message && <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">{message}</div>}
      </Card>
    </div>
  )
}


