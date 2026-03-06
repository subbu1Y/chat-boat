import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Wraps a route that requires authentication.
 * - If loading: show spinner
 * - If not logged in: redirect to /auth/login
 * - If `requiredRole` is set and user's role doesn't match: redirect to their default page
 */
export default function ProtectedRoute({ children, requiredRole }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: '#040D2C' }}>
        <div className="flex flex-col items-center gap-4">
          <svg className="w-10 h-10 animate-spin" fill="none" viewBox="0 0 24 24" style={{ color: '#4361EE' }}>
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <p className="text-sm" style={{ color: '#7EA6FF' }}>Loading…</p>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/auth/login" replace />

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to={user.role === 'admin' ? '/dashboard' : '/helpdesk'} replace />
  }

  return children
}
