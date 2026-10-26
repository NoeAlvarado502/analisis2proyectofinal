import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const SearchContext = createContext({
  query: '',
  setQuery: () => {},
  placeholder: 'Buscar...',
  setPlaceholder: () => {},
  clearQuery: () => {},
  handleSearchSubmit: () => {}
});

export function SearchProvider({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [customPlaceholder, setCustomPlaceholder] = useState('');

  // Limpiar búsqueda y placeholder al cambiar de módulo/ruta
  useEffect(() => {
    setQuery('');
    setCustomPlaceholder('');
  }, [location.pathname]);

  // Placeholder simplificado adaptado automáticamente al módulo actual
  const defaultPlaceholder = useMemo(() => {
    const path = location.pathname;
    if (path.startsWith('/pedidos')) return 'Buscar pedidos...';
    if (path.startsWith('/ventas')) return 'Buscar ventas o pagos...';
    if (path.startsWith('/inventario')) return 'Buscar en inventario...';
    if (path.startsWith('/compras')) return 'Buscar compras...';
    if (path.startsWith('/productos')) return 'Buscar productos...';
    if (path.startsWith('/clientes')) return 'Buscar clientes...';
    if (path.startsWith('/proveedores')) return 'Buscar proveedores...';
    if (path.startsWith('/reportes')) return 'Buscar en reportes...';
    if (path.startsWith('/auditoria')) return 'Buscar en auditoría...';
    if (path.startsWith('/usuarios')) return 'Buscar usuarios...';
    if (path.startsWith('/roles')) return 'Buscar roles...';
    return 'Buscar...';
  }, [location.pathname]);

  const clearQuery = useCallback(() => {
    setQuery('');
  }, []);

  const handleSearchSubmit = useCallback(
    (qVal) => {
      const trimmed = (qVal !== undefined ? qVal : query).trim();
      if (!trimmed) return;
      if (location.pathname === '/inicio') {
        navigate('/productos', { state: { q: trimmed } });
      }
    },
    [location.pathname, query, navigate]
  );

  return (
    <SearchContext.Provider
      value={{
        query,
        setQuery,
        placeholder: customPlaceholder || defaultPlaceholder,
        setPlaceholder: setCustomPlaceholder,
        clearQuery,
        handleSearchSubmit
      }}
    >
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  return useContext(SearchContext);
}
