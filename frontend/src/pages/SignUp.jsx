import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { registerUser } from '../services/api'
import { useAuth } from '../context/AuthContext'

const S = {
  page:  { background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)', minHeight: '100vh' },
  card:  { background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', backdropFilter: 'blur(12px)' },
  input: { background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#FFFFFF' },
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
  const [step, setStep]       = useState(1)

  const set = (f, v) => setForm(p => ({ ...p, [f]: v }))

  const validateStep1 = () => {
    if (!form.name.trim())                             { setError('Full name is required.'); return false }
    if (!form.email.trim() || !form.email.includes('@')){ setError('Valid email is required.'); return false }
    if (!form.password || form.password.length < 6)   { setError('Password must be at least 6 characters.'); return false }
    if (form.password !== form.confirm)                { setError('Passwords do not match.'); return false }
    return true
  }

  const handleNext = () => {
    if (!validateStep1()) return
    setError('')
    setStep(2)
  }

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
      if (res.user.role === 'admin') navigate('/dashboard')
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
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.25) 0%, transparent 70%)' }} />
      </div>

      <div className="relative z-10 w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/logo.png" alt="Cognida" className="h-24 mx-auto mb-3 drop-shadow-lg"
            onError={e => { e.target.style.display = 'none' }} />
          <h1 className="text-2xl font-bold text-white">Cognida.ai</h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.65)' }}>IT Helpdesk Portal</p>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-3 mb-6">
          {[1, 2].map(n => (
            <div key={n} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all"
                style={step >= n
                  ? { background: 'rgba(255,255,255,0.9)', color: '#5a67d8' }
                  : { background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: 'rgba(255,255,255,0.5)' }}>
                {step > n ? '✓' : n}
              </div>
              {n < 2 && <div className="w-10 h-0.5 rounded" style={{ background: step > n ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.2)' }} />}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8" style={S.card}>

          {/* Step 1 — Personal details */}
          {step === 1 && (
            <>
              <h2 className="text-xl font-bold mb-1 text-white">Create Account</h2>
              <p className="text-sm mb-7" style={{ color: 'rgba(255,255,255,0.65)' }}>Fill in your details to get started.</p>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-white">Full Name <span className="text-red-300">*</span></label>
                  <input type="text" value={form.name} onChange={e => set('name', e.target.value)}
                    placeholder="e.g. Subrahmanyam Pillalamarri" autoComplete="name"
                    style={S.input}
                    className="w-full rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-white/50 placeholder:text-white/30" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-white">Work Email <span className="text-red-300">*</span></label>
                    <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                      placeholder="you@cognida.ai" autoComplete="email"
                      style={S.input}
                      className="w-full rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-white/50 placeholder:text-white/30" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-white">
                      Employee ID <span className="font-normal text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>(optional)</span>
                    </label>
                    <input type="text" value={form.emp_id} onChange={e => set('emp_id', e.target.value)}
                      placeholder="e.g. EMP-001"
                      style={S.input}
                      className="w-full rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-white/50 placeholder:text-white/30" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 text-white">Password <span className="text-red-300">*</span></label>
                  <div className="relative">
                    <input type={showPw ? 'text' : 'password'} value={form.password} onChange={e => set('password', e.target.value)}
                      placeholder="Min. 6 characters" autoComplete="new-password"
                      style={S.input}
                      className="w-full rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-white/50 placeholder:text-white/30 pr-12" />
                    <button type="button" onClick={() => setShowPw(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white">
                      {showPw ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 text-white">Confirm Password <span className="text-red-300">*</span></label>
                  <input type="password" value={form.confirm} onChange={e => set('confirm', e.target.value)}
                    placeholder="Re-enter password" autoComplete="new-password"
                    style={S.input}
                    className="w-full rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-white/50 placeholder:text-white/30" />
                </div>

                {error && (
                  <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm text-red-200"
                    style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)' }}>
                    ⚠️ {error}
                  </div>
                )}

                <button onClick={handleNext}
                  className="w-full py-3.5 rounded-xl text-base font-bold hover:opacity-90 transition-opacity"
                  style={{ background: 'rgba(255,255,255,0.95)', color: '#5a67d8' }}>
                  Next → Select Role
                </button>
              </div>
            </>
          )}

          {/* Step 2 — Role selection */}
          {step === 2 && (
            <>
              <h2 className="text-xl font-bold mb-1 text-white">Select Your Role</h2>
              <p className="text-sm mb-7" style={{ color: 'rgba(255,255,255,0.65)' }}>Choose the role that matches your position.</p>

              <div className="space-y-4 mb-7">
                {ROLES.map(r => (
                  <button key={r.value} type="button" onClick={() => set('role', r.value)}
                    className="w-full flex items-center gap-4 rounded-xl px-5 py-4 text-left transition-all border-2"
                    style={form.role === r.value
                      ? { background: 'rgba(255,255,255,0.2)', borderColor: 'rgba(255,255,255,0.8)' }
                      : { background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.2)' }}>
                    <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
                      style={form.role === r.value
                        ? { borderColor: '#fff', background: '#fff' }
                        : { borderColor: 'rgba(255,255,255,0.4)', background: 'transparent' }}>
                      {form.role === r.value && <div className="w-2 h-2 rounded-full" style={{ background: '#5a67d8' }} />}
                    </div>
                    <div>
                      <p className="font-bold text-base text-white">{r.label}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>{r.desc}</p>
                    </div>
                  </button>
                ))}
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm text-red-200 mb-4"
                  style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)' }}>
                  ⚠️ {error}
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => { setError(''); setStep(1) }}
                  className="flex-1 py-3.5 rounded-xl text-base font-semibold hover:opacity-80 transition-opacity"
                  style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }}>
                  ← Back
                </button>
                <button onClick={handleSubmit} disabled={loading}
                  className="flex-1 py-3.5 rounded-xl text-base font-bold hover:opacity-90 disabled:opacity-40 transition-opacity flex items-center justify-center gap-2"
                  style={{ background: 'rgba(255,255,255,0.95)', color: '#5a67d8' }}>
                  {loading
                    ? <><svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>Creating…</>
                    : '✓ Create Account'}
                </button>
              </div>
            </>
          )}

          {/* Footer */}
          <p className="text-center text-sm mt-6" style={{ color: 'rgba(255,255,255,0.55)' }}>
            Already have an account?{' '}
            <Link to="/auth/login" className="font-semibold text-white hover:opacity-80 transition-opacity">
              Sign In
            </Link>
          </p>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'rgba(255,255,255,0.35)' }}>
          © 2026 Cognida.ai · IT Helpdesk
        </p>
      </div>
    </div>
  )
}
