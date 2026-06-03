<template>
  <div class="login-container">
    <div class="login-box">
      <div class="title">
        <span class="gem">💎</span>
        <h1>MAZE BRAWL</h1>
        <span class="gem">💎</span>
      </div>
      <p class="subtitle">Multiplayer 3D Maze Battle</p>

      <div class="tabs">
        <button :class="{ active: mode === 'login' }" @click="mode = 'login'">Login</button>
        <button :class="{ active: mode === 'register' }" @click="mode = 'register'">Register</button>
      </div>

      <form @submit.prevent="submit">
        <input v-model="username" type="text" placeholder="Username" maxlength="20" autocomplete="username" />
        <input v-model="password" type="password" placeholder="Password" autocomplete="current-password" />
        <button type="submit" class="btn-primary" :disabled="loading">
          {{ loading ? 'Loading...' : mode === 'login' ? 'Enter Game' : 'Create Account' }}
        </button>
      </form>

      <p v-if="error" class="error">{{ error }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth.store'

const router = useRouter()
const auth = useAuthStore()

const mode = ref<'login' | 'register'>('login')
const username = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

async function submit() {
  error.value = ''
  loading.value = true
  try {
    const endpoint = mode.value === 'login' ? '/api/auth/login' : '/api/auth/register'
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.value, password: password.value }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed')
    auth.setAuth(data.token, data.player)
    router.push('/lobby')
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Error'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: radial-gradient(ellipse at center, #1a1a3e 0%, #0a0a1a 100%);
}

.login-box {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(100,150,255,0.3);
  border-radius: 16px;
  padding: 40px;
  width: 360px;
  text-align: center;
  backdrop-filter: blur(10px);
  box-shadow: 0 0 40px rgba(50,100,255,0.2);
}

.title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 8px;
}

.title h1 {
  font-size: 2rem;
  font-weight: 900;
  color: #fff;
  text-shadow: 0 0 20px rgba(100,150,255,0.8);
  letter-spacing: 2px;
}

.gem { font-size: 1.5rem; }

.subtitle {
  color: rgba(255,255,255,0.5);
  margin-bottom: 24px;
  font-size: 0.85rem;
}

.tabs {
  display: flex;
  margin-bottom: 20px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.1);
}

.tabs button {
  flex: 1;
  padding: 10px;
  background: transparent;
  border: none;
  color: rgba(255,255,255,0.5);
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.tabs button.active {
  background: rgba(100,150,255,0.3);
  color: #fff;
}

form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

input {
  padding: 12px 16px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  color: #fff;
  font-size: 1rem;
  outline: none;
  transition: border-color 0.2s;
}

input:focus { border-color: rgba(100,150,255,0.6); }

.btn-primary {
  padding: 14px;
  background: linear-gradient(135deg, #4466ff, #2244cc);
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.1s, box-shadow 0.2s;
  box-shadow: 0 4px 15px rgba(68,102,255,0.4);
}

.btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(68,102,255,0.6); }
.btn-primary:active { transform: translateY(0); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

.error {
  color: #ff6666;
  margin-top: 12px;
  font-size: 0.85rem;
}
</style>
