
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import BookCover from '../components/ui/BookCover'
import { StarDisplay } from '../components/ui/StarRating'

export default function PastBooksPage() {
  const [pastBooks, setPastBooks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPastBooks()
  }, [])

  const fetchPastBooks = async () => {
    setLoading(true)
    const { data: past, error } = await supabase
      .from('books')
      .select(`
        *,
        ratings (rating)
      `)
      .eq('status', 'past')
      .order('date_read', { ascending: false })

    if (error) {
      console.error('Error fetching past books:', error)
      setLoading(false)
      return
    }

    // Calculate average ratings
    const pastWithRatings = past.map(book => {
      const ratings = book.ratings || []
      const sum = ratings.reduce((acc, r) => acc + r.rating, 0)
      const avg = ratings.length > 0 ? (sum / ratings.length).toFixed(1) : 0
      return {
        ...book,
        averageRating: parseFloat(avg),
        ratingsCount: ratings.length
      }
    })

    setPastBooks(pastWithRatings)
    setLoading(false)
  }

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>
  }

  return (
    <>
      <h2 style={{ color: '#212529', marginBottom: 30 }}>Past Books</h2>
      <div className="future-books-list">
        {pastBooks.length === 0 ? (
          <p>No past books found.</p>
        ) : (
          pastBooks.map((book) => (
            <Link
              key={book.id}
              to={`/books/${book.id}`}
              className="future-book-item"
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <BookCover url={book.cover_image_url} title={book.title} size="tiny" />
              <div className="future-book-details">
                <h3>{book.title}</h3>
                <div className="author">by {book.author}</div>
                <div className="suggested-by">
                  Read: {book.date_read}
                </div>
              </div>
              <div className="vote-section">
                <div className="rating-display">
                  <StarDisplay rating={book.averageRating} />
                </div>
                <span className="vote-count">
                  {book.averageRating} ({book.ratingsCount} ratings)
                </span>
              </div>
            </Link>
          ))
        )}
      </div>
    </>
  )
}
