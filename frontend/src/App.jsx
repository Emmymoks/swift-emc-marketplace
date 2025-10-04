import React, { useEffect, useState } from 'react'
import { Routes, Route, Link, useNavigate } from 'react-router-dom'
import Home from './pages/Home'
import Signup from './pages/Signup'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Listings from './pages/Listings'
import ListingView from './pages/ListingView'
import AdminPanel from './pages/AdminPanel'

export default function App(){
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [mobileOpen, setMobileOpen] = useState(false)
  const nav = useNavigate()

  useEffect(()=>{
    function onStorage(){ setToken(localStorage.getItem('token')) }
    window.addEventListener('storage', onStorage)
    return ()=> window.removeEventListener('storage', onStorage)
  },[])

  function handleSignOut(){
    localStorage.removeItem('token')
    setToken(null)
    setMobileOpen(false)
    nav('/')
  }

  return (
    <div className="app">
      <header className="site-header">
        <div className="brand">
          <div className="logo"/>
          <div>
            <h1 style={{fontSize:18,margin:0}}>Swift EMC Marketplace</h1>
            <div className="muted" style={{fontSize:12}}>Modern. Fast. Secure.</div>
          </div>
        </div>

        {/* Desktop nav (hidden on small) */}
        <nav className="site-nav">
          <Link to="/">Home</Link>
          <Link to="/listings">Browse</Link>
          {/* show signup/login only when not authenticated */}
          {!token && <Link to="/signup">Sign up</Link>}
          {!token && <Link to="/login">Login</Link>}
          {/* when logged in show profile and sign out */}
          {token && <Link to="/dashboard">Profile</Link>}
          {token && <button className="btn ghost" onClick={handleSignOut} style={{marginLeft:8}}>Sign out</button>}
          {/* Admin panel link intentionally hidden from nav for safety; route remains available at /Adminpanel */}
        </nav>

        {/* Mobile hamburger */}
        <div className="mobile-controls">
          <button className="hamburger" aria-label="Toggle menu" onClick={()=>setMobileOpen(v=>!v)}>
            <span className={"bar" + (mobileOpen? ' open':'')}></span>
            <span className={"bar" + (mobileOpen? ' open':'')}></span>
            <span className={"bar" + (mobileOpen? ' open':'')}></span>
          </button>
        </div>

        {/* Mobile dropdown nav */}
        <div className={"site-nav-mobile" + (mobileOpen? ' open':'') } onClick={()=>setMobileOpen(false)}>
          <Link to="/">Home</Link>
          <Link to="/listings">Browse</Link>
          {!token && <Link to="/signup">Sign up</Link>}
          {!token && <Link to="/login">Login</Link>}
          {token && <Link to="/dashboard">Profile</Link>}
          {token && <button className="btn ghost" onClick={e=>{ e.preventDefault(); handleSignOut(); }}>Sign out</button>}
          {/* Admin link hidden in mobile nav as well */}
        </div>
      </header>

      <main className="site-main">
        <Routes>
          <Route path="/" element={<Home/>} />
          <Route path="/signup" element={<Signup/>} />
          <Route path="/login" element={<Login/>} />
          <Route path="/dashboard" element={<Dashboard/>} />
          <Route path="/listings" element={<Listings/>} />
          <Route path="/listings/:id" element={<ListingView/>} />
          <Route path="/Adminpanel" element={<AdminPanel/>} />
        </Routes>
      </main>
    </div>
  )
}
