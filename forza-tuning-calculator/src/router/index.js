import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import CalculatorView from '../views/CalculatorView.vue'

const routes = [
  { path: '/', name: 'home', component: HomeView },
  { path: '/calculator', name: 'calculator', component: CalculatorView },
  { path: '/tunes', name: 'tune-feed', component: () => import('../views/TunesView.vue') },
  { path: '/tunes/:slug', name: 'tune-detail', component: () => import('../views/PublicTuneView.vue') },
  { path: '/vehicles', name: 'vehicle-list', component: () => import('../views/VehiclesView.vue') },
  { path: '/vehicles/:slug', name: 'vehicle-detail', component: () => import('../views/VehicleDetailView.vue') },
  { path: '/sitemap.xml', name: 'sitemap', component: () => import('../views/SitemapView.vue') },
  { path: '/upgrade', name: 'upgrade', component: () => import('../views/UpgradeView.vue') },
  { path: '/account', name: 'account', component: () => import('../views/AccountView.vue') },
  { path: '/account/builds', name: 'account-builds', component: () => import('../views/AccountBuildsView.vue') },
  { path: '/account/favorites', name: 'account-favorites', component: () => import('../views/AccountFavoritesView.vue') },
  { path: '/account/tunes', name: 'account-tunes', component: () => import('../views/MyTunesView.vue') },
  { path: '/account/tunes/:id/edit', name: 'tune-edit', component: () => import('../views/TuneEditView.vue') },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
