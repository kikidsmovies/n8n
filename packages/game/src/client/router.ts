import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from './stores/auth.store'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/lobby' },
    { path: '/login', component: () => import('./ui/views/LoginView.vue') },
    { path: '/lobby', component: () => import('./ui/views/LobbyView.vue'), meta: { requiresAuth: true } },
    { path: '/game', component: () => import('./ui/views/GameView.vue'), meta: { requiresAuth: true } },
    { path: '/shop', component: () => import('./ui/views/ShopView.vue'), meta: { requiresAuth: true } },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.token) {
    return '/login'
  }
})

export default router
