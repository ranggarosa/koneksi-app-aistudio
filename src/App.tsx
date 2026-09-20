import React from 'react'
import { BrowserRouter } from 'react-router-dom'
import { AppRoutes } from '@/routes/AppRoutes'
import { AuthProvider } from '@/features/auth/auth.controller'

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
