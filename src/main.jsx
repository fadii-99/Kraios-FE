import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'

import KraiosToaster from '@/components/ui/KraiosToaster'
import { router } from '@/router/router'
import '@/styles/index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
    <KraiosToaster />
  </StrictMode>,
)
