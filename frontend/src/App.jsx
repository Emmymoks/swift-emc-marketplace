import React, { useEffect, useState } from 'react'
import { Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import Signup from './pages/Signup'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import AdminLogin from './pages/AdminLogin'
import Listings from './pages/Listings'
import ListingView from './pages/ListingView'
import AdminPanel from './pages/AdminPanel'
import UserProfile from './pages/UserProfile'
import MyListings from './pages/MyListings'
import EditListing from './pages/EditListing'

export default function App(){
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [isAdmin, setIsAdmin] = useState(!!sessionStorage.getItem('admin_secret'))
  const [mobileOpen, setMobileOpen] = useState(false)
  const nav = useNavigate()

  useEffect(()=>{
    function onStorage(){ setToken(localStorage.getItem('token')) }
    function onTokenChange(){ setToken(localStorage.getItem('token')) }
    function onAdminChange(){ setIsAdmin(!!sessionStorage.getItem('admin_secret')) }
    window.addEventListener('storage', onStorage)
    window.addEventListener('tokenChange', onTokenChange)
    window.addEventListener('adminChange', onAdminChange)
    return ()=> { window.removeEventListener('storage', onStorage); window.removeEventListener('tokenChange', onTokenChange); window.removeEventListener('adminChange', onAdminChange) }
  },[])

  function handleSignOut(){
    localStorage.removeItem('token')
    setToken(null)
    setMobileOpen(false)
    window.dispatchEvent(new Event('tokenChange'))
    nav('/')
  }

  function handleAdminSignOut(){
    sessionStorage.removeItem('admin_secret')
    setIsAdmin(false)
    window.dispatchEvent(new Event('adminChange'))
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
          {/* when logged in show profile, add listing and sign out */}
          {token && <Link to="/profile">Profile</Link>}
          {token && <Link to="/add-listing">Add listing</Link>}
          {token && <Link to="/my-listings">My listings</Link>}
          {token && <button className="btn ghost" onClick={handleSignOut} style={{marginLeft:8}}>Sign out</button>}
          {isAdmin && <button className="btn ghost" onClick={handleAdminSignOut} style={{marginLeft:8}}>Admin logout</button>}
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
          {token && <Link to="/profile">Profile</Link>}
          {token && <Link to="/add-listing">Add listing</Link>}
          {token && <button className="btn ghost" onClick={e=>{ e.preventDefault(); handleSignOut(); }}>Sign out</button>}
          {isAdmin && <button className="btn ghost" onClick={e=>{ e.preventDefault(); handleAdminSignOut(); }}>Admin logout</button>}
        </div>
      </header>

      <main className="site-main">
        <Routes>
          <Route path="/" element={<Home/>} />
          <Route path="/signup" element={<Signup/>} />
          <Route path="/login" element={<Login/>} />
          <Route path="/profile" element={<Profile/>} />
          <Route path="/add-listing" element={<Dashboard/>} />
          <Route path="/dashboard" element={<Dashboard/>} />
          <Route path="/admin-login" element={<AdminLogin/>} />
          <Route path="/listings" element={<Listings/>} />
          <Route path="/listings/:id" element={<ListingView/>} />
          <Route path="/user/:username" element={<UserProfile/>} />
          <Route path="/my-listings" element={<MyListings/>} />
          <Route path="/edit-listing/:id" element={<EditListing/>} />
          <Route path="/Adminpanel" element={isAdmin ? <AdminPanel/> : <Navigate to="/admin-login" replace />} />
        </Routes>
      </main>
    </div>
  )
}
