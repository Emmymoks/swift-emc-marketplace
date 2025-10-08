import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { resolveImageUrl } from "../lib/image";

export default function Home() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const nav = useNavigate();
  const timer = useRef(null);

  const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

  useEffect(() => {
    let mounted = true;
    axios
      .get(`${API}/api/listings`)
      .then((res) => {
        if (mounted) setListings(res.data?.listings || []);
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => (mounted = false);
  }, [API]);

  const DEMO_ITEMS = [
    {
      _id: "demo1",
      title: "Vintage Camera",
      price: 120,
      currency: "USD",
      images: [
        "https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=800&q=60",
      ],
      description: "Classic 35mm camera in working condition.",
    },
    {
      _id: "demo2",
      title: "Mountain Bike",
      price: 450,
      currency: "USD",
      images: [
        "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&q=60",
      ],
      description: "Hardtail bike, great for trails.",
    },
    {
      _id: "demo3",
      title: "iPhone 12",
      price: 350,
      currency: "USD",
      images: [
        "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=60",
      ],
      description: "Used phone with new battery.",
    },
    {
      _id: "demo4",
      title: "Wooden Desk",
      price: 200,
      currency: "USD",
      images: [
        "https://images.unsplash.com/photo-1499955085172-a104c9463ece?auto=format&fit=crop&w=800&q=60",
      ],
      description: "Sturdy desk for home office.",
    },
  ];

  const visibleListings =
    listings && listings.length > 0 ? listings : DEMO_ITEMS;

  async function handleSearch(q) {
    setQuery(q);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      if (!q || q.trim().length < 2) {
        setSuggestions([]);
        return;
      }
      try {
        const res = await axios.get(`${API}/api/listings`, { params: { q } });
        setSuggestions(res.data?.listings || []);
        setShowSuggestions(true);
      } catch {
        setSuggestions([]);
      }
    }, 250);
  }

  function goToSearchResults(q) {
    setShowSuggestions(false);
    if (!q) return;
    nav("/listings?q=" + encodeURIComponent(q));
  }

  return (
    <div className="px-6 py-10 md:px-12 lg:px-20 bg-gray-50 min-h-screen">
      {/* Hero Section */}
      <div className="flex flex-col-reverse lg:flex-row items-center justify-between gap-10">
        <div className="flex-1 text-center lg:text-left">
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight">
            Discover Unique Items & Services Near You
          </h1>
          <p className="text-gray-600 mt-3 text-lg max-w-xl mx-auto lg:mx-0">
            Browse trusted local listings, message sellers instantly, and find
            exactly what you need — all in one place.
          </p>

          {/* Search bar */}
          <div className="relative mt-6 w-full max-w-xl mx-auto lg:mx-0">
            <div className="flex bg-white rounded-2xl shadow-md overflow-hidden">
              <input
                type="text"
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search items or services (e.g. 'bike', 'guitar', 'plumber')"
                className="flex-1 px-4 py-3 outline-none text-gray-700"
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              />
              <button
                onClick={() => goToSearchResults(query)}
                className="px-6 bg-blue-600 text-white font-medium hover:bg-blue-700 transition"
              >
                Search
              </button>
            </div>

            {/* Suggestions */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-20 bg-white mt-2 w-full rounded-xl shadow-lg border border-gray-100 max-h-80 overflow-y-auto">
                {suggestions.slice(0, 8).map((s) => (
                  <div
                    key={s._id}
                    onClick={() => goToSearchResults(s.title || s._id)}
                    className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer"
                  >
                    <img
                      src={
                        resolveImageUrl(s.images?.[0]) ||
                        "https://via.placeholder.com/48"
                      }
                      alt="thumb"
                      className="w-12 h-9 object-cover rounded-md"
                      onError={(e) => (e.target.src = "https://via.placeholder.com/48")}
                    />
                    <div>
                      <div className="font-semibold text-gray-800">
                        {s.title}
                      </div>
                      <div className="text-sm text-gray-500">
                        💲{s.price} {s.currency}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CTA Buttons */}
          <div className="mt-6 flex flex-wrap justify-center lg:justify-start gap-3">
            <Link
              to="/listings"
              className="bg-blue-600 text-white px-5 py-3 rounded-xl hover:bg-blue-700 transition font-medium"
            >
              Browse Listings
            </Link>
            <Link
              to="/dashboard"
              className="border border-blue-600 text-blue-600 px-5 py-3 rounded-xl hover:bg-blue-50 transition font-medium"
            >
              Sell Something
            </Link>
          </div>
        </div>

        {/* Featured Listings Grid */}
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-2 text-gray-500 text-center py-10">
              Loading featured...
            </div>
          ) : (
            visibleListings.slice(0, 6).map((l) => {
              const imageUrl =
                resolveImageUrl(l.images?.[0]) ||
                "https://via.placeholder.com/320x240";
              const isDemo = String(l._id || "").startsWith("demo");
              const Card = (
                <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition cursor-pointer">
                  <img
                    src={imageUrl}
                    alt={l.title}
                    className="w-full h-36 object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "https://via.placeholder.com/320x240";
                    }}
                  />
                  <div className="p-3">
                    <div className="font-semibold text-gray-800 truncate">
                      {l.title}
                    </div>
                    <div className="text-sm text-gray-500">
                      💲{l.price} {l.currency}
                    </div>
                  </div>
                </div>
              );

              return isDemo ? (
                <div key={l._id}>{Card}</div>
              ) : (
                <Link key={l._id} to={`/listings/${l._id}`}>
                  {Card}
                </Link>
              );
            })
          )}
        </div>
      </div>

      {/* Categories */}
      <div className="mt-16">
        <h3 className="text-2xl font-bold mb-5 text-gray-800">
          Popular Categories
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
          {["Electronics", "Vehicles", "Home & Garden", "Services"].map(
            (cat) => (
              <div
                key={cat}
                className="bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md text-center py-6 font-medium text-gray-700 hover:text-blue-600 transition cursor-pointer"
              >
                {cat}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
