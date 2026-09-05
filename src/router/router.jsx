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

// The catch-all page. Not lazy either, and for a harder reason: it is the only
// route element that renders OUTSIDE AppLayout and DashboardLayout, so there is
// no Suspense boundary above it to resolve a lazy chunk against.
import NotFoundPage from '@/pages/NotFoundPage'

// The BIM engine's workspace. Lazy like every other page, and for a harder
// reason than the rest: it is the entry point of a feature that will grow a
// 3D viewer, so its chunk must never land in the bundle of a user who does not
// open it. Part of a removable feature - see src/pages/bim/README.md.
const BimWorkspace = lazy(() => import('@/pages/bim/BimWorkspace'))
const BimPlanPage = lazy(() => import('@/pages/bim/BimPlanPage'))

// Step 1's Generate page.
const GenerateStep = lazy(
  () => import('@/pages/dashboard/projects/GenerateStep'),
)

// Step 1's full-screen workspace.
const FloorPlanAssistantPage = lazy(
  () => import('@/pages/dashboard/projects/FloorPlanAssistantPage'),
)

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

      // The BIM engine. A separate workspace with its own uploads and its own
      // state, but a route INSIDE `dashboard` so it inherits the authenticated
      // boundary and the shell rather than re-implementing them.
      { path: 'bim', element: <BimWorkspace /> },
      { path: 'bim/:sourceId', element: <BimPlanPage /> },

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
          { path: 'generate', element: <GenerateStep /> },
          { path: 'rendering', element: <RenderingStep /> },
          { path: 'boq', element: <BoQStep /> },
          { path: 'output', element: <OutputStep /> },
        ],
      },

      // Step 1's 2D Floor Plan Assistant — a SIBLING of the workspace, sharing the full right-hand workspace.
      {
        path: 'projects/:projectId/upload/assistant',
        element: (
          <RequireProject>
            <FloorPlanAssistantPage />
          </RequireProject>
        ),
      },
      {
        path: 'projects/:projectId/generate/assistant',
        element: (
          <RequireProject>
            <FloorPlanAssistantPage />
          </RequireProject>
        ),
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

  // Global catch-all for every address that matches nothing above — public,
  // dashboard-shaped or nested. A dashboard branch only matches when one of its
  // leaves matches the whole path, so /dashboard/banana and
  // /dashboard/projects/1/banana never reach DashboardLayout: they land here
  // and are answered as a page that does not exist, not as a login wall. Route
  // precedence therefore lives in this table and nowhere else.
  {
    path: '*',
    element: <NotFoundPage />,
  },
])


