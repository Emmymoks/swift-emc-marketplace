import React, { useState } from 'react'

export default function PasswordInput({ value, onChange, placeholder, required, name }) {
  const [visible, setVisible] = useState(false)

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <input
        name={name}
        placeholder={placeholder}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        required={required}
        style={{ flex: 1, paddingRight: 36 }}
      />
      <button
        type="button"
        onClick={() => setVisible(v => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        style={{
          position: 'absolute',
          right: 6,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {visible ? (
          // "Eye Off" SVG icon
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.77 21.77 0 0 1 5.06-6.95" />
            <path d="M1 1l22 22" />
          </svg>
        ) : (
          // "Eye" SVG icon
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  )
}
