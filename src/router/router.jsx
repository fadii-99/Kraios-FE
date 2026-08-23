/* eslint-disable react-refresh/only-export-components --
   A router module legitimately holds both the lazy page components and the
   `router` object; splitting them apart would only obscure the route tree. */
import { lazy } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'

import AppLayout from '@/layouts/AppLayout'
import DashboardLayout from '@/layouts/DashboardLayout'
import { DEFAULT_WORKFLOW_SEGMENT } from '@/lib/dashboard/projectWorkflow'

/**
 * Route-level code splitting. Only whole pages are lazy — reusable components
 * are not, since splitting those costs more in requests than it saves.
 */
// Public pages
const Home = lazy(() => import('@/pages/Home'))
const Login = lazy(() => import('@/pages/Login'))
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'))
const Signup = lazy(() => import('@/pages/Signup'))

// Dashboard pages
const DashboardHome = lazy(() => import('@/pages/dashboard/DashboardHome'))
const Projects = lazy(() => import('@/pages/dashboard/Projects'))
const Models = lazy(() => import('@/pages/dashboard/Models'))
const Estimates = lazy(() => import('@/pages/dashboard/Estimates'))
const Profile = lazy(() => import('@/pages/dashboard/Profile'))
const Subscription = lazy(() => import('@/pages/dashboard/Subscription'))

// Project workflow pages (one selected project)
const ProjectWorkspace = lazy(() => import('@/pages/dashboard/projects/ProjectWorkspace'))
const UploadStep = lazy(() => import('@/pages/dashboard/projects/UploadStep'))
const RenderingStep = lazy(() => import('@/pages/dashboard/projects/RenderingStep'))
const BoQStep = lazy(() => import('@/pages/dashboard/projects/BoQStep'))
const OutputStep = lazy(() => import('@/pages/dashboard/projects/OutputStep'))

export const router = createBrowserRouter([
  // Public website & authentication routes
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'login', element: <Login /> },
      { path: 'forgot-password', element: <ForgotPassword /> },
      { path: 'signup', element: <Signup /> },
    ],
  },

  // Logged-in Kraios dashboard routes
  {
    path: 'dashboard',
    element: <DashboardLayout />,
    children: [
      { index: true, element: <DashboardHome /> },
      { path: 'projects', element: <Projects /> },
      { path: 'models', element: <Models /> },
      { path: 'estimates', element: <Estimates /> },
      { path: 'profile', element: <Profile /> },
      { path: 'subscription', element: <Subscription /> },

      // Project workflow — the four stages are SIBLINGS under one project,
      // each independently addressable. Output is deliberately not nested
      // under BoQ, because BoQ will be optional and skippable.
      {
        path: 'projects/:projectId',
        element: <ProjectWorkspace />,
        children: [
          { index: true, element: <Navigate to={DEFAULT_WORKFLOW_SEGMENT} replace /> },
          { path: 'upload', element: <UploadStep /> },
          { path: 'rendering', element: <RenderingStep /> },
          { path: 'boq', element: <BoQStep /> },
          { path: 'output', element: <OutputStep /> },
        ],
      },
    ],
  },
])

