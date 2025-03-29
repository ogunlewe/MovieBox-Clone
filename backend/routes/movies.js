import express from "express";
import { scrapeMovies, scrapeMovieByTitle } from "../scrapers/mycimaScraper.js";

const router = express.Router();

router.get("/movies", async (req, res) => {
  try {
    const movies = await scrapeMovies();
    res.json(movies);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch movies" });
  }
});

router.post("/scrape", async (req, res) => {
  try {
    const movies = await scrapeMovies();
    res.status(200).json({ message: "Scraping completed", movies });
  } catch (error) {
    console.error("Error during scraping:", error);
    res.status(500).json({ error: "Failed to scrape movies" });
  }
});

// Add the /movies/search route
router.get("/movies/search", async (req, res) => {
  const { title } = req.query;
  if (!title) {
    console.error("Missing title parameter in search request.");
    return res.status(400).json({ error: "Missing title parameter" });
  }

  try {
    console.log(`Received search request for movie: "${title}"`);
    const movie = await scrapeMovieByTitle(title);

    if (!movie || movie.length === 0) {
      console.warn(`Movie "${title}" not found.`);
      return res.status(404).json({ error: `Movie "${title}" not found.` });
    }

    console.log(`Movie "${title}" found or scraped successfully.`);
    res.json(movie);
  } catch (error) {
    console.error(`Error searching for movie "${title}":`, error);
    res.status(500).json({ error: "Error fetching movie" });
  }
});

export default router;
