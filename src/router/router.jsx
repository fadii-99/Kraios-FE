/* eslint-disable react-refresh/only-export-components --
   A router module legitimately holds both the lazy page components and the
   `router` object; splitting them apart would only obscure the route tree. */
import { lazy } from 'react'
import { createBrowserRouter } from 'react-router-dom'

import AppLayout from '@/layouts/AppLayout'

/**
 * Route-level code splitting. Only whole pages are lazy — reusable components
 * are not, since splitting those costs more in requests than it saves.
 */
const Home = lazy(() => import('@/pages/Home'))
const Login = lazy(() => import('@/pages/Login'))
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'))
const Signup = lazy(() => import('@/pages/Signup'))

/**
 * One router, one parent layout. The landing page is a child route like any
 * other, so the Navbar is mounted once and never remounts between pages.
 */
export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'login', element: <Login /> },
      { path: 'forgot-password', element: <ForgotPassword /> },
      { path: 'signup', element: <Signup /> },
    ],
  },
])
