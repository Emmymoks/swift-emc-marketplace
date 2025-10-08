import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useParams, Link } from "react-router-dom";
import io from "socket.io-client";
import ChatPopover from "../components/ChatPopover";

const PLACEHOLDER_320x240 = "https://via.placeholder.com/320x240?text=No+Image";
const PLACEHOLDER_48 = "https://via.placeholder.com/48";
const resolveImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return (import.meta.env.VITE_API_URL || "http://localhost:5000") + url;
};

export default function ListingView() {
  const { id } = useParams();
  const [listing, setListing] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const [openChat, setOpenChat] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const socketRef = useRef(null);

  const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

  useEffect(() => {
    let mounted = true;
    axios
      .get(`${API}/api/listings/${id}`)
      .then((res) => mounted && setListing(res.data.listing))
      .catch(console.error);

    axios
      .get(`${API}/api/messages/${id}`)
      .then((res) => setMsgs(res.data.messages || []))
      .catch(() => {});

    const s = io(import.meta.env.VITE_API_WS || API, { transports: ["websocket"] });
    socketRef.current = s;
    const roomId = "listing_" + id;
    s.emit("joinRoom", roomId);
    s.on("newMessage", (m) =>
      setMsgs((prev) => (m._id && prev.find((x) => x._id === m._id) ? prev : [...prev, m]))
    );

    return () => {
      mounted = false;
      s.emit("leaveRoom", roomId);
      s.disconnect();
    };
  }, [id]);

  async function send() {
    const token = localStorage.getItem("token");
    if (!token) return alert("Please log in to send messages.");
    if (!text.trim()) return;
    const message = { _tempId: Date.now().toString(), from: "me", text };
    setMsgs((p) => [...p, message]);
    const roomId = "listing_" + id;
    socketRef.current.emit("sendMessage", { roomId, message });
    try {
      await axios.post(
        `${API}/api/messages`,
        { roomId, text, listing: id },
        { headers: { Authorization: "Bearer " + token } }
      );
    } catch {}
    setText("");
  }

  async function submitReview() {
    const token = localStorage.getItem("token");
    if (!token) return alert("Please log in to review.");
    try {
      const res = await axios.post(
        `${API}/api/listings/${id}/review`,
        { rating, comment },
        { headers: { Authorization: "Bearer " + token } }
      );
      setListing(res.data.listing);
      setComment("");
      alert("Thanks for your review!");
    } catch {
      alert("Review failed.");
    }
  }

  if (!listing) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 space-y-6">
      {/* Top Section */}
      <div className="flex flex-col md:flex-row gap-6">
        <img
          src={resolveImageUrl(listing.images?.[0]) || PLACEHOLDER_320x240}
          onError={(e) => (e.target.src = PLACEHOLDER_320x240)}
          alt="listing"
          className="w-full md:w-80 h-60 object-cover rounded-2xl shadow"
        />

        <div className="flex-1 space-y-3">
          <h2 className="text-3xl font-bold">{listing.title}</h2>
          <p className="text-gray-700">{listing.description}</p>
          <p className="text-lg font-semibold text-blue-600">
            💲 {listing.price} {listing.currency}
          </p>

          {listing.owner && (
            <div className="flex items-center gap-4 mt-4">
              <img
                src={resolveImageUrl(listing.owner.profilePhotoUrl) || PLACEHOLDER_48}
                alt="owner"
                onError={(e) => (e.target.src = PLACEHOLDER_48)}
                className="w-12 h-12 rounded-xl object-cover"
              />
              <div>
                <Link
                  to={`/user/${encodeURIComponent(listing.owner.username)}`}
                  className="font-semibold hover:underline"
                >
                  @{listing.owner.username}
                </Link>
                <div className="text-gray-500 text-sm">{listing.owner.location}</div>
              </div>
              <button
                onClick={() => setOpenChat(true)}
                className="ml-auto px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition text-sm"
              >
                💬 Message Seller
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Chat Section */}
      <div className="bg-white rounded-2xl shadow p-5">
        <h4 className="font-semibold mb-3 text-lg">Chat about this listing</h4>
        <div className="max-h-64 overflow-auto border rounded-lg p-3 bg-gray-50 space-y-2">
          {msgs.length === 0 ? (
            <div className="text-gray-500 text-sm">No messages yet.</div>
          ) : (
            msgs.map((m, i) => (
              <div
                key={m._id || m._tempId || i}
                className={`p-2 rounded-lg text-sm ${
                  m.from === "me"
                    ? "bg-blue-100 text-right"
                    : "bg-gray-100 text-left"
                }`}
              >
                <b>{m.from?.username || (m.from === "me" ? "You" : "User")}:</b>{" "}
                {m.text}
              </div>
            ))
          )}
        </div>

        <div className="flex gap-2 mt-3">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 border rounded-lg px-3 py-2"
          />
          <button
            onClick={send}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Send ➤
          </button>
        </div>
      </div>

      {/* Reviews Section */}
      <div className="bg-white rounded-2xl shadow p-5">
        <h4 className="font-semibold text-lg mb-3">Leave a Review</h4>
        <div className="flex items-center gap-3 mb-4">
          <select
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
            className="border rounded-lg px-3 py-2"
          >
            {[5, 4, 3, 2, 1].map((v) => (
              <option key={v} value={v}>
                {v} ⭐
              </option>
            ))}
          </select>
          <input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Write a short comment..."
            className="flex-1 border rounded-lg px-3 py-2"
          />
          <button
            onClick={submitReview}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
          >
            Submit ✅
          </button>
        </div>

        {listing.reviews?.length > 0 && (
          <div className="space-y-3">
            <h5 className="font-semibold">Reviews</h5>
            {listing.reviews.map((r) => (
              <div key={r._id} className="border rounded-lg p-3 bg-gray-50">
                <div className="text-yellow-500 mb-1">
                  {"⭐".repeat(r.rating)}
                </div>
                <p className="text-gray-700">{r.comment}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {openChat && (
        <ChatPopover
          listingId={id}
          sellerId={listing.owner?._id}
          onClose={() => setOpenChat(false)}
        />
      )}
    </div>
  );
}
