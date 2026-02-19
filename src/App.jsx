
import { Routes, Route } from 'react-router-dom'
import Layout from './components/layout/Layout'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import PastBooksPage from './pages/PastBooksPage'
import FutureShelfPage from './pages/FutureShelfPage'
import BookDetailPage from './pages/BookDetailPage'
import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/past-books" element={<PastBooksPage />} />
          <Route path="/future-shelf" element={<FutureShelfPage />} />
          <Route path="/books/:bookId" element={<BookDetailPage />} />
        </Route>
      </Route>
    </Routes>
  )
}

