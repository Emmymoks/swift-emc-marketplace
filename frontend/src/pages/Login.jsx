import React, { useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

export default function Login(){
  const [form, setForm] = useState({});
  const nav = useNavigate();
  async function submit(e){
    e.preventDefault();
    try{
      const { data } = await axios.post((import.meta.env.VITE_API_URL||'http://localhost:5000') + '/api/auth/login', { identifier: form.identifier, password: form.password });
      localStorage.setItem('token', data.token);
      nav('/dashboard');
    }catch(err){ alert(err?.response?.data?.error || 'Error'); }
  }
  return (
    <form onSubmit={submit}>
      <h3>Login</h3>
      <input placeholder="Email or Username" onChange={e=>setForm({...form, identifier:e.target.value})} required/><br/>
      <input placeholder="Password" type="password" onChange={e=>setForm({...form, password:e.target.value})} required/><br/>
      <button type="submit">Login</button>
    </form>
  )
}
