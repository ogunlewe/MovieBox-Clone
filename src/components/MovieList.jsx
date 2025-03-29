import React, { useEffect, useState, useCallback } from "react";
import DownloadButton from "./DownloadButton";
import VideoPlayer from "./VideoPlayer";
import SkeletonLoader from "./SkeletonLoader";

const MovieList = () => {
  const [movies, setMovies] = useState([]);
  const [showPlayer, setShowPlayer] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredMovies, setFilteredMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [isSearching, setIsSearching] = useState(false);

  const fetchMovies = async () => {
    try {
      setLoading(true);
      console.log("Fetching movies:", { page, limit: 20 });

      const response = await fetch(
        `http://localhost:5000/movies?page=${page}&limit=20`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Response data:", data);

      // Safely handle the response data
      if (data && Array.isArray(data.movies)) {
        if (page === 1) {
          setMovies(data.movies);
          setFilteredMovies(data.movies);
        } else {
          setMovies((prev) => [...prev, ...data.movies]);
          setFilteredMovies((prev) => [...prev, ...data.movies]);
        }

        // Safely access pagination data with defaults
        setHasMore(data.pagination?.hasMore ?? false);
        setTotalPages(data.pagination?.totalPages ?? 1);
      } else {
        // Handle invalid response format
        console.error("Invalid response format:", data);
        setMovies([]);
        setFilteredMovies([]);
        setHasMore(false);
        setTotalPages(1);
      }
    } catch (error) {
      console.error("Error fetching movies:", error);
      setMovies([]);
      setFilteredMovies([]);
      setHasMore(false);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  // Add debouncing for search
  const debounceSearch = useCallback(
    debounce((searchValue) => {
      if (searchValue) {
        setPage(1);
        handleSearch(searchValue);
      } else {
        setFilteredMovies(movies);
      }
    }, 1000),
    [movies]
  );

  // Debounce function
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Modify handleSearch to accept searchValue parameter
  const handleSearch = async (searchValue = searchTerm) => {
    if (!searchValue.trim()) {
      setPage(1);
      setFilteredMovies(movies);
      return;
    }

    try {
      setIsSearching(true);
      setLoading(true);
      console.log("Searching for:", searchValue);

      const response = await fetch(
        `http://localhost:5000/movies/search?title=${encodeURIComponent(
          searchValue
        )}&page=${page}&limit=20`
      );

      const data = await response.json();
      console.log("Search response:", data);

      if (response.status === 404) {
        setFilteredMovies([]);
        setHasMore(false);
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Always use the movies array from response
      if (page === 1) {
        setFilteredMovies(data.movies || []);
      } else {
        setFilteredMovies((prev) => [...prev, ...(data.movies || [])]);
      }

      setHasMore(data.pagination?.hasMore || false);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (error) {
      console.error("Error searching for movie:", error);
      setFilteredMovies([]);
      setHasMore(false);
    } finally {
      setLoading(false);
      setIsSearching(false);
    }
  };

  // Add event listener for Enter key
  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleStreamClick = (movie) => {
    setShowPlayer(movie);
  };

  // Update handleLoadMore
  const handleLoadMore = () => {
    if (!loading && hasMore) {
      setPage((prev) => prev + 1);
      if (searchTerm) {
        handleSearch();
      } else {
        fetchMovies();
      }
    }
  };

  // Update search input handling
  const handleSearchInputChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    debounceSearch(value);
  };

  // Remove the searchTerm dependency from this useEffect since we're using debouncing
  useEffect(() => {
    if (!searchTerm) {
      fetchMovies();
    }
  }, [page]); // Remove searchTerm dependency

  if (loading && page === 1) {
    return <SkeletonLoader />;
  }

  return (
    <div className="min-h-screen bg-[#0B0B0F] text-white">
      {/* Featured Section */}
      <div className="relative h-[60vh] mb-8">
        {filteredMovies[0] && (
          <>
            <div className="absolute inset-0">
              <img
                src={filteredMovies[0].image}
                alt={filteredMovies[0].title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0F] via-transparent to-[#0B0B0F]/60" />
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-8 z-10">
              <h1 className="text-4xl font-bold mb-4">
                {filteredMovies[0].title}
              </h1>
              <div className="flex gap-4">
                <button
                  onClick={() => handleStreamClick(filteredMovies[0])}
                  className="px-6 py-3 bg-[#f47521] hover:bg-[#ff8534] rounded-md transition-all duration-300"
                >
                  Stream Now
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Search Bar */}
      <div className="sticky top-0 z-50 backdrop-blur-xl bg-[#0B0B0F]/80 px-6 py-4 mb-8">
        <div className="max-w-2xl mx-auto">
          <div className="relative">
            <input
              type="text"
              placeholder="Search movies..."
              value={searchTerm}
              onChange={handleSearchInputChange} // Update this line
              onKeyPress={handleKeyPress}
              className="w-full bg-[#1A1A1F] text-white placeholder-gray-400 rounded-full py-3 px-6 pl-12 focus:outline-none focus:ring-2 focus:ring-[#f47521]/50 transition-all duration-300"
            />
            <button
              onClick={handleSearch}
              className="absolute right-2 top-2 bg-orange-600 text-white px-4 py-1 rounded-md hover:bg-gray-700 transition-colors"
            >
              Search
            </button>
            <svg
              className="absolute left-4 top-3.5 h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="px-6 mb-8 overflow-x-auto">
        <div className="flex gap-4 pb-2">
          {["All", "Action", "Drama", "Comedy", "Horror", "Sci-Fi"].map(
            (category) => (
              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-[#1A1A1F] text-white rounded-md hover:bg-[#f47521] transition-colors"
              >
                {category}
              </button>
            )
          )}
        </div>
      </div>

      {/* Movie Grid */}
      <div className="px-6">
        {filteredMovies.length > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredMovies.map((movie, index) => (
                <div
                  key={index}
                  className="group relative rounded-lg overflow-hidden animate-[fadeUp_0.3s_ease-out_forwards] opacity-0"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="aspect-[3/4] relative">
                    <img
                      src={movie.image}
                      alt={movie.title}
                      className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent opacity-0 group-hover:opacity-100 transition-all duration-300">
                      <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-6 group-hover:translate-y-0 transition-transform duration-300">
                        {movie.magnet && (
                          <button
                            onClick={() => handleStreamClick(movie)}
                            className="w-full bg-[#f47521] hover:bg-[#ff8534] text-white px-4 py-2 rounded-md transition-all duration-300"
                          >
                            Stream Now
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="p-2">
                    <h3 className="text-sm font-medium text-white/90 truncate">
                      {movie.title}
                    </h3>
                    {movie.year && (
                      <p className="text-xs text-[#f47521]">{movie.year}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Load More Button */}
            {hasMore && (
              <div className="flex justify-center mt-8 mb-8">
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="px-6 py-3 bg-[#f47521] hover:bg-[#ff8534] rounded-md transition-all duration-300 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Loading...</span>
                    </div>
                  ) : (
                    "Load More"
                  )}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="text-center">
              <p className="text-xl text-gray-400">No movies found</p>
            </div>
          </div>
        )}
      </div>

      {/* Video Player Modal */}
      
          
     
      {showPlayer && (
        <VideoPlayer
          magnetLink={showPlayer.magnet}
          onClose={() => setShowPlayer(false)}
        />
      )}

      
    
    </div>
  );
};

export default MovieList;
