import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const api = axios.create({
  baseURL: BASE,
  timeout: 15000,
  headers: { 'Accept': 'application/json' }
})

api.interceptors.request.use(cfg => {
  // ensure Content-Type for POSTs
  if (!cfg.headers['Content-Type'] && cfg.method && cfg.method.toLowerCase() === 'post') cfg.headers['Content-Type'] = 'application/json'
  return cfg
})

api.interceptors.response.use(res=>res, err=>{
  // Normalize error shape
  if (err.response && err.response.data) return Promise.reject(err)
  if (err.code === 'ECONNABORTED') return Promise.reject(new Error('Request timed out'))
  if (err.message && err.message.indexOf('Network Error') !== -1) return Promise.reject(new Error('Network error: backend unreachable'))
  return Promise.reject(err)
})

export default api
