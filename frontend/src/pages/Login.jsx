import React, { useState } from 'react'
import api from '../lib/api'
import { useNavigate } from 'react-router-dom'

export default function Login(){
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();
  async function submit(e){
    e.preventDefault();
    setLoading(true);
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
      <input placeholder="Email or Username" onChange={e=>setForm({...form, identifier:e.target.value})} required/>
      <input placeholder="Password" type="password" onChange={e=>setForm({...form, password:e.target.value})} required/>
      <button className="btn" type="submit" disabled={loading}>{loading? 'Signing in...':'Login'}</button>
    </form>
  )
}
