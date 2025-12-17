"use client";

import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from '@/context/ThemeContext'
import { FirebaseProvider } from '@/context/FirebaseContext'
import { AuthProvider } from '@/context/AuthContext'
import { NotificationSetup } from '@/components/providers/NotificationSetup'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <FirebaseProvider>
        <AuthProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#fff',
                color: '#1f2937',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#fff',
                },
              },
              error: {
                duration: 5000,
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
          <NotificationSetup />
          {children}
        </AuthProvider>
      </FirebaseProvider>
    </ThemeProvider>
  );
}

