import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function Header({ displayName }) {
  const navigate = useNavigate()

  const handleLogout = async () => {
    console.log('[Logout] Signing out...')
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('[Logout] Error:', error.message)
    } else {
      console.log('[Logout] Sign-out successful, redirecting...')
      navigate('/login')
    }
  }

  return (
    <header>
      <h1>&#128218; Book Club</h1>
      <div className="user-info">
        <span className="user-name">Welcome, {displayName || 'User'}</span>
        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </header>
  )
}
