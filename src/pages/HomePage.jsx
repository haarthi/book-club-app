import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { searchBooks, fetchBookCover, fetchAndSaveCover, fetchBookMetadata } from '../lib/googleBooks'
import BookCover from '../components/ui/BookCover'
import { StarDisplay } from '../components/ui/StarRating'
import Modal from '../components/ui/Modal'

export default function HomePage() {
  const [currentBook, setCurrentBook] = useState(null)
  const [pastBooks, setPastBooks] = useState([])
  const [isAdmin, setIsAdmin] = useState(false)

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editTab, setEditTab] = useState('future-shelf')
  const [selectedFutureBook, setSelectedFutureBook] = useState(null)
  const [futureBooks, setFutureBooks] = useState([])

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)

  // Form state
  const [meetingDate, setMeetingDate] = useState('')
  const [meetingLocation, setMeetingLocation] = useState('')

  // Manual entry state
  const [manualTitle, setManualTitle] = useState('')
  const [manualAuthor, setManualAuthor] = useState('')
  const [manualDescription, setManualDescription] = useState('')
  const [manualGenre, setManualGenre] = useState('')
  const [manualReason, setManualReason] = useState('')
  const [manualCoverUrl, setManualCoverUrl] = useState('')

  useEffect(() => {
    fetchData()
    checkAdmin()
  }, [])

  useEffect(() => {
    if (editModalOpen && editTab === 'future-shelf') {
      fetchFutureBooks()
    }
  }, [editModalOpen, editTab])

  const fetchData = async () => {
    // Fetch current book
    const { data: current } = await supabase
      .from('books')
      .select('*')
      .eq('status', 'current')
      .single()

    setCurrentBook(current)

    // Fetch past books with ratings
    const { data: past } = await supabase
      .from('books')
      .select(`
        *,
        ratings (rating)
      `)
      .eq('status', 'past')
      .order('date_read', { ascending: false })
      .limit(10) // Limit to 10 for carousel

    // Calculate average ratings
    const pastWithRatings = past?.map(book => {
      const ratings = book.ratings || []
      const sum = ratings.reduce((acc, r) => acc + r.rating, 0)
      const avg = ratings.length > 0 ? (sum / ratings.length).toFixed(1) : 0
      return {
        ...book,
        averageRating: parseFloat(avg),
        ratingsCount: ratings.length
      }
    }) || []

    setPastBooks(pastWithRatings)
  }

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()
      setIsAdmin(profile?.is_admin || false)
    }
  }

  const fetchFutureBooks = async () => {
    const { data } = await supabase
      .from('books')
      .select('*')
      .eq('status', 'future')
      .order('created_at', { ascending: false })
    setFutureBooks(data || [])
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setIsSearching(true)
    const results = await searchBooks(searchQuery)
    setSearchResults(results)
    setIsSearching(false)
  }

  const selectSearchResult = async (book) => {
    setManualTitle(book.title)
    setManualAuthor(book.author)
    setManualReason('')
    setManualDescription(book.description || '')
    setManualGenre(book.genre || '')
    setManualCoverUrl(book.thumbnail || '')
    setEditTab('manual')
    setSearchResults([])
    setSearchQuery('')
  }

  const handleSetCurrentBook = async () => {
    try {
      // 1. Demote old current book to past
      if (currentBook) {
        await supabase
          .from('books')
          .update({
            status: 'past',
            date_read: new Date().toISOString() // Or keep it simple
          })
          .eq('id', currentBook.id)
      }

      // 2. Promote new book
      if (editTab === 'future-shelf' && selectedFutureBook) {
        await supabase
          .from('books')
          .update({
            status: 'current',
            meeting_date: meetingDate,
            meeting_location: meetingLocation
          })
          .eq('id', selectedFutureBook)
      } else if (editTab === 'manual') {
        // Resolve the correct cover URL BEFORE inserting
        const resolvedCoverUrl = await fetchBookCover({
          isbn: null,
          title: manualTitle,
          author: manualAuthor,
        })

        // Fetch description & genre from Google Books (manual values override)
        const metadata = await fetchBookMetadata(manualTitle, manualAuthor)

        const { error } = await supabase
          .from('books')
          .insert({
            title: manualTitle,
            author: manualAuthor,
            user_recommended_reason: manualReason,
            description: manualDescription || metadata.description,
            genre: manualGenre || metadata.genre,
            cover_image_url: resolvedCoverUrl || null,
            status: 'current',
            meeting_date: meetingDate,
            meeting_location: meetingLocation,
            suggested_by: (await supabase.auth.getUser()).data.user.id
          })

        if (error) throw error
      }

      setEditModalOpen(false)
      fetchData()
    } catch (error) {
      console.error('Error setting current book:', error)
      alert('Failed to update current book')
    }
  }

  if (!currentBook && !isAdmin && pastBooks.length === 0) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>
  }

  return (
    <>
      {/* Current Book Hero */}
      <div className="current-book-hero">
        {currentBook ? (
          <>
            <BookCover url={currentBook.cover_image_url} title={currentBook.title} size="large" />
            <div className="current-book-info">
              <div className="now-reading-label">
                <span className="pulse-dot"></span>
                Now Reading
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'start',
                  marginBottom: 10,
                }}
              >
                <h2 style={{ margin: 0 }}>{currentBook.title}</h2>
                {isAdmin && (
                  <button
                    className="admin-edit-btn"
                    onClick={() => setEditModalOpen(true)}
                  >
                    &#9999;&#65039; Edit
                  </button>
                )}
              </div>
              <div className="author">by {currentBook.author}</div>
              <div className="meeting-date">
                &#128197; {currentBook.meeting_date ? new Date(currentBook.meeting_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'TBD'}
              </div>
              <div className="meeting-location">
                &#128205; {currentBook.meeting_location || 'TBD'}
              </div>
              <div className="description">{currentBook.description}</div>
            </div>
          </>
        ) : (
          <div className="current-book-info" style={{ width: '100%', textAlign: 'center' }}>
            <h2>No current book selected</h2>
            {isAdmin && (
              <button
                className="admin-edit-btn"
                style={{ float: 'none', marginTop: 20 }}
                onClick={() => setEditModalOpen(true)}
              >
                &#9999;&#65039; Set Current Book
              </button>
            )}
          </div>
        )}
      </div>

      {/* Past Books Carousel */}
      <div className="past-books-section">
        <div className="section-header">
          <h3>Recently Read</h3>
          <Link to="/past-books" className="view-all-btn">
            View All Past Books
          </Link>
        </div>

        <div className="carousel">
          {pastBooks.length === 0 ? (
            <p>No past books yet.</p>
          ) : (
            pastBooks.map((book) => (
              <Link
                key={book.id}
                to={`/books/${book.id}`}
                className="carousel-book-card"
              >
                <BookCover url={book.cover_image_url} title={book.title} size="small" />
                <h3>{book.title}</h3>
                <div className="author">by {book.author}</div>
                <div className="date-read">Read: {book.date_read}</div>
                <div className="rating-display">
                  <StarDisplay rating={book.averageRating} />
                  <span className="rating-text">
                    {book.averageRating} ({book.ratingsCount} ratings)
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Edit Current Book Modal */}
      <Modal open={editModalOpen} onClose={() => setEditModalOpen(false)}>
        <div className="modal-header">
          <h3>Set Current Book</h3>
          <button
            className="close-modal"
            onClick={() => setEditModalOpen(false)}
          >
            &times;
          </button>
        </div>

        <div className="modal-tabs">
          <button
            className={`modal-tab ${editTab === 'future-shelf' ? 'active' : ''}`}
            onClick={() => setEditTab('future-shelf')}
          >
            From Future Shelf
          </button>
          <button
            className={`modal-tab ${editTab === 'search' ? 'active' : ''}`}
            onClick={() => setEditTab('search')}
          >
            Search Books
          </button>
          <button
            className={`modal-tab ${editTab === 'manual' ? 'active' : ''}`}
            onClick={() => setEditTab('manual')}
          >
            Manual Entry
          </button>
        </div>

        {editTab === 'future-shelf' && (
          <div>
            <p style={{ color: '#6c757d', marginBottom: 20 }}>
              Select a book from your future reading list:
            </p>
            <div className="future-books-select">
              {futureBooks.map((book) => (
                <div
                  key={book.id}
                  className={`future-book-option ${selectedFutureBook === book.id ? 'selected' : ''}`}
                  onClick={() => setSelectedFutureBook(book.id)}
                >
                  <h4>{book.title}</h4>
                  <div className="author">by {book.author}</div>
                </div>
              ))}
            </div>
            <div
              style={{
                marginTop: 25,
                paddingTop: 25,
                borderTop: '1px solid #e9ecef',
              }}
            >
              <div className="form-group">
                <label>Book Club Meeting Date *</label>
                <input
                  type="date"
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Meeting Location *</label>
                <input
                  type="text"
                  placeholder="e.g., Sarah's House, 123 Oak Street"
                  value={meetingLocation}
                  onChange={(e) => setMeetingLocation(e.target.value)}
                />
                <div className="help-text">
                  Where will the book club meet to discuss this book?
                </div>
              </div>
            </div>
          </div>
        )}

        {editTab === 'search' && (
          <div>
            <div className="form-group">
              <label>Search by Title or Author</label>
              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  type="text"
                  placeholder="e.g., The Great Gatsby or F. Scott Fitzgerald"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <button
                  className="btn-primary"
                  style={{ width: 'auto', marginBottom: 0 }}
                  onClick={handleSearch}
                  disabled={isSearching}
                >
                  {isSearching ? '...' : 'Search'}
                </button>
              </div>
              <div className="help-text">
                Search results using Google Books API
              </div>
            </div>

            <div className="search-results" style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 20 }}>
              {searchResults.map((book) => (
                <div
                  key={book.id}
                  style={{ display: 'flex', gap: 10, padding: 10, borderBottom: '1px solid #eee', cursor: 'pointer' }}
                  onClick={() => selectSearchResult(book)}
                >
                  {book.thumbnail && (
                    <img src={book.thumbnail} alt={book.title} style={{ width: 40, height: 60, objectFit: 'cover', borderRadius: 4 }} />
                  )}
                  <div>
                    <h4 style={{ margin: '0 0 5px 0' }}>{book.title}</h4>
                    <div style={{ fontSize: '0.9rem', color: '#666' }}>{book.author}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="form-group">
              <label>Book Club Meeting Date *</label>
              <input
                type="date"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Meeting Location *</label>
              <input
                type="text"
                placeholder="e.g., Sarah's House, 123 Oak Street"
                value={meetingLocation}
                onChange={(e) => setMeetingLocation(e.target.value)}
              />
              <div className="help-text">
                Where will the book club meet to discuss this book?
              </div>
            </div>
          </div>
        )}

        {editTab === 'manual' && (
          <div>
            <div className="form-group">
              <label>Book Title *</label>
              <input
                type="text"
                placeholder="Enter book title"
                value={manualTitle}
                onChange={(e) => setManualTitle(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Author *</label>
              <input
                type="text"
                placeholder="Enter author name"
                value={manualAuthor}
                onChange={(e) => setManualAuthor(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Book Club Meeting Date *</label>
              <input
                type="date"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Meeting Location *</label>
              <input
                type="text"
                placeholder="e.g., Sarah's House, 123 Oak Street"
                value={meetingLocation}
                onChange={(e) => setMeetingLocation(e.target.value)}
              />
              <div className="help-text">
                Where will the book club meet to discuss this book?
              </div>
            </div>
            <div className="form-group">
              <label>Why are you recommending this book? (Optional)</label>
              <textarea
                placeholder="Tell the group why you think they'll enjoy this book..."
                value={manualReason}
                onChange={(e) => setManualReason(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Description (Optional)</label>
              <textarea
                placeholder="A brief synopsis or summary of the book..."
                value={manualDescription}
                onChange={(e) => setManualDescription(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Genre (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Fiction, Memoir, Fantasy, Self-Help"
                value={manualGenre}
                onChange={(e) => setManualGenre(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Cover Image URL (Optional)</label>
              <input
                type="text"
                placeholder="https://example.com/cover.jpg"
                value={manualCoverUrl}
                onChange={(e) => setManualCoverUrl(e.target.value)}
              />
              <div className="help-text">Or leave blank to use a placeholder</div>
            </div>
          </div>
        )}

        <div className="modal-actions">
          <button
            className="btn-secondary"
            onClick={() => setEditModalOpen(false)}
          >
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={handleSetCurrentBook}
          >
            Set as Current Book
          </button>
        </div>
      </Modal>
    </>
  )
}
