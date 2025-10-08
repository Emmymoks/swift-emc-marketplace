import React, { useEffect, useState } from "react";
import { resolveImageUrl, PLACEHOLDER_280x200, PLACEHOLDER_48 } from "../lib/image";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import ChatPopover from "../components/ChatPopover";
import { MessageSquare, Eye } from "lucide-react";

export default function Listings() {
  const [list, setList] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const nav = useNavigate();
  const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

  useEffect(() => {
    axios
      .get(`${API}/api/listings`)
      .then((res) => setList(res.data.listings || []))
      .catch(() => setList([]));
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold mb-6">Browse Listings</h2>

      {list.length === 0 ? (
        <div className="text-gray-500 text-center py-12">No listings found.</div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.map((l) => (
            <div
              key={l._id}
              className="bg-white rounded-2xl shadow-md hover:shadow-lg transition p-4 flex flex-col"
            >
              <img
                src={resolveImageUrl(l.images?.[0]) || PLACEHOLDER_280x200}
                onError={(e) => {
                  e.target.src = PLACEHOLDER_280x200;
                }}
                alt="listing"
                className="w-full h-48 object-cover rounded-xl mb-3"
              />

              <h3 className="font-semibold text-lg truncate">{l.title}</h3>
              <p className="text-gray-600 text-sm line-clamp-3 mt-1 flex-1">
                {l.description}
              </p>
              <div className="mt-3 font-semibold text-primary">
                {l.price} {l.currency}
              </div>

              {l.owner && (
                <div className="flex items-center gap-3 mt-4">
                  <img
                    src={resolveImageUrl(l.owner.profilePhotoUrl) || PLACEHOLDER_48}
                    onError={(e) => (e.target.src = PLACEHOLDER_48)}
                    alt="owner"
                    className="w-10 h-10 rounded-lg object-cover"
                  />
                  <div>
                    <Link
                      to={`/user/${encodeURIComponent(l.owner.username)}`}
                      className="font-medium hover:underline"
                    >
                      @{l.owner.username}
                    </Link>
                    <div className="text-gray-500 text-xs">{l.owner.location}</div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 mt-5">
                <Link
                  to={`/listings/${l._id}`}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition text-sm"
                >
                  <Eye className="w-4 h-4" /> View
                </Link>
                <button
                  onClick={() => {
                    const token = localStorage.getItem("token");
                    if (!token) return nav(`/listings/${l._id}`);
                    setActiveChat(l._id);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition text-sm"
                >
                  <MessageSquare className="w-4 h-4" /> Message
                </button>
              </div>

              {activeChat === l._id && (
                <ChatPopover
                  listingId={l._id}
                  sellerId={l.owner?._id}
                  onClose={() => setActiveChat(null)}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
