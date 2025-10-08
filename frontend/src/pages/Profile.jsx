// frontend/src/pages/Profile.jsx
import React, { useEffect, useState, useRef, Suspense } from 'react'
import axios from 'axios'

export default function Profile() {
  const [me, setMe] = useState(null)
  const [edit, setEdit] = useState({})
  const [loading, setLoading] = useState(false)
  const [SupportChatComponent, setSupportChatComponent] = useState(null)
  const mounted = useRef(true)
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000'

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  useEffect(()=>{ loadProfile() }, [])

  async function loadProfile() {
    try {
      const token = localStorage.getItem('token')
      if (!token) return
      const { data } = await axios.get(`${baseUrl}/api/auth/profile`, { headers: { Authorization: 'Bearer ' + token } })
      if (!mounted.current) return
      setMe(data.user)
      setEdit({
        fullName: data.user.fullName || '',
        email: data.user.email || '',
        phone: data.user.phone || '',
        location: data.user.location || '',
        bio: data.user.bio || '',
        profilePhotoUrl: data.user.profilePhotoUrl || ''
      })
    } catch (e) {
      console.error('Profile load failed:', e)
      localStorage.removeItem('token')
      if (mounted.current) setMe(null)
    }
  }

  async function save(e){
    e?.preventDefault()
    setLoading(true)
    try{
      const token = localStorage.getItem('token')
      const { data } = await axios.put(`${baseUrl}/api/auth/profile`, edit, { headers: { Authorization: 'Bearer '+token } })
      if (mounted.current) {
        setMe(data.user)
        alert('Profile updated')
      }
    }catch(err){ alert(err?.response?.data?.error || 'Error') }
    if (mounted.current) setLoading(false)
  }

  async function uploadFile(file){
    if(!file) return null
    const fd = new FormData(); fd.append('file', file)
    const res = await axios.post(`${baseUrl}/api/upload`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    return res.data.url
  }

  async function onSelectFile(e){
    const f = e.target.files && e.target.files[0]
    if(!f) return
    try{
      const url = await uploadFile(f)
      const newEdit = {...edit, profilePhotoUrl: url}
      setEdit(newEdit)
      // auto-save profile photo change (no form submit event)
      try{ await save() }catch(e){}
    }catch(e){ alert('Upload failed') }
  }

  async function recoverPassword(){
    const identifier = prompt('Enter your email or username to recover')
    if(!identifier) return
    try{
      const res = await axios.post(`${baseUrl}/api/auth/recover`, { emailOrUsername: identifier })
      if(res.data.securityQuestion){
        const answer = prompt(res.data.securityQuestion)
        const newPassword = prompt('Enter new password')
        if(!answer || !newPassword) return
        await axios.post(`${baseUrl}/api/auth/recover`, { emailOrUsername: identifier, securityAnswer: answer, newPassword })
        alert('Password reset')
      } else alert('Check your email or contact support')
    }catch(e){ alert('Recover failed') }
  }

  // dynamically load SupportChat after profile is present to avoid runtime errors
  useEffect(()=>{
    let active = true
    if (!me) return
    import('../components/SupportChat').then(mod=>{
      if(active && mounted.current) setSupportChatComponent(()=>mod.default)
    }).catch(err=>{
      console.warn('SupportChat import failed', err)
      setSupportChatComponent(null)
    })
    return ()=>{ active = false }
  },[me])

  if(!me) return <div className="page"><h2>Please log in to view your profile.</h2></div>

  return (
    <>
      <div className="page">
        <h2>Your Profile</h2>
        <div style={{display:'flex',gap:12,alignItems:'center'}}>
          <img src={me.profilePhotoUrl||'https://via.placeholder.com/96'} alt="avatar" style={{width:96,height:96,borderRadius:12,objectFit:'cover'}}/>
          <div>
            <label className="btn ghost" style={{display:'inline-block'}}>
              Change photo
              <input type="file" accept="image/*" onChange={onSelectFile} style={{display:'none'}} />
            </label>
          </div>
          <div style={{flex:1}}>
            <div style={{fontWeight:700}}>{me.fullName}</div>
            <div className="muted">{me.email}</div>
          </div>
        </div>

        <form onSubmit={save} style={{maxWidth:640,marginTop:12}}>
          <input placeholder="Full name" value={edit.fullName||''} onChange={e=>setEdit({...edit, fullName:e.target.value})} />
          <input placeholder="Email" value={edit.email||''} onChange={e=>setEdit({...edit, email:e.target.value})} />
          <input placeholder="Phone" value={edit.phone||''} onChange={e=>setEdit({...edit, phone:e.target.value})} />
          <input placeholder="Location" value={edit.location||''} onChange={e=>setEdit({...edit, location:e.target.value})} />
          <input placeholder="Profile photo URL" value={edit.profilePhotoUrl||''} onChange={e=>setEdit({...edit, profilePhotoUrl:e.target.value})} />
          <textarea placeholder="Bio" value={edit.bio||''} onChange={e=>setEdit({...edit, bio:e.target.value})} />
          <div style={{display:'flex',gap:8}}>
            <button className="btn" type="submit" disabled={loading}>{loading? 'Saving...':'Save profile'}</button>
            <button type="button" className="btn ghost" onClick={recoverPassword}>Reset password</button>
          </div>
        </form>
      </div>

      <Suspense fallback={null}>
        {SupportChatComponent ? <SupportChatComponent user={me} /> : null}
      </Suspense>
    </>
  )
}
