
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function LoginPage() {
  const navigate = useNavigate()
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/')
      }
    })
  }, [navigate])

  const [successMsg, setSuccessMsg] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccessMsg(null)

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName,
            },
          },
        })
        if (error) throw error

        // Check if the user got auto-confirmed (email confirmation disabled in Supabase)
        if (data.session) {
          // Auto-confirmed — session exists, redirect to home
          navigate('/')
        } else if (data.user && !data.session) {
          // Email confirmation required
          setSuccessMsg(
            'Account created! Please check your email to confirm your account, then log in.'
          )
          setIsSignUp(false)
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) {
          // Provide a more helpful message for common errors
          if (error.message.includes('Email not confirmed')) {
            throw new Error(
              'Email not confirmed. Check your inbox for a confirmation link, or disable email confirmation in your Supabase project settings (Authentication → Email → Confirm email).'
            )
          }
          if (error.message.includes('Invalid login credentials')) {
            throw new Error(
              'Invalid email or password. If you just signed up, check your email for a confirmation link first.'
            )
          }
          throw error
        }
        navigate('/')
      }
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleAuth = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
      })
      if (error) throw error
    } catch (error) {
      setError(error.message)
    }
  }

  return (
    <div className="container" style={{ maxWidth: 460, margin: '40px auto' }}>
      <div className="login-container">
        <h2>{isSignUp ? 'Create Account' : 'Welcome Back'}</h2>

        {error && (
          <div className="form-error">{error}</div>
        )}
        {successMsg && (
          <div className="form-success">{successMsg}</div>
        )}

        <form onSubmit={handleSubmit}>
          {isSignUp && (
            <div className="form-group">
              <label>Display Name</label>
              <input
                type="text"
                placeholder="Enter your display name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="login-btn"
            disabled={loading}
          >
            {loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Log In')}
          </button>
        </form>

        <div className="divider">or</div>

        <button
          className="google-btn"
          onClick={handleGoogleAuth}
          type="button"
        >
          Sign in with Google
        </button>

        <div className="signup-link">
          {isSignUp ? (
            <>
              Already have an account?{' '}
              <button
                onClick={() => setIsSignUp(false)}
                className="signup-link-btn"
              >
                Log in
              </button>
            </>
          ) : (
            <>
              Don&apos;t have an account?{' '}
              <button
                onClick={() => setIsSignUp(true)}
                className="signup-link-btn"
              >
                Sign up
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
