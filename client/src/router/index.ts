import { createRouter, createWebHistory } from 'vue-router'

// Extend route meta type
declare module 'vue-router' {
  interface RouteMeta {
    transition?: 'page-fade' | 'page-slide' | 'page-slide-back'
  }
}

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../views/HomeView.vue'),
    },
    {
      path: '/sessions/:sessionId',
      name: 'session',
      component: () => import('../views/SessionView.vue'),
      meta: { transition: 'page-slide' },
    },
    {
      path: '/sessions/:sessionId/map',
      name: 'session-map',
      component: () => import('../views/SessionMapView.vue'),
    },
    {
      path: '/sessions/:sessionId/images',
      name: 'session-images',
      component: () => import('../views/SessionImagesView.vue'),
    },
    {
      path: '/sessions/:sessionId/characters',
      name: 'session-characters',
      component: () => import('../views/SessionCharactersView.vue'),
    },
    {
      path: '/sessions/:sessionId/locations',
      name: 'session-locations',
      component: () => import('../views/SessionLocationsView.vue'),
    },
    {
      path: '/sessions/:sessionId/quests',
      name: 'session-quests',
      component: () => import('../views/SessionQuestsView.vue'),
    },
    {
      path: '/sessions/:sessionId/history',
      name: 'session-history',
      component: () => import('../views/SessionHistoryView.vue'),
    },
    {
      path: '/sessions/:sessionId/factions',
      name: 'session-factions',
      component: () => import('../views/SessionFactionsView.vue'),
    },
    {
      path: '/sessions/:sessionId/resources',
      name: 'session-resources',
      component: () => import('../views/SessionResourcesView.vue'),
    },
    {
      path: '/sessions/:sessionId/notes',
      name: 'session-notes',
      component: () => import('../views/SessionNotesView.vue'),
    },
    {
      path: '/characters/:characterId',
      name: 'character',
      component: () => import('../views/CharacterView.vue'),
      meta: { transition: 'page-slide' },
    },
    {
      path: '/locations/:locationId',
      name: 'location',
      component: () => import('../views/LocationView.vue'),
      meta: { transition: 'page-slide' },
    },
    {
      path: '/quests/:questId',
      name: 'quest',
      component: () => import('../views/QuestView.vue'),
      meta: { transition: 'page-slide' },
    },
    {
      path: '/images/:imageId',
      name: 'image',
      component: () => import('../views/ImageView.vue'),
      meta: { transition: 'page-slide' },
    },
  ],
})

export default router
