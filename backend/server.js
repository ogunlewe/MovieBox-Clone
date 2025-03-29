import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import torrentStream from "torrent-stream"; // ✅ FIXED: Import torrentStream
import { db, auth } from "./firebase.js";
import parseTorrent from "parse-torrent";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import moviesRoute from "./routes/movies.js";
import { scrapeMovies, scrapeMovieByTitle } from "./scrapers/mycimaScraper.js";
import rangeParser from "range-parser";
import pump from "pump";
import NodeCache from "node-cache"; // Add this new code after yourusing imports

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: "http://localhost:5173" }));
// app.use(express.json());

app.use(express.urlencoded({ extended: true })); // Add this to parse URL-encoded bodies
app.use(express.json()); // Ensure JSON body parsing

const streamCache = new NodeCache({
  // Add this before your routes
  stdTTL: 3600, // Cache for 1 hour
  checkperiod: 600, // Check for expired entries every 10 minutes
});

// Add this function to manage stream buffers
function createStreamBuffer(file, start, end) {
  const BUFFER_SIZE = 1024 * 1024; // 1MB buffer size
  const bufferKey = `${file.name}-${start}-${end}`;

  if (streamCache.has(bufferKey)) {
    return streamCache.get(bufferKey);
  }

  const buffer = Buffer.alloc(BUFFER_SIZE);
  streamCache.set(bufferKey, buffer);
  return buffer;
}

// ✅ Token verification middleware
const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).send("Unauthorized");

  try {
    const decodedToken = await auth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error("Token verification failed:", error);
    res.status(401).send("Invalid token");
  }
};

// ✅ Root route
app.get("/", (req, res) => {
  res.send("MovieBox Backend is running!");
});

// ✅ Fetch all movies from Firestore (or scrape if empty)
app.get("/movies", async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  try {
    const moviesCollection = collection(db, "movies");
    const snapshot = await getDocs(moviesCollection);
    let movies = [];

    if (snapshot.empty) {
      console.warn("No movies found in the database. Scraping movies...");
      movies = await scrapeMovies();

      // Save scraped movies to database
      for (const movie of movies) {
        try {
          const movieDoc = doc(
            moviesCollection,
            `${movie.title}-${movie.year || "unknown"}`
          );
          await setDoc(movieDoc, movie, { merge: true });
        } catch (error) {
          console.error(`Failed to save movie: ${movie.title}`, error);
        }
      }
    } else {
      movies = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    }

    // Pagination logic
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedMovies = movies.slice(startIndex, endIndex);

    res.json({
      movies: paginatedMovies,
      pagination: {
        total: movies.length,
        currentPage: parseInt(page),
        totalPages: Math.ceil(movies.length / parseInt(limit)),
        hasMore: endIndex < movies.length,
      },
    });
  } catch (error) {
    console.error("Error fetching movies:", error);
    res.status(500).json({
      movies: [],
      pagination: {
        total: 0,
        currentPage: 1,
        totalPages: 0,
        hasMore: false,
      },
    });
  }
});

// Move and update the search endpoint (place this BEFORE /movies/:id)
app.get("/movies/search", async (req, res) => {
  const { title, page = 1, limit = 20 } = req.query;
  if (!title) {
    return res.status(400).json({ error: "Title query parameter is required" });
  }

  try {
    console.log(`Searching for movie: "${title}"`);
    const moviesCollection = collection(db, "movies");

    // Search in database first
    const snapshot = await getDocs(moviesCollection);
    let matchingMovies = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((movie) =>
        movie.title.toLowerCase().includes(title.toLowerCase())
      );

    // If not found in database, try scraping
    if (matchingMovies.length === 0) {
      console.log(`Scraping for movie: "${title}"`);
      const scrapedMovies = await scrapeMovieByTitle(title);

      if (scrapedMovies && scrapedMovies.length > 0) {
        // Save scraped movies to database
        for (const movie of scrapedMovies) {
          try {
            const movieDoc = doc(
              moviesCollection,
              `${movie.title}-${movie.year || "unknown"}`
            );
            await setDoc(movieDoc, movie, { merge: true });
          } catch (error) {
            console.error(`Failed to save movie: ${movie.title}`, error);
          }
        }
        matchingMovies = scrapedMovies;
      }
    }

    // Pagination logic
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedMovies = matchingMovies.slice(startIndex, endIndex);

    return res.json({
      movies: paginatedMovies,
      pagination: {
        total: matchingMovies.length,
        currentPage: parseInt(page),
        totalPages: Math.ceil(matchingMovies.length / parseInt(limit)),
        hasMore: endIndex < matchingMovies.length,
      },
    });
  } catch (error) {
    console.error("Error searching for movie:", error);
    res.status(500).json({
      movies: [],
      pagination: {
        total: 0,
        currentPage: 1,
        totalPages: 0,
        hasMore: false,
      },
    });
  }
});

// ✅ Fetch a single movie by ID
app.get("/movies/:id", async (req, res) => {
  try {
    const movieDoc = doc(db, "movies", req.params.id);
    const docSnap = await getDoc(movieDoc);
    if (!docSnap.exists()) return res.status(404).send("Movie not found");
    res.json({ id: docSnap.id, ...docSnap.data() });
  } catch (error) {
    console.error("Error fetching movie:", error);
    res.status(500).send("Error fetching movie details");
  }
});

// ✅ Add a new movie (requires authentication)
app.post("/movies", verifyToken, async (req, res) => {
  try {
    const movie = req.body;
    const movieDoc = doc(collection(db, "movies"));
    await setDoc(movieDoc, movie);
    res.status(201).send({ id: movieDoc.id });
  } catch (error) {
    console.error("Error adding movie:", error);
    res.status(500).send("Error adding movie");
  }
});

// ✅ Update a movie
app.put("/movies/:id", verifyToken, async (req, res) => {
  try {
    const movieDoc = doc(db, "movies", req.params.id);
    await updateDoc(movieDoc, req.body);
    res.send("Movie updated successfully");
  } catch (error) {
    console.error("Error updating movie:", error);
    res.status(500).send("Error updating movie");
  }
});

// ✅ Delete a movie
app.delete("/movies/:id", verifyToken, async (req, res) => {
  try {
    const movieDoc = doc(db, "movies", req.params.id);
    await deleteDoc(movieDoc);
    res.send("Movie deleted successfully");
  } catch (error) {
    console.error("Error deleting movie:", error);
    res.status(500).send("Error deleting movie");
  }
});

// ✅ Scrape and return movies
app.get("/api/movies", async (req, res) => {
  try {
    const movies = await scrapeMovies();
    res.json(movies);
  } catch (error) {
    console.error("Error fetching movies:", error);
    res.status(500).json({ error: "Failed to fetch movies" });
  }
});

// ✅ Stream movies using magnet link
app.get("/stream", async (req, res) => {
  try {
    const magnetLink = decodeURIComponent(req.query.magnet);
    if (!magnetLink) {
      return res.status(400).json({ error: "Magnet link is required" });
    }

    const engine = torrentStream(magnetLink, {
      connections: 50,
      path: "./temp",
      buffer: true,
      sequential: true,
    });

    engine.on("ready", () => {
      const file = engine.files.find(
        (f) =>
          f.name.endsWith(".mp4") ||
          f.name.endsWith(".mkv") ||
          f.name.endsWith(".avi")
      );

      if (!file) {
        engine.destroy();
        return res.status(404).json({ error: "No video file found" });
      }

      const range = req.headers.range;
      const fileSize = file.length;

      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunkSize = end - start + 1;

        const stream = file.createReadStream({ start, end });

        res.writeHead(206, {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunkSize,
          "Content-Type": "video/mp4",
        });

        stream.pipe(res);
      } else {
        res.writeHead(200, {
          "Content-Length": fileSize,
          "Content-Type": "video/mp4",
        });

        const stream = file.createReadStream();
        stream.pipe(res);
      }
    });

    engine.on("error", (err) => {
      console.error("Torrent error:", err);
      res.status(500).end();
    });

    res.on("close", () => {
      engine.destroy();
    });
  } catch (error) {
    console.error("Stream error:", error);
    res.status(500).end();
  }
});
// Add this new endpoint after the stream endpoint
app.get("/download", async (req, res) => {
  try {
    const magnetLink = decodeURIComponent(req.query.magnet);

    if (!magnetLink) {
      return res.status(400).json({ error: "Magnet link is required" });
    }

    console.log("Processing download for:", magnetLink);

    let parsedTorrent;
    try {
      parsedTorrent = parseTorrent(magnetLink);
    } catch (parseError) {
      console.error("Failed to parse torrent:", parseError);
      return res.status(400).json({ error: "Invalid magnet link format" });
    }

    // Replace the existing engine configuration with this optimized version
    const engine = torrentStream(magnetLink, {
      connections: 100, // Balanced number of connections
      maxConns: 200, // Maximum connections per torrent
      uploadRateLimit: 100000, // 100KB/s upload limit
      downloadRateLimit: 0, // No download limit
      tmp: "./temp", // Temporary folder
      path: "./temp", // Download path
      verify: false, // Skip verification for faster initial streaming
      dht: true, // Enable DHT (Distributed Hash Table)
      tracker: true, // Enable trackers
      trackers: [
        // More reliable trackers
        "udp://tracker.opentrackr.org:1337/announce",
        "udp://9.rarbg.com:2810/announce",
        "udp://tracker.openbittorrent.com:6969/announce",
        "udp://tracker.internetwarriors.net:1337/announce",
        "udp://tracker.leechers-paradise.org:6969/announce",
        "http://tracker.openbittorrent.com:80/announce",
        "udp://exodus.desync.com:6969/announce",
      ],
      webSeeds: true, // Enable web seeds
      strategy: "sequential", // Sequential download strategy for streaming
    });

    engine.on("ready", () => {
      const file = engine.files.reduce((a, b) => (a.length > b.length ? a : b));

      if (!file) {
        engine.destroy();
        return res.status(404).json({ error: "No downloadable file found" });
      }

      const fileSize = file.length;
      res.setHeader("Content-Length", fileSize);
      res.setHeader("Content-Type", "video/mp4");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${file.name}"`
      );

      const stream = file.createReadStream();
      stream.pipe(res);

      // Monitor download progress
      let downloaded = 0;
      stream.on("data", (chunk) => {
        downloaded += chunk.length;
        const progress = (downloaded / fileSize) * 100;
        console.log(`Download progress: ${Math.round(progress)}%`);
      });

      stream.on("error", (err) => {
        console.error("Download stream error:", err);
        engine.destroy();
      });

      stream.on("end", () => {
        console.log("Download completed");
        engine.destroy();
      });
    });

    engine.on("error", (err) => {
      console.error("Torrent engine error:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Download error" });
      }
      engine.destroy();
    });

    res.on("close", () => {
      engine.destroy();
      console.log("Download connection closed");
    });
  } catch (error) {
    console.error("Download setup error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to setup download" });
    }
  }
});

app.use("/api", moviesRoute);

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
