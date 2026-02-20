
import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import BookCover from '../components/ui/BookCover'
import { StarDisplay, StarInput } from '../components/ui/StarRating'

export default function BookDetailPage() {
  const { bookId } = useParams()
  const [book, setBook] = useState(null)
  const [userRating, setUserRating] = useState(0)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchBookDetails(session.user.id)
    })
  }, [bookId])

  const fetchBookDetails = async (userId) => {
    try {
      setLoading(true)
      // Fetch book details
      const { data: bookData, error } = await supabase
        .from('books')
        .select('*')
        .eq('id', bookId)
        .single()

      if (error) throw error

      // Fetch ratings (without joining profiles — no FK exists between ratings and profiles)
      const { data: ratingsData, error: ratingsError } = await supabase
        .from('ratings')
        .select('rating, review, user_id')
        .eq('book_id', bookId)

      if (ratingsError) throw ratingsError

      // Fetch display names for all users who rated
      const userIds = ratingsData.map(r => r.user_id)
      let profilesMap = {}
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name')
          .in('id', userIds)

        if (profiles) {
          profilesMap = Object.fromEntries(
            profiles.map(p => [p.id, p.display_name])
          )
        }
      }

      // Process ratings with display names
      const ratings = ratingsData.map(r => ({
        rating: r.rating,
        review: r.review,
        memberName: profilesMap[r.user_id] || 'Anonymous',
        isUser: r.user_id === userId
      }))

      // Calculate average
      const sum = ratings.reduce((acc, r) => acc + r.rating, 0)
      const avg = ratings.length > 0 ? (sum / ratings.length).toFixed(1) : 0

      // Find user's rating
      const myRating = ratings.find(r => r.isUser)
      if (myRating) {
        setUserRating(myRating.rating)
      }

      setBook({
        ...bookData,
        averageRating: parseFloat(avg),
        ratingsCount: ratings.length,
        ratings: ratings
      })
    } catch (error) {
      console.error('Error fetching book details:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRate = async (rating) => {
    if (!session) return

    try {
      setUserRating(rating) // Optimistic update

      await supabase
        .from('ratings')
        .upsert({
          book_id: bookId,
          user_id: session.user.id,
          rating: rating
        })

      fetchBookDetails(session.user.id)
    } catch (error) {
      console.error('Error submitting rating:', error)
    }
  }

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>
  }

  if (!book) {
    return (
      <div className="book-detail">
        <Link to="/past-books" className="back-btn">
          &larr; Back to Past Books
        </Link>
        <p>Book not found.</p>
      </div>
    )
  }

  const renderMemberStars = (rating) => {
    let stars = ''
    for (let i = 0; i < 5; i++) {
      stars += i < rating ? '\u2605' : '\u2606'
    }
    return stars
  }

  return (
    <div className="book-detail">
      <Link to="/past-books" className="back-btn">
        &larr; Back to Past Books
      </Link>

      <div className="book-detail-header">
        <BookCover url={book.cover_image_url} title={book.title} size="large" />
        <div className="book-detail-info">
          <h2>{book.title}</h2>
          <div className="author">by {book.author}</div>

          <div className="date-read">Read: {book.date_read}</div>
          {book.description && (
            <div className="description">{book.description}</div>
          )}
          <div className="average-rating">
            <h3>Average Rating</h3>
            <StarDisplay rating={book.averageRating} />
            <span className="rating-value">
              {book.averageRating} / 5.0
            </span>
            <div
              style={{ marginTop: 5, fontSize: 14, color: '#6c757d' }}
            >
              {book.ratingsCount} members rated
            </div>
          </div>
        </div>
      </div>

      <div className="ratings-section">
        <h3>Ratings</h3>

        <div className="your-rating">
          <h4>Your Rating</h4>
          <StarInput rating={userRating} onRate={handleRate} />
        </div>

        {book.ratings.length > 0 && (
          <>
            <h4 style={{ marginBottom: 15, color: '#6c757d' }}>
              Member Ratings
            </h4>
            <div className="member-ratings">
              {book.ratings.map((r, i) => (
                <div key={i} className="member-rating">
                  <span className="member-name">{r.memberName}</span>
                  <span className="member-stars">
                    {renderMemberStars(r.rating)}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

