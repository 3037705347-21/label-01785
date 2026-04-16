import { createRouter, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Browser',
    component: () => import('@/views/BrowserView.vue')
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
