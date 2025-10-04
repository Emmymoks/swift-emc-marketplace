import React, { useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

export default function Signup(){
  const [form, setForm] = useState({});
  const nav = useNavigate();
  async function submit(e){
    e.preventDefault();
    try{
      const { data } = await axios.post((import.meta.env.VITE_API_URL||'http://localhost:5000') + '/api/auth/signup', form);
      localStorage.setItem('token', data.token);
      nav('/dashboard');
    }catch(err){ alert(err?.response?.data?.error || 'Error'); }
  }
  return (
    <form onSubmit={submit}>
      <h3>Create account</h3>
      <input placeholder="Full name" onChange={e=>setForm({...form, fullName:e.target.value})} required/><br/>
      <input placeholder="Location" onChange={e=>setForm({...form, location:e.target.value})} /><br/>
      <input placeholder="Username" onChange={e=>setForm({...form, username:e.target.value})} required/><br/>
      <input placeholder="Phone (+countrycode)" onChange={e=>setForm({...form, phone:e.target.value})} /><br/>
      <input placeholder="Email" type="email" onChange={e=>setForm({...form, email:e.target.value})} required/><br/>
      <input placeholder="Password" type="password" onChange={e=>setForm({...form, password:e.target.value})} required/><br/>
      <input placeholder="Security question (eg. first school)" onChange={e=>setForm({...form, securityQuestion:e.target.value})} required/><br/>
      <input placeholder="Security answer" onChange={e=>setForm({...form, securityAnswer:e.target.value})} required/><br/>
      <button type="submit">Sign up</button>
    </form>
  )
}
