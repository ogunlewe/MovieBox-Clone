import { db } from "../firebase.js";
import puppeteer from "puppeteer";
import { doc, setDoc, collection } from "firebase/firestore";

const BASE_URL = "https://yts.mx";
const MAX_PAGES = 2; // Change this if you want more pages



/**
 * Scrape movies from the browse pages (general scraping).
 */
const scrapeMovies = async () => {
  try {
    const browser = await puppeteer.launch({
      headless: "false", // Change to false to see the browser
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-blink-features=AutomationControlled",
      ],
    });
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    );
    await page.setViewport({ width: 1280, height: 800 });

    let allMovies = [];
    // Use the browse-movies URL with pagination.
    for (let i = 1; i <= MAX_PAGES; i++) {
      console.log(`Scraping Page ${i}...`);
      await page.goto(`${BASE_URL}/browse-movies?page=${i}`, {
        waitUntil: "domcontentloaded",
      });
      await new Promise((resolve) => setTimeout(resolve, 2000));
 // Wait 2 seconds for page content to fully load

      await page
        .waitForSelector(".browse-movie-wrap", { timeout: 5000 })
        .catch(() => console.warn("⚠️ Movie not found on page " + i));

      // Extract movie details.
      const movies = await page.evaluate(() => {
        const baseURL = window.location.origin;
        const results = [];
        document.querySelectorAll(".browse-movie-wrap").forEach((movieBox) => {
          const title =
            movieBox.querySelector(".browse-movie-title")?.textContent.trim() ||
            "Unknown Title";
          const image = movieBox.querySelector("img")?.src || "No Image";
          const link = new URL(
            movieBox.querySelector("a")?.href || "#",
            baseURL
          ).href;
          results.push({ title, image, link });
        });
        return results;
      });
      allMovies.push(...movies);
    }
    console.log(`Total Movies Found: ${allMovies.length}`);

    // Visit each movie's page to fetch torrent & magnet links.
    for (let movie of allMovies) {
      console.log(`Fetching torrent link for: ${movie.title}`);
      try {
        await page.goto(movie.link, { waitUntil: "domcontentloaded" });
        const torrentLink = await page.evaluate(() => {
          return (
            document.querySelector('a[href*="/torrent/download/"]')?.href ||
            null
          );
        });
        if (torrentLink) {
          movie.torrent = torrentLink;
          const hash = torrentLink.split("/").pop();
          movie.magnet = `magnet:?xt=urn:btih:${hash}`;
        } else {
          movie.torrent = null;
          movie.magnet = null;
        }
        // Save movie to Firestore.
        console.log(`Saving to Firestore: ${movie.title}`);
        const movieRef = doc(collection(db, "movies"), movie.title);
        await setDoc(movieRef, movie, { merge: true });
      } catch (error) {
        console.error(`Failed to get torrent for: ${movie.title}`, error);
      }
    }
    await browser.close();
    return allMovies;
  } catch (error) {
    console.error("Error scraping movies:", error);
    return [];
  }
};

/**
 * Scrape movies by title using YTS's search URL structure and return an array of similar movies.
 * URL format: https://yts.mx/browse-movies/<title>/all/all/0/latest/0/all
 */
const scrapeMovieByTitle = async (title) => {
  let browser;
  try {
    console.log(`🔍 Searching for: "${title}"`);

    // Update browser launch configuration
    const browser = await puppeteer.launch({
      headless: false, // Change to false if you want to see the browser
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--disable-gpu",
      ],
    });

    const page = await browser.newPage();

    // Configure page settings
    await page.setDefaultNavigationTimeout(30000);
    await page.setRequestInterception(true);

    
    page.on("request", (req) => {
      if (["image", "stylesheet", "font"].includes(req.resourceType())) {
        req.abort();
      } else {
        req.continue();
      }
    });

    const searchUrl = `${BASE_URL}/browse-movies/${encodeURIComponent(
      title
    )}/all/all/0/latest/0/all`;
    console.log(`🔍 Searching at: ${searchUrl}`);
    await page.goto(searchUrl, { timeout: 60000, waitUntil: "networkidle2" });
    await new Promise((resolve) => setTimeout(resolve, 2000));
 

    // First get all movie basic info
    const movies = await page.evaluate(() => {
      return [...document.querySelectorAll(".browse-movie-wrap")].map(
        (movieBox) => ({
          title:
            movieBox.querySelector(".browse-movie-title")?.textContent.trim() ||
            "Unknown",
          image: movieBox.querySelector("img")?.src || "",
          link: movieBox.querySelector("a")?.href || "",
          type: "movie",
        })
      );
    });

    console.log(`📽️ Found ${movies.length} movies, fetching torrents...`);

    // Fetching torrent links for each movie with retry logic
    const moviesWithTorrents = [];
    for (const movie of movies) {
      let retries = 3;
      let success = false;

      while (retries > 0 && !success) {
        try {
          console.log(`🔍 Fetching torrent for: ${movie.title}`);
          await page.goto(movie.link, {
            waitUntil: "networkidle0",
            timeout: 20000,
          });

          // Wait specifically for torrent link or its container
          await page.waitForSelector('a[href*="/torrent/download/"]', {
            timeout: 10000,
          });

          const torrentData = await page.evaluate(() => {
            const torrentLink = document.querySelector(
              'a[href*="/torrent/download/"]'
            )?.href;
            if (!torrentLink) return null;

            const hash = torrentLink.split("/").pop();
            return { torrentLink, hash };
          });

          if (torrentData) {
            movie.torrent = torrentData.torrentLink;
            movie.magnet = `magnet:?xt=urn:btih:${torrentData.hash}`;
            success = true;

            // Save to database
            await setDoc(doc(collection(db, "movies"), movie.title), movie, {
              merge: true,
            });
            console.log(
              `✅ Success: ${movie.title} - Torrent and magnet links saved`
            );

            moviesWithTorrents.push(movie);
          } else {
            throw new Error("Torrent link not found");
          }
        } catch (error) {
          retries--;
          if (retries > 0) {
            console.log(`⚠️ Retry ${3 - retries}/3 for: ${movie.title}`);
            await new Promise((r) => setTimeout(r, 2000));
          } else {
            console.error(
              `❌ Failed to get torrent for: ${movie.title}`,
              error.message
            );
          }
        }
      }
    }

    console.log(
      `✅ Successfully processed ${moviesWithTorrents.length}/${movies.length} movies`
    );
    return moviesWithTorrents;
  } catch (error) {
    console.error(`❌ Error scraping "${title}":`, error);
    return [];
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};



export { scrapeMovies, scrapeMovieByTitle };
