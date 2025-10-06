#!/usr/bin/env node
// migrate_uploads_to_s3.js
// Usage: node migrate_uploads_to_s3.js [--delete]
// Requires AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION and S3_BUCKET env vars

require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3')

const uploadsDir = path.join(__dirname, '..', 'uploads')
const bucket = process.env.S3_BUCKET || process.env.AWS_S3_BUCKET
const region = process.env.AWS_REGION || 'us-east-1'

if (!bucket) {
  console.error('S3_BUCKET (or AWS_S3_BUCKET) environment variable is required')
  process.exit(1)
}

const client = new S3Client({ region })

const args = process.argv.slice(2)
const doDelete = args.includes('--delete')

async function uploadFile(filePath, key) {
  const stream = fs.createReadStream(filePath)
  const params = {
    Bucket: bucket,
    Key: key,
    Body: stream,
    ACL: process.env.AWS_S3_ACL || 'public-read'
  }
  await client.send(new PutObjectCommand(params))
  const baseUrl = process.env.S3_BASE_URL || `https://${bucket}.s3.${region}.amazonaws.com`
  return `${baseUrl}/${encodeURIComponent(key)}`
}

async function main(){
  if(!fs.existsSync(uploadsDir)){
    console.error('Uploads directory not found:', uploadsDir)
    process.exit(1)
  }
  const files = fs.readdirSync(uploadsDir).filter(f=> fs.statSync(path.join(uploadsDir,f)).isFile())
  if(files.length===0){ console.log('No files to migrate'); return }
  console.log(`Found ${files.length} files to upload to bucket ${bucket}`)

  for(const f of files){
    const full = path.join(uploadsDir, f)
    try{
      const url = await uploadFile(full, f)
      console.log('Uploaded', f, '->', url)
      if(doDelete){ try{ fs.unlinkSync(full); console.log('Deleted local file', f) }catch(e){ console.warn('Failed to delete', f, e) }}
    }catch(e){ console.error('Failed uploading', f, e) }
  }
}

main().catch(err=>{ console.error(err); process.exit(2) })
