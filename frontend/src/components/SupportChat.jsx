// frontend/src/components/SupportChat.jsx
import React, { useEffect, useState, useRef } from 'react'
import axios from 'axios'
import { io as ioClient } from 'socket.io-client'

export default function SupportChat({ user }) {
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState([])
  const [text, setText] = useState('')
  const socketRef = useRef(null)
  const mounted = useRef(true)

  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000'
  const wsUrl = baseUrl.replace(/^http/, 'ws')
  const roomId = user && (user.id || user._id) ? `support:${user.id || user._id}` : null

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  useEffect(() => {
    if (!roomId) return
    let active = true

    // Connect socket
    const s = ioClient(wsUrl, { transports: ['websocket'], reconnection: true })
    socketRef.current = s

    s.on('connect', () => {
      console.log('Connected to support chat socket')
      s.emit('joinRoom', roomId)
    })

    s.on('disconnect', () => {
      console.log('Disconnected from socket')
    })

    s.on('newMessage', (msg) => {
      if (!mounted.current || !msg) return
      if (msg.roomId === roomId) {
        setMsgs((cur) => [...cur, msg])
      }
    })

    // Load existing chat history
    ;(async () => {
      try {
        const token = localStorage.getItem('token')
        const res = await axios.get(`${baseUrl}/api/messages/${encodeURIComponent(roomId)}`, {
          headers: { Authorization: 'Bearer ' + token },
        })
        if (active && mounted.current) {
          setMsgs(res.data.msgs || [])
        }
      } catch (e) {
        console.warn('Failed to load chat history', e)
      }
    })()

    return () => {
      active = false
      try {
        s.emit('leaveRoom', roomId)
        s.disconnect()
      } catch (e) {}
    }
  }, [roomId])

  // Send message
  async function send() {
    if (!text.trim() || !roomId) return
    try {
      const token = localStorage.getItem('token')
      const res = await axios.post(
        `${baseUrl}/api/messages`,
        { roomId, toId: null, text: text.trim() },
        { headers: { Authorization: 'Bearer ' + token } }
      )
      if (mounted.current) {
        setMsgs((m) => [...m, res.data.msg])
        setText('')
      }
    } catch (e) {
      alert('Failed to send message. Please try again.')
    }
  }

  if (!user) return null

  return (
    <div className="chat-box" style={{ position: 'fixed', right: 20, bottom: 20, width: 320, zIndex: 9999 }}>
      <div
        style={{
          background: '#fff',
          border: '1px solid #ddd',
          borderRadius: 10,
          overflow: 'hidden',
          boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
          transition: 'all 0.3s ease',
        }}
      >
        <div
          style={{
            padding: '8px 10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#fafafa',
            borderBottom: '1px solid #eee',
          }}
        >
          <div style={{ fontWeight: 700 }}>Customer Support</div>
          <button
            className="btn ghost"
            onClick={() => setOpen((o) => !o)}
            style={{ fontSize: 18, fontWeight: 600, lineHeight: 1 }}
          >
            {open ? '−' : '+'}
          </button>
        </div>

        {open && (
          <div style={{ padding: 10, background: '#fff' }}>
            <div
              style={{
                height: 200,
                overflowY: 'auto',
                border: '1px solid #eee',
                padding: 6,
                borderRadius: 6,
                marginBottom: 8,
                background: '#fafafa',
              }}
            >
              {msgs.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#888', marginTop: 30 }}>
                  No messages yet.
                </div>
              ) : (
                msgs.map((m) => (
                  <div
                    key={m._id || Math.random()}
                    style={{
                      marginBottom: 8,
                      textAlign: m.from && m.from._id === user._id ? 'right' : 'left',
                    }}
                  >
                    <div
                      style={{
                        display: 'inline-block',
                        background:
                          m.from && m.from._id === user._id ? '#007bff' : '#f0f0f0',
                        color: m.from && m.from._id === user._id ? '#fff' : '#333',
                        padding: '6px 10px',
                        borderRadius: 12,
                        maxWidth: '80%',
                        wordBreak: 'break-word',
                      }}
                    >
                      {m.text}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type a message..."
                style={{
                  flex: 1,
                  borderRadius: 6,
                  border: '1px solid #ddd',
                  padding: '6px 8px',
                  outline: 'none',
                }}
                onKeyDown={(e) => e.key === 'Enter' && send()}
              />
              <button className="btn" onClick={send} style={{ padding: '6px 12px' }}>
                Send
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
