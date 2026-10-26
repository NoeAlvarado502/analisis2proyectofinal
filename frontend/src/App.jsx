import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { ToastProvider } from './components/Toast';
import { SearchProvider } from './context/SearchContext';
import AppRoutes from './routes/AppRoutes';

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <ToastProvider>
          <SearchProvider>
            <AppRoutes />
          </SearchProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
