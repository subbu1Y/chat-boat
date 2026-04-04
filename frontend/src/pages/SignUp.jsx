import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { registerUser } from '../services/api'
import { useAuth } from '../context/AuthContext'

const S = {
  page:  { background: '#040D2C', minHeight: '100vh' },
  card:  { background: '#0B1854', border: '1px solid #1E3799' },
  input: { background: '#071038', border: '1px solid #1E3799', color: '#E8EEFF' },
}

const ROLES = [
  { value: 'user',  label: '👤 Employee / Staff', desc: 'Access the IT Helpdesk portal' },
  { value: 'admin', label: '🛡️ IT Administrator',  desc: 'Access admin dashboard & all tickets' },
]

export default function SignUp() {
  const navigate      = useNavigate()
  const { login }     = useAuth()
  const [form, setForm] = useState({ name: '', email: '', emp_id: '', password: '', confirm: '', role: 'user' })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw]   = useState(false)
  const [step, setStep]       = useState(1)  // 1=details, 2=role select

  const set = (f, v) => setForm(p => ({ ...p, [f]: v }))

  const validateStep1 = () => {
    if (!form.name.trim())                            { setError('Full name is required.'); return false }
    if (!form.email.trim() || !form.email.includes('@')){ setError('Valid email is required.'); return false }
    if (!form.password || form.password.length < 6)  { setError('Password must be at least 6 characters.'); return false }
    if (form.password !== form.confirm)               { setError('Passwords do not match.'); return false }
    return true
  }

  const handleNext = () => {  { setError(''); setStep(2) } }

  const handleSubmit = async () => {
    setError(''); setLoading(true)
    try {
      const res = await registerUser({
        name:     form.name.trim(),
        email:    form.email.trim(),
        emp_id:   form.emp_id.trim() || null,
        password: form.password,
        role:     form.role,
      })
      login(res.token, res.user)
      if (['admin', 'super-admin'].includes(res.user.role)) navigate('/dashboard')
      else navigate('/helpdesk')
    } catch (err) {
      setError(err?.response?.data?.detail || 'Registration failed. Please try again.')
      setStep(1)
    } finally { setLoading(false) }
  }

  return (
    <div className="flex items-center justify-center p-4 py-8" style={S.page}>

      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, #4361EE 0%, transparent 70%)' }} />
      </div>

      <div className="relative z-10 w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/logo.png" alt="Cognida" className="h-14 mx-auto mb-3 drop-shadow-lg"
            onError={e => { e.target.style.display = 'none' }} />
          <h1 className="text-2xl font-bold" style={{ color: '#E8EEFF' }}>Cognida.ai</h1>
          <p className="text-sm mt-1" style={{ color: '#7EA6FF' }}>IT Helpdesk Portal</p>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-3 mb-6">
          {[1, 2].map(n => (
            <div key={n} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all"
                style={step >= n
                  ? { background: '#4361EE', color: '#fff' }
                  : { background: '#0B1854', border: '1px solid #1E3799', color: '#3B5299' }}>
                {step > n ? '✓' : n}
              </div>
              {n < 2 && <div className="w-10 h-0.5 rounded" style={{ background: step > n ? '#4361EE' : '#1E3799' }} />}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8" style={S.card}>

          {/* Step 1 — Personal details */}
          {step === 1 && (
            <>
              <h2 className="text-xl font-bold mb-1" style={{ color: '#E8EEFF' }}>Create Account</h2>
              <p className="text-sm mb-7" style={{ color: '#7EA6FF' }}>Fill in your details to get started.</p>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#7EA6FF' }}>Full Name <span className="text-red-400">*</span></label>
                  <input type="text" value={form.name} onChange={e => set('name', e.target.value)}
                    placeholder="e.g. Subrahmanyam Pillalamarri" autoComplete="name"
                    style={S.input}
                    className="w-full rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-blue-900" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: '#7EA6FF' }}>Work Email <span className="text-red-400">*</span></label>
                    <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                      placeholder="you@cognida.ai" autoComplete="email"
                      style={S.input}
                      className="w-full rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-blue-900" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: '#7EA6FF' }}>
                      Employee ID <span className="font-normal text-xs" style={{ color: '#3B5299' }}>(optional)</span>
                    </label>
                    <input type="text" value={form.emp_id} onChange={e => set('emp_id', e.target.value)}
                      placeholder="e.g. EMP-001"
                      style={S.input}
                      className="w-full rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-blue-900" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#7EA6FF' }}>Password <span className="text-red-400">*</span></label>
                  <div className="relative">
                    <input type={showPw ? 'text' : 'password'} value={form.password} onChange={e => set('password', e.target.value)}
                      placeholder="Min. 6 characters" autoComplete="new-password"
                      style={S.input}
                      className="w-full rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-blue-900 pr-12" />
                    <button type="button" onClick={() => setShowPw(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: '#3B5299' }}>
                      {showPw ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#7EA6FF' }}>Confirm Password <span className="text-red-400">*</span></label>
                  <input type="password" value={form.confirm} onChange={e => set('confirm', e.target.value)}
                    placeholder="Re-enter password" autoComplete="new-password"
                    style={S.input}
                    className="w-full rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-blue-900" />
                </div>

                {error && (
                  <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm text-red-300"
                    style={{ background: '#2D0A0A', border: '1px solid #7F1D1D' }}>
                    ⚠️ {error}
                  </div>
                )}

                <button onClick={handleNext}
                  className="w-full py-3.5 rounded-xl text-base font-bold text-white hover:opacity-90 transition-opacity"
                  style={{ background: '#4361EE' }}>
                  Next → Select Role
                </button>
              </div>
            </>
          )}

          {/* Step 2 — Role selection */}
          {step === 2 && (
            <>
              <h2 className="text-xl font-bold mb-1" style={{ color: '#E8EEFF' }}>Select Your Role</h2>
              <p className="text-sm mb-7" style={{ color: '#7EA6FF' }}>Choose the role that matches your position.</p>

              <div className="space-y-4 mb-7">
                {ROLES.map(r => (
                  <button key={r.value} type="button" onClick={() => set('role', r.value)}
                    className="w-full flex items-center gap-4 rounded-xl px-5 py-4 text-left transition-all border-2"
                    style={form.role === r.value
                      ? { background: '#0F1F6B', borderColor: '#4361EE' }
                      : { background: '#071038', borderColor: '#1E3799' }}>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all`}
                      style={form.role === r.value
                        ? { borderColor: '#4361EE', background: '#4361EE' }
                        : { borderColor: '#1E3799', background: 'transparent' }}>
                      {form.role === r.value && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <div>
                      <p className="font-bold text-base" style={{ color: '#E8EEFF' }}>{r.label}</p>
                      <p className="text-xs mt-0.5" style={{ color: '#7EA6FF' }}>{r.desc}</p>
                    </div>
                  </button>
                ))}
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm text-red-300 mb-4"
                  style={{ background: '#2D0A0A', border: '1px solid #7F1D1D' }}>
                  ⚠️ {error}
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => { setError(''); setStep(1) }}
                  className="flex-1 py-3.5 rounded-xl text-base font-semibold hover:opacity-80 transition-opacity"
                  style={{ background: '#071038', color: '#7EA6FF', border: '1px solid #1E3799' }}>
                  ← Back
                </button>
                <button onClick={handleSubmit} disabled={loading}
                  className="flex-1 py-3.5 rounded-xl text-base font-bold text-white hover:opacity-90 disabled:opacity-40 transition-opacity flex items-center justify-center gap-2"
                  style={{ background: '#4361EE' }}>
                  {loading
                    ? <><svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>Creating…</>
                    : '✓ Create Account'}
                </button>
              </div>
            </>
          )}

          {/* Footer */}
          <p className="text-center text-sm mt-6" style={{ color: '#3B5299' }}>
            Already have an account?{' '}
            <Link to="/auth/login" className="font-semibold hover:opacity-80 transition-opacity" style={{ color: '#60A5FA' }}>
              Sign In
            </Link>
          </p>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: '#1E3799' }}>
          © 2026 Cognida.ai · IT Helpdesk
        </p>
      </div>
    </div>
  )
}
