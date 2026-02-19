export function StarDisplay({ rating, max = 5 }) {
  const fullStars = Math.floor(rating)
  const hasHalf = rating - fullStars >= 0.5

  let display = ''
  for (let i = 0; i < max; i++) {
    if (i < fullStars) {
      display += '\u2605'
    } else if (i === fullStars && hasHalf) {
      display += '\u2605'
    } else {
      display += '\u2606'
    }
  }

  return <span className="stars">{display}</span>
}

export function StarInput({ rating, onRate }) {
  return (
    <div className="star-input">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          className={`star-btn ${star <= rating ? 'active' : ''}`}
          onClick={() => onRate(star)}
          type="button"
        >
          &#9733;
        </button>
      ))}
    </div>
  )
}
