import { useState } from 'react'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { auth, db } from './firebase'
import { setDoc, doc } from 'firebase/firestore'

function getAuthErrorMessage(err) {
  switch (err.code) {
    case 'auth/email-already-in-use':
      return 'Email already registered. Please log in.'
    case 'auth/invalid-email':
      return 'Invalid email format.'
    case 'auth/configuration-not-found':
      return 'Firebase Authentication is not configured yet. Enable Email/Password sign-in in the Firebase Console.'
    case 'auth/network-request-failed':
      return 'Network error. Check your internet connection and try again.'
    default:
      return err.message || 'Sign up failed. Please try again.'
  }
}

export default function Signup({ onSwitchToLogin, onSignupSuccess, onContinueAsGuest }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSignup = async (e) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setLoading(true)

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      
      await updateProfile(userCredential.user, {
        displayName: name
      })

      await setDoc(doc(db, 'users', userCredential.user.uid), {
        name,
        email,
        createdAt: new Date(),
        photoURL: ''
      })

      onSignupSuccess()
    } catch (err) {
      setError(getAuthErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="section-card auth-card">
      <div className="section-header">
        <h2>Join Planora</h2>
        <p>Create your account to manage and join events</p>
      </div>
      
      <form className="form-grid" onSubmit={handleSignup}>
        <div className="field-group">
          <label htmlFor="signup-name">Full Name</label>
          <input
            id="signup-name"
            type="text"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="field-group">
          <label htmlFor="signup-email">Email</label>
          <input
            id="signup-email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="field-group">
          <label htmlFor="signup-password">Password</label>
          <input
            id="signup-password"
            type="password"
            placeholder="Enter password (min 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div className="field-group">
          <label htmlFor="signup-confirm">Confirm Password</label>
          <input
            id="signup-confirm"
            type="password"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>
        
        <button type="submit" disabled={loading} className="primary-action">
          {loading ? 'Creating account...' : 'Sign up'}
        </button>
      </form>

      {error && <p className="status-message error-message">{error}</p>}

      <div className="auth-footer">
        <p>Already have an account? 
          <button className="link-button" onClick={onSwitchToLogin}>
            Log in here
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
