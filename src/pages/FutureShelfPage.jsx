import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { searchBooks, fetchBookCover, fetchAndSaveCover, fetchBookMetadata } from '../lib/googleBooks'
import BookCover from '../components/ui/BookCover'
import Modal from '../components/ui/Modal'

export default function FutureShelfPage() {
  const [futureBooks, setFutureBooks] = useState([])
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [addTab, setAddTab] = useState('search')
  const [session, setSession] = useState(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedBook, setSelectedBook] = useState(null)
  const [searchReason, setSearchReason] = useState('')

  // Manual entry state
  const [manualTitle, setManualTitle] = useState('')
  const [manualAuthor, setManualAuthor] = useState('')
  const [manualDescription, setManualDescription] = useState('')
  const [manualGenre, setManualGenre] = useState('')
  const [manualReason, setManualReason] = useState('')
  const [manualCoverUrl, setManualCoverUrl] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchBooks(session.user.id)
    })
  }, [])

  const fetchBooks = async (userId) => {
    // Fetch books with votes and suggester info
    const { data: books, error } = await supabase
      .from('books')
      .select(`
        *,
        votes (
            user_id
        ),
        profiles:suggested_by (
            display_name
        )
      `)
      .eq('status', 'future')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching future books:', error)
      return
    }

    // Process books to add votes count and hasVoted status
    const processedBooks = books.map(book => ({
      ...book,
      votesCount: book.votes.length,
      hasVoted: book.votes.some(v => v.user_id === userId),
      suggestedBy: book.profiles?.display_name || 'Unknown'
    })).sort((a, b) => b.votesCount - a.votesCount) // Sort by votes

    setFutureBooks(processedBooks)
  }


  const toggleVote = async (bookId, hasVoted) => {
    if (!session) return

    try {
      if (hasVoted) {
        // Remove vote
        await supabase
          .from('votes')
          .delete()
          .eq('book_id', bookId)
          .eq('user_id', session.user.id)
      } else {
        // Add vote
        await supabase
          .from('votes')
          .insert({
            book_id: bookId,
            user_id: session.user.id
          })
      }
      fetchBooks(session.user.id)
    } catch (error) {
      console.error('Error toggling vote:', error)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setIsSearching(true)
    const results = await searchBooks(searchQuery)
    setSearchResults(results)
    setIsSearching(false)
  }

  const selectSearchResult = (book) => {
    setSelectedBook(book)
  }

  const handleAddFromSearch = async () => {
    if (!selectedBook) return
    try {
      // Resolve cover
      const resolvedCoverUrl = await fetchBookCover({
        isbn: selectedBook.isbn,
        title: selectedBook.title,
        author: selectedBook.author,
      })

      // Fetch description & genre from Google Books
      const metadata = await fetchBookMetadata(selectedBook.title, selectedBook.author)

      const { error } = await supabase
        .from('books')
        .insert({
          title: selectedBook.title,
          author: selectedBook.author,
          user_recommended_reason: searchReason,
          description: metadata.description,
          genre: metadata.genre,
          cover_image_url: resolvedCoverUrl || null,
          status: 'future',
          suggested_by: session.user.id
        })

      if (error) throw error

      setAddModalOpen(false)
      setSelectedBook(null)
      setSearchReason('')
      setSearchResults([])
      setSearchQuery('')
      fetchBooks(session.user.id)
    } catch (error) {
      console.error('Error adding book:', error)
      alert('Failed to add book suggestion')
    }
  }

  const handleAddBook = async () => {
    try {
      if (addTab === 'manual') {
        // Resolve the correct cover URL BEFORE inserting
        console.log('[handleAddBook] Resolving cover for:', manualTitle, manualAuthor)
        const resolvedCoverUrl = await fetchBookCover({
          isbn: null,
          title: manualTitle,
          author: manualAuthor,
        })
        console.log('[handleAddBook] Resolved cover URL:', resolvedCoverUrl)

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
            status: 'future',
            suggested_by: session.user.id
          })

        if (error) throw error
      }

      setAddModalOpen(false)
      setManualTitle('')
      setManualAuthor('')
      setManualReason('')
      setManualDescription('')
      setManualGenre('')
      setManualCoverUrl('')

      fetchBooks(session.user.id)
    } catch (error) {
      console.error('Error adding book:', error)
      alert('Failed to add book suggestion')
    }
  }

  return (
    <>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 30,
        }}
      >
        <h2 style={{ color: '#212529' }}>Future Shelf</h2>
        <button className="add-book-btn" onClick={() => setAddModalOpen(true)}>
          + Add Book Suggestion
        </button>
      </div>

      <div className="future-books-list">
        {futureBooks.length === 0 ? (
          <p>No books in the future shelf yet. Be the first to suggest one!</p>
        ) : (
          futureBooks.map((book) => (
            <div key={book.id} className="future-book-item">
              <BookCover url={book.cover_image_url} title={book.title} size="tiny" />
              <div className="future-book-details">
                <h3>{book.title}</h3>
                <div className="author">by {book.author}</div>
                <div className="suggested-by">
                  Suggested by {book.suggestedBy} &bull; {new Date(book.created_at).toLocaleDateString()}
                </div>
                {book.user_recommended_reason && (
                  <div style={{ fontSize: '0.9rem', color: '#666', marginTop: 5 }}>
                    &quot;{book.user_recommended_reason}&quot;
                  </div>
                )}
              </div>
              <div className="vote-section">
                <button
                  className={`vote-btn ${book.hasVoted ? 'voted' : ''}`}
                  onClick={() => toggleVote(book.id, book.hasVoted)}
                >
                  &#9650; {book.hasVoted ? 'Voted!' : 'Vote'}
                </button>
                <span className="vote-count">{book.votesCount} votes</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Book Suggestion Modal */}
      <Modal open={addModalOpen} onClose={() => setAddModalOpen(false)}>
        <div className="modal-header">
          <h3>Add Book Suggestion</h3>
          <button
            className="close-modal"
            onClick={() => setAddModalOpen(false)}
          >
            &times;
          </button>
        </div>

        <div className="modal-tabs">
          <button
            className={`modal-tab ${addTab === 'search' ? 'active' : ''}`}
            onClick={() => setAddTab('search')}
          >
            Search Books
          </button>
          <button
            className={`modal-tab ${addTab === 'manual' ? 'active' : ''}`}
            onClick={() => setAddTab('manual')}
          >
            Manual Entry
          </button>
        </div>

        {addTab === 'search' && (
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
                Search results using Open Library
              </div>
            </div>

            {!selectedBook && (
              <div className="search-results" style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 20 }}>
                {searchResults.map((book) => (
                  <div
                    key={book.id}
                    style={{ display: 'flex', gap: 10, padding: 10, borderBottom: '1px solid #eee', cursor: 'pointer' }}
                    onClick={() => selectSearchResult(book)}
                  >
                    {book.coverId && (
                      <img src={`https://covers.openlibrary.org/b/id/${book.coverId}-S.jpg`} alt={book.title} style={{ width: 40, height: 60, objectFit: 'cover' }} />
                    )}
                    <div>
                      <h4 style={{ margin: '0 0 5px 0' }}>{book.title}</h4>
                      <div style={{ fontSize: '0.9rem', color: '#666' }}>{book.author}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedBook && (
              <div style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 16, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
                  <div>
                    <h4 style={{ margin: '0 0 4px 0', color: 'var(--text)' }}>{selectedBook.title}</h4>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{selectedBook.author}</div>
                  </div>
                  <button
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--text-muted)' }}
                    onClick={() => setSelectedBook(null)}
                  >
                    ✕
                  </button>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Why are you suggesting this book? (Optional)</label>
                  <textarea
                    placeholder="Tell the group why you think they'll enjoy this book..."
                    value={searchReason}
                    onChange={(e) => setSearchReason(e.target.value)}
                  />
                </div>
                <button
                  className="btn-primary"
                  style={{ marginTop: 12 }}
                  onClick={handleAddFromSearch}
                >
                  Add to Future Shelf
                </button>
              </div>
            )}
          </div>
        )}

        {addTab === 'manual' && (
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
              <label>Why are you suggesting this book? (Optional)</label>
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

        {addTab === 'manual' && (
          <div className="modal-actions">
            <button
              className="btn-secondary"
              onClick={() => setAddModalOpen(false)}
            >
              Cancel
            </button>
            <button
              className="btn-primary"
              onClick={handleAddBook}
            >
              Add to Future Shelf
            </button>
          </div>
        )}
      </Modal>
    </>
  )
}
