export function resolveImageUrl(url){
  try{
    if(!url) return ''
    const trimmed = String(url).trim()
    if(trimmed === '') return ''
    if(trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed
    // if it's already an absolute path starting with /uploads
    const base = import.meta.env.VITE_API_URL || 'http://localhost:5000'
    return base.replace(/\/$/, '') + (trimmed.startsWith('/') ? trimmed : ('/' + trimmed))
  }catch(e){ return url }
}

export const PLACEHOLDER_96 = 'https://via.placeholder.com/96'
export const PLACEHOLDER_48 = 'https://via.placeholder.com/48'
export const PLACEHOLDER_280x200 = 'https://via.placeholder.com/280x200'
export const PLACEHOLDER_320x240 = 'https://via.placeholder.com/320x240'
