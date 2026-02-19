# Product Requirements Document: Book Club App

## 1. Overview

### 1.1 Product Name
Book Club App

### 1.2 Purpose
A web application to help a small book club (5-10 members) manage their reading selections, track past books, rate their experiences, and plan future reads.

### 1.3 Target Users
- 5-10 members of a single book club
- Users need basic web/mobile literacy
- Members want a centralized place to track and discuss book selections

---

## 2. Goals & Objectives

### 2.1 Primary Goals
- Provide a single source of truth for current, past, and future book selections
- Enable member engagement through ratings and reviews
- Simplify book club organization and planning

### 2.2 Success Metrics
- All book club members successfully create accounts and log in
- Members actively rate completed books (target: 80%+ participation)
- Future book shelf is populated with member suggestions

---

## 3. User Stories

### 3.1 Authentication & Access
- As a book club member, I want to create an account so I can access the app
- As a member, I want to log in securely using either Google Auth or email and password so I have flexible sign-in options
- As a member, I want to set a display name so other members know who I am
- As a member, I want to log out when I'm done using the app

### 3.2 Current Book
- As a member, I want to see what book we're currently reading
- As a member, I want to see details about the current book (title, author, cover, book club date)

### 3.3 Past Books
- As a member, I want to browse all books we've read in the past
- As a member, I want to see when we read each book
- As a member, I want to see the average rating for each past book

### 3.4 Ratings
- As a member, I want to rate books we've completed (1-5 stars or similar scale)
- As a member, I want to see the average rating across all members
- As a member, I want to see individual member ratings for transparency

### 3.5 Future Books
- As a member, I want to suggest books for future reading
- As a member, I want to see what books are on the future reading list
- As a member, I want to see who suggested each book

---

## 4. Functional Requirements

### 4.1 User Authentication
**Priority: High**

#### 4.1.1 Registration
- Users can create an account with:
  - Email address
  - Password (minimum 8 characters)
  - Display name
- Alternatively, users can sign up with Google (OAuth 2.0)
  - Display name auto-populated from Google account
- System validates email format
- System ensures unique email addresses
- Maximum of 10 total user accounts

#### 4.1.2 Login
- Users can log in with:
  - Email and password
  - Google Auth (OAuth 2.0) via "Sign in with Google" button
- System maintains login session
- Invalid credentials show clear error message

#### 4.1.3 Logout
- Users can log out from any page
- System clears session on logout

### 4.2 Current Book Display
**Priority: High**

#### 4.2.1 Book Information
- Display on home/dashboard page:
  - Book title
  - Author name
  - Cover image (if available)
  - Book club meeting date
  - Optional: description/synopsis

#### 4.2.2 Administration
- One user (admin) can update the current book
- Current book moves to "Past Books" when a new current book is set

### 4.3 Past Books
**Priority: High**

#### 4.3.1 Book List
- Display all previously read books in reverse chronological order
- Show for each book:
  - Book title
  - Author
  - Cover image (thumbnail)
  - Date read (month/year or completion date)
  - Average rating (aggregated from all member ratings)
  - Number of ratings

#### 4.3.2 Book Details
- Users can click on a past book to see:
  - Full book information
  - All member ratings
  - Optional: member comments/reviews

### 4.4 Rating System
**Priority: High**

#### 4.4.1 Rating Input
- Members can rate past books on a 5-star scale
- One rating per member per book
- Members can update their rating at any time
- Members cannot rate books until they're moved to "Past Books"

#### 4.4.2 Rating Display
- Show average rating (e.g., 4.2/5 stars)
- Show visual representation (star icons)
- Display number of members who have rated
- Show individual member ratings with names

### 4.5 Future Book Shelf
**Priority: Medium**

#### 4.5.1 Adding Books
- Any member can add a book to the future shelf
- Required information:
  - Book title
  - Author name
- Optional information:
  - Cover image URL
  - Suggested by (auto-filled with logged-in user)
  - Why they're suggesting it (brief note)

#### 4.5.2 Future Book List
- Display all suggested future books
- Show for each:
  - Book title and author
  - Who suggested it
  - Date added
  - Optional: suggestion reason

#### 4.5.3 Managing Future Books
- Admin can remove books from future shelf
- Admin can move a book from future shelf to current book

---

## 5. Non-Functional Requirements

### 5.1 Performance
- Pages should load within 2 seconds on standard internet connection
- Support 10 concurrent users without degradation

### 5.2 Security
- Passwords managed securely by Supabase Auth (bcrypt under the hood)
- Google OAuth handled by Supabase Auth
- Row Level Security (RLS) policies in Supabase to restrict data access by user role
- HTTPS enforced by default on Supabase and Vercel

### 5.3 Usability
- Mobile-responsive design (works on phones and tablets)
- Intuitive navigation requiring minimal instruction
- Clear visual hierarchy and readable fonts

### 5.4 Reliability
- 99% uptime (if hosted)
- Data backup system to prevent loss

---

## 6. Technical Considerations

### 6.1 Recommended Tech Stack
- **Frontend**: React with Vite
- **Backend**: Node.js with Express (or Supabase Edge Functions for serverless)
- **Database**: Supabase (PostgreSQL under the hood)
- **Authentication**: Supabase Auth (supports email/password + Google OAuth out of the box)
- **File Storage**: Supabase Storage (for any future image uploads)
- **Book Covers**: Google Books API (primary) + Open Library API (fallback)
- **Hosting**: Vercel (frontend) + Supabase (backend/database)

### 6.2 Why Supabase

Supabase replaces several tools with one platform, making it ideal for this app:

- **Auth built-in**: Email/password and Google OAuth work out of the box - no need for Passport.js or custom JWT handling
- **PostgreSQL database**: Fully managed, no setup required
- **Real-time**: Optional real-time updates (e.g. ratings update live for all members)
- **Free tier**: Generous free tier, more than enough for 5-10 users
- **Dashboard**: Easy-to-use web dashboard to manage data and users
- **Row Level Security (RLS)**: Built-in security rules to control who can read/write data
- **Supabase client SDK**: Simple JavaScript SDK that works directly in React, reducing the need for a custom Express backend

#### User
- id (primary key)
- email (unique)
- password_hash (nullable, for email/password accounts)
- google_id (nullable, for Google OAuth accounts)
- display_name
- is_admin (boolean)
- created_at

#### Book
- id (primary key)
- title
- author
- isbn (for Open Library fallback lookup)
- cover_image_url (saved from whichever API returned it)
- cover_source (google_books / open_library / placeholder)
- description
- status (current/past/future)
- meeting_date
- meeting_location
- date_completed
- suggested_by (user_id, foreign key)
- suggestion_note
- created_at

#### Rating
- id (primary key)
- user_id (foreign key)
- book_id (foreign key)
- rating (1-5)
- review_text (optional)
- created_at
- updated_at

---

## 6.3 Book Cover Image Strategy

Book covers are fetched automatically when a book is added or searched. The app uses a dual-API approach for maximum coverage at no cost.

#### Primary: Google Books API
- Triggered whenever a user searches for or adds a book
- Returns cover image URL, description, author, ISBN, and other metadata
- Requires a Google Books API key (obtained from Google Cloud Console)
- Used for: current book, past books, and optionally future shelf

#### Fallback: Open Library API (Internet Archive)
- Used automatically if Google Books returns no cover image
- No API key required — free and open
- Cover fetched via ISBN: `https://covers.openlibrary.org/b/isbn/{ISBN}-L.jpg`
- Used for: current book and past books

#### Fallback Placeholder
- If neither API returns a cover, display a clean styled placeholder with the book title and author initials

#### Cover Fetch Logic
```
1. User adds or searches a book
2. App queries Google Books API → saves cover URL if found
3. If no cover from Google Books → query Open Library by ISBN
4. If no cover from either → display placeholder
```

#### Cover Display Requirements
- **Current book**: Large cover image (prominent hero display)
- **Past books carousel**: Medium thumbnail
- **Past books grid (View All)**: Medium thumbnail
- **Future shelf**: Small thumbnail (optional, nice to have)
- **Book detail page**: Large cover image

---

## 7. User Interface Mockup Descriptions

### 7.1 Home/Dashboard
- Header with app name and logout button
- "Current Book" section (large, prominent)
- Quick links to Past Books and Future Shelf
- User greeting (e.g., "Welcome back, Sarah!")

### 7.2 Past Books Page
- Grid or list view of all past books
- Filter/sort options (by date, rating)
- Click on book to see details and ratings

### 7.3 Future Shelf Page
- List of suggested books
- "Add Book" button (opens form)
- Each entry shows suggester and date added

### 7.4 Book Details Page
- Full book information
- Rating interface (stars)
- All member ratings displayed
- Back button to previous page

---

## 8. MVP Scope (Phase 1)

### Must Have
- User authentication (register, login, logout) with email/password and Google OAuth
- Display current book with cover image (Google Books API + Open Library fallback)
- Display past books list with cover images
- Basic rating system (5-star)
- Add books to future shelf
- Admin ability to change current book

### Should Have
- Average rating calculation and display
- Mobile-responsive design
- Open Library fallback for missing covers
- Styled placeholder for books with no cover found
- Voting system for future books (members can upvote suggestions)
- Voting system for future books

### Could Have (Future Phases)
- Member comments/reviews (text)
- Discussion threads per book
- Meeting date scheduling
- Reading progress tracking

---

## 9. Timeline Estimate

### Phase 1 (MVP): 2-4 weeks
- Week 1: Authentication and database setup
- Week 2: Book display and management
- Week 3: Rating system
- Week 4: Testing and refinement

### Phase 2 (Enhancements): 1-2 weeks
- Polish UI/UX
- Add cover images
- Improve mobile experience

---

## 10. Open Questions & Decisions

1. **Admin Role**: Who will be the admin? Should there be multiple admins?
   > ✅ **Decided:** Single admin. Admin role set manually in the backend.

2. **Book Data**: Will you manually enter book information, or integrate with an API (Google Books, Open Library)?
   > ✅ **Decided:** Google Books API (primary) + Open Library (fallback). See Section 6.3.

3. **Hosting**: Where will the app be hosted? Self-hosted or cloud service?
   > ✅ **Decided:** Cloud hosting. Vercel for the frontend, Supabase for the backend/database.

4. **Discussions**: Do you want a discussion/comment feature for each book?
   > ✅ **Decided:** Not for MVP. May revisit in a future phase.

5. **Meeting Dates**: Should the app track when meetings are scheduled?
   > ✅ **Decided:** Yes. Both current and past books will have a meeting date set by the admin.

6. **Notifications**: Do members want email notifications for new books or ratings?
   > ✅ **Decided:** Not for MVP. May revisit in a future phase.

7. **Book Selection**: How do you decide which future book becomes the next current book? Vote? Admin decision?
   > ✅ **Decided:** Admin decision. Admin selects the next book from the future shelf.

---

## 11. Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Low user adoption | High | Keep interface simple and intuitive; provide onboarding |
| Data loss | High | Implement regular backups; use reliable hosting |
| Security breach | Medium | Use industry-standard authentication; hash passwords |
| Scope creep | Medium | Stick to MVP features first; plan future phases |
| Technical complexity | Medium | Choose simple, well-documented tech stack |

---

## 12. Success Criteria

The MVP will be considered successful if:
- All 5-10 members can create accounts and log in
- Current book is visible to all members
- At least 3 past books are displayed with ratings
- Members can successfully rate books
- At least 3 books are added to the future shelf
- App is accessible on both desktop and mobile devices

---

## Appendix: Future Feature Ideas

- Reading challenges or goals
- Book genre tagging and filtering
- Member reading statistics
- Integration with Goodreads
- Book recommendation engine
- Virtual meeting room integration
- Reading pace calculator
- Spoiler-free discussion sections
- Member profiles with reading preferences
- Export reading history