import { useState } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from './firebase'

function getAuthErrorMessage(err) {
  switch (err.code) {
    case 'auth/user-not-found':
      return 'User not found. Please sign up first.'
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password.'
    case 'auth/configuration-not-found':
      return 'Firebase Authentication is not configured yet. Enable Email/Password sign-in in the Firebase Console.'
    case 'auth/network-request-failed':
      return 'Network error. Check your internet connection and try again.'
    default:
      return err.message || 'Login failed. Please try again.'
  }
}

export default function Login({ onSwitchToSignup, onLoginSuccess, onContinueAsGuest }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      await signInWithEmailAndPassword(auth, email, password)
      onLoginSuccess()
    } catch (err) {
      setError(getAuthErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="section-card auth-card">
      <div className="section-header">
        <h2>Login to Planora</h2>
        <p>Access your events and tickets</p>
      </div>
      
      <form className="form-grid" onSubmit={handleLogin}>
        <div className="field-group">
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="field-group">
          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        
        <button type="submit" disabled={loading} className="primary-action">
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>

      {error && <p className="status-message error-message">{error}</p>}

      <div className="auth-footer">
        <p>Don't have an account? 
          <button className="link-button" onClick={onSwitchToSignup}>
            Sign up here
          </button>
        </p>
        <p>
          <button className="link-button" type="button" onClick={onContinueAsGuest}>
            Continue as guest
          </button>
        </p>
      </div>
    </div>
  )
}
