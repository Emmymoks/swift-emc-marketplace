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
    <div style={{fontFamily: 'Inter, system-ui, Arial', padding: 10}}>
      <header style={{display:'flex',gap:12,alignItems:'center',justifyContent:'space-between'}}>
        <h1>Swift EMC Marketplace</h1>
        <nav>
          <Link to="/">Home</Link> | <Link to="/listings">Browse</Link> | <Link to="/signup">Sign up</Link> | <Link to="/login">Login</Link>
        </nav>
      </header>
      <main style={{marginTop:20}}>
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
