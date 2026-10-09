import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from '../components/Layout';
import ProtectedRoute from './ProtectedRoute';
import LoginPage from '../pages/LoginPage';
import HomePage from '../pages/HomePage';
import UsuariosPage from '../pages/UsuariosPage';
import RolesPage from '../pages/RolesPage';
import ClientesPage from '../pages/ClientesPage';
import ProductosPage from '../pages/ProductosPage';
import { useAuth } from '../auth/AuthContext';

export default function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Public Route */}
      <Route
        path="/login"
        element={user ? <Navigate to="/inicio" replace /> : <LoginPage />}
      />

      {/* Protected Routes inside App Layout */}
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/" element={<Navigate to="/inicio" replace />} />
        <Route path="/inicio" element={<HomePage />} />

        {/* Granular RBAC Protected Routes */}
        <Route
          path="/usuarios"
          element={
            <ProtectedRoute requiredPermission="usuarios.gestionar">
              <UsuariosPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/roles"
          element={
            <ProtectedRoute requiredPermission="roles.gestionar">
              <RolesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/clientes"
          element={
            <ProtectedRoute requiredPermission="clientes.consultar">
              <ClientesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/productos"
          element={
            <ProtectedRoute requiredPermission="productos.consultar">
              <ProductosPage />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/inicio" replace />} />
    </Routes>
  );
}
