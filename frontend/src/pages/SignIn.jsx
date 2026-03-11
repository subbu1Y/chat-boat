import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { loginUser } from '../services/api'
import { useAuth } from '../context/AuthContext'

const S = {
  page:  { background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)', minHeight: '100vh' },
  card:  { background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', backdropFilter: 'blur(12px)' },
  input: { background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#FFFFFF' },
}

export default function SignIn() {
  const navigate        = useNavigate()
  const { login }       = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw]   = useState(false)

  const set = (f, v) => setForm(p => ({ ...p, [f]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.email.trim() || !form.password) { setError('Please fill in all fields.'); return }
    setError(''); setLoading(true)
    try {
      const res = await loginUser(form.email.trim(), form.password)
      login(res.token, res.user)
      // Route by role
      if (res.user.role === 'admin') navigate('/dashboard')
      else navigate('/helpdesk')
    } catch (err) {
      setError(err?.response?.data?.detail || 'Login failed. Check your credentials.')
    } finally { setLoading(false) }
  }

  return (
    <div className="flex items-center justify-center p-4" style={S.page}>

      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.25) 0%, transparent 70%)' }} />
      </div>

      <div className="relative z-10 w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/logo.png" alt="Cognida" className="h-24 mx-auto mb-3 drop-shadow-lg"
            onError={e => { e.target.style.display = 'none' }} />
          <h1 className="text-2xl font-bold" style={{ color: '#FFFFFF' }}>Cognida.ai</h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.8)' }}>IT Helpdesk Portal</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8" style={S.card}>
          <h2 className="text-xl font-bold mb-1" style={{ color: '#FFFFFF' }}>Sign In</h2>
          <p className="text-sm mb-7" style={{ color: 'rgba(255,255,255,0.75)' }}>Welcome back! Enter your credentials to continue.</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.85)' }}>Work Email</label>
              <input
                type="email" value={form.email} onChange={e => set('email', e.target.value)}
                placeholder="you@cognida.ai" autoComplete="email"
                style={S.input}
                className="w-full rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-blue-900"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.85)' }}>Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'} value={form.password} onChange={e => set('password', e.target.value)}
                  placeholder="Enter your password" autoComplete="current-password"
                  style={S.input}
                  className="w-full rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-blue-900 pr-12"
                />
                <button type="button" onClick={() => setShowPw(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-lg"
                  style={{ color: 'rgba(255,255,255,0.7)' }}>
                  {showPw ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm text-red-300"
                style={{ background: '#2D0A0A', border: '1px solid #7F1D1D' }}>
                ⚠️ {error}
              </div>
            )}

            {/* Submit */}
            <button type="submit" disabled={loading}
              className="w-full py-3.5 rounded-xl text-base font-bold hover:opacity-90 disabled:opacity-40 transition-opacity flex items-center justify-center gap-2"
              style={{ background: '#FFFFFF', color: '#5a67d8' }}>
              {loading
                ? <><svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>Signing in…</>
                : '→ Sign In'}
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-sm mt-6" style={{ color: 'rgba(255,255,255,0.65)' }}>
            Don't have an account?{' '}
            <Link to="/auth/register" className="font-semibold hover:opacity-80 transition-opacity" style={{ color: '#FFFFFF' }}>
              Create Account
            </Link>
          </p>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'rgba(255,255,255,0.5)' }}>
          © 2026 Cognida.ai · IT Helpdesk
        </p>
      </div>
    </div>
  )
}
