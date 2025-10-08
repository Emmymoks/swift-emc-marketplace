import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { io as ioClient } from "socket.io-client";
import axios from "axios";
import { Loader2, RefreshCw, Trash2, Send, Search } from "lucide-react";

export default function AdminPanel() {
  const [pending, setPending] = useState([]);
  const [secret, setSecret] = useState(() => sessionStorage.getItem("admin_secret") || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [analytics, setAnalytics] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [allListings, setAllListings] = useState([]);
  const [allReviews, setAllReviews] = useState([]);
  const [searchUsername, setSearchUsername] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inbox, setInbox] = useState([]);
  const [msgRoom, setMsgRoom] = useState("");
  const [msgText, setMsgText] = useState("");
  const [socket, setSocket] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const nav = useNavigate();
  const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

  // 🔌 Setup socket
  useEffect(() => {
    const s = sessionStorage.getItem("admin_secret") || "";
    if (!s) nav("/admin-login");

    try {
      const sc = ioClient(API);
      setSocket(sc);

      sc.on("admin:newMessage", (m) => {
        if (!m) return;
        setInbox((curr) => {
          const other = curr.filter((i) => i.roomId !== m.roomId);
          const key = `admin:unread:${m.roomId}`;
          const cur = parseInt(localStorage.getItem(key) || "0", 10) || 0;
          localStorage.setItem(key, String(cur + 1));
          return [{ roomId: m.roomId, text: m.text, from: m.from, unread: cur + 1 }, ...other].slice(0, 50);
        });
        setUnreadCount((c) => c + 1);
        setMessages((curr) => (m.roomId === msgRoom ? [...curr, m] : curr));
      });

      sc.on("admin:user:signup", (payload) => {
        setAnalytics((a) => ({ ...(a || {}), totalUsers: payload.totalUsers }));
      });
    } catch (e) {
      console.error("Socket init failed", e);
    }

    return () => {
      try {
        if (socket) socket.disconnect();
      } catch (e) {}
    };
  }, []);

  // Load initial data
  useEffect(() => {
    loadInbox();
    loadAllUsers();
    loadAllListings();
    loadAllReviews();
  }, []);

  async function loadInbox() {
    try {
      const res = await axios.get(`${API}/api/admin/recent-messages`, { headers: { "x-admin-secret": secret } });
      const rooms = res.data.rooms || [];
      setInbox(
        rooms.map((r) => ({
          roomId: r.roomId,
          text: r.lastMessage.text,
          from: r.lastMessage.from,
          unread: parseInt(localStorage.getItem(`admin:unread:${r.roomId}`) || "0", 10) || 0,
        }))
      );
    } catch {}
  }

  async function loadPending() {
    setError("");
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/admin/listings`, { headers: { "x-admin-secret": secret } });
      setPending(res.data.pending || []);
    } catch {
      setError("Failed to load pending listings.");
      setPending([]);
    } finally {
      setLoading(false);
    }
  }

  async function approve(id) {
    try {
      await axios.post(`${API}/api/admin/listings/${id}/approve`, {}, { headers: { "x-admin-secret": secret } });
      setPending((p) => p.filter((x) => x._id !== id));
    } catch {
      alert("Approve failed");
    }
  }

  async function reject(id) {
    try {
      await axios.post(`${API}/api/admin/listings/${id}/reject`, {}, { headers: { "x-admin-secret": secret } });
      setPending((p) => p.filter((x) => x._id !== id));
    } catch {
      alert("Reject failed");
    }
  }

  async function loadAnalytics() {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/admin/analytics`, { headers: { "x-admin-secret": secret } });
      setAnalytics(res.data);
    } catch {
      setError("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }

  async function loadAllUsers() {
    try {
      const res = await axios.get(`${API}/api/admin/users/all`, { headers: { "x-admin-secret": secret } });
      setAllUsers(res.data.users || []);
    } catch {}
  }

  async function loadAllListings() {
    try {
      const res = await axios.get(`${API}/api/admin/listings/all`, { headers: { "x-admin-secret": secret } });
      setAllListings(res.data.listings || []);
    } catch {}
  }

  async function loadAllReviews() {
    try {
      const res = await axios.get(`${API}/api/admin/reviews`, { headers: { "x-admin-secret": secret } });
      setAllReviews(res.data.reviews || []);
    } catch {}
  }

  async function deleteUser(id) {
    if (!confirm("Delete user and their data?")) return;
    try {
      await axios.delete(`${API}/api/admin/users/${id}`, { headers: { "x-admin-secret": secret } });
      setAllUsers((u) => u.filter((x) => x._id !== id));
    } catch {
      alert("Delete failed");
    }
  }

  async function deleteListing(id) {
    if (!confirm("Delete listing?")) return;
    try {
      await axios.delete(`${API}/api/admin/listings/${id}`, { headers: { "x-admin-secret": secret } });
      setAllListings((l) => l.filter((x) => x._id !== id));
    } catch {
      alert("Delete failed");
    }
  }

  async function deleteReview(id) {
    if (!confirm("Delete review?")) return;
    try {
      await axios.delete(`${API}/api/admin/reviews/${id}`, { headers: { "x-admin-secret": secret } });
      setAllReviews((r) => r.filter((x) => String(x.review._id) !== String(id)));
    } catch {
      alert("Delete failed");
    }
  }

  async function searchUser() {
    if (!searchUsername) return;
    setLoading(true);
    setSearchResult(null);
    try {
      const res = await axios.get(`${API}/api/admin/users`, {
        params: { username: searchUsername },
        headers: { "x-admin-secret": secret },
      });
      setSearchResult(res.data);
    } catch {
      setError("User not found or search failed");
    } finally {
      setLoading(false);
    }
  }

  async function loadMessages() {
    if (!msgRoom) return setError("Enter roomId to load messages");
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/admin/messages`, {
        params: { roomId: msgRoom },
        headers: { "x-admin-secret": secret },
      });
      setMessages(res.data.msgs || []);
      localStorage.setItem(`admin:unread:${msgRoom}`, "0");
      setInbox((curr) => curr.map((i) => (i.roomId === msgRoom ? { ...i, unread: 0 } : i)));
      setUnreadCount(0);
    } catch {
      setError("Failed to load messages");
    } finally {
      setLoading(false);
    }
  }

  async function replyMessage() {
    if (!msgRoom || !msgText) return;
    try {
      const target = messages.slice().reverse().find((m) => m.from && m.from._id) || messages[0];
      const toId = target ? target.from?._id || target.to?._id : null;
      const res = await axios.post(
        `${API}/api/admin/messages/reply`,
        { roomId: msgRoom, toId, text: msgText },
        { headers: { "x-admin-secret": secret } }
      );
      setMessages((m) => [...m, res.data.msg]);
      setMsgText("");
    } catch {
      alert("Send failed");
    }
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Admin Dashboard</h2>

      {error && <div className="text-red-500 mb-3">{error}</div>}

      <div className="grid md:grid-cols-3 gap-6">
        {/* LEFT COLUMN - Pending Listings */}
        <div className="md:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">Pending Listings</h3>
            <div className="flex gap-2">
              <button onClick={loadPending} className="btn flex items-center gap-1">
                {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
                Refresh
              </button>
              <button onClick={loadAnalytics} className="btn flex items-center gap-1">
                Load Analytics
              </button>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pending.length === 0 ? (
              <div className="text-gray-500">No pending listings</div>
            ) : (
              pending.map((l) => (
                <div key={l._id} className="p-4 bg-white rounded-xl shadow">
                  <h4 className="font-semibold">{l.title}</h4>
                  <p className="text-sm text-gray-600 line-clamp-3">{l.description}</p>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => approve(l._id)} className="btn bg-green-500 hover:bg-green-600 text-white">
                      Approve
                    </button>
                    <button onClick={() => reject(l._id)} className="btn bg-red-500 hover:bg-red-600 text-white">
                      Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT COLUMN - Analytics & User Management */}
        <div className="space-y-6">
          <div className="p-4 bg-white rounded-xl shadow">
            <h4 className="font-semibold mb-2">Site Analytics</h4>
            {analytics ? (
              <ul className="text-sm text-gray-700 space-y-1">
                <li>Total users: {analytics.totalUsers}</li>
                <li>Total listings: {analytics.totalListings}</li>
                <li>Pending listings: {analytics.pendingListings}</li>
                <li>Total messages: {analytics.totalMessages}</li>
                <li>Uptime: {Math.round(analytics.uptime)}s</li>
              </ul>
            ) : (
              <div className="text-gray-500 text-sm">No analytics loaded</div>
            )}
          </div>

          <div className="p-4 bg-white rounded-xl shadow">
            <div className="flex gap-2 mb-3">
              <input
                placeholder="Search username"
                value={searchUsername}
                onChange={(e) => setSearchUsername(e.target.value)}
                className="input flex-1"
              />
              <button onClick={searchUser} className="btn flex items-center gap-1">
                <Search className="w-4 h-4" /> Search
              </button>
            </div>

            {searchResult && (
              <div className="bg-gray-50 p-2 rounded text-sm">
                <div>
                  <strong>{searchResult.user.username}</strong> ({searchResult.user.email})
                </div>
                <div>{searchResult.user.fullName}</div>
                <div className="mt-2">
                  <strong>Listings:</strong>
                  {searchResult.listings.length === 0 ? (
                    <div className="text-gray-500">No listings</div>
                  ) : (
                    searchResult.listings.map((l) => (
                      <div key={l._id}>
                        {l.title} - {l.approved ? "approved" : "pending"}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* MESSAGES */}
          <div className="p-4 bg-white rounded-xl shadow">
            <h4 className="font-semibold mb-2">
              Messages / Complaints{" "}
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 ml-2">{unreadCount}</span>
              )}
            </h4>
            <div className="max-h-40 overflow-auto space-y-2">
              {inbox.length === 0 ? (
                <div className="text-gray-500 text-sm">No messages</div>
              ) : (
                inbox.map((i) => (
                  <div
                    key={i.roomId}
                    onClick={() => {
                      setMsgRoom(i.roomId);
                      loadMessages();
                      setUnreadCount(0);
                    }}
                    className="p-2 border rounded hover:bg-gray-100 cursor-pointer flex justify-between"
                  >
                    <div>
                      <div className="font-semibold text-sm">{i.from?.username || "User"}</div>
                      <div className="text-xs text-gray-500 truncate">{i.text}</div>
                    </div>
                    {i.unread > 0 && (
                      <div className="bg-red-500 text-white rounded-full px-2 text-xs">{i.unread}</div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="max-h-56 overflow-auto mt-3 space-y-2">
              {messages.length === 0 ? (
                <div className="text-gray-500 text-sm">No messages loaded</div>
              ) : (
                messages.map((m) => (
                  <div key={m._id} className="border rounded p-2 text-sm">
                    <div>
                      <strong>{m.from?.username || "Admin"}</strong> →{" "}
                      <em>{m.to?.username || "User"}</em>
                    </div>
                    <div className="text-gray-600">{m.text}</div>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-2 mt-3">
              <input
                placeholder="Reply..."
                value={msgText}
                onChange={(e) => setMsgText(e.target.value)}
                className="input flex-1"
              />
              <button onClick={replyMessage} className="btn flex items-center gap-1">
                <Send className="w-4 h-4" /> Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
