import React, { useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

export default function Signup(){
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();
  async function submit(e){
    e.preventDefault();
    setLoading(true);
    try{
      const { data } = await axios.post((import.meta.env.VITE_API_URL||'http://localhost:5000') + '/api/auth/signup', form);
      localStorage.setItem('token', data.token);
      nav('/dashboard');
    }catch(err){ alert(err?.response?.data?.error || 'Error'); }
    setLoading(false);
  }
  return (
    <form onSubmit={submit} className="page" style={{maxWidth:640}}>
      <h3>Create account</h3>
      <div className="form-row">
        <div className="form-col"><input placeholder="Full name" onChange={e=>setForm({...form, fullName:e.target.value})} required/></div>
        <div className="form-col"><input placeholder="Location" onChange={e=>setForm({...form, location:e.target.value})} /></div>
      </div>
      <input placeholder="Username" onChange={e=>setForm({...form, username:e.target.value})} required/>
      <input placeholder="Phone (+countrycode)" onChange={e=>setForm({...form, phone:e.target.value})} />
      <input placeholder="Email" type="email" onChange={e=>setForm({...form, email:e.target.value})} required/>
      <input placeholder="Password" type="password" onChange={e=>setForm({...form, password:e.target.value})} required/>
      <input placeholder="Security question (eg. first school)" onChange={e=>setForm({...form, securityQuestion:e.target.value})} required/>
      <input placeholder="Security answer" onChange={e=>setForm({...form, securityAnswer:e.target.value})} required/>
      <button className="btn" type="submit" disabled={loading}>{loading? 'Creating...':'Sign up'}</button>
    </form>
  )
}
