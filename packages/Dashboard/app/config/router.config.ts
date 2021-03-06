import { IRoute } from 'umi-types/config';

// umi routes: https://umijs.org/zh/guide/router.html
export const routes: IRoute[] = [
  {
    path: '/user',
    component: '../layouts/UserLayout',
    routes: [
      { path: '/user', redirect: '/user/login' },
      { path: '/user/login', name: 'login', component: './user/login' },
      {
        component: './404',
      },
    ],
  },
  {
    path: '/',
    component: '../layouts/BasicLayout',
    Routes: ['src/pages/Authorized'],
    authority: ['admin', 'user'],
    routes: [
      { path: '/', redirect: '/home' },
      {
        path: '/home',
        name: 'dashboard',
        icon: 'dashboard',
        routes: [
          { path: '/home', redirect: '/home/monitor' },
          {
            path: '/home/monitor',
            name: 'monitor',
            component: './dashboard/Monitor',
          },
          {
            name: 'analysis',
            path: '/home/analysis',
            component: './dashboard/analysis',
          },
        ],
      },
      {
        path: '/notify',
        name: 'notify',
        icon: 'notification',
        component: './notify',
      },
      {
        path: '/deploy',
        name: 'deploy',
        icon: 'cloud-upload',
        component: './deploy',
      },
      {
        component: './404',
      },
    ],
  },
  {
    component: './404',
  },
];

export default routes;
