import React, { useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import countries from '../data/countries'

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
      const { data } = await axios.post((import.meta.env.VITE_API_URL||'http://localhost:5000') + '/api/auth/signup', payload);
      localStorage.setItem('token', data.token);
      nav('/dashboard');
    }catch(err){ alert(err?.response?.data?.error || 'Error'); }
    setLoading(false);
  }

  return (
    <form onSubmit={submit} className="page" style={{maxWidth:640}}>
      <h3>Create account</h3>
      <div className="form-row">
        <div className="form-col"><input placeholder="Full name" value={form.fullName||''} onChange={e=>setField('fullName', e.target.value)} required/></div>
        <div className="form-col">
          <label className="sr-only">Location</label>
          <select value={form.country} onChange={e=>{ const c = countries.find(x=>x.code===e.target.value); setField('country', e.target.value); if(c) setField('dial', c.dial); }}>
            {countries.map(c=> <option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}
          </select>
        </div>
      </div>

      <input placeholder="Username" value={form.username||''} onChange={e=>setField('username', e.target.value)} required/>

      <div style={{display:'flex',gap:8}}>
        <select style={{width:160}} value={form.dial||''} onChange={e=>setField('dial', e.target.value)}>
          {countries.map(c=> (<option key={c.code} value={c.dial}>{c.flag} {c.name} ({c.dial})</option>))}
        </select>
        <input placeholder="Phone number" value={form.phoneNumber||''} onChange={e=>setField('phoneNumber', e.target.value)} />
      </div>

      <input placeholder="Email" type="email" value={form.email||''} onChange={e=>setField('email', e.target.value)} required/>
      <input placeholder="Password" type="password" value={form.password||''} onChange={e=>setField('password', e.target.value)} required/>

      <select value={form.securityQuestion||''} onChange={e=>setField('securityQuestion', e.target.value)} required>
        <option value="">Select a security question</option>
        {SECURITY_QUESTIONS.map(q=> <option key={q} value={q}>{q}</option>)}
      </select>
      <input placeholder="Security answer" value={form.securityAnswer||''} onChange={e=>setField('securityAnswer', e.target.value)} required/>

      <button className="btn" type="submit" disabled={loading}>{loading? 'Creating...':'Sign up'}</button>
    </form>
  )
}
