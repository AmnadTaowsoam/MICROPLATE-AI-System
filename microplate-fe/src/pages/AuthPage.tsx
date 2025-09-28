import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdEmail, MdLock, MdPerson, MdLogin } from 'react-icons/md';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { authService } from '../services/auth.service';

function PasswordStrength({ value }: { value: string }) {
  const rules = [
    /[a-z]/.test(value),
    /[A-Z]/.test(value),
    /\d/.test(value),
    /[^A-Za-z0-9]/.test(value),
    value.length >= 8,
  ];
  const score = rules.filter(Boolean).length;
  const colors = ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-lime-500', 'bg-green-600'];
  const labels = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong'];
  return (
    <div className="mt-2 text-xs">
      <div className="h-1 w-full bg-gray-200 dark:bg-gray-700 rounded">
        <div className={`h-1 rounded ${colors[Math.max(0, score - 1)]}`} style={{ width: `${(score / 5) * 100}%` }} />
      </div>
      <div className="text-gray-500 mt-1">{labels[Math.max(0, score - 1)]}</div>
    </div>
  );
}

export default function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const canSubmit = mode === 'login' ? (!!username || !!email) && !!password : !!username && !!email && password.length >= 8;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setMessage(null);
    try {
      if (mode === 'signup') {
        const res = await authService.register({ email, username, password });
        setMessage(res.message || 'Registered successfully. You can login now.');
        setMode('login');
        setPassword('');
      } else {
        console.log('Starting login process...');
        const loginResult = await authService.login({ username: username || email, password });
        console.log('Login result:', loginResult);
        
        const token = authService.getCurrentToken();
        console.log('Token after login:', token ? 'Present' : 'Missing');
        console.log('Token valid:', authService.isTokenValid());
        
        // Trigger storage event to update App state
        console.log('Triggering storage event...');
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'access_token',
          newValue: token,
          storageArea: localStorage
        }));
        
        // Small delay to ensure state updates
        setTimeout(() => {
          console.log('Navigating to /capture...');
          navigate('/capture', { replace: true });
        }, 100);
      }
    } catch (e: unknown) {
      let message = 'Request failed';
      if (typeof e === 'object' && e !== null && 'message' in e && typeof (e as {message: string}).message === 'string') {
        message = (e as {message: string}).message;
      }
      setMessage(message);
    } finally {
      setLoading(false);
    }
  };

  const AuthForm = (
    <div className="w-full lg:w-1/2 p-8 lg:p-12">
      <div className="flex items-center mb-8">
        <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg mr-4">
          <MdLogin className="w-6 h-6 text-gray-700 dark:text-gray-200" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">HAIlytics</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Analytics-first Hemagglutination Inhibition</p>
        </div>
      </div>

      <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
        {mode === 'login' ? 'Welcome back' : 'Create your account'}
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        {mode === 'login' ? 'Login to access your dashboard.' : 'Join us to start analyzing your results.'}
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {mode === 'signup' && (
          <div className="relative">
            <MdEmail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required />
          </div>
        )}
        <div className="relative">
          <MdPerson className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input placeholder={mode === 'login' ? 'Username or Email' : 'Username'} value={username} onChange={(e) => setUsername(e.target.value)} className="pl-10" required />
        </div>
        <div className="relative">
          <MdLock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" required />
          {mode === 'signup' && password && <PasswordStrength value={password} />}
        </div>
        
        {message && (
          <div className={`text-sm px-3 py-2 rounded ${message.includes('success') ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'}`}>
            {message}
          </div>
        )}

        <Button type="submit" className="w-full !py-3 !text-base" disabled={!canSubmit || loading}>
          {loading ? 'Please wait...' : (mode === 'login' ? 'Login' : 'Sign up')}
        </Button>

        <div className="text-sm text-center text-gray-600 dark:text-gray-400">
          {mode === 'login' ? (
            <span>Don't have an account? <button type="button" className="font-semibold text-primary-600 hover:underline" onClick={() => setMode('signup')}>Sign up</button></span>
          ) : (
            <span>Already have an account? <button type="button" className="font-semibold text-primary-600 hover:underline" onClick={() => setMode('login')}>Login</button></span>
          )}
        </div>
        {mode === 'login' && (
          <div className="text-center">
            <button type="button" className="text-sm text-primary-600 hover:underline" onClick={async () => {
              if (!email && !username) { setMessage('Enter your email or username to request a reset link.'); return; }
              try {
                setLoading(true);
                setMessage(null);
                await authService.requestPasswordReset({ email: email || username });
                setMessage('If an account exists for that email, a password reset link has been sent.');
              } catch {
                setMessage('Failed to send reset link.');
              }
              finally { setLoading(false); }
            }}>
              Forgot password?
            </button>
          </div>
        )}
      </form>
    </div>
  );

  const BrandingPanel = (
    <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/95 via-blue-700/95 to-indigo-800/95"></div>
        <div className="relative z-10 text-white text-center">
            <h2 className="text-4xl font-bold mb-4 drop-shadow-lg">Unlock Insights Instantly</h2>
            <p className="text-lg max-w-md text-blue-100 drop-shadow-md">Our AI-powered platform delivers rapid, precise microplate analysis to accelerate your research.</p>
            {/* Scientific illustration */}
             <div className="mt-8 p-6 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20">
                <div className="w-32 h-32 mx-auto rounded-full bg-white/20 flex items-center justify-center">
                  <div className="grid grid-cols-3 gap-2">
                    {[...Array(9)].map((_, i) => (
                      <div key={i} className="w-3 h-3 bg-white/70 rounded-full animate-pulse" style={{animationDelay: `${i * 0.1}s`}}></div>
                    ))}
                  </div>
                </div>
             </div>
        </div>
    </div>
  );


  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="max-w-4xl w-full mx-auto">
            <Card className="shadow-2xl border-none overflow-hidden">
                <div className="flex flex-col lg:flex-row">
                    {mode === 'login' ? BrandingPanel : AuthForm}
                    {mode === 'login' ? AuthForm : BrandingPanel}
                </div>
            </Card>
        </div>
    </div>
  );
}


