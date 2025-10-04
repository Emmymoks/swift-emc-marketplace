import React, { useEffect, useState } from 'react'
import axios from 'axios'
export default function Dashboard(){
  const [me, setMe] = useState(null);
  const [listing, setListing] = useState({});
  useEffect(()=>{ /* fetch user profile when logged in */ }, []);
  async function createListing(e){
    e.preventDefault();
    try{
      const token = localStorage.getItem('token');
      const { data } = await axios.post((import.meta.env.VITE_API_URL||'http://localhost:5000') + '/api/listings', listing, { headers: { Authorization: 'Bearer '+token } });
      alert('Listing created and is pending admin approval.');
    }catch(err){ alert('Error creating listing'); }
  }
  return (
    <div>
      <h2>Dashboard</h2>
      <p>Post a new listing (will be pending admin approval)</p>
      <form onSubmit={createListing}>
        <input placeholder="Title" onChange={e=>setListing({...listing, title:e.target.value})} required/><br/>
        <select onChange={e=>setListing({...listing, type:e.target.value})}>
          <option value="item">Item</option>
          <option value="service">Service</option>
        </select><br/>
        <input placeholder="Category" onChange={e=>setListing({...listing, category:e.target.value})} /><br/>
        <input placeholder="Price" type="number" onChange={e=>setListing({...listing, price:parseFloat(e.target.value)})} /><br/>
        <textarea placeholder="Description" onChange={e=>setListing({...listing, description:e.target.value})} /><br/>
        <button type="submit">Create (Pending)</button>
      </form>
    </div>
  )
}
