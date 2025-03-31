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

const allowedOrigins = [process.env.CORS_ORIGIN, "http://localhost:5173"];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

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
  try {
    const moviesCollection = collection(db, "movies");
    const snapshot = await getDocs(moviesCollection);

    if (snapshot.empty) {
      console.warn("No movies found in the database. Scraping movies...");
      const scrapedMovies = await scrapeMovies();

      for (let movie of scrapedMovies) {
        try {
          const movieDoc = doc(moviesCollection, movie.title);
          await setDoc(movieDoc, movie, { merge: true });
        } catch (error) {
          console.error(`Failed to save movie: ${movie.title}`, error);
        }
      }
      return res.json(scrapedMovies);
    }

    const movies = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json(movies);
  } catch (error) {
    console.error("Error fetching movies:", error);
    res.status(500).json({ error: "Error fetching movies" });
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

// ✅ Search movies by title
app.get("/movies/search", async (req, res) => {
  const { title } = req.query;
  if (!title)
    return res.status(400).json({ error: "Title query parameter is required" });

  try {
    console.log(`Searching for movie: "${title}"`);
    const moviesCollection = collection(db, "movies");

    const snapshot = await getDocs(moviesCollection);
    const movies = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((movie) =>
        movie.title.toLowerCase().includes(title.toLowerCase())
      );

    if (movies.length > 0) return res.json(movies);

    console.warn(`Movie "${title}" not found in the database. Scraping...`);
    const scrapedMovies = await scrapeMovieByTitle(title);

    if (scrapedMovies.length > 0) return res.json(scrapedMovies);

    res
      .status(404)
      .json({ error: `Movie "${title}" not found after scraping ` });
  } catch (error) {
    console.error("Error searching for movie:", error);
    res.status(500).json({ error: "Error searching for movie" });
  }
});

// ✅ Stream movies using magnet link
app.get("/stream", async (req, res) => {
  try {
    const magnetLink = decodeURIComponent(req.query.magnet);

    if (!magnetLink) {
      return res.status(400).json({ error: "Magnet link is required" });
    }

    console.log("Processing magnet link:", magnetLink);

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
        return res.status(404).json({ error: "No playable file found" });
      }

      const range = req.headers.range;
      const fileSize = file.length;

      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

        if (start >= fileSize) {
          res.status(416).send("Requested range not satisfiable");
          return;
        }

        const chunksize = end - start + 1;
        const stream = file.createReadStream({ start, end });

        const head = {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunksize,
          "Content-Type": "video/mp4",
        };

        res.writeHead(206, head);
        stream.pipe(res);

        stream.on("error", (streamError) => {
          console.error("Stream error:", streamError);
          engine.destroy();
        });
      } else {
        const head = {
          "Content-Length": fileSize,
          "Content-Type": "video/mp4",
        };
        res.writeHead(200, head);
        const stream = file.createReadStream();
        stream.pipe(res);
      }
    });

    engine.on("error", (err) => {
      console.error("Torrent engine error:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Streaming error" });
      }
      engine.destroy();
    });

    res.on("close", () => {
      engine.destroy();
      console.log("Stream closed, cleaning up");
    });
  } catch (error) {
    console.error("Stream setup error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to setup stream" });
    }
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
