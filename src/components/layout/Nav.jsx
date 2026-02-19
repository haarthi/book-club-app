import { NavLink } from 'react-router-dom'

export default function Nav() {
  return (
    <nav>
      <NavLink to="/" end>
        {({ isActive }) => (
          <div className={`nav-item ${isActive ? 'active' : ''}`}>Home</div>
        )}
      </NavLink>
      <NavLink to="/past-books">
        {({ isActive }) => (
          <div className={`nav-item ${isActive ? 'active' : ''}`}>
            Past Books
          </div>
        )}
      </NavLink>
      <NavLink to="/future-shelf">
        {({ isActive }) => (
          <div className={`nav-item ${isActive ? 'active' : ''}`}>
            Future Shelf
          </div>
        )}
      </NavLink>
    </nav>
  )
}
