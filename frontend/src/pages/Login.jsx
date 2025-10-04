import React, { useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

export default function Login(){
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();
  async function submit(e){
    e.preventDefault();
    setLoading(true);
    try{
      const { data } = await axios.post((import.meta.env.VITE_API_URL||'http://localhost:5000') + '/api/auth/login', { identifier: form.identifier, password: form.password });
      localStorage.setItem('token', data.token);
      nav('/dashboard');
    }catch(err){ alert(err?.response?.data?.error || 'Error'); }
    setLoading(false);
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
