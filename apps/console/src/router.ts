import {
  createRouter,
  createWebHistory,
  type RouterHistory,
} from 'vue-router'

const RouteState = { render: () => null }

export function createConsoleRouter(history: RouterHistory = createWebHistory()) {
  return createRouter({
    history,
    routes: [
      { path: '/', redirect: '/projects' },
      { path: '/projects', name: 'projects', component: RouteState },
      { path: '/guide', name: 'guide', component: RouteState },
      {
        path: '/projects/:projectId/apps',
        name: 'applications',
        component: RouteState,
      },
      {
        path: '/projects/:projectId/apps/:appId/monitor',
        name: 'monitor',
        component: RouteState,
      },
    ],
  })
}

export const router = createConsoleRouter()
