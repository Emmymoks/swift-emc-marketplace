import React, { useState, useRef, useEffect } from 'react'
import api from '../lib/api'
import { useNavigate } from 'react-router-dom'
import countries from '../data/countries'
import PasswordInput from '../components/PasswordInput'

// Small helper to build flag svg urls from flagcdn
function flagUrl(code){
  try{ return `https://flagcdn.com/${String(code).toLowerCase()}.svg` }catch(e){ return '' }
}

function SearchableCountrySelect({ value, onChange }){
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState('')
  const ref = useRef()
  useEffect(()=>{
    function onDoc(e){ if(ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('click', onDoc)
    return ()=> document.removeEventListener('click', onDoc)
  },[])
  const selected = countries.find(c=>c.code===value) || countries[0]
  const list = countries.filter(c=> (c.name+' '+c.code).toLowerCase().includes(filter.toLowerCase()))
  return (
    <div className="country-picker" ref={ref}>
      <button type="button" className="country-picker-toggle" onClick={()=>setOpen(v=>!v)}>
        <img src={flagUrl(selected.code)} alt="flag" className="country-flag" onError={(e)=>{ e.target.onerror=null; e.target.src='data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="34" height="18"><rect width="100%" height="100%" fill="%23eee"/></svg>' }} />
        <span className="country-name">{selected.name}</span>
        <span className="chev">▾</span>
      </button>
      {open && (
        <div className="picker-dropdown">
          <input className="picker-search" placeholder="Search country..." value={filter} onChange={e=>setFilter(e.target.value)} />
          <div className="picker-list">
            {list.map(c=> (
              <button key={c.code} type="button" className="country-option" onClick={()=>{ onChange(c.code); setOpen(false); setFilter('') }}>
                <img src={flagUrl(c.code)} alt="flag" className="country-flag" onError={(e)=>{ e.target.onerror=null; e.target.src='data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="34" height="18"><rect width="100%" height="100%" fill="%23eee"/></svg>' }} />
                <div style={{flex:1,textAlign:'left'}}>{c.name} <span className="muted">{c.dial}</span></div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function CountryDialSelect({ dial, country, onChange }){
  // Prefer to show the dial matching the provided country first (handles +1 ambiguity)
  let match = null
  if(country) match = countries.find(c=>c.code === country)
  if(!match) match = countries.find(c=>c.dial === dial) || countries.find(c=>c.code==='US')
  return (
    <div style={{display:'flex',alignItems:'center',gap:8}}>
      <img src={flagUrl(match.code)} alt="flag" className="country-flag dial-flag" onError={(e)=>{ e.target.onerror=null; e.target.src='data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="34" height="18"><rect width="100%" height="100%" fill="%23eee"/></svg>' }} />
      <select style={{width:220}} value={dial||''} onChange={e=>onChange(e.target.value)}>
        {countries.map(c=> (<option key={c.code} value={c.dial}>{c.name} ({c.dial})</option>))}
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

export default function Signup(){
  const [form, setForm] = useState({ country: 'US', dial: '+1' });
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  function setField(k, v){ setForm(f=>({ ...f, [k]: v })) }

  async function submit(e){
    e.preventDefault();
    setLoading(true);
    if(!form.username || !form.email || !form.password){ alert('username, email and password are required'); setLoading(false); return }
    try{
      // compose phone from dial + number if provided separately and normalize
      const payload = { ...form };
      if(form.phoneNumber && form.dial){
        const cleanDial = String(form.dial).replace(/[^+0-9]/g, '');
        const cleanNumber = String(form.phoneNumber).replace(/[^0-9]/g, '');
        payload.phone = `${cleanDial}${cleanNumber}`
        // remove the temporary phoneNumber field so backend receives 'phone'
        delete payload.phoneNumber
      }
      const { data } = await api.post('/api/auth/signup', payload);
      if (!data || !data.token) throw new Error('Invalid response from server')
      localStorage.setItem('token', data.token);
      window.dispatchEvent(new Event('tokenChange'));
      nav('/profile');
    }catch(err){ alert(err?.response?.data?.error || err?.message || 'Error'); }
    finally{ setLoading(false) }
  }

  return (
    <form onSubmit={submit} className="page" style={{maxWidth:640}}>
      <h3>Create account</h3>
      <div className="form-row">
        <div className="form-col"><input placeholder="Full name" value={form.fullName||''} onChange={e=>setField('fullName', e.target.value)} required/></div>
        <div className="form-col">
          <SearchableCountrySelect value={form.country} onChange={(code)=>{ const c = countries.find(x=>x.code===code); setField('country', code); if(c) setField('dial', c.dial); }} />
        </div>
      </div>

  <input placeholder="Username" value={form.username||''} onChange={e=>setField('username', e.target.value)} required/>

      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
        <CountryDialSelect dial={form.dial} country={form.country} onChange={v=>setField('dial', v)} />
        <input placeholder="Phone number" value={form.phoneNumber||''} onChange={e=>setField('phoneNumber', e.target.value)} style={{flex:1,minWidth:160}} />
      </div>

  <input placeholder="Email" type="email" value={form.email||''} onChange={e=>setField('email', e.target.value)} required/>
  <PasswordInput placeholder="Password" value={form.password||''} onChange={e=>setField('password', e.target.value)} required name="password" />

      <select value={form.securityQuestion||''} onChange={e=>setField('securityQuestion', e.target.value)} required>
        <option value="">Select a security question</option>
        {SECURITY_QUESTIONS.map(q=> <option key={q} value={q}>{q}</option>)}
      </select>
      <input placeholder="Security answer" value={form.securityAnswer||''} onChange={e=>setField('securityAnswer', e.target.value)} required/>

      <button className="btn" type="submit" disabled={loading}>{loading? 'Creating...':'Sign up'}</button>
    </form>
  )
}
