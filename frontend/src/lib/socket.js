import { io as ioClient } from 'socket.io-client'

let socket = null
export function getSocket(){
  if(socket) return socket
  const base = import.meta.env.VITE_API_WS || (import.meta.env.VITE_API_URL || 'http://localhost:5000')
  socket = ioClient(base, { transports: ['websocket'], reconnection: true })
  return socket
}

export function closeSocket(){ if(socket){ try{ socket.disconnect() }catch(e){} socket = null } }
