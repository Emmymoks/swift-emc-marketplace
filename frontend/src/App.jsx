import React from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import Home from './pages/Home'
import Signup from './pages/Signup'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Listings from './pages/Listings'
import ListingView from './pages/ListingView'
import AdminPanel from './pages/AdminPanel'

export default function App(){
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
        <nav className="site-nav">
          <Link to="/">Home</Link>
          <Link to="/listings">Browse</Link>
          <Link to="/signup">Sign up</Link>
          <Link to="/login">Login</Link>
          {/* Admin link intentionally subtle; remove or keep hidden in production */}
          <Link to="/Adminpanel" style={{display:'none'}}>Admin</Link>
        </nav>
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
