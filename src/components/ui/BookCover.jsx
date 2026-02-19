/**
 * Get initials from a book title for the placeholder.
 * e.g. "The Great Gatsby" → "TGG", "Educated" → "E"
 */
function getInitials(title) {
  if (!title) return '?'
  const words = title.split(/\s+/).filter(Boolean)
  if (words.length === 1) return words[0][0].toUpperCase()
  return words
    .slice(0, 3)
    .map((w) => w[0].toUpperCase())
    .join('')
}

/**
 * Generate a consistent background color from a title string.
 */
function getColor(title) {
  const colors = [
    '#71717a', '#a1a1aa', '#6b7280', '#9ca3af',
    '#78716c', '#a8a29e', '#737373', '#a3a3a3',
    '#64748b', '#94a3b8', '#6d7c8a', '#8b95a2',
  ]
  let hash = 0
  for (let i = 0; i < (title || '').length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

export default function BookCover({ url, title, size = 'small' }) {
  const classMap = {
    large: 'book-cover-large',
    medium: 'book-cover-medium',
    small: 'book-cover-small',
    tiny: 'book-cover-tiny',
  }

  const initials = getInitials(title)
  const bgColor = getColor(title)

  return (
    <div className={classMap[size] || 'book-cover-small'}>
      {url ? (
        <img src={url} alt={title} />
      ) : (
        <div
          className="book-cover-placeholder"
          style={{
            backgroundColor: bgColor,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 700,
            fontSize: size === 'large' ? '2.5rem' : size === 'medium' ? '1.5rem' : '1rem',
            letterSpacing: '0.05em',
            borderRadius: 6,
            userSelect: 'none',
          }}
        >
          {initials}
        </div>
      )}
    </div>
  )
}
