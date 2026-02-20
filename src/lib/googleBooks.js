import { supabase } from './supabase'

/**
 * Search Google Books API for books by query string.
 * Uses the VITE_GOOGLE_BOOKS_API_KEY from .env.
 */
export const searchBooks = async (query) => {
    if (!query) return []

    try {
        const apiKey = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY
        const url = apiKey
            ? `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=10&key=${apiKey}`
            : `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=10`
        console.log('[Search] Google Books URL:', url)

        const response = await fetch(url)
        if (!response.ok) {
            console.warn('[Search] Google Books returned', response.status)
            return []
        }

        const data = await response.json()
        if (!data.items || data.items.length === 0) return []

        return data.items.map((item) => {
            const info = item.volumeInfo || {}
            const isbn13 = info.industryIdentifiers?.find(id => id.type === 'ISBN_13')?.identifier
            const isbn10 = info.industryIdentifiers?.find(id => id.type === 'ISBN_10')?.identifier

            return {
                id: item.id,
                title: info.title || 'Untitled',
                author: info.authors ? info.authors.join(', ') : 'Unknown Author',
                isbn: isbn13 || isbn10 || null,
                thumbnail: info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || null,
                description: info.description ? info.description.substring(0, 500) : '',
                genre: info.categories?.[0] || '',
                publishedYear: info.publishedDate ? info.publishedDate.substring(0, 4) : null,
            }
        })
    } catch (error) {
        console.error('[Search] Error searching Google Books:', error)
        return []
    }
}

/**
 * Fetch book description and genre from Google Books API.
 * Called once when a book is added — not on every search or page load.
 */
export const fetchBookMetadata = async (title, author) => {
    try {
        const apiKey = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY
        if (!apiKey) {
            console.warn('[Metadata] No Google Books API key configured')
            return { description: '', genre: '' }
        }

        const q = `intitle:${title}${author ? `+inauthor:${author}` : ''}`
        const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=1&key=${apiKey}`
        console.log('[Metadata] Fetching from Google Books:', url)

        const response = await fetch(url)
        if (!response.ok) {
            console.warn('[Metadata] Google Books returned', response.status)
            return { description: '', genre: '' }
        }

        const data = await response.json()
        if (!data.items || data.items.length === 0) {
            console.log('[Metadata] No results from Google Books')
            return { description: '', genre: '' }
        }

        const info = data.items[0].volumeInfo
        const description = info.description
            ? info.description.substring(0, 500)
            : ''
        const genre = info.categories?.[0] || ''

        console.log('[Metadata] ✅ description:', description.substring(0, 80) + '...')
        console.log('[Metadata] ✅ genre:', genre)

        return { description, genre }
    } catch (error) {
        console.error('[Metadata] Error fetching from Google Books:', error)
        return { description: '', genre: '' }
    }
}

/**
 * Sort ISBNs to prefer 13-digit ISBNs starting with 978 (US/common editions),
 * then other 13-digit ISBNs, then 10-digit ISBNs.
 */
const prioritizeIsbns = (isbns) => {
    if (!isbns || isbns.length === 0) return []

    const isbn13_978 = []
    const isbn13_other = []
    const isbn10 = []
    const rest = []

    for (const isbn of isbns) {
        const clean = isbn.replace(/[-\s]/g, '')
        if (clean.length === 13 && clean.startsWith('978')) {
            isbn13_978.push(clean)
        } else if (clean.length === 13) {
            isbn13_other.push(clean)
        } else if (clean.length === 10) {
            isbn10.push(clean)
        } else {
            rest.push(clean)
        }
    }

    return [...isbn13_978, ...isbn13_other, ...isbn10, ...rest]
}

/**
 * Search Open Library for ISBNs of a book by title + author.
 * Returns a prioritized array of ISBNs to try.
 */
const lookupIsbns = async (title, author) => {
    try {
        const params = new URLSearchParams({
            title,
            author: author || '',
            limit: '1',
            fields: 'isbn',
        })
        const url = `https://openlibrary.org/search.json?${params}`
        console.log('[Cover] ISBN lookup URL:', url)

        const response = await fetch(url)
        if (!response.ok) return []

        const data = await response.json()
        const rawIsbns = data.docs?.[0]?.isbn || []
        console.log(`[Cover] Found ${rawIsbns.length} ISBNs, prioritizing...`)

        const prioritized = prioritizeIsbns(rawIsbns)
        console.log('[Cover] Top ISBNs to try:', prioritized.slice(0, 5).join(', '))
        return prioritized
    } catch (error) {
        console.error('[Cover] ISBN lookup failed:', error)
        return []
    }
}

/**
 * Try multiple ISBNs until we find one with a valid cover image.
 * Checks up to maxAttempts ISBNs to avoid slow lookups.
 */
const findCoverFromIsbns = async (isbns, maxAttempts = 5) => {
    const toTry = isbns.slice(0, maxAttempts)

    for (const isbn of toTry) {
        const coverUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`
        console.log(`[Cover] Trying ISBN ${isbn} → ${coverUrl}`)

        const isValid = await verifyImageExists(coverUrl)
        if (isValid) {
            return coverUrl
        }
    }

    return null
}

/**
 * Verify an image URL actually has a real image (not Open Library's 1x1 blank gif).
 * Returns true if the image loads and is larger than 1x1.
 */
const verifyImageExists = (url) => {
    return new Promise((resolve) => {
        const img = new Image()
        img.onload = () => {
            const isValid = img.width > 1 && img.height > 1
            console.log(`[Cover] Image check: ${url} → ${img.width}x${img.height} → ${isValid ? '✅ valid' : '❌ blank gif'}`)
            resolve(isValid)
        }
        img.onerror = () => {
            console.log(`[Cover] Image check: ${url} → ❌ failed to load`)
            resolve(false)
        }
        img.src = url
    })
}

/**
 * Fetch a book cover using Open Library only.
 *
 * Flow:
 * 1. If we have an ISBN from search → try it first
 * 2. Look up all ISBNs from Open Library by title + author
 * 3. Prioritize ISBN-13s starting with 978
 * 4. Try each ISBN's cover image until one is valid (width > 1)
 * 5. Return the first valid cover URL, or null for placeholder
 *
 * @param {Object} opts
 * @param {string|null} opts.isbn  - ISBN if already known
 * @param {string} opts.title     - Book title
 * @param {string} opts.author    - Book author
 * @returns {Promise<string|null>} Cover URL or null
 */
export const fetchBookCover = async ({ isbn, title, author }) => {
    console.log('[Cover] === Starting cover fetch ===')
    console.log('[Cover] Title:', title, '| Author:', author, '| ISBN:', isbn)

    // Step 1: If we have an ISBN already, try it first
    if (isbn) {
        const coverUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`
        console.log(`[Cover] Trying provided ISBN ${isbn}...`)
        const isValid = await verifyImageExists(coverUrl)
        if (isValid) {
            console.log('[Cover] ✅ Provided ISBN has a valid cover!')
            return coverUrl
        }
        console.log('[Cover] Provided ISBN had no valid cover, searching for alternatives...')
    }

    // Step 2: Look up all ISBNs and try them
    const isbns = await lookupIsbns(title, author)
    if (isbns.length === 0) {
        console.log('[Cover] ❌ No ISBNs found — using placeholder')
        return null
    }

    // Step 3: Try ISBNs until we find one with a real cover
    const coverUrl = await findCoverFromIsbns(isbns)

    if (coverUrl) {
        console.log('[Cover] ✅ Found valid cover!')
        return coverUrl
    }

    console.log('[Cover] ❌ None of the ISBNs had a valid cover — using placeholder')
    return null
}

/**
 * Fetch a cover and save it to Supabase for a book.
 * Call this after inserting/updating a book.
 */
export const fetchAndSaveCover = async (bookId, { isbn, title, author }) => {
    console.log('[Cover Save] bookId received:', bookId)

    if (!bookId) {
        console.error('[Cover Save] ❌ bookId is undefined! Cannot save cover.')
        return null
    }

    const coverUrl = await fetchBookCover({ isbn, title, author })

    if (!coverUrl) {
        console.log('[Cover Save] No cover URL to save — skipping update')
        return null
    }

    console.log('[Cover Save] Saving cover URL to Supabase...')
    console.log('[Cover Save] Book ID:', bookId)
    console.log('[Cover Save] Cover URL:', coverUrl)

    const { data, error } = await supabase
        .from('books')
        .update({ cover_image_url: coverUrl })
        .eq('id', bookId)
        .select()

    if (error) {
        console.error('[Cover Save] ❌ Supabase update FAILED:', error.message)
        console.error('[Cover Save] Full error:', JSON.stringify(error, null, 2))
    } else if (!data || data.length === 0) {
        console.warn('[Cover Save] ⚠️ Update returned no rows — RLS policy may be blocking the update')
        console.warn('[Cover Save] Check that the books table allows authenticated users to update')
    } else {
        console.log('[Cover Save] ✅ Successfully saved! Updated row:', JSON.stringify(data[0], null, 2))
    }

    return coverUrl
}
