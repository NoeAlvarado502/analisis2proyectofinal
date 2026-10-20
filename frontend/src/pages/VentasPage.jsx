import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
  ShoppingBag,
  CreditCard,
  Plus,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Receipt,
  AlertTriangle,
  Send,
  CheckCheck,
  Trash2
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/Toast';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import FormField from '../components/FormField';
import SearchInput from '../components/SearchInput';
import FilterDropdown from '../components/FilterDropdown';
import SearchableSelect from '../components/SearchableSelect';
import ToySwitch from '../components/ToySwitch';
import PageCard from '../components/PageCard';
import DatePicker from '../components/DatePicker';

export default function VentasPage() {
  const { can } = useAuth();
  const toast = useToast();
  const location = useLocation();

  const canRegisterVentas = can('ventas.registrar');
  const canRegisterPagos = can('pagos.registrar');

  // Pestaña activa ('facturas' | 'pagos')
  const [activeTab, setActiveTab] = useState('facturas');

  // ========================================================
  // PESTAÑA 1: FACTURAS DE VENTA
  // ========================================================
  const [ventas, setVentas] = useState([]);
  const [loadingVentas, setLoadingVentas] = useState(false);
  const [qVentas, setQVentas] = useState('');
  const [filterEstadoVenta, setFilterEstadoVenta] = useState('');
  const [soloSaldoPendiente, setSoloSaldoPendiente] = useState(false);
  const [filterFechaDesde, setFilterFechaDesde] = useState('');
  const [filterFechaHasta, setFilterFechaHasta] = useState('');
  const [pageVentas, setPageVentas] = useState(1);
  const [totalPagesVentas, setTotalPagesVentas] = useState(1);
  const [totalRecordsVentas, setTotalRecordsVentas] = useState(0);

  const hoyStr = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  // Modal Nueva Venta (Facturación de Pedido Aprobado)
  const [facturarModalOpen, setFacturarModalOpen] = useState(false);
  const [pedidosAprobadosList, setPedidosAprobadosList] = useState([]);
  const [selectedPedidoId, setSelectedPedidoId] = useState('');
  const [selectedPedidoInfo, setSelectedPedidoInfo] = useState(null);
  const [conPagoInicial, setConPagoInicial] = useState(false);
  const [pagosIniciales, setPagosIniciales] = useState([
    { id: 1, monto: '', metodo_pago: 'EFECTIVO', referencia_pago: '' }
  ]);
  const [submittingVenta, setSubmittingVenta] = useState(false);

  const METODOS_PAGO_SELECT = [
    { value: 'EFECTIVO', label: 'Efectivo' },
    { value: 'TARJETA_DEBITO', label: 'Tarjeta de Débito' },
    { value: 'TARJETA_CREDITO', label: 'Tarjeta de Crédito' },
    { value: 'TRANSFERENCIA', label: 'Transferencia Bancaria' }
  ];

  const totalPagosIniciales = useMemo(() => {
    return pagosIniciales.reduce((acc, p) => acc + (parseFloat(p.monto) || 0), 0);
  }, [pagosIniciales]);

  // Modal Detalle de Venta y Pagos
  const [viewVentaModalOpen, setViewVentaModalOpen] = useState(false);
  const [selectedVentaDetail, setSelectedVentaDetail] = useState(null);
  const [loadingVentaDetail, setLoadingVentaDetail] = useState(false);

  // Modal / Formulario Registrar Pago a Venta Existente
  const [pagoModalOpen, setPagoModalOpen] = useState(false);
  const [pagoForm, setPagoForm] = useState({
    numero_recibo: '',
    monto: '',
    metodo_pago: 'EFECTIVO',
    referencia_pago: ''
  });
  const [submittingPago, setSubmittingPago] = useState(false);

  // Modal Anular Venta
  const [anularModalOpen, setAnularModalOpen] = useState(false);
  const [anulando, setAnulando] = useState(false);

  // ========================================================
  // PESTAÑA 2: HISTORIAL DE PAGOS / RECIBOS
  // ========================================================
  const [pagos, setPagos] = useState([]);
  const [loadingPagos, setLoadingPagos] = useState(false);
  const [qPagos, setQPagos] = useState('');
  const [filterMetodoPago, setFilterMetodoPago] = useState('');
  const [pagePagos, setPagePagos] = useState(1);
  const [totalPagesPagos, setTotalPagesPagos] = useState(1);
  const [totalRecordsPagos, setTotalRecordsPagos] = useState(0);

  const metodoPagoOptions = [
    { value: '', label: 'Todos los métodos', shortLabel: 'Método' },
    { value: 'EFECTIVO', label: 'Efectivo', shortLabel: 'Efectivo' },
    { value: 'TARJETA_DEBITO', label: 'Tarjeta de Débito', shortLabel: 'Débito' },
    { value: 'TARJETA_CREDITO', label: 'Tarjeta de Crédito', shortLabel: 'Crédito' },
    { value: 'TRANSFERENCIA', label: 'Transferencia Bancaria', shortLabel: 'Transferencia' }
  ];

  const estadoVentaOptions = [
    { value: '', label: 'Todos los estados', shortLabel: 'Estados' },
    { value: 'PENDIENTE', label: 'Pendiente de Cobro', shortLabel: 'Pendientes' },
    { value: 'COMPLETADA', label: 'Completada (Pagada)', shortLabel: 'Completadas' },
    { value: 'ANULADA', label: 'Anulada', shortLabel: 'Anuladas' }
  ];

  // ========================================================
  // CARGAS DE DATOS
  // ========================================================
  const fetchVentas = useCallback(async () => {
    setLoadingVentas(true);
    try {
      const params = { page: pageVentas, limit: 10 };
      if (qVentas.trim()) params.q = qVentas.trim();
      if (filterEstadoVenta) params.estado = filterEstadoVenta;
      if (soloSaldoPendiente) params.con_saldo_pendiente = 'true';
      if (filterFechaDesde) params.fecha_desde = filterFechaDesde;
      if (filterFechaHasta) params.fecha_hasta = filterFechaHasta;

      const res = await api.get('/ventas', { params });
      if (res?.data) {
        setVentas(res.data);
        if (res.meta) {
          setTotalPagesVentas(res.meta.totalPages || 1);
          setTotalRecordsVentas(res.meta.total || 0);
        }
      }
    } catch (err) {
      toast.error(err.message || 'Error al cargar ventas');
    } finally {
      setLoadingVentas(false);
    }
  }, [pageVentas, qVentas, filterEstadoVenta, soloSaldoPendiente, filterFechaDesde, filterFechaHasta, toast]);

  const fetchPagos = useCallback(async () => {
    setLoadingPagos(true);
    try {
      const params = { page: pagePagos, limit: 10 };
      if (qPagos.trim()) params.q = qPagos.trim();
      if (filterMetodoPago) params.metodo_pago = filterMetodoPago;
      if (filterFechaDesde) params.fecha_desde = filterFechaDesde;
      if (filterFechaHasta) params.fecha_hasta = filterFechaHasta;

      const res = await api.get('/pagos', { params });
      if (res?.data) {
        setPagos(res.data);
        if (res.meta) {
          setTotalPagesPagos(res.meta.totalPages || 1);
          setTotalRecordsPagos(res.meta.total || 0);
        }
      }
    } catch (err) {
      toast.error(err.message || 'Error al cargar historial de pagos');
    } finally {
      setLoadingPagos(false);
    }
  }, [pagePagos, qPagos, filterMetodoPago, filterFechaDesde, filterFechaHasta, toast]);

  useEffect(() => {
    if (activeTab === 'facturas') {
      fetchVentas();
    } else {
      fetchPagos();
    }
  }, [activeTab, fetchVentas, fetchPagos]);

  // Cargar pedidos aprobados para el select de facturación
  const fetchPedidosAprobados = useCallback(async () => {
    try {
      const res = await api.get('/pedidos', { params: { estado: 'APROBADO', limit: 100 } });
      if (res?.data) {
        setPedidosAprobadosList(res.data);
      }
    } catch (err) {
      console.error('Error cargando pedidos aprobados:', err);
    }
  }, []);

  // Abrir modal de nueva venta (facturar)
  const handleOpenFacturar = useCallback(async (preselectedPedido = null) => {
    await fetchPedidosAprobados();
    setConPagoInicial(false);

    if (preselectedPedido) {
      setSelectedPedidoId(String(preselectedPedido.id_pedido));
      setSelectedPedidoInfo(preselectedPedido);
      setPagosIniciales([
        {
          id: Date.now(),
          monto: String(preselectedPedido.total || ''),
          metodo_pago: 'EFECTIVO',
          referencia_pago: ''
        }
      ]);
    } else {
      setSelectedPedidoId('');
      setSelectedPedidoInfo(null);
      setPagosIniciales([
        { id: Date.now(), monto: '', metodo_pago: 'EFECTIVO', referencia_pago: '' }
      ]);
    }

    setFacturarModalOpen(true);
  }, [fetchPedidosAprobados]);

  // Si se navegó desde PedidosPage pasando un pedido aprobado en location.state
  useEffect(() => {
    if (location.state?.pedidoAprobado) {
      handleOpenFacturar(location.state.pedidoAprobado);
      // Limpiar state de history para no reabrir si refresca
      window.history.replaceState({}, document.title);
    }
  }, [location.state, handleOpenFacturar]);

  // Al seleccionar un pedido en el modal de facturación, cargar sus detalles
  const handleSelectPedidoChange = async (pedidoIdStr) => {
    setSelectedPedidoId(pedidoIdStr);
    if (!pedidoIdStr) {
      setSelectedPedidoInfo(null);
      setPagosIniciales([
        { id: Date.now(), monto: '', metodo_pago: 'EFECTIVO', referencia_pago: '' }
      ]);
      return;
    }

    try {
      const res = await api.get(`/pedidos/${pedidoIdStr}`);
      setSelectedPedidoInfo(res.data);
      setPagosIniciales([
        {
          id: Date.now(),
          monto: String(res.data.total || ''),
          metodo_pago: 'EFECTIVO',
          referencia_pago: ''
        }
      ]);
    } catch (err) {
      toast.error('Error al cargar datos del pedido seleccionado');
    }
  };

  const handleToggleConPagoInicial = (val) => {
    const nextVal = typeof val === 'boolean' ? val : !conPagoInicial;
    setConPagoInicial(nextVal);
    if (nextVal && selectedPedidoInfo) {
      if (pagosIniciales.length === 0 || !pagosIniciales[0].monto) {
        setPagosIniciales([
          {
            id: Date.now(),
            monto: String(selectedPedidoInfo.total || ''),
            metodo_pago: 'EFECTIVO',
            referencia_pago: ''
          }
        ]);
      }
    }
  };

  const handleAddPagoInicialRow = () => {
    const totalPedido = parseFloat(selectedPedidoInfo?.total || 0);
    const restante = Math.max(0, totalPedido - totalPagosIniciales);
    setPagosIniciales((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        monto: restante > 0 ? (Math.round(restante * 100) / 100).toFixed(2) : '',
        metodo_pago: 'TRANSFERENCIA',
        referencia_pago: ''
      }
    ]);
  };

  const handleRemovePagoInicialRow = (idToRemove) => {
    setPagosIniciales((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((p) => p.id !== idToRemove);
    });
  };

  const handleUpdatePagoInicialRow = (id, field, value) => {
    setPagosIniciales((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        if (field === 'monto') {
          let sanitized = value.replace(/[^0-9.]/g, '');
          const parts = sanitized.split('.');
          if (parts.length > 2) {
            sanitized = parts[0] + '.' + parts.slice(1).join('');
          }
          return { ...p, monto: sanitized };
        }
        return { ...p, [field]: value };
      })
    );
  };

  // Enviar formulario de generación de venta
  const handleSubmitFactura = async (e) => {
    e.preventDefault();

    if (!selectedPedidoId) {
      toast.error('Debes seleccionar un pedido aprobado para facturar');
      return;
    }

    if (conPagoInicial) {
      const totalPedido = parseFloat(selectedPedidoInfo?.total || 0);
      if (pagosIniciales.length === 0) {
        toast.error('Agrega al menos un método de pago inicial');
        return;
      }
      for (let i = 0; i < pagosIniciales.length; i++) {
        const p = pagosIniciales[i];
        const montoNum = parseFloat(p.monto);
        if (isNaN(montoNum) || montoNum <= 0) {
          toast.error(`El monto del pago #${i + 1} debe ser mayor a 0`);
          return;
        }
        if (p.metodo_pago === 'TRANSFERENCIA' && !p.referencia_pago?.trim()) {
          toast.error(`Ingresa la referencia o comprobante para el pago #${i + 1} por transferencia`);
          return;
        }
      }

      if (totalPagosIniciales > totalPedido + 0.01) {
        toast.error(
          `La suma de pagos (Q${totalPagosIniciales.toFixed(2)}) supera el total de la venta (Q${totalPedido.toFixed(2)})`
        );
        return;
      }
    }

    setSubmittingVenta(true);
    try {
      const payload = {
        id_pedido: parseInt(selectedPedidoId, 10)
      };

      if (conPagoInicial && pagosIniciales.length > 0) {
        payload.pagos_iniciales = pagosIniciales
          .filter((p) => parseFloat(p.monto) > 0)
          .map((p) => ({
            monto: parseFloat(p.monto),
            metodo_pago: p.metodo_pago,
            referencia_pago: p.metodo_pago === 'TRANSFERENCIA' ? (p.referencia_pago?.trim() || null) : null
          }));
      }

      const res = await api.post('/ventas', payload);
      const nuevaVenta = res.data;

      if (nuevaVenta.estado === 'COMPLETADA') {
        toast.success(
          `¡Venta ${nuevaVenta.numero_factura} COMPLETADA! Pago liquidado al 100% y SALIDA de inventario registrada automáticamente (RN03).`
        );
      } else {
        toast.success(
          `Venta ${nuevaVenta.numero_factura} registrada. Saldo pendiente: Q${parseFloat(nuevaVenta.saldo_pendiente).toFixed(2)}.`
        );
      }

      setFacturarModalOpen(false);
      fetchVentas();
    } catch (err) {
      toast.error(err.message || 'Error al generar la venta');
    } finally {
      setSubmittingVenta(false);
    }
  };

  // Ver detalle de una venta
  const handleOpenVentaDetail = async (ventaItem) => {
    setViewVentaModalOpen(true);
    setLoadingVentaDetail(true);
    setSelectedVentaDetail(null);
    try {
      const res = await api.get(`/ventas/${ventaItem.id_venta}`);
      setSelectedVentaDetail(res.data);
    } catch (err) {
      toast.error(err.message || 'Error al cargar detalle de venta');
      setViewVentaModalOpen(false);
    } finally {
      setLoadingVentaDetail(false);
    }
  };

  // Abrir modal de registrar pago sobre venta seleccionada
  const handleOpenRegistrarPago = async () => {
    if (!selectedVentaDetail) return;
    let recSugerido = '';
    try {
      const sug = await api.get('/pagos/sugerir-recibo');
      if (sug?.data?.sugerencia) {
        recSugerido = sug.data.sugerencia;
      }
    } catch (err) {
      console.error('Error sugiriendo recibo:', err);
    }

    setPagoForm({
      numero_recibo: recSugerido,
      monto: String(selectedVentaDetail.saldo_pendiente || ''),
      metodo_pago: 'EFECTIVO',
      referencia_pago: ''
    });
    setPagoModalOpen(true);
  };

  // Enviar registro de pago
  const handleSubmitPago = async (e) => {
    e.preventDefault();

    const montoNum = parseFloat(pagoForm.monto);
    const saldoPend = parseFloat(selectedVentaDetail?.saldo_pendiente || 0);

    if (isNaN(montoNum) || montoNum <= 0) {
      toast.error('El monto a pagar debe ser mayor a 0');
      return;
    }

    if (montoNum > saldoPend + 0.001) {
      toast.error(`El pago no puede superar el saldo pendiente (RN09): Q${saldoPend.toFixed(2)}`);
      return;
    }

    if (pagoForm.metodo_pago === 'TRANSFERENCIA' && !pagoForm.referencia_pago?.trim()) {
      toast.error('Ingresa la referencia o comprobante para transferencia bancaria');
      return;
    }

    setSubmittingPago(true);
    try {
      const payload = {
        id_venta: selectedVentaDetail.id_venta,
        numero_recibo: pagoForm.numero_recibo?.trim() || null,
        monto: montoNum,
        metodo_pago: pagoForm.metodo_pago,
        referencia_pago: pagoForm.metodo_pago === 'TRANSFERENCIA' ? (pagoForm.referencia_pago?.trim() || null) : null
      };

      const res = await api.post('/pagos', payload);
      const { venta } = res.data;

      if (venta.estado === 'COMPLETADA') {
        toast.success(
          '¡Pago liquidado al 100%! La venta pasó a COMPLETADA y se registró la SALIDA física de inventario (RN03).'
        );
      } else {
        toast.success(`Abono registrado con éxito. Saldo restante: Q${parseFloat(venta.saldo_pendiente).toFixed(2)}.`);
      }

      setPagoModalOpen(false);
      // Recargar datos actualizados de la venta en el modal
      const resVentaActualizada = await api.get(`/ventas/${selectedVentaDetail.id_venta}`);
      setSelectedVentaDetail(resVentaActualizada.data);
      fetchVentas();
    } catch (err) {
      toast.error(err.message || 'Error al registrar el pago');
    } finally {
      setSubmittingPago(false);
    }
  };

  // Anular venta
  const handleConfirmAnularVenta = async () => {
    if (!selectedVentaDetail) return;
    setAnulando(true);
    try {
      await api.patch(`/ventas/${selectedVentaDetail.id_venta}/anular`);
      toast.success('Venta anulada correctamente');
      setAnularModalOpen(false);
      setViewVentaModalOpen(false);
      fetchVentas();
    } catch (err) {
      toast.error(err.message || 'Error al anular la venta');
    } finally {
      setAnulando(false);
    }
  };

  // Insignia de estado de venta
  const renderVentaEstadoBadge = (estado) => {
    switch (estado) {
      case 'PENDIENTE':
        return (
          <span
            className="badge badge-warning"
            style={{
              backgroundColor: 'rgba(255, 157, 46, 0.15)',
              color: 'var(--toy-orange-dark)',
              border: '1px solid rgba(255, 157, 46, 0.4)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Clock size={12} />
            Pendiente de Cobro
          </span>
        );
      case 'COMPLETADA':
        return (
          <span
            className="badge badge-success"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            <CheckCheck size={12} />
            Completada (Pagada)
          </span>
        );
      case 'ANULADA':
        return (
          <span
            className="badge badge-danger"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            <XCircle size={12} />
            Anulada
          </span>
        );
      default:
        return <span className="badge">{estado}</span>;
    }
  };

  // Columnas para tabla de Ventas
  const columnasVentas = [
    {
      header: 'Factura',
      key: 'numero_factura',
      render: (row) => <code>{row.numero_factura}</code>
    },
    {
      header: 'Pedido Origen',
      key: 'numero_pedido',
      render: (row) => <span style={{ fontWeight: 600 }}>{row.numero_pedido}</span>
    },
    {
      header: 'Cliente',
      key: 'cliente_nombre',
      render: (row) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: 700, color: 'var(--toy-ink)' }}>{row.cliente_nombre}</span>
          <span style={{ fontSize: '0.76rem', color: 'var(--toy-muted)' }}>
            NIT: {row.cliente_identificacion || 'C/F'}
          </span>
        </div>
      )
    },
    {
      header: 'Fecha',
      key: 'fecha_venta',
      render: (row) => (
        <span style={{ fontSize: '0.84rem', color: 'var(--toy-muted)' }}>
          {row.fecha_venta ? new Date(row.fecha_venta).toLocaleDateString() : '-'}
        </span>
      )
    },
    {
      header: 'Total',
      key: 'total',
      render: (row) => (
        <span style={{ fontWeight: 800, color: 'var(--toy-deep-blue)' }}>
          Q{parseFloat(row.total || 0).toFixed(2)}
        </span>
      )
    },
    {
      header: 'Saldo Pendiente',
      key: 'saldo_pendiente',
      render: (row) => {
        const saldo = parseFloat(row.saldo_pendiente || 0);
        return (
          <span
            style={{
              fontWeight: 800,
              color: saldo > 0 ? 'var(--toy-orange-dark)' : 'var(--toy-green-dark)'
            }}
          >
            Q{saldo.toFixed(2)}
          </span>
        );
      }
    },
    {
      header: 'Estado',
      key: 'estado',
      render: (row) => renderVentaEstadoBadge(row.estado)
    },
    {
      header: 'Acciones',
      key: 'acciones',
      render: (row) => (
        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => handleOpenVentaDetail(row)}
            title="Ver detalle de factura y pagos"
          >
            <Eye size={15} />
          </button>
          {row.estado === 'PENDIENTE' && parseFloat(row.saldo_pendiente) > 0 && canRegisterPagos && (
            <button
              type="button"
              className="btn btn-success btn-sm"
              onClick={() => handleOpenVentaDetail(row)}
              title="Abonar / Liquidar venta"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '0.35rem 0.65rem' }}
            >
              <CreditCard size={13} />
              <span>Cobrar</span>
            </button>
          )}
        </div>
      )
    }
  ];

  // Columnas para tabla de Pagos
  const columnasPagos = [
    {
      header: 'Recibo',
      key: 'numero_recibo',
      render: (row) => <code>{row.numero_recibo}</code>
    },
    {
      header: 'Factura / Pedido',
      key: 'numero_factura',
      render: (row) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: 700, color: 'var(--toy-ink)' }}>{row.numero_factura}</span>
          <span style={{ fontSize: '0.76rem', color: 'var(--toy-muted)' }}>{row.numero_pedido}</span>
        </div>
      )
    },
    {
      header: 'Cliente',
      key: 'cliente_nombre',
      render: (row) => (
        <span style={{ fontWeight: 600, color: 'var(--toy-ink)' }}>{row.cliente_nombre}</span>
      )
    },
    {
      header: 'Método de Pago',
      key: 'metodo_pago',
      render: (row) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span className="badge badge-info" style={{ fontSize: '0.72rem' }}>
            {row.metodo_pago}
          </span>
          {row.referencia_pago && (
            <span style={{ fontSize: '0.74rem', color: 'var(--toy-muted)', marginTop: '2px' }}>
              Ref: {row.referencia_pago}
            </span>
          )}
        </div>
      )
    },
    {
      header: 'Fecha',
      key: 'fecha_pago',
      render: (row) => (
        <span style={{ fontSize: '0.84rem', color: 'var(--toy-muted)' }}>
          {row.fecha_pago ? new Date(row.fecha_pago).toLocaleString() : '-'}
        </span>
      )
    },
    {
      header: 'Monto Cobrado',
      key: 'monto',
      render: (row) => (
        <span style={{ fontWeight: 800, color: 'var(--toy-green-dark)', fontSize: '0.96rem' }}>
          +Q{parseFloat(row.monto || 0).toFixed(2)}
        </span>
      )
    },
    {
      header: 'Registrado Por',
      key: 'usuario_nombre',
      render: (row) => (
        <span style={{ fontSize: '0.82rem', color: 'var(--toy-ink)', fontWeight: 600 }}>
          {row.usuario_nombre}
        </span>
      )
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <PageCard
        title="Gestión de Ventas, Facturación y Cobranza"
        subtitle="Emisión de facturas desde pedidos aprobados, control de saldo y registro de pagos"
        actions={
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {canRegisterVentas && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleOpenFacturar(null)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Plus size={18} strokeWidth={2.4} />
                <span>Facturar Pedido Aprobado</span>
              </button>
            )}
          </div>
        }
      >
        {/* Pestañas de Navegación */}
        <div
          style={{
            display: 'flex',
            backgroundColor: '#F8F5EE',
            borderBottom: '2px solid var(--toy-border)',
            padding: '0.5rem 1.25rem 0',
            gap: '0.5rem'
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('facturas')}
            style={{
              padding: '0.65rem 1.2rem',
              border: 'none',
              borderBottom: activeTab === 'facturas' ? '3px solid var(--toy-blue)' : '3px solid transparent',
              backgroundColor: activeTab === 'facturas' ? '#FFFFFF' : 'transparent',
              color: activeTab === 'facturas' ? 'var(--toy-deep-blue)' : 'var(--toy-muted)',
              fontWeight: 800,
              fontSize: '0.92rem',
              cursor: 'pointer',
              borderTopLeftRadius: '10px',
              borderTopRightRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Receipt size={18} />
            <span>Facturas de Venta ({totalRecordsVentas})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pagos')}
            style={{
              padding: '0.65rem 1.2rem',
              border: 'none',
              borderBottom: activeTab === 'pagos' ? '3px solid var(--toy-blue)' : '3px solid transparent',
              backgroundColor: activeTab === 'pagos' ? '#FFFFFF' : 'transparent',
              color: activeTab === 'pagos' ? 'var(--toy-deep-blue)' : 'var(--toy-muted)',
              fontWeight: 800,
              fontSize: '0.92rem',
              cursor: 'pointer',
              borderTopLeftRadius: '10px',
              borderTopRightRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <CreditCard size={18} />
            <span>Historial de Pagos y Recibos</span>
          </button>
        </div>

        {/* PESTAÑA 1: FACTURAS DE VENTA */}
        {activeTab === 'facturas' && (
          <>
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
                <div style={{ width: '280px' }}>
                  <SearchInput
                    value={qVentas}
                    onChange={setQVentas}
                    placeholder="Buscar factura, pedido o cliente..."
                  />
                </div>

                <FilterDropdown
                  title="Estado de Factura"
                  buttonTitle="Estado"
                  value={filterEstadoVenta}
                  onChange={setFilterEstadoVenta}
                  options={estadoVentaOptions}
                />

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    backgroundColor: '#FFFFFF',
                    border: '1.5px solid var(--toy-border)',
                    borderRadius: '12px',
                    padding: '0.4rem 0.75rem'
                  }}
                >
                  <ToySwitch
                    id="switch-con-saldo"
                    checked={soloSaldoPendiente}
                    onChange={(val) => {
                      setSoloSaldoPendiente(val);
                      setPageVentas(1);
                    }}
                  />
                  <label
                    htmlFor="switch-con-saldo"
                    style={{
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: soloSaldoPendiente ? 'var(--toy-orange-dark)' : 'var(--toy-ink)',
                      cursor: 'pointer',
                      userSelect: 'none'
                    }}
                  >
                    Con Saldo Pendiente
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--toy-muted)', fontWeight: 700 }}>Desde:</span>
                <DatePicker
                  value={filterFechaDesde}
                  onChange={(val) => {
                    if (val && val > hoyStr) return;
                    setFilterFechaDesde(val);
                    setPageVentas(1);
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
                    setPageVentas(1);
                  }}
                  placeholder="Hasta"
                  width="135px"
                  min={filterFechaDesde || undefined}
                  max={hoyStr}
                  align="right"
                />
              </div>
            </div>

            <DataTable
              columns={columnasVentas}
              data={ventas}
              loading={loadingVentas}
              emptyMessage="No se encontraron facturas de venta."
              pagination={{
                currentPage: pageVentas,
                totalPages: totalPagesVentas,
                totalRecords: totalRecordsVentas
              }}
              onPageChange={setPageVentas}
              embedded
            />
          </>
        )}

        {/* PESTAÑA 2: HISTORIAL DE PAGOS */}
        {activeTab === 'pagos' && (
          <>
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
                <div style={{ width: '280px' }}>
                  <SearchInput
                    value={qPagos}
                    onChange={setQPagos}
                    placeholder="Buscar recibo, factura o cliente..."
                  />
                </div>

                <FilterDropdown
                  title="Método de Pago"
                  buttonTitle="Método"
                  value={filterMetodoPago}
                  onChange={setFilterMetodoPago}
                  options={metodoPagoOptions}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--toy-muted)', fontWeight: 700 }}>Desde:</span>
                <DatePicker
                  value={filterFechaDesde}
                  onChange={(val) => {
                    if (val && val > hoyStr) return;
                    setFilterFechaDesde(val);
                    setPagePagos(1);
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
                    setPagePagos(1);
                  }}
                  placeholder="Hasta"
                  width="135px"
                  min={filterFechaDesde || undefined}
                  max={hoyStr}
                  align="right"
                />
              </div>
            </div>

            <DataTable
              columns={columnasPagos}
              data={pagos}
              loading={loadingPagos}
              emptyMessage="No se han registrado pagos aún."
              pagination={{
                currentPage: pagePagos,
                totalPages: totalPagesPagos,
                totalRecords: totalRecordsPagos
              }}
              onPageChange={setPagePagos}
              embedded
            />
          </>
        )}
      </PageCard>

      {/* ========================================================
          MODAL: FACTURAR PEDIDO APROBADO
         ======================================================== */}
      <Modal
        isOpen={facturarModalOpen}
        onClose={() => setFacturarModalOpen(false)}
        title="Generar Factura"
        size="large"
      >
        <form onSubmit={handleSubmitFactura} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <FormField label="Pedido Aprobado a Facturar" required>
            <SearchableSelect
              placeholder="Selecciona un pedido aprobado..."
              value={selectedPedidoId}
              onChange={handleSelectPedidoChange}
              options={pedidosAprobadosList.map((p) => ({
                value: p.id_pedido,
                label: `${p.numero_pedido} - ${p.cliente_nombre} (Total: Q${parseFloat(p.total).toFixed(2)})`
              }))}
            />
          </FormField>

          {/* Resumen del Pedido Seleccionado */}
          {selectedPedidoInfo && (
            <div
              style={{
                backgroundColor: '#FFFDF9',
                border: '1.5px solid var(--toy-border)',
                borderRadius: '16px',
                padding: '1.1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: 'var(--toy-ink)' }}>
                  Resumen de Productos a Facturar
                </h4>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--toy-deep-blue)' }}>
                  Total Pedido: Q{parseFloat(selectedPedidoInfo.total).toFixed(2)}
                </div>
              </div>

              <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8F5EE', textAlign: 'left', borderBottom: '1px solid var(--toy-border)' }}>
                    <th style={{ padding: '0.45rem' }}>Producto</th>
                    <th style={{ padding: '0.45rem', textAlign: 'center' }}>Cantidad</th>
                    <th style={{ padding: '0.45rem', textAlign: 'right' }}>Precio Escala</th>
                    <th style={{ padding: '0.45rem', textAlign: 'right' }}>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedPedidoInfo.detalles || []).map((det, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--toy-border-light)' }}>
                      <td style={{ padding: '0.45rem' }}>
                        <span style={{ fontWeight: 700 }}>{det.producto_nombre}</span> ({det.codigo_sku})
                      </td>
                      <td style={{ padding: '0.45rem', textAlign: 'center', fontWeight: 700 }}>{det.cantidad}</td>
                      <td style={{ padding: '0.45rem', textAlign: 'right' }}>Q{parseFloat(det.precio_escala).toFixed(2)}</td>
                      <td style={{ padding: '0.45rem', textAlign: 'right', fontWeight: 700 }}>Q{parseFloat(det.subtotal).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Opción de Pago Inicial en el Mismo Acto */}
          {canRegisterPagos && selectedPedidoInfo && (
            <div
              style={{
                backgroundColor: conPagoInicial ? 'rgba(116, 201, 91, 0.08)' : '#FBF9F4',
                border: conPagoInicial ? '1.5px solid var(--toy-green)' : '1.5px dashed var(--toy-border)',
                borderRadius: '16px',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ToySwitch
                    id="switch-pago-inicial"
                    checked={conPagoInicial}
                    onChange={handleToggleConPagoInicial}
                  />
                  <label
                    htmlFor="switch-pago-inicial"
                    style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--toy-ink)', cursor: 'pointer' }}
                  >
                    Registrar Pago Inicial / Contado en el mismo acto
                  </label>
                </div>
                {conPagoInicial && (
                  <span
                    style={{
                      fontSize: '0.78rem',
                      color: totalPagosIniciales >= parseFloat(selectedPedidoInfo.total) ? 'var(--toy-green-dark)' : 'var(--toy-orange-dark)',
                      fontWeight: 700
                    }}
                  >
                    {totalPagosIniciales >= parseFloat(selectedPedidoInfo.total)
                      ? '✓ Venta quedará COMPLETADA y saldrá de inventario'
                      : `Abono parcial (Resta: Q${Math.max(0, parseFloat(selectedPedidoInfo.total) - totalPagosIniciales).toFixed(2)})`}
                  </span>
                )}
              </div>

              {conPagoInicial && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--toy-ink)' }}>
                      Desglose de Formas de Pago
                    </span>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={handleAddPagoInicialRow}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}
                    >
                      <Plus size={14} />
                      <span>Agregar Otro Pago</span>
                    </button>
                  </div>

                  {pagosIniciales.map((pagoRow, idx) => {
                    const isTransferencia = pagoRow.metodo_pago === 'TRANSFERENCIA';
                    return (
                      <div
                        key={pagoRow.id}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: isTransferencia ? '1.4fr 1.1fr 1.4fr auto' : '1.5fr 1.5fr auto',
                          gap: '0.75rem',
                          alignItems: 'flex-end',
                          backgroundColor: '#FFFFFF',
                          padding: '0.75rem',
                          borderRadius: '12px',
                          border: '1px solid var(--toy-border-light)'
                        }}
                      >
                        <FormField label={`Método #${idx + 1}`} required>
                          <SearchableSelect
                            value={pagoRow.metodo_pago}
                            onChange={(val) => handleUpdatePagoInicialRow(pagoRow.id, 'metodo_pago', val)}
                            options={METODOS_PAGO_SELECT}
                            placeholder="Selecciona método..."
                          />
                        </FormField>

                        <FormField label="Monto (Q)" required>
                          <input
                            type="text"
                            inputMode="decimal"
                            className="form-control"
                            placeholder="0.00"
                            value={pagoRow.monto}
                            onChange={(e) => handleUpdatePagoInicialRow(pagoRow.id, 'monto', e.target.value)}
                          />
                        </FormField>

                        {isTransferencia && (
                          <FormField label="No. Comprobante / Transf." required>
                            <input
                              type="text"
                              className="form-control"
                              placeholder="Ej. TRANSF-0912"
                              value={pagoRow.referencia_pago}
                              onChange={(e) => handleUpdatePagoInicialRow(pagoRow.id, 'referencia_pago', e.target.value)}
                            />
                          </FormField>
                        )}

                        {pagosIniciales.length > 1 && (
                          <button
                            type="button"
                            className="btn btn-danger"
                            onClick={() => handleRemovePagoInicialRow(pagoRow.id)}
                            title="Eliminar este pago"
                            style={{
                              height: '42px',
                              width: '42px',
                              padding: 0,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              boxShadow: '0 3px 0 #DC2626'
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    );
                  })}

                  {/* Resumen de Pago */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.7rem 0.9rem',
                      backgroundColor: '#FFFFFF',
                      borderRadius: '10px',
                      border: '1.5px solid var(--toy-border)',
                      fontSize: '0.85rem',
                      flexWrap: 'wrap',
                      gap: '0.5rem'
                    }}
                  >
                    <div>
                      <span>Total Pedido: </span>
                      <strong style={{ color: 'var(--toy-ink)' }}>Q{parseFloat(selectedPedidoInfo.total).toFixed(2)}</strong>
                    </div>
                    <div>
                      <span>Cobrado en este acto: </span>
                      <strong
                        style={{
                          color:
                            totalPagosIniciales > parseFloat(selectedPedidoInfo.total) + 0.001
                              ? '#DC2626'
                              : 'var(--toy-green-dark)'
                        }}
                      >
                        Q{totalPagosIniciales.toFixed(2)}
                      </strong>
                    </div>
                    <div>
                      <span>Saldo Restante: </span>
                      <strong style={{ color: 'var(--toy-orange-dark)' }}>
                        Q{Math.max(0, parseFloat(selectedPedidoInfo.total) - totalPagosIniciales).toFixed(2)}
                      </strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setFacturarModalOpen(false)}
              disabled={submittingVenta}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submittingVenta || !selectedPedidoId}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Receipt size={16} />
              <span>{submittingVenta ? 'Emitiendo Factura...' : 'Emitir Factura de Venta'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================
          MODAL: DETALLE DE VENTA Y REGISTRO DE PAGOS
         ======================================================== */}
      <Modal
        isOpen={viewVentaModalOpen}
        onClose={() => setViewVentaModalOpen(false)}
        title={selectedVentaDetail ? `Factura de Venta #${selectedVentaDetail.numero_factura}` : 'Cargando Factura...'}
        size="large"
      >
        {loadingVentaDetail || !selectedVentaDetail ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--toy-muted)' }}>
            Cargando información de la venta...
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Cabecera de Factura */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '1rem',
                padding: '1rem',
                backgroundColor: '#FFFDF9',
                border: '1.5px solid var(--toy-border)',
                borderRadius: '16px'
              }}
            >
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--toy-muted)', fontWeight: 700 }}>Estado:</span>
                <div style={{ marginTop: '3px' }}>
                  {renderVentaEstadoBadge(selectedVentaDetail.estado)}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--toy-muted)', fontWeight: 700 }}>Cliente:</span>
                <div style={{ fontWeight: 700, color: 'var(--toy-ink)', fontSize: '0.9rem' }}>
                  {selectedVentaDetail.cliente_nombre}
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--toy-muted)' }}>
                  NIT: {selectedVentaDetail.cliente_identificacion || 'C/F'}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--toy-muted)', fontWeight: 700 }}>Total Facturado:</span>
                <div style={{ fontWeight: 800, color: 'var(--toy-deep-blue)', fontSize: '1.15rem' }}>
                  Q{parseFloat(selectedVentaDetail.total).toFixed(2)}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--toy-muted)', fontWeight: 700 }}>Saldo Pendiente:</span>
                <div
                  style={{
                    fontWeight: 800,
                    color: parseFloat(selectedVentaDetail.saldo_pendiente) > 0 ? 'var(--toy-orange-dark)' : 'var(--toy-green-dark)',
                    fontSize: '1.15rem'
                  }}
                >
                  Q{parseFloat(selectedVentaDetail.saldo_pendiente).toFixed(2)}
                </div>
              </div>
            </div>

            {/* Tabla de Productos Facturados */}
            <div>
              <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.92rem', fontWeight: 800, color: 'var(--toy-ink)' }}>
                Productos Entregados / Facturados
              </h4>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8F5EE', textAlign: 'left', borderBottom: '2px solid var(--toy-border)' }}>
                    <th style={{ padding: '0.45rem' }}>Producto</th>
                    <th style={{ padding: '0.45rem', textAlign: 'center' }}>Cantidad</th>
                    <th style={{ padding: '0.45rem', textAlign: 'right' }}>Precio Unit.</th>
                    <th style={{ padding: '0.45rem', textAlign: 'right' }}>Descuento</th>
                    <th style={{ padding: '0.45rem', textAlign: 'right' }}>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedVentaDetail.detalles || []).map((det, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid var(--toy-border)' }}>
                      <td style={{ padding: '0.45rem' }}>
                        <span style={{ fontWeight: 700 }}>{det.producto_nombre}</span> ({det.codigo_sku})
                      </td>
                      <td style={{ padding: '0.45rem', textAlign: 'center', fontWeight: 700 }}>{det.cantidad}</td>
                      <td style={{ padding: '0.45rem', textAlign: 'right' }}>Q{parseFloat(det.precio_unitario).toFixed(2)}</td>
                      <td style={{ padding: '0.45rem', textAlign: 'right' }}>Q{parseFloat(det.descuento_aplicado || 0).toFixed(2)}</td>
                      <td style={{ padding: '0.45rem', textAlign: 'right', fontWeight: 800, color: 'var(--toy-deep-blue)' }}>
                        Q{parseFloat(det.subtotal).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Tabla de Pagos Realizados */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: 'var(--toy-ink)' }}>
                  Historial de Pagos y Abonos Registrados
                </h4>
                {selectedVentaDetail.estado === 'PENDIENTE' && parseFloat(selectedVentaDetail.saldo_pendiente) > 0 && canRegisterPagos && (
                  <button
                    type="button"
                    className="btn btn-success btn-sm"
                    onClick={handleOpenRegistrarPago}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Plus size={14} />
                    <span>Registrar Nuevo Pago / Abono</span>
                  </button>
                )}
              </div>

              <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8F5EE', textAlign: 'left', borderBottom: '2px solid var(--toy-border)' }}>
                    <th style={{ padding: '0.45rem' }}>Recibo</th>
                    <th style={{ padding: '0.45rem' }}>Fecha</th>
                    <th style={{ padding: '0.45rem' }}>Método</th>
                    <th style={{ padding: '0.45rem' }}>Referencia</th>
                    <th style={{ padding: '0.45rem', textAlign: 'right' }}>Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedVentaDetail.pagos || []).length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ padding: '1rem', textAlign: 'center', color: 'var(--toy-muted)' }}>
                        No se han registrado pagos para esta factura aún (Venta 100% al crédito).
                      </td>
                    </tr>
                  ) : (
                    (selectedVentaDetail.pagos || []).map((pago, pIdx) => (
                      <tr key={pIdx} style={{ borderBottom: '1px solid var(--toy-border)' }}>
                        <td style={{ padding: '0.45rem' }}><code>{pago.numero_recibo}</code></td>
                        <td style={{ padding: '0.45rem' }}>{new Date(pago.fecha_pago).toLocaleString()}</td>
                        <td style={{ padding: '0.45rem' }}>
                          <span className="badge badge-info" style={{ fontSize: '0.72rem' }}>{pago.metodo_pago}</span>
                        </td>
                        <td style={{ padding: '0.45rem', color: 'var(--toy-muted)' }}>{pago.referencia_pago || '-'}</td>
                        <td style={{ padding: '0.45rem', textAlign: 'right', fontWeight: 800, color: 'var(--toy-green-dark)' }}>
                          +Q{parseFloat(pago.monto).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Barra de Acciones */}
            <div
              style={{
                borderTop: '2px solid var(--toy-border)',
                paddingTop: '1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                {selectedVentaDetail.estado === 'PENDIENTE' &&
                  parseFloat(selectedVentaDetail.saldo_pendiente) === parseFloat(selectedVentaDetail.total) && (
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => setAnularModalOpen(true)}
                    >
                      <XCircle size={15} style={{ marginRight: '4px' }} />
                      Anular Factura
                    </button>
                  )}
              </div>

              <div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setViewVentaModalOpen(false)}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ========================================================
          MODAL: REGISTRAR PAGO A VENTA EXISTENTE
         ======================================================== */}
      <Modal
        isOpen={pagoModalOpen}
        onClose={() => setPagoModalOpen(false)}
        title={`Registrar Pago a Factura #${selectedVentaDetail?.numero_factura}`}
        size="medium"
      >
        <form onSubmit={handleSubmitPago} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div
            style={{
              padding: '0.75rem',
              backgroundColor: '#F8F5EE',
              borderRadius: '12px',
              fontSize: '0.85rem',
              display: 'flex',
              justifyContent: 'space-between'
            }}
          >
            <span>Saldo Pendiente Actual:</span>
            <strong style={{ color: 'var(--toy-orange-dark)', fontSize: '0.95rem' }}>
              Q{parseFloat(selectedVentaDetail?.saldo_pendiente || 0).toFixed(2)}
            </strong>
          </div>

          <FormField label="Número de Recibo" required>
            <input
              type="text"
              className="form-control"
              value={pagoForm.numero_recibo}
              onChange={(e) => setPagoForm({ ...pagoForm, numero_recibo: e.target.value })}
              placeholder="Ej. REC-0001"
            />
          </FormField>

          <FormField label="Monto a Pagar (Q)" required>
            <input
              type="text"
              inputMode="decimal"
              className="form-control"
              placeholder="0.00"
              value={pagoForm.monto}
              onChange={(e) => {
                let val = e.target.value.replace(/[^0-9.]/g, '');
                const parts = val.split('.');
                if (parts.length > 2) val = parts[0] + '.' + parts.slice(1).join('');
                setPagoForm({ ...pagoForm, monto: val });
              }}
            />
          </FormField>

          <FormField label="Método de Pago" required>
            <SearchableSelect
              value={pagoForm.metodo_pago}
              onChange={(val) => setPagoForm({ ...pagoForm, metodo_pago: val })}
              options={METODOS_PAGO_SELECT}
              placeholder="Seleccionar método de pago..."
            />
          </FormField>

          {pagoForm.metodo_pago === 'TRANSFERENCIA' && (
            <FormField label="No. Comprobante / Transferencia" required>
              <input
                type="text"
                className="form-control"
                placeholder="Ej. Boleta o No. de autorización bancaria"
                value={pagoForm.referencia_pago}
                onChange={(e) => setPagoForm({ ...pagoForm, referencia_pago: e.target.value })}
              />
            </FormField>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setPagoModalOpen(false)}
              disabled={submittingPago}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-success"
              disabled={submittingPago}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <CheckCircle size={16} />
              <span>{submittingPago ? 'Procesando Pago...' : 'Confirmar y Asentar Pago'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================
          CONFIRM MODAL: ANULAR FACTURA
         ======================================================== */}
      <ConfirmModal
        isOpen={anularModalOpen}
        onClose={() => setAnularModalOpen(false)}
        onConfirm={handleConfirmAnularVenta}
        title="¿Anular esta Factura de Venta?"
        message={`¿Estás seguro de anular la factura #${selectedVentaDetail?.numero_factura}? Esta acción solo es posible si no posee pagos registrados y es irreversible.`}
        confirmText={anulando ? 'Anulando...' : 'Sí, Anular Factura'}
        confirmVariant="danger"
      />
    </div>
  );
}
