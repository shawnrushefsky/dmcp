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
      path: '/games/:gameId',
      name: 'game',
      component: () => import('../views/GameView.vue'),
      meta: { transition: 'page-slide' },
    },
    {
      path: '/games/:gameId/map',
      name: 'game-map',
      component: () => import('../views/GameMapView.vue'),
    },
    {
      path: '/games/:gameId/images',
      name: 'game-images',
      component: () => import('../views/GameImagesView.vue'),
    },
    {
      path: '/games/:gameId/characters',
      name: 'game-characters',
      component: () => import('../views/GameCharactersView.vue'),
    },
    {
      path: '/games/:gameId/locations',
      name: 'game-locations',
      component: () => import('../views/GameLocationsView.vue'),
    },
    {
      path: '/games/:gameId/quests',
      name: 'game-quests',
      component: () => import('../views/GameQuestsView.vue'),
    },
    {
      path: '/games/:gameId/history',
      name: 'game-history',
      component: () => import('../views/GameHistoryView.vue'),
    },
    {
      path: '/games/:gameId/factions',
      name: 'game-factions',
      component: () => import('../views/GameFactionsView.vue'),
    },
    {
      path: '/games/:gameId/resources',
      name: 'game-resources',
      component: () => import('../views/GameResourcesView.vue'),
    },
    {
      path: '/games/:gameId/notes',
      name: 'game-notes',
      component: () => import('../views/GameNotesView.vue'),
    },
    {
      path: '/games/:gameId/items',
      name: 'game-items',
      component: () => import('../views/GameItemsView.vue'),
    },
    {
      path: '/games/:gameId/settings',
      name: 'game-settings',
      component: () => import('../views/GameSettingsView.vue'),
    },
    {
      path: '/games/:gameId/relationships',
      name: 'game-relationships',
      component: () => import('../views/GameRelationshipsView.vue'),
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
    {
      path: '/factions/:factionId',
      name: 'faction',
      component: () => import('../views/FactionView.vue'),
      meta: { transition: 'page-slide' },
    },
    {
      path: '/items/:itemId',
      name: 'item',
      component: () => import('../views/ItemView.vue'),
      meta: { transition: 'page-slide' },
    },
  ],
})

export default router
