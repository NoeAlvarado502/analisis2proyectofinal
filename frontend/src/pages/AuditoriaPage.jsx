import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  History,
  Search,
  Eye,
  ShieldCheck,
  FileCode,
  Calendar,
  Lock,
  ArrowRight
} from 'lucide-react';
import api from '../api/client';
import { useToast } from '../components/Toast';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import FilterDropdown from '../components/FilterDropdown';
import PageCard from '../components/PageCard';
import DatePicker from '../components/DatePicker';
import { useSearch } from '../context/SearchContext';

const FIELD_LABELS = {
  nombre: 'Nombre',
  id_categoria: 'ID Categoría',
  id_marca: 'ID Marca',
  stock_minimo: 'Stock Mínimo',
  stock_actual: 'Stock Actual',
  codigo_sku: 'Código SKU',
  edad_minima_meses: 'Edad Mínima (Meses)',
  advertencia_seguridad: 'Advertencia',
  activo: 'Estado Activo',
  razon_social: 'Razón Social',
  identificacion_fiscal: 'NIT / Identificación',
  contacto_nombre: 'Contacto',
  telefono: 'Teléfono',
  email: 'Correo Electrónico',
  direccion: 'Dirección',
  valor: 'Valor Configurado',
  clave: 'Parámetro',
  monto: 'Monto',
  metodo: 'Método de Pago',
  id_venta: 'ID Venta',
  id_pedido: 'ID Pedido',
  subtotal: 'Subtotal',
  descuento: 'Descuento',
  total: 'Total',
  saldo_pendiente: 'Saldo Pendiente',
  precio_unitario: 'Precio Unitario',
  precio_escala: 'Precio Escala',
  cantidad: 'Cantidad',
  cantidad_minima: 'Cantidad Mínima'
};

function formatFieldValue(key, val) {
  if (val === null || val === undefined) {
    return <span style={{ color: 'var(--toy-muted)', fontStyle: 'italic' }}>Sin valor</span>;
  }
  if (key === 'activo') {
    return Number(val) === 1 ? (
      <span className="badge badge-success" style={{ fontSize: '0.74rem' }}>Activo</span>
    ) : (
      <span className="badge badge-danger" style={{ fontSize: '0.74rem' }}>Inactivo</span>
    );
  }
  if (typeof val === 'boolean') {
    return val ? (
      <span className="badge badge-success" style={{ fontSize: '0.74rem' }}>Sí</span>
    ) : (
      <span className="badge badge-secondary" style={{ fontSize: '0.74rem' }}>No</span>
    );
  }
  if (typeof val === 'number' && (key.includes('monto') || key.includes('precio') || key.includes('subtotal') || key.includes('total') || key.includes('saldo') || key.includes('descuento'))) {
    return <strong style={{ color: 'var(--toy-deep-blue)' }}>Q{parseFloat(val).toFixed(2)}</strong>;
  }
  if (typeof val === 'object') {
    return <code style={{ fontSize: '0.78rem' }}>{JSON.stringify(val)}</code>;
  }
  return <span style={{ fontWeight: 600, color: 'var(--toy-ink)' }}>{String(val)}</span>;
}

function renderFriendlyState(raw, isNew = false) {
  let parsed = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = raw;
    }
  }

  if (!parsed || (typeof parsed === 'object' && Object.keys(parsed).length === 0)) {
    return (
      <div
        style={{
          padding: '1.5rem 1rem',
          textAlign: 'center',
          color: 'var(--toy-muted)',
          fontSize: '0.84rem',
          backgroundColor: isNew ? 'rgba(116, 201, 91, 0.04)' : '#FBF9F4',
          borderRadius: '12px',
          border: '1.5px dashed var(--toy-border)'
        }}
      >
        <span style={{ fontWeight: 600 }}>
          {isNew ? 'Registro eliminado o sin modificaciones posteriores' : 'Registro nuevo (No existía estado anterior)'}
        </span>
      </div>
    );
  }

  if (typeof parsed !== 'object') {
    return (
      <div style={{ padding: '0.85rem', backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid var(--toy-border-light)' }}>
        <span style={{ fontWeight: 600 }}>{String(parsed)}</span>
      </div>
    );
  }

  const entries = Object.entries(parsed);
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.45rem',
        maxHeight: '280px',
        overflowY: 'auto',
        paddingRight: '4px'
      }}
    >
      {entries.map(([k, v]) => {
        const label = FIELD_LABELS[k] || k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        return (
          <div
            key={k}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.6rem 0.85rem',
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              border: isNew ? '1.5px solid rgba(116, 201, 91, 0.35)' : '1px solid var(--toy-border-light)',
              fontSize: '0.82rem',
              gap: '0.75rem'
            }}
          >
            <span style={{ color: 'var(--toy-muted)', fontWeight: 700 }}>{label}:</span>
            <div>{formatFieldValue(k, v)}</div>
          </div>
        );
      })}
    </div>
  );
}

export default function AuditoriaPage() {
  const toast = useToast();

  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filtros
  const { query: q } = useSearch();
  const [filterModulo, setFilterModulo] = useState('');
  const [filterAccion, setFilterAccion] = useState('');
  const [filterFechaDesde, setFilterFechaDesde] = useState('');
  const [filterFechaHasta, setFilterFechaHasta] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [q]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const hoyStr = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  // Opciones dinámicas de filtros pobladas desde el backend
  const [modulosDisponibles, setModulosDisponibles] = useState([
    'Usuarios', 'Clientes', 'Proveedores', 'Productos', 'Compras', 'Pedidos', 'Ventas', 'Pagos', 'Configuración'
  ]);
  const [accionesDisponibles, setAccionesDisponibles] = useState([]);

  // Modal para ver cambios JSON
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  const fetchAuditoria = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      const queryTerm = typeof q === 'string' ? q.trim() : (q?.target?.value?.trim() || '');
      if (queryTerm) params.q = queryTerm;
      if (filterModulo) params.modulo = filterModulo;
      if (filterAccion) params.accion = filterAccion;
      if (filterFechaDesde) params.fecha_desde = filterFechaDesde;
      if (filterFechaHasta) params.fecha_hasta = filterFechaHasta;

      const res = await api.get('/auditoria', { params });
      if (res?.data) {
        setRegistros(res.data);
        if (res.meta) {
          setTotalPages(res.meta.totalPages || 1);
          setTotalRecords(res.meta.total || 0);
          if (res.meta.modulos && res.meta.modulos.length > 0) {
            setModulosDisponibles(res.meta.modulos);
          }
          if (res.meta.acciones && res.meta.acciones.length > 0) {
            setAccionesDisponibles(res.meta.acciones);
          }
        }
      }
    } catch (err) {
      toast.error(err.message || 'Error al cargar registros de auditoría');
    } finally {
      setLoading(false);
    }
  }, [page, q, filterModulo, filterAccion, filterFechaDesde, filterFechaHasta, toast]);

  useEffect(() => {
    fetchAuditoria();
  }, [fetchAuditoria]);

  const handleOpenDetail = (row) => {
    setSelectedRecord(row);
    setDetailModalOpen(true);
  };

  const getModuloBadge = (modulo) => {
    switch (modulo) {
      case 'Pedidos':
        return <span className="badge badge-primary">Pedidos</span>;
      case 'Ventas':
        return <span className="badge badge-success">Ventas</span>;
      case 'Pagos':
        return <span className="badge badge-info" style={{ backgroundColor: '#0EA5E9', color: '#fff' }}>Pagos</span>;
      case 'Compras':
        return <span className="badge badge-warning">Compras</span>;
      case 'Productos':
        return <span className="badge badge-purple">Productos</span>;
      case 'Clientes':
        return <span className="badge badge-success" style={{ backgroundColor: '#10B981', color: '#fff' }}>Clientes</span>;
      case 'Proveedores':
        return <span className="badge badge-orange" style={{ backgroundColor: 'var(--toy-orange)', color: '#fff' }}>Proveedores</span>;
      case 'Usuarios':
        return <span className="badge badge-purple" style={{ backgroundColor: '#6366F1', color: '#fff' }}>Usuarios</span>;
      default:
        return <span className="badge">{modulo}</span>;
    }
  };

  const moduloOptions = [
    { value: '', label: 'Todos los módulos', shortLabel: 'Módulos' },
    ...modulosDisponibles.map((m) => ({ value: m, label: m, shortLabel: m }))
  ];

  const accionOptions = [
    { value: '', label: 'Todas las acciones', shortLabel: 'Acciones' },
    ...accionesDisponibles.map((a) => ({ value: a, label: a, shortLabel: a }))
  ];

  const columns = [
    {
      header: 'Fecha / Hora',
      key: 'fecha_hora',
      render: (row) => (
        <span style={{ fontSize: '0.82rem', color: 'var(--toy-muted)', fontWeight: 600 }}>
          {row.fecha_hora ? new Date(row.fecha_hora).toLocaleString() : '-'}
        </span>
      )
    },
    {
      header: 'Usuario',
      key: 'usuario_nombre',
      render: (row) => (
        <span style={{ fontWeight: 700, color: 'var(--toy-ink)' }}>{row.usuario_nombre}</span>
      )
    },
    {
      header: 'Módulo',
      key: 'modulo',
      render: (row) => getModuloBadge(row.modulo)
    },
    {
      header: 'Acción',
      key: 'accion',
      render: (row) => (
        <span style={{ fontWeight: 600, color: 'var(--toy-ink)' }}>{row.accion}</span>
      )
    },
    {
      header: 'Registro',
      key: 'id_registro',
      render: (row) => (
        <code style={{ fontSize: '0.8rem', padding: '0.2rem 0.4rem', backgroundColor: '#F3EFE6', borderRadius: '6px' }}>
          {row.id_registro}
        </code>
      )
    },
    {
      header: 'IP Origen',
      key: 'ip_origen',
      render: (row) => (
        <span style={{ fontSize: '0.78rem', color: 'var(--toy-muted)' }}>
          {row.ip_origen || '127.0.0.1'}
        </span>
      )
    },
    {
      header: 'Detalle',
      key: 'acciones',
      render: (row) => (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => handleOpenDetail(row)}
            title="Ver detalle del cambio"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem' }}
          >
            <Eye size={13} />
            <span>Ver Cambios</span>
          </button>
        </div>
      )
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <PageCard title="Auditoría">
        {/* Barra de Filtros */}
        <div
          style={{
            padding: '1rem 1.25rem',
            backgroundColor: '#FAFAFA',
            borderBottom: '1px solid var(--toy-border)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.85rem',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap', alignItems: 'center', flex: 1 }}>
            <FilterDropdown
              title="Filtrar por Módulo"
              buttonTitle="Módulo"
              value={filterModulo}
              onChange={(val) => {
                setFilterModulo(val);
                setPage(1);
              }}
              options={moduloOptions}
            />

            {accionesDisponibles.length > 0 && (
              <FilterDropdown
                title="Filtrar por Acción"
                buttonTitle="Acción"
                value={filterAccion}
                onChange={(val) => {
                  setFilterAccion(val);
                  setPage(1);
                }}
                options={accionOptions}
              />
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--toy-muted)', fontWeight: 700 }}>Desde:</span>
            <DatePicker
              value={filterFechaDesde}
              onChange={(val) => {
                if (val && val > hoyStr) return;
                setFilterFechaDesde(val);
                setPage(1);
              }}
              placeholder="Desde"
              width="135px"
              max={filterFechaHasta || hoyStr}
            />
            <span style={{ fontSize: '0.78rem', color: 'var(--toy-muted)', fontWeight: 700 }}>Hasta:</span>
            <DatePicker
              value={filterFechaHasta}
              onChange={(val) => {
                if (val && val > hoyStr) return;
                setFilterFechaHasta(val);
                setPage(1);
              }}
              placeholder="Hasta"
              width="135px"
              min={filterFechaDesde || undefined}
              max={hoyStr}
              align="right"
            />
          </div>
        </div>

        {/* Tabla */}
        <DataTable
          columns={columns}
          data={registros}
          loading={loading}
          emptyMessage="No se encontraron eventos de auditoría registrados con los filtros aplicados."
          pagination={{
            page,
            currentPage: page,
            totalPages,
            totalRecords
          }}
          onPageChange={setPage}
          embedded
        />
      </PageCard>

      {/* ========================================================
          MODAL: VER CAMBIOS (DETALLE ANTERIOR VS NUEVO)
         ======================================================== */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title={
          selectedRecord
            ? `Evento de Auditoría: ${selectedRecord.modulo} - ${selectedRecord.accion}`
            : 'Detalle de Auditoría'
        }
        size="large"
      >
        {selectedRecord && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '0.75rem',
                backgroundColor: '#FFFDF9',
                border: '1.5px solid var(--toy-border)',
                borderRadius: '14px',
                padding: '0.85rem'
              }}
            >
              <div>
                <span style={{ fontSize: '0.74rem', color: 'var(--toy-muted)', fontWeight: 700 }}>Registro Afectado:</span>
                <div style={{ fontWeight: 800, color: 'var(--toy-ink)' }}>{selectedRecord.id_registro}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.74rem', color: 'var(--toy-muted)', fontWeight: 700 }}>Usuario Responsable:</span>
                <div style={{ fontWeight: 800, color: 'var(--toy-ink)' }}>{selectedRecord.usuario_nombre}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.74rem', color: 'var(--toy-muted)', fontWeight: 700 }}>Fecha y Hora:</span>
                <div style={{ fontSize: '0.84rem', color: 'var(--toy-ink)' }}>
                  {new Date(selectedRecord.fecha_hora).toLocaleString()}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.74rem', color: 'var(--toy-muted)', fontWeight: 700 }}>IP Cliente:</span>
                <div style={{ fontSize: '0.84rem', color: 'var(--toy-ink)' }}>{selectedRecord.ip_origen || '127.0.0.1'}</div>
              </div>
            </div>

            {/* Comparativa de Cambios */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div
                style={{
                  backgroundColor: '#FAF8F5',
                  border: '1.5px solid var(--toy-border)',
                  borderRadius: '14px',
                  padding: '0.85rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.65rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="badge badge-secondary" style={{ fontSize: '0.74rem' }}>Estado Anterior</span>
                </div>
                {renderFriendlyState(selectedRecord.detalle_anterior, false)}
              </div>

              <div
                style={{
                  backgroundColor: '#FAFCF8',
                  border: '1.5px solid rgba(116, 201, 91, 0.4)',
                  borderRadius: '14px',
                  padding: '0.85rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.65rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="badge badge-success" style={{ fontSize: '0.74rem' }}>Estado Nuevo</span>
                </div>
                {renderFriendlyState(selectedRecord.detalle_nuevo, true)}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDetailModalOpen(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
