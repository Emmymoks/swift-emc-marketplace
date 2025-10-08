import React, { useEffect, useState } from "react";
import { resolveImageUrl, PLACEHOLDER_280x200, PLACEHOLDER_48 } from "../lib/image";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import ChatPopover from "../components/ChatPopover";

export default function Listings() {
  const [list, setList] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const nav = useNavigate();

  const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

  useEffect(() => {
    let mounted = true;

    axios
      .get(`${API}/api/listings`)
      .then((res) => {
        if (!mounted) return;
        // ✅ Defensive: handle unexpected response shapes
        const listings = res.data?.listings || res.data || [];
        setList(Array.isArray(listings) ? listings : []);
      })
      .catch((err) => {
        console.error("Failed to fetch listings:", err);
        setList([]);
      });

    return () => {
      mounted = false;
    };
  }, [API]);

  const handleMessage = (listingId) => {
    const token = localStorage.getItem("token");
    if (!token) {
      nav(`/listings/${listingId}`);
      return;
    }
    setActiveChat(listingId);
  };

  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold mb-6">Browse Listings</h2>

      {list.length === 0 ? (
        <div className="text-gray-500 text-center py-12">No listings found.</div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.map((l) => {
            const imageUrl = resolveImageUrl(l?.images?.[0]) || PLACEHOLDER_280x200;
            const owner = l?.owner || {};

            return (
              <div
                key={l._id || Math.random()}
                className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-all duration-200 p-4 flex flex-col"
              >
                <img
                  src={imageUrl}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = PLACEHOLDER_280x200;
                  }}
                  alt={l?.title || "listing"}
                  className="w-full h-48 object-cover rounded-xl mb-3"
                />

                <h3 className="font-semibold text-lg truncate">{l?.title || "Untitled"}</h3>
                <p className="text-gray-600 text-sm line-clamp-3 mt-1 flex-1">
                  {l?.description || "No description provided."}
                </p>

                <div className="mt-3 font-semibold text-blue-600">
                  💲 {l?.price || "N/A"} {l?.currency || ""}
                </div>

                {owner.username && (
                  <div className="flex items-center gap-3 mt-4">
                    <img
                      src={resolveImageUrl(owner.profilePhotoUrl) || PLACEHOLDER_48}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = PLACEHOLDER_48;
                      }}
                      alt={owner.username}
                      className="w-10 h-10 rounded-lg object-cover"
                    />
                    <div>
                      <Link
                        to={`/user/${encodeURIComponent(owner.username)}`}
                        className="font-medium hover:underline"
                      >
                        @{owner.username}
                      </Link>
                      <div className="text-gray-500 text-xs">{owner.location || "Unknown"}</div>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 mt-5">
                  <Link
                    to={`/listings/${l._id}`}
                    className="flex-1 text-center bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition text-sm"
                  >
                    👁️ View
                  </Link>
                  <button
                    onClick={() => handleMessage(l._id)}
                    className="flex-1 text-center bg-gray-100 hover:bg-gray-200 transition px-3 py-2 rounded-lg text-sm"
                  >
                    💬 Message
                  </button>
                </div>

                {activeChat === l._id && (
                  <ChatPopover
                    listingId={l._id}
                    sellerId={owner._id}
                    onClose={() => setActiveChat(null)}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
