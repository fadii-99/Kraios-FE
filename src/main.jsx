import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'

import KraiosToaster from '@/components/ui/KraiosToaster'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProfileProvider } from '@/contexts/ProfileContext'
import { router } from '@/router/router'
import '@/styles/index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <ProfileProvider>
        <RouterProvider router={router} />
        <KraiosToaster />
      </ProfileProvider>
    </AuthProvider>
  </StrictMode>,
)


