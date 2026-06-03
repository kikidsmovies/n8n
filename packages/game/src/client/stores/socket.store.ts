import { defineStore } from 'pinia'
import { ref } from 'vue'
import { io, Socket } from 'socket.io-client'

export const useSocketStore = defineStore('socket', () => {
  const socket = ref<Socket | null>(null)
  const connected = ref(false)

  function connect(token: string) {
    if (socket.value?.connected) return

    socket.value = io('/', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    })

    socket.value.on('connect', () => { connected.value = true })
    socket.value.on('disconnect', () => { connected.value = false })
  }

  function disconnect() {
    socket.value?.disconnect()
    socket.value = null
    connected.value = false
  }

  function emit(event: string, data?: unknown) {
    socket.value?.emit(event, data)
  }

  function on(event: string, handler: (...args: unknown[]) => void) {
    socket.value?.on(event, handler)
  }

  function off(event: string, handler: (...args: unknown[]) => void) {
    socket.value?.off(event, handler)
  }

  return { socket, connected, connect, disconnect, emit, on, off }
})
