import { Outlet, useOutletContext } from 'react-router-dom'
import Header from './Header'
import Nav from './Nav'

export default function Layout() {
  const { displayName } = useOutletContext()
  return (
    <div className="container">
      <Header displayName={displayName} />
      <Nav />
      <main>
        <Outlet />
      </main>
    </div>
  )
}

