import React, { useState, useRef, useEffect } from 'react'
import api from '../lib/api'
import { useNavigate } from 'react-router-dom'
import countries from '../data/countries'
import PasswordInput from '../components/PasswordInput'

// Build flag image URLs
function flagUrl(code) {
  try { return `https://flagcdn.com/${String(code).toLowerCase()}.svg` } catch (e) { return '' }
}

// Country picker for selecting user’s country
function SearchableCountrySelect({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState('')
  const ref = useRef()

  useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  }, [])

  const selected = countries.find(c => c.code === value) || countries[0]
  const list = countries.filter(c => (c.name + ' ' + c.code).toLowerCase().includes(filter.toLowerCase()))

  return (
    <div className="country-picker" ref={ref}>
      <button type="button" className="country-picker-toggle" onClick={() => setOpen(v => !v)}>
        <img src={flagUrl(selected.code)} alt="flag" className="country-flag" />
        <span className="country-name">{selected.name}</span>
        <span className="chev">▾</span>
      </button>
      {open && (
        <div className="picker-dropdown">
          <input className="picker-search" placeholder="Search country..." value={filter} onChange={e => setFilter(e.target.value)} />
          <div className="picker-list">
            {list.map(c => (
              <button key={c.code} type="button" className="country-option"
                onClick={() => { onChange(c.code); setOpen(false); setFilter('') }}>
                <img src={flagUrl(c.code)} alt="flag" className="country-flag" />
                <div style={{ flex: 1, textAlign: 'left' }}>{c.name}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Country dial selector (short country code format)
function CountryDialSelect({ dial, country, onChange }) {
  let match = countries.find(c => c.code === country) || countries.find(c => c.dial === dial) || countries.find(c => c.code === 'US')

  function handleChange(e) {
    const [code, selectedDial] = String(e.target.value).split('|')
    onChange({ code, dial: selectedDial })
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <img src={flagUrl(match.code)} alt="flag" className="country-flag dial-flag" />
      <select style={{ width: 110 }} value={`${match.code}|${match.dial}`} onChange={handleChange}>
        {countries.map(c => (
          <option key={c.code} value={`${c.code}|${c.dial}`}>
            {c.code} ({c.dial})
          </option>
        ))}
      </select>
    </div>
  )
}

const SECURITY_QUESTIONS = [
  'What was your first school?',
  'What is your mother\'s maiden name?',
  'What is the name of your first pet?',
  'What was the make of your first car?'
]

export default function Signup() {
  const [form, setForm] = useState({ country: 'US', dial: '+1', firstName: '', middleInitial: '', lastName: '' })
  const [loading, setLoading] = useState(false)
  const nav = useNavigate()

  function setField(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function submit(e) {
    e.preventDefault()
    setLoading(true)
    if (!form.username || !form.email || !form.password) {
      alert('username, email and password are required')
      setLoading(false)
      return
    }
    try {
      const payload = { ...form }
      if (form.phoneNumber && form.dial) {
        const cleanDial = String(form.dial).replace(/[^+0-9]/g, '')
        const cleanNumber = String(form.phoneNumber).replace(/[^0-9]/g, '')
        payload.phone = `${cleanDial}${cleanNumber}`
        delete payload.phoneNumber
      }
      const { data } = await api.post('/api/auth/signup', payload)
      if (!data || !data.token) throw new Error('Invalid response from server')
      localStorage.setItem('token', data.token)
      window.dispatchEvent(new Event('tokenChange'))
      nav('/profile')
    } catch (err) {
      alert(err?.response?.data?.error || err?.message || 'Error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="page" style={{ maxWidth: 680 }}>
      <h3>Create account</h3>
      <div className="form-row">
        <div className="form-col"><input placeholder="First name" value={form.firstName || ''} onChange={e => setField('firstName', e.target.value)} required /></div>
        <div style={{ width: 92 }}><input placeholder="M." value={form.middleInitial || ''} onChange={e => setField('middleInitial', e.target.value)} maxLength={3} /></div>
        <div className="form-col"><input placeholder="Last name" value={form.lastName || ''} onChange={e => setField('lastName', e.target.value)} required /></div>
      </div>

      <div className="form-row">
        <div className="form-col">
          <SearchableCountrySelect
            value={form.country}
            onChange={(code) => {
              const c = countries.find(x => x.code === code)
              setField('country', code)
              if (c) setField('dial', c.dial)
            }}
          />
        </div>
      </div>

      <input placeholder="Username" value={form.username || ''} onChange={e => setField('username', e.target.value)} required />

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <CountryDialSelect dial={form.dial} country={form.country} onChange={(v) => { if (v.code) setField('country', v.code); if (v.dial) setField('dial', v.dial) }} />
        <input placeholder="Phone number" value={form.phoneNumber || ''} onChange={e => setField('phoneNumber', e.target.value)} style={{ flex: 1, minWidth: 160 }} />
      </div>

      <input placeholder="Email" type="email" value={form.email || ''} onChange={e => setField('email', e.target.value)} required />
      <PasswordInput placeholder="Password" value={form.password || ''} onChange={e => setField('password', e.target.value)} required name="password" />

      <select value={form.securityQuestion || ''} onChange={e => setField('securityQuestion', e.target.value)} required>
        <option value="">Select a security question</option>
        {SECURITY_QUESTIONS.map(q => <option key={q} value={q}>{q}</option>)}
      </select>
      <input placeholder="Security answer" value={form.securityAnswer || ''} onChange={e => setField('securityAnswer', e.target.value)} required />

      <button className="btn" type="submit" disabled={loading}>{loading ? 'Creating...' : 'Sign up'}</button>
    </form>
  )
}
