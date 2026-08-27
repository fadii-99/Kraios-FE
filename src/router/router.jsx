/* eslint-disable react-refresh/only-export-components --
   A router module legitimately holds both the lazy page components and the
   `router` object; splitting them apart would only obscure the route tree. */
import { lazy } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'

import AppLayout from '@/layouts/AppLayout'
import DashboardLayout from '@/layouts/DashboardLayout'
import { DEFAULT_WORKFLOW_SEGMENT } from '@/lib/dashboard/workflow/projectWorkflow'

/**
 * Route-level code splitting. Only whole pages are lazy — reusable components
 * are not, since splitting those costs more in requests than it saves.
 */
// Public pages
const Home = lazy(() => import('@/pages/Home'))
const Login = lazy(() => import('@/pages/Login'))
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'))
const ResetPassword = lazy(() => import('@/pages/ResetPassword'))
const Signup = lazy(() => import('@/pages/Signup'))

// Dashboard pages
const DashboardHome = lazy(() => import('@/pages/dashboard/DashboardHome'))
const Projects = lazy(() => import('@/pages/dashboard/Projects'))
const Profile = lazy(() => import('@/pages/dashboard/Profile'))
const Subscription = lazy(() => import('@/pages/dashboard/Subscription'))

// Project workflow pages (one selected project)
const ProjectWorkspace = lazy(() => import('@/pages/dashboard/projects/ProjectWorkspace'))
const UploadStep = lazy(() => import('@/pages/dashboard/projects/UploadStep'))
const RenderingStep = lazy(() => import('@/pages/dashboard/projects/RenderingStep'))
const BoQStep = lazy(() => import('@/pages/dashboard/projects/BoQStep'))
const OutputStep = lazy(() => import('@/pages/dashboard/projects/OutputStep'))

// The project-existence guard. Not lazy: it is tiny, and every project route
// renders it before anything else.
import RequireProject from '@/pages/dashboard/projects/RequireProject'

// Step 2's full-screen workspace. A page, not a stage — see the route below.
const DesignAssistantPage = lazy(
  () => import('@/pages/dashboard/projects/DesignAssistantPage'),
)

// Step 3's full-screen workspace.
const BoQAssistantPage = lazy(
  () => import('@/pages/dashboard/projects/BoQAssistantPage'),
)

export const router = createBrowserRouter([
  // Public website & authentication routes
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'login', element: <Login /> },
      { path: 'forgot-password', element: <ForgotPassword /> },
      { path: 'reset-password', element: <ResetPassword /> },
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
      { path: 'profile', element: <Profile /> },
      { path: 'subscription', element: <Subscription /> },

      // Project workflow — the four stages are SIBLINGS under one project,
      // each independently addressable. Output is deliberately not nested
      // under BoQ, because BoQ will be optional and skippable.
      {
        path: 'projects/:projectId',
        element: (
          <RequireProject>
            <ProjectWorkspace />
          </RequireProject>
        ),
        children: [
          { index: true, element: <Navigate to={DEFAULT_WORKFLOW_SEGMENT} replace /> },
          { path: 'upload', element: <UploadStep /> },
          { path: 'rendering', element: <RenderingStep /> },
          { path: 'boq', element: <BoQStep /> },
          { path: 'output', element: <OutputStep /> },
        ],
      },

      // Step 2's Design Assistant — a SIBLING of the workspace, not a child of
      // it. It is still inside `dashboard`, so it shares `ProjectsProvider` and
      // therefore the same Step 2 state; but it is outside `ProjectWorkspace`,
      // so it does not inherit the stepper and the Previous/Next bar it is
      // meant to replace for the duration of the task. The dashboard shell —
      // sidebar, mobile nav and page surface — stays: "full screen" here means
      // the full right-hand workspace, not a second shell or a modal.
      {
        path: 'projects/:projectId/rendering/assistant',
        element: (
          <RequireProject>
            <DesignAssistantPage />
          </RequireProject>
        ),
      },

      // Step 3's BoQ Assistant — a SIBLING of the workspace, sharing the full
      // right-hand workspace.
      {
        path: 'projects/:projectId/boq/assistant',
        element: (
          <RequireProject>
            <BoQAssistantPage />
          </RequireProject>
        ),
      },
    ],
  },
])


