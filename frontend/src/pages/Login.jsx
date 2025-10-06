import React, { useState } from 'react'
import api from '../lib/api'
import PasswordInput from '../components/PasswordInput'
import { useNavigate } from 'react-router-dom'

export default function Login(){
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();
  async function submit(e){
    e.preventDefault();
    setLoading(true);
    // quick client-side validation
    if(!form.identifier || !form.password){ alert('Please fill identifier and password'); setLoading(false); return }
    try{
      const { data } = await api.post('/api/auth/login', { identifier: form.identifier, password: form.password });
      if (!data || !data.token) throw new Error('Invalid response from server')
      localStorage.setItem('token', data.token);
      window.dispatchEvent(new Event('tokenChange'));
      nav('/profile');
    }catch(err){
      const msg = err?.response?.data?.error || err?.message || 'Login failed'
      alert(msg)
    }finally{ setLoading(false) }
  }
  return (
    <form onSubmit={submit} className="page" style={{maxWidth:420}}>
      <h3>Login</h3>
      <input placeholder="Email or Username" value={form.identifier||''} onChange={e=>setForm({...form, identifier:e.target.value})} required/>
  <PasswordInput placeholder="Password" value={form.password||''} onChange={e=>setForm({...form, password:e.target.value})} required name="password" />
      <button className="btn" type="submit" disabled={loading}>{loading? 'Signing in...':'Login'}</button>
    </form>
  )
}
