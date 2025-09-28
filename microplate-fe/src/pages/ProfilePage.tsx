import { useEffect, useState } from 'react'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import { authService } from '../services/auth.service'
import { MdPerson, MdEmail, MdEdit, MdSave, MdCancel, MdSecurity, MdNotifications, MdLanguage, MdAccessibility, MdVerified } from 'react-icons/md'
import { useTheme } from '../contexts/ThemeContext'

interface UserProfile {
  email: string
  username: string
  fullName?: string
  role?: string
  joinDate?: string
  lastLogin?: string
  isVerified?: boolean
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile>({
    email: '',
    username: '',
    fullName: '',
    role: 'User',
    joinDate: '',
    lastLogin: '',
    isVerified: true
  })
  
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  
  // Form state for editing
  const [editForm, setEditForm] = useState({
    email: '',
    username: '',
    fullName: ''
  })

  useEffect(() => {
    loadUserProfile()
  }, [])

  const loadUserProfile = () => {
    try {
      const token = authService.getCurrentToken()
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]))
        const userProfile: UserProfile = {
          email: payload.email || payload.sub || '',
          username: payload.username || payload.name || '',
          fullName: payload.fullName || '',
          role: payload.role || 'User',
          joinDate: payload.iat ? new Date(payload.iat * 1000).toLocaleDateString() : '',
          lastLogin: payload.exp ? new Date(payload.exp * 1000).toLocaleDateString() : '',
          isVerified: payload.verified !== false
        }
        setProfile(userProfile)
        setEditForm({
          email: userProfile.email,
          username: userProfile.username,
          fullName: userProfile.fullName || ''
        })
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    }
  }

  const handleEdit = () => {
    setIsEditing(true)
    setMessage(null)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditForm({
      email: profile.email,
      username: profile.username,
      fullName: profile.fullName || ''
    })
    setMessage(null)
  }

  const handleSave = async () => {
    setLoading(true)
    setMessage(null)
    
    try {
      const res = await authService.updateProfile({
        email: editForm.email,
        username: editForm.username,
        fullName: editForm.fullName
      })
      
      setProfile(prev => ({
        ...prev,
        email: editForm.email,
        username: editForm.username,
        fullName: editForm.fullName
      }))
      
      setIsEditing(false)
      setMessage({ type: 'success', text: res.message || 'Profile updated successfully' })
    } catch (error: any) {
      setMessage({ type: 'error', text: error?.message || 'Failed to update profile' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Profile</h1>
        <p className="text-gray-600 dark:text-gray-400">Manage your personal information and preferences</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Profile Overview Card */}
        <div className="lg:col-span-1">
          <Card className="p-8 text-center">
            {/* Avatar */}
            <div className="relative inline-block mb-6">
              <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto shadow-lg border-4 border-white dark:border-gray-800">
                <MdPerson className="w-16 h-16 text-white" />
              </div>
              {profile.isVerified && (
                <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white dark:border-gray-800">
                  <MdVerified className="w-5 h-5 text-white" />
                </div>
              )}
            </div>

            {/* Profile Info */}
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {profile.fullName || profile.username || 'User'}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-3 flex items-center justify-center gap-2">
              <MdEmail className="w-4 h-4" />
              {profile.email}
            </p>
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-full text-sm font-medium mb-6 shadow-sm">
              <MdSecurity className="w-4 h-4" />
              {profile.role}
            </div>

            {/* Stats */}
            <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-6">
              <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Member since</span>
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{profile.joinDate}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Last login</span>
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{profile.lastLogin}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Profile Details Card */}
        <div className="lg:col-span-2">
          <Card className="p-8">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <MdEdit className="w-5 h-5" />
                Personal Information
              </h3>
              {!isEditing && (
                <Button onClick={handleEdit} variant="outline" className="flex items-center gap-2">
                  <MdEdit className="w-4 h-4" />
                  Edit Profile
                </Button>
              )}
            </div>

            {message && (
              <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
                message.type === 'success' 
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800' 
                  : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
              }`}>
                {message.type === 'success' ? (
                  <MdVerified className="w-5 h-5" />
                ) : (
                  <MdCancel className="w-5 h-5" />
                )}
                {message.text}
              </div>
            )}

            <div className="space-y-6">
              {/* Full Name */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Full Name
              </label>
                {isEditing ? (
                  <Input
                    value={editForm.fullName}
                    onChange={(e) => setEditForm(prev => ({ ...prev, fullName: e.target.value }))}
                    placeholder="Enter your full name"
                    className="w-full"
                  />
                ) : (
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white">
                    {profile.fullName || 'Not specified'}
                  </div>
                )}
              </div>

              {/* Email */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <MdEmail className="w-4 h-4" />
                Email Address
              </label>
                {isEditing ? (
                  <Input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter your email"
                    className="w-full"
                  />
                ) : (
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white flex items-center gap-2">
                    <MdEmail className="w-4 h-4 text-gray-500" />
                    {profile.email}
                  </div>
                )}
              </div>

              {/* Username */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <MdPerson className="w-4 h-4" />
                Username
              </label>
                {isEditing ? (
                  <Input
                    value={editForm.username}
                    onChange={(e) => setEditForm(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="Enter your username"
                    className="w-full"
                  />
                ) : (
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white flex items-center gap-2">
                    <MdPerson className="w-4 h-4 text-gray-500" />
                    {profile.username}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {isEditing && (
                <div className="flex gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <Button 
                    onClick={handleSave} 
                    disabled={loading}
                    className="flex items-center gap-2"
                  >
                    <MdSave className="w-4 h-4" />
                    {loading ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button 
                    onClick={handleCancel} 
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <MdCancel className="w-4 h-4" />
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Quick Actions */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <MdAccessibility className="w-5 h-5" />
          Quick Actions
        </h3>
        <div className="grid md:grid-cols-3 gap-4">
          <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
            <MdSecurity className="w-6 h-6" />
            <span>Change Password</span>
          </Button>
          <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
            <MdNotifications className="w-6 h-6" />
            <span>Notification Settings</span>
          </Button>
          <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
            <MdLanguage className="w-6 h-6" />
            <span>Language & Region</span>
          </Button>
        </div>
      </Card>
    </div>
  )
}
