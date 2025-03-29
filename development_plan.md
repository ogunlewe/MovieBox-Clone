# MovieBox Clone Web App Development Plan

## Overview

**Project Name:** MovieBox Clone  
**Description:** A Progressive Web App (PWA) that aggregates movie links from external sources, displays them in a user-friendly interface, and allows users to download MP4 movies directly to their devices for offline viewing.  
**Goal:** Provide a legally compliant aggregator that does not host movies but enables users to download them through the app.  
**Key Feature:** Direct MP4 downloads using the File System Access API, with a progress bar and storage space detection.

---

## Tech Stack

### Frontend

- **React**: For building UI components, SEO if needed.
- **CSS3**: For UI styling (Tailwind CSS).
- **PWA Technologies**:
  - Service Workers: For offline capabilities.
  - Web App Manifest: For installability.

### Backend

- **Node.js**: Runtime environment.
- **Express**: API server.
- **Scraping Libraries**:
  - Puppeteer or Cheerio: For scraping movie pages.
- **Database**:
  - Firebase: To store movie metadata (titles, images, links, etc.).
  we can also use cloudinary to store the images and provide the link

### Other APIs / Features
### Authentication
- **Firebase Authentication**: For user authentication and authorization.
- **Firebase Firestore**: For storing user data and managing user profiles.


- **File System Access API**: For saving MP4 files directly to the user's device.
- **Storage API**: For estimating available storage before downloads.
- **Fetch API**: For downloading movie files and tracking progress.
- **Cloudinary**: For storing images and providing links.

---

## Project Architecture & File Structure

### Suggested Structure

```
moviebox-clone/
├── backend/
│   ├── server.js          // Express server entry point
│   ├── routes/
│   │   └── movies.js      // API routes for movie data
│   ├── models/
│   │   └── Movie.js       //firebase schema for storing movie data
│   ├── scrapers/
│   │   └── fzmoviesScraper.js // scraper script
│   └── utils/
│       └── storage.js     // Utility for checking storage size, etc.
├── frontend/
│   ├── public/            // Static files (manifest.json, icons)
│   ├── src/
│   │   ├── components/
│   │   │   ├── MovieList.js      // Lists movies
│   │   │   ├── MovieCard.js      // Single movie UI component
│   │   │   ├── DownloadButton.js // Download button with progress bar
│   │   │   └── ProgressBar.js    // Progress bar UI
│   │   ├── pages/
│   │   │   ├── index.js          // Home page (lists movies)
│   │   │   └── movie/[id].js     // Movie detail page
│   │   ├── serviceWorker.js      // Service worker for PWA
│   │   └── App.js                // Main App component
│   └── package.json
└── development_plan.md           // This development plan
```

---

## Core Features & Functionality

### 1. Movie Scraping & Metadata Storage

- **Objective:** Scrape movie metadata (title, image, streaming link, download link) from external sources.
- **Key Functions:**
  - `scrapeMovies()`: Fetch and parse HTML from target sites ((https://mycima.tube)) using Cheerio/Puppeteer.
  - Store each movie as a document in MongoDB with fields: `title`, `link`, `downloadLink`, `image`, `source`, `dateAdded`.

  ### This is where we will scrape data from 
  https://mycima.tube

### 2. API Endpoints

- **GET /movies:** Return a list of movies (metadata) stored in the database.
- **POST /scrape:** (Optional) Trigger a manual scrape/update.
- **GET /movie/:id:** Return details for a specific movie (for the detail page).

### 3. Frontend UI

- **Movie List Page:**
  - Displays a grid or list of movies with thumbnails, titles, and a “Download” button.
  - Includes search and filter options.
- **Movie Detail Page:**
  - Provides more details about the movie.
  - Shows download and/or streaming options.
- **Download Functionality:**
  - **Download Button Component:**
    - Checks if the app is installed as a PWA.
    - Alerts the user to install the app if not installed.
    - Calls the download function if installed.
  - **Progress Bar:**
    - Displays download progress in real time.
    - Updates based on fetched file chunks.

### 4. Download Handling Using File System Access API

- **Key Functions:**
  - `saveMovieFile(url, fileName, updateProgress)`:
    - Prompts the user to select a folder or uses a default storage location.
    - Streams the MP4 file using the Fetch API.
    - Writes file chunks to disk.
    - Updates the UI with download progress.
  - `checkStorageSize(requiredSize)`:
    - Uses the Storage API to estimate available storage.
    - Alerts the user if there isn’t enough space.

---

## PWA Setup for Offline Capabilities

### Manifest File (manifest.json)

Define icons, display properties, start URL, etc.

### Service Worker (serviceWorker.js)

- Cache static assets and API responses.
- Enable offline viewing of the app shell.

**Example Service Worker Code:**

```javascript
const CACHE_NAME = "moviebox-cache-v1";
const urlsToCache = [
  "/",
  "/index.html",
  // Add other essential URLs (JS, CSS, icons)
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
```

---

## Development Milestones & Timeline

### 1. Project Setup

- Set up repository and file structure.
- Configure backend (Express, MongoDB connection).
- Initialize frontend with React (or Next.js).

### 2. Movie Scraping & API Development

- Develop scraper(s) using Cheerio/Puppeteer.
- Build API endpoints for movies.
- Store sample movie data in MongoDB.

### 3. Frontend UI & Basic Integration

- Create movie listing and detail pages.
- Integrate API endpoints.
- Build basic download button (without progress bar).

### 4. Download Functionality & Progress Bar

- Implement `saveMovieFile` and `checkStorageSize`.
- Integrate progress bar UI.
- Test file downloads using the File System Access API.

### 5. PWA Implementation & Offline Support

- Add manifest and service worker.
- Test PWA installation and offline usage.

### 6. Testing, Debugging & Deployment

- Perform cross-browser testing (especially for File System Access API support).
- Deploy backend and frontend (e.g., Vercel for frontend, Render for backend).
- Monitor and adjust as needed.

---

## Additional Notes

### Legal Disclaimer

Include a disclaimer stating that the app does not host content and that all movies are linked from third-party sources.

### Error Handling & User Feedback

Ensure robust error handling in both the scraper and download functions.

### Security

Use proxies and rotate domains if scraping is detected. Follow security best practices for both frontend and backend.
