#!/usr/bin/env node
// update_db_image_urls.js
// Scans User.profilePhotoUrl and Listing.images for local uploads and replaces with S3 URL.
// Usage: set env MONGODB_URI and either S3_BASE_URL or S3_BUCKET + AWS_REGION, then run:
// node update_db_image_urls.js

require('dotenv').config()
const mongoose = require('mongoose')
const User = require('../models/User')
const Listing = require('../models/Listing')
const path = require('path')

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/swift_emc'
const bucket = process.env.S3_BUCKET || process.env.AWS_S3_BUCKET
const region = process.env.AWS_REGION || 'us-east-1'
const baseUrl = process.env.S3_BASE_URL || (bucket ? `https://${bucket}.s3.${region}.amazonaws.com` : null)

if (!baseUrl) {
  console.error('S3_BASE_URL or S3_BUCKET+AWS_REGION is required in env to construct new URLs')
  process.exit(1)
}

async function run(){
  await mongoose.connect(MONGODB_URI)
  console.log('Connected to', MONGODB_URI)

  // Helper to convert local upload URL to S3 URL if possible
  function convertUrl(url){
    if(!url) return url
    try{
      // detect '/uploads/filename' or full host '/uploads/filename'
      const idx = url.indexOf('/uploads/')
      if(idx === -1) return url
      const filename = url.substring(idx + '/uploads/'.length)
      if(!filename) return url
      return `${baseUrl}/${encodeURIComponent(filename)}`
    }catch(e){ return url }
  }

  // Users
  const users = await User.find({ profilePhotoUrl: /uploads\//i }).lean()
  console.log('Found', users.length, 'users with local uploads')
  for(const u of users){
    const newUrl = convertUrl(u.profilePhotoUrl)
    if(newUrl && newUrl !== u.profilePhotoUrl){
      await User.updateOne({ _id: u._id }, { $set: { profilePhotoUrl: newUrl } })
      console.log('Updated user', u._id, '->', newUrl)
    }
  }

  // Listings
  const listings = await Listing.find({ images: /uploads\//i }).lean()
  console.log('Found', listings.length, 'listings with local uploads')
  for(const l of listings){
    const newImages = (l.images || []).map(img => convertUrl(img))
    await Listing.updateOne({ _id: l._id }, { $set: { images: newImages } })
    console.log('Updated listing', l._id)
  }

  console.log('Done')
  process.exit(0)
}

run().catch(err=>{ console.error(err); process.exit(2) })
