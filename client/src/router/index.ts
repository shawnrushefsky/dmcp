import { createRouter, createWebHistory } from 'vue-router'

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
      path: '/characters/:characterId',
      name: 'character',
      component: () => import('../views/CharacterView.vue'),
    },
    {
      path: '/locations/:locationId',
      name: 'location',
      component: () => import('../views/LocationView.vue'),
    },
    {
      path: '/quests/:questId',
      name: 'quest',
      component: () => import('../views/QuestView.vue'),
    },
    {
      path: '/images/:imageId',
      name: 'image',
      component: () => import('../views/ImageView.vue'),
    },
  ],
})

export default router
