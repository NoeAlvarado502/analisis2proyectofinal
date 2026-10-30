import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  FileText,
  FilePlus,
  Plus,
  Eye,
  Pencil,
  XCircle,
  CheckCircle,
  Send,
  AlertTriangle,
  Clock,
  ArrowRight,
  Trash2,
  Layers,
  ShoppingBag,
  ShieldCheck,
  CheckCheck
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/Toast';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import FormField from '../components/FormField';
import FilterDropdown from '../components/FilterDropdown';
import SearchableSelect from '../components/SearchableSelect';
import ToySwitch from '../components/ToySwitch';
import PageCard from '../components/PageCard';
import DatePicker from '../components/DatePicker';
import { useSearch } from '../context/SearchContext';

export default function PedidosPage() {
  const { can, user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const canCreate = can('pedidos.crear');
  const canAuthorize = can('pedidos.autorizar_descuento');
  const canCancel = can('pedidos.cancelar') || canCreate;
  const canRegisterVenta = can('ventas.registrar');

  // Listado principal
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filtros
  const { query: q } = useSearch();
  const [filterEstado, setFilterEstado] = useState(() => location.state?.filterEstado || '');
  const [filterFechaDesde, setFilterFechaDesde] = useState('');
  const [filterFechaHasta, setFilterFechaHasta] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [q]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Sincronizar filtro cuando se navega con estado desde las alertas (Home)
  useEffect(() => {
    if (location.state?.filterEstado !== undefined) {
      setFilterEstado(location.state.filterEstado);
      setPage(1);
    }
  }, [location.state]);

  const hoyStr = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  // Catálogos auxiliares
  const [clientesActivos, setClientesActivos] = useState([]);
  const [productosActivos, setProductosActivos] = useState([]);
  const [descuentoMaxConfig, setDescuentoMaxConfig] = useState(10.0);

  // Modal Crear / Editar Pedido
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [editingPedidoId, setEditingPedidoId] = useState(null);
  const [formData, setFormData] = useState({
    numero_pedido: '',
    id_cliente: '',
    observaciones: '',
    motivo_descuento_especial: '',
    enviar_inmediatamente: false
  });
  const [detallesList, setDetallesList] = useState([]);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Entrada para agregar productos al detalle
  const [itemInput, setItemInput] = useState({
    id_producto: '',
    cantidad: 1,
    porcentaje_descuento_extra: 0
  });

  // Modal Ver Detalle / Gestión
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Modal Autorización de Descuento
  const [authorizeModalOpen, setAuthorizeModalOpen] = useState(false);
  const [motivoAutorizar, setMotivoAutorizar] = useState('');
  const [authorizing, setAuthorizing] = useState(false);

  // Modal Cancelar Pedido
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [canceling, setCanceling] = useState(false);

  // Opciones de estado
  const estadoOptions = [
    { value: '', label: 'Todos los estados', shortLabel: 'Estados' },
    { value: 'PENDIENTE_APROBACION', label: 'Pendiente de Autorización', shortLabel: 'Pendientes' },
    { value: 'CREADO', label: 'Borrador (Creado)', shortLabel: 'Borrador' },
    { value: 'APROBADO', label: 'Aprobado (Listo para facturar)', shortLabel: 'Aprobados' },
    { value: 'EN_PROCESO', label: 'En Proceso (Facturado)', shortLabel: 'En Proceso' },
    { value: 'COMPLETADO', label: 'Completado (Entregado)', shortLabel: 'Completados' },
    { value: 'CANCELADO', label: 'Cancelado', shortLabel: 'Cancelados' }
  ];

  // Helper para calcular precio por escala según cantidad
  const getEscalaInfo = useCallback((producto, cantidad) => {
    if (!producto) return { precioUnitario: 0, escalaNivel: 1 };
    const cantNum = parseInt(cantidad, 10) || 1;
    const escalas = producto.escalas || [];

    if (escalas.length === 0) {
      return {
        precioUnitario: parseFloat(producto.precio_menudeo || 0),
        escalaNivel: 1
      };
    }

    const aplicable = [...escalas]
      .filter((e) => Number(e.cantidad_minima) <= cantNum)
      .sort((a, b) => Number(b.cantidad_minima) - Number(a.cantidad_minima))[0];

    if (aplicable) {
      return {
        precioUnitario: parseFloat(aplicable.precio_unitario),
        escalaNivel: Number(aplicable.cantidad_minima)
      };
    }

    return {
      precioUnitario: parseFloat(escalas[0].precio_unitario),
      escalaNivel: Number(escalas[0].cantidad_minima)
    };
  }, []);

  // Cargar lista de pedidos
  const fetchPedidos = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (q.trim()) params.q = q.trim();
      if (filterEstado) params.estado = filterEstado;
      if (filterFechaDesde) params.fecha_desde = filterFechaDesde;
      if (filterFechaHasta) params.fecha_hasta = filterFechaHasta;

      const res = await api.get('/pedidos', { params });
      if (res?.data) {
        setPedidos(res.data);
        if (res.meta) {
          setTotalPages(res.meta.totalPages || 1);
          setTotalRecords(res.meta.total || 0);
        }
      }
    } catch (err) {
      toast.error(err.message || 'Error al cargar los pedidos');
    } finally {
      setLoading(false);
    }
  }, [page, q, filterEstado, filterFechaDesde, filterFechaHasta, toast]);

  useEffect(() => {
    fetchPedidos();
  }, [fetchPedidos]);

  // Cargar clientes y productos activos
  const fetchAuxiliares = useCallback(async () => {
    try {
      const [cliRes, prodRes, sugRes] = await Promise.all([
        api.get('/clientes', { params: { activo: '1', limit: 150 } }),
        api.get('/productos', { params: { activo: '1', limit: 300 } }),
        api.get('/pedidos/sugerir-numero')
      ]);
      if (cliRes?.data) setClientesActivos(cliRes.data);
      if (prodRes?.data) setProductosActivos(prodRes.data);
      if (sugRes?.data?.descuento_max_sin_autorizacion !== undefined) {
        setDescuentoMaxConfig(parseFloat(sugRes.data.descuento_max_sin_autorizacion));
      }
    } catch (err) {
      console.error('Error cargando listas auxiliares:', err);
    }
  }, []);

  useEffect(() => {
    fetchAuxiliares();
  }, [fetchAuxiliares]);

  // Abrir modal de creación
  const handleOpenCreate = async () => {
    setModalMode('create');
    setEditingPedidoId(null);
    setDetallesList([]);
    setFormErrors({});
    setItemInput({ id_producto: '', cantidad: 1, porcentaje_descuento_extra: 0 });

    let numeroSugerido = '';
    try {
      const sug = await api.get('/pedidos/sugerir-numero');
      if (sug?.data) {
        numeroSugerido = sug.data.sugerencia || '';
        if (sug.data.descuento_max_sin_autorizacion !== undefined) {
          setDescuentoMaxConfig(parseFloat(sug.data.descuento_max_sin_autorizacion));
        }
      }
    } catch (err) {
      console.error('No se pudo sugerir número de pedido:', err);
    }

    setFormData({
      numero_pedido: numeroSugerido,
      id_cliente: '',
      observaciones: '',
      motivo_descuento_especial: '',
      enviar_inmediatamente: false
    });
    setFormModalOpen(true);
  };

  // Abrir modal de edición (solo si está CREADO)
  const handleOpenEdit = async (pedidoItem) => {
    try {
      setLoading(true);
      const [res, sugRes] = await Promise.all([
        api.get(`/pedidos/${pedidoItem.id_pedido}`),
        api.get('/pedidos/sugerir-numero').catch(() => null)
      ]);
      if (sugRes?.data?.descuento_max_sin_autorizacion !== undefined) {
        setDescuentoMaxConfig(parseFloat(sugRes.data.descuento_max_sin_autorizacion));
      }
      const fullPedido = res.data;

      if (fullPedido.estado !== 'CREADO') {
        toast.error(`Solo se puede editar un pedido en estado CREADO (Estado actual: ${fullPedido.estado})`);
        return;
      }

      setModalMode('edit');
      setEditingPedidoId(fullPedido.id_pedido);
      setFormData({
        numero_pedido: fullPedido.numero_pedido,
        id_cliente: String(fullPedido.id_cliente),
        observaciones: fullPedido.observaciones || '',
        motivo_descuento_especial: fullPedido.motivo_descuento_especial || '',
        enviar_inmediatamente: false
      });

      const mappedDetalles = (fullPedido.detalles || []).map((d) => ({
        id_producto: d.id_producto,
        codigo_sku: d.codigo_sku,
        producto_nombre: d.producto_nombre,
        cantidad: d.cantidad,
        precio_escala: parseFloat(d.precio_escala),
        porcentaje_descuento_extra: parseFloat(d.porcentaje_descuento_extra || 0),
        monto_descuento_extra: parseFloat(d.monto_descuento_extra || 0),
        subtotal: parseFloat(d.subtotal),
        stock_actual: d.stock_actual ?? productosActivos.find((p) => Number(p.id_producto) === Number(d.id_producto))?.stock_actual ?? 9999
      }));

      setDetallesList(mappedDetalles);
      setFormErrors({});
      setItemInput({ id_producto: '', cantidad: 1, porcentaje_descuento_extra: 0 });
      setFormModalOpen(true);
      setViewModalOpen(false);
    } catch (err) {
      toast.error(err.message || 'Error al cargar pedido para edición');
    } finally {
      setLoading(false);
    }
  };

  // Abrir modal de detalle completo
  const handleOpenDetail = async (pedidoItem) => {
    setViewModalOpen(true);
    setLoadingDetail(true);
    setSelectedPedido(null);
    try {
      const [res, sugRes] = await Promise.all([
        api.get(`/pedidos/${pedidoItem.id_pedido}`),
        api.get('/pedidos/sugerir-numero').catch(() => null)
      ]);
      if (sugRes?.data?.descuento_max_sin_autorizacion !== undefined) {
        setDescuentoMaxConfig(parseFloat(sugRes.data.descuento_max_sin_autorizacion));
      }
      setSelectedPedido(res.data);
    } catch (err) {
      toast.error(err.message || 'Error al cargar detalle del pedido');
      setViewModalOpen(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Abrir detalle automáticamente si se navega desde el panel de inicio con un pedidoId específico
  useEffect(() => {
    if (location.state?.pedidoId) {
      handleOpenDetail({ id_pedido: location.state.pedidoId });
    }
  }, [location.state?.pedidoId]);

  // Producto seleccionado actualmente en itemInput
  const selectedProdInfo = useMemo(() => {
    if (!itemInput.id_producto) return null;
    return productosActivos.find((p) => String(p.id_producto) === String(itemInput.id_producto));
  }, [itemInput.id_producto, productosActivos]);

  // Cálculo en vivo del precio unitario y descuento para la línea en edición
  const itemPreview = useMemo(() => {
    if (!selectedProdInfo) return { precioUnitario: 0, montoDescuento: 0, subtotal: 0, escalaNivel: 1 };
    const cant = parseInt(itemInput.cantidad, 10) || 1;
    const descPct = parseFloat(itemInput.porcentaje_descuento_extra) || 0;
    const { precioUnitario, escalaNivel } = getEscalaInfo(selectedProdInfo, cant);
    const montoDesc = Math.round(cant * precioUnitario * (descPct / 100) * 100) / 100;
    const subtotal = Math.round((cant * precioUnitario - montoDesc) * 100) / 100;

    return {
      precioUnitario,
      escalaNivel,
      montoDescuento: montoDesc,
      subtotal
    };
  }, [selectedProdInfo, itemInput.cantidad, itemInput.porcentaje_descuento_extra, getEscalaInfo]);

  // Agregar producto a la lista de detalle
  const handleAddItem = () => {
    if (!itemInput.id_producto) {
      toast.error('Debes seleccionar un producto');
      return;
    }

    const cant = parseInt(itemInput.cantidad, 10);
    if (isNaN(cant) || cant <= 0) {
      toast.error('La cantidad debe ser mayor a 0');
      return;
    }

    const stockDisponible = selectedProdInfo?.stock_actual ?? 0;
    if (cant > stockDisponible) {
      toast.error(`Inventario insuficiente. Solo hay ${stockDisponible} unidades`);
      return;
    }

    const descPct = parseFloat(itemInput.porcentaje_descuento_extra) || 0;
    if (descPct < 0 || descPct > 100) {
      toast.error('El descuento debe estar entre 0% y 100%');
      return;
    }

    const prodId = parseInt(itemInput.id_producto, 10);
    const yaExiste = false;
    const existingIdx = detallesList.findIndex((d) => Number(d.id_producto) === prodId);
    if (existingIdx !== -1) {
      const nuevaCant = detallesList[existingIdx].cantidad + cant;
      if (nuevaCant > stockDisponible) {
        toast.error(`Inventario insuficiente. Solo hay ${stockDisponible} unidades`);
        return;
      }
      const { precioUnitario: nuevoPrecio, escalaNivel: nuevoNivel } = getEscalaInfo(selectedProdInfo, nuevaCant);
      const nuevoMontoDesc = Math.round(nuevaCant * nuevoPrecio * (descPct / 100) * 100) / 100;
      const nuevoSubtotal = Math.round((nuevaCant * nuevoPrecio - nuevoMontoDesc) * 100) / 100;
      const copia = [...detallesList];
      copia[existingIdx] = {
        ...copia[existingIdx],
        cantidad: nuevaCant,
        precio_escala: nuevoPrecio,
        escala_nivel: nuevoNivel,
        porcentaje_descuento_extra: descPct,
        monto_descuento_extra: nuevoMontoDesc,
        subtotal: nuevoSubtotal
      };
      setDetallesList(copia);
      setItemInput({ id_producto: '', cantidad: 1, porcentaje_descuento_extra: 0 });
      return;
    }
    if (yaExiste) {
      toast.error('Este producto ya fue agregado al pedido. Si deseas modificarlo, elimínalo y vuelve a añadirlo.');
      return;
    }

    setDetallesList([
      ...detallesList,
      {
        id_producto: prodId,
        codigo_sku: selectedProdInfo.codigo_sku,
        producto_nombre: selectedProdInfo.nombre,
        cantidad: cant,
        stock_actual: stockDisponible,
        precio_escala: itemPreview.precioUnitario,
        escala_nivel: itemPreview.escalaNivel,
        porcentaje_descuento_extra: descPct,
        monto_descuento_extra: itemPreview.montoDescuento,
        subtotal: itemPreview.subtotal
      }
    ]);

    setItemInput({
      id_producto: '',
      cantidad: 1,
      porcentaje_descuento_extra: 0
    });
  };

  const handleRemoveItem = (index) => {
    setDetallesList(detallesList.filter((_, i) => i !== index));
  };

  // Cálculo de totales del pedido en vivo
  const totalesCalculados = useMemo(() => {
    let subtotalGeneral = 0;
    let descuentoTotal = 0;
    let totalPagar = 0;
    let tieneDescuentoMayor = false;

    detallesList.forEach((d) => {
      const lineaBruta = d.cantidad * d.precio_escala;
      subtotalGeneral += lineaBruta;
      descuentoTotal += d.monto_descuento_extra;
      totalPagar += d.subtotal;
      if (d.porcentaje_descuento_extra > descuentoMaxConfig) {
        tieneDescuentoMayor = true;
      }
    });

    return {
      subtotalGeneral,
      descuentoTotal,
      totalPagar,
      tieneDescuentoMayor
    };
  }, [detallesList, descuentoMaxConfig]);

  // Guardar formulario (Crear o Editar)
  const handleSubmitForm = async (e) => {
    e.preventDefault();

    if (!formData.id_cliente) {
      setFormErrors({ id_cliente: 'Debes seleccionar un cliente' });
      toast.error('Debes seleccionar un cliente');
      return;
    }

    if (detallesList.length === 0) {
      toast.error('Debes incluir al menos un producto en el pedido');
      return;
    }

    if (totalesCalculados.tieneDescuentoMayor && !formData.motivo_descuento_especial?.trim()) {
      setFormErrors({
        motivo_descuento_especial: `El descuento supera el ${descuentoMaxConfig}%. Es obligatorio indicar el motivo del descuento especial`
      });
      toast.error('Indica el motivo del descuento especial superior al límite.');
      return;
    }

    setSubmitting(true);
    setFormErrors({});

    try {
      if (modalMode === 'create') {
        const payload = {
          numero_pedido: formData.numero_pedido?.trim() || null,
          id_cliente: parseInt(formData.id_cliente, 10),
          observaciones: formData.observaciones?.trim() || null,
          motivo_descuento_especial: formData.motivo_descuento_especial?.trim() || null,
          enviar_inmediatamente: Boolean(formData.enviar_inmediatamente),
          detalles: detallesList.map((d) => ({
            id_producto: d.id_producto,
            cantidad: d.cantidad,
            porcentaje_descuento_extra: d.porcentaje_descuento_extra
          }))
        };

        const res = await api.post('/pedidos', payload);
        const nuevo = res.data;
        if (nuevo.estado === 'PENDIENTE_APROBACION') {
          toast.warning('Pedido guardado: Quedó PENDIENTE DE APROBACIÓN por descuento especial.');
        } else if (nuevo.estado === 'APROBADO') {
          toast.success('Pedido creado y APROBADO automáticamente listo para facturar.');
        } else {
          toast.success('Pedido guardado en borrador (CREADO).');
        }
      } else {
        const payload = {
          observaciones: formData.observaciones?.trim() || null,
          motivo_descuento_especial: formData.motivo_descuento_especial?.trim() || null,
          detalles: detallesList.map((d) => ({
            id_producto: d.id_producto,
            cantidad: d.cantidad,
            porcentaje_descuento_extra: d.porcentaje_descuento_extra
          }))
        };
        await api.put(`/pedidos/${editingPedidoId}`, payload);
        toast.success('Pedido actualizado exitosamente.');
      }

      setFormModalOpen(false);
      fetchPedidos();
    } catch (err) {
      toast.error(err.message || 'Error al guardar el pedido');
    } finally {
      setSubmitting(false);
    }
  };

  // Enviar pedido (CREADO -> APROBADO o PENDIENTE_APROBACION)
  const handleEnviarPedido = async (idPedido) => {
    try {
      const res = await api.patch(`/pedidos/${idPedido}/enviar`);
      const updated = res.data;
      if (updated.estado === 'PENDIENTE_APROBACION') {
        toast.warning('El pedido se envió pero requiere autorización de un Supervisor.');
      } else {
        toast.success('¡Pedido APROBADO exitosamente! Ya puede facturarse.');
      }
      setViewModalOpen(false);
      fetchPedidos();
    } catch (err) {
      toast.error(err.message || 'Error al enviar el pedido');
    }
  };

  // Autorizar descuento de pedido (Supervisor)
  const handleConfirmAuthorize = async () => {
    if (!selectedPedido) return;
    if (!motivoAutorizar.trim()) {
      toast.error('Debes indicar el motivo de la autorización del descuento especial');
      return;
    }

    setAuthorizing(true);
    try {
      await api.patch(`/pedidos/${selectedPedido.id_pedido}/autorizar`, {
        motivo_descuento_especial: motivoAutorizar.trim()
      });
      toast.success('¡Descuento autorizado con éxito! El pedido pasa a estado APROBADO.');
      setAuthorizeModalOpen(false);
      setViewModalOpen(false);
      fetchPedidos();
    } catch (err) {
      toast.error(err.message || 'Error al autorizar el pedido');
    } finally {
      setAuthorizing(false);
    }
  };


  // Cancelar pedido
  const handleConfirmCancel = async () => {
    if (!selectedPedido) return;
    setCanceling(true);
    try {
      await api.patch(`/pedidos/${selectedPedido.id_pedido}/cancelar`);
      toast.success('Pedido cancelado correctamente');
      setCancelModalOpen(false);
      setViewModalOpen(false);
      fetchPedidos();
    } catch (err) {
      toast.error(err.message || 'Error al cancelar el pedido');
    } finally {
      setCanceling(false);
    }
  };

  // Renderizar insignia de estado
  const renderEstadoBadge = (estado, requiereAutorizacion) => {
    switch (estado) {
      case 'CREADO':
        return (
          <span
            className="badge"
            style={{
              backgroundColor: '#EDE9E3',
              color: 'var(--toy-muted)',
              border: '1px solid var(--toy-border)'
            }}
          >
            Borrador
          </span>
        );
      case 'PENDIENTE_APROBACION':
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
            Pendiente Autorización
          </span>
        );
      case 'APROBADO':
        return (
          <span
            className="badge badge-success"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            <CheckCircle size={12} />
            Aprobado
          </span>
        );
      case 'EN_PROCESO':
        return (
          <span
            className="badge badge-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            <ShoppingBag size={12} />
            Facturado
          </span>
        );
      case 'COMPLETADO':
        return (
          <span
            className="badge badge-success"
            style={{
              backgroundColor: '#2D6A4F',
              color: '#FFFFFF',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <CheckCheck size={12} />
            Completado
          </span>
        );
      case 'CANCELADO':
        return (
          <span
            className="badge badge-danger"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            <XCircle size={12} />
            Cancelado
          </span>
        );
      default:
        return <span className="badge">{estado}</span>;
    }
  };

  // Columnas para DataTable
  const columns = [
    {
      header: 'Pedido',
      key: 'numero_pedido',
      render: (row) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <code>{row.numero_pedido}</code>
          {Boolean(row.requiere_autorizacion) && row.estado === 'PENDIENTE_APROBACION' && (
            <span
              style={{
                fontSize: '0.72rem',
                color: 'var(--toy-orange-dark)',
                fontWeight: 700,
                marginTop: '2px'
              }}
            >
              Excede desc. 10%
            </span>
          )}
        </div>
      )
    },
    {
      header: 'Cliente',
      key: 'cliente_nombre',
      render: (row) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: 700, color: 'var(--toy-ink)' }}>{row.cliente_nombre}</span>
          <span style={{ fontSize: '0.78rem', color: 'var(--toy-muted)' }}>
            NIT: {row.cliente_identificacion || 'C/F'}
          </span>
        </div>
      )
    },
    {
      header: 'Vendedor',
      key: 'vendedor_nombre',
      render: (row) => (
        <span style={{ fontSize: '0.84rem', color: 'var(--toy-ink)', fontWeight: 600 }}>
          {row.vendedor_nombre}
        </span>
      )
    },
    {
      header: 'Fecha',
      key: 'fecha_creacion',
      render: (row) => (
        <span style={{ fontSize: '0.84rem', color: 'var(--toy-muted)', fontWeight: 600 }}>
          {row.fecha_creacion ? new Date(row.fecha_creacion).toLocaleDateString() : '-'}
        </span>
      )
    },
    {
      header: 'Total',
      key: 'total',
      render: (row) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: 800, color: 'var(--toy-deep-blue)', fontSize: '0.94rem' }}>
            Q{parseFloat(row.total || 0).toFixed(2)}
          </span>
          {parseFloat(row.descuento_total || 0) > 0 && (
            <span style={{ fontSize: '0.72rem', color: 'var(--toy-green-dark)', fontWeight: 700 }}>
              Ahorro: Q{parseFloat(row.descuento_total).toFixed(2)}
            </span>
          )}
        </div>
      )
    },
    {
      header: 'Estado',
      key: 'estado',
      render: (row) => renderEstadoBadge(row.estado, row.requiere_autorizacion)
    },
    {
      header: 'Acciones',
      key: 'acciones',
      render: (row) => (
        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => handleOpenDetail(row)}
            title="Ver detalle del pedido"
          >
            <Eye size={15} />
          </button>
          {row.estado === 'CREADO' && canCreate && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleOpenEdit(row)}
              title="Editar pedido"
            >
              <Pencil size={15} />
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <PageCard
        title="Pedidos"
        actions={
          <>
            <FilterDropdown
              title="Filtrar por estado"
              buttonTitle="Estados"
              value={filterEstado}
              onChange={(val) => {
                setFilterEstado(val);
                setPage(1);
              }}
              options={estadoOptions}
            />

            <DatePicker
              value={filterFechaDesde}
              onChange={(val) => {
                if (val && val > hoyStr) return;
                setFilterFechaDesde(val);
                setPage(1);
              }}
              placeholder="Desde"
              width="130px"
              max={filterFechaHasta || hoyStr}
            />

            <DatePicker
              value={filterFechaHasta}
              onChange={(val) => {
                if (val && val > hoyStr) return;
                setFilterFechaHasta(val);
                setPage(1);
              }}
              placeholder="Hasta"
              width="130px"
              min={filterFechaDesde || undefined}
              max={hoyStr}
              align="right"
            />

            {canCreate && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleOpenCreate}
                title="Registrar Pedido"
                aria-label="Registrar Pedido"
                style={{
                  width: '40px',
                  height: '40px',
                  padding: 0,
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <FilePlus size={20} strokeWidth={2.4} />
              </button>
            )}
          </>
        }
      >

        {/* Tabla Principal */}
        <DataTable
          columns={columns}
          data={pedidos}
          loading={loading}
          emptyMessage="No se encontraron pedidos registrados con los filtros aplicados."
          pagination={{
            currentPage: page,
            totalPages,
            totalRecords
          }}
          onPageChange={setPage}
          embedded
        />
      </PageCard>

      {/* ========================================================
          MODAL: NUEVO / EDITAR PEDIDO
         ======================================================== */}
      <Modal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        title={modalMode === 'create' ? 'Registrar Pedido' : `Editar Pedido #${formData.numero_pedido}`}
        size="large"
      >
        <form onSubmit={handleSubmitForm} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          {/* Cabecera del Pedido */}
          <FormField label="Cliente" error={formErrors.id_cliente} required>
            <SearchableSelect
              placeholder="Selecciona un cliente..."
              value={formData.id_cliente}
              onChange={(val) => setFormData({ ...formData, id_cliente: val })}
              options={clientesActivos.map((c) => ({
                value: c.id_cliente,
                label: `${c.nombre_razon_social} (NIT: ${c.identificacion || 'C/F'})`
              }))}
            />
          </FormField>

          {/* Subpanel: Agregar Líneas de Productos */}
          <div
            style={{
              backgroundColor: '#FFFDF9',
              border: '1.5px solid var(--toy-border)',
              borderRadius: '16px',
              padding: '1.1rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: 'var(--toy-ink)' }}>
                Líneas de Productos y Escalas
              </h4>
              <span style={{ fontSize: '0.78rem', color: 'var(--toy-muted)', fontWeight: 600 }}>
                Límite descuento sin autorización: <strong>{descuentoMaxConfig}%</strong>
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '0.75rem',
                alignItems: 'flex-end'
              }}
            >
              <div style={{ gridColumn: 'span 2', minWidth: '220px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--toy-ink)', marginBottom: '4px', display: 'block' }}>
                  Producto
                </label>
                <SearchableSelect
                  placeholder="Buscar producto por SKU o nombre..."
                  value={itemInput.id_producto}
                  onChange={(val) => setItemInput({ ...itemInput, id_producto: val })}
                  options={productosActivos.map((p) => ({
                    value: p.id_producto,
                    label: `${p.codigo_sku} - ${p.nombre} (Stock: ${p.stock_actual ?? 0})`
                  }))}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--toy-ink)', marginBottom: '4px', display: 'block' }}>
                  Cantidad
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  className="form-control"
                  value={itemInput.cantidad}
                  placeholder="1"
                  onChange={(e) => {
                    const clean = e.target.value.replace(/\D/g, '');
                    if (clean === '') {
                      setItemInput({ ...itemInput, cantidad: '' });
                      return;
                    }
                    let num = parseInt(clean, 10);
                    if (isNaN(num) || num <= 0) num = 1;
                    const maxStock = selectedProdInfo?.stock_actual ?? 9999;
                    if (num > maxStock) num = maxStock;
                    setItemInput({ ...itemInput, cantidad: num });
                  }}
                  onBlur={() => {
                    if (!itemInput.cantidad || parseInt(itemInput.cantidad, 10) <= 0) {
                      setItemInput({ ...itemInput, cantidad: 1 });
                    }
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--toy-ink)', marginBottom: '4px', display: 'block' }}>
                  Desc. Extra (%)
                </label>
                <input
                  type="number"
                  className="form-control"
                  min="0"
                  max="100"
                  step="0.5"
                  value={itemInput.porcentaje_descuento_extra}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') {
                      setItemInput({ ...itemInput, porcentaje_descuento_extra: '' });
                      return;
                    }
                    let num = parseFloat(raw);
                    if (isNaN(num) || num < 0) num = 0;
                    if (num > 100) num = 100;
                    setItemInput({ ...itemInput, porcentaje_descuento_extra: num });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+') {
                      e.preventDefault();
                    }
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleAddItem}
                  title="Agregar producto"
                  style={{
                    height: '40px',
                    width: '100%',
                    padding: '0 1rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    fontWeight: 800
                  }}
                >
                  <Plus size={18} strokeWidth={2.6} />
                  <span>Agregar</span>
                </button>
              </div>
            </div>

            {/* Vista previa de precio por escala */}
            {selectedProdInfo && (
              <div
                style={{
                  marginTop: '0.75rem',
                  fontSize: '0.82rem',
                  padding: '0.5rem 0.85rem',
                  backgroundColor: 'rgba(25, 168, 232, 0.08)',
                  borderRadius: '10px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  color: 'var(--toy-deep-blue)',
                  fontWeight: 700
                }}
              >
                <span>
                  Escala aplicada: <strong>Nivel {itemPreview.escalaNivel}+ uds (Q{itemPreview.precioUnitario.toFixed(2)} c/u)</strong>
                </span>
                <span>
                  Subtotal línea: Q{itemPreview.subtotal.toFixed(2)}
                  {itemPreview.montoDescuento > 0 && (
                    <span style={{ color: 'var(--toy-green-dark)', marginLeft: '6px' }}>
                      (Desc: Q{itemPreview.montoDescuento.toFixed(2)})
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>

          {/* Tabla de Productos Agregados */}
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%', border: '1px solid var(--toy-border)', borderRadius: '12px' }}>
            <table className="table" style={{ width: '100%', minWidth: '520px', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8F5EE', textAlign: 'left', borderBottom: '2px solid var(--toy-border)' }}>
                  <th style={{ padding: '0.55rem' }}>Producto</th>
                  <th style={{ padding: '0.55rem', textAlign: 'center', width: '70px' }}>Cant.</th>
                  <th style={{ padding: '0.55rem', textAlign: 'right', width: '100px' }}>Precio Escala</th>
                  <th style={{ padding: '0.55rem', textAlign: 'center', width: '80px' }}>% Desc.</th>
                  <th style={{ padding: '0.55rem', textAlign: 'right', width: '100px' }}>Subtotal</th>
                  <th style={{ padding: '0.55rem', width: '50px', textAlign: 'center' }}></th>
                </tr>
              </thead>
              <tbody>
                {detallesList.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--toy-muted)' }}>
                      No has agregado productos a este pedido aún.
                    </td>
                  </tr>
                ) : (
                  detallesList.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--toy-border)' }}>
                      <td style={{ padding: '0.55rem' }}>
                        <div style={{ fontWeight: 700, color: 'var(--toy-ink)' }}>{item.producto_nombre}</div>
                        <code style={{ fontSize: '0.75rem' }}>{item.codigo_sku}</code>
                      </td>
                      <td style={{ padding: '0.55rem', textAlign: 'center', fontWeight: 700, width: '70px' }}>
                        {item.cantidad}
                      </td>
                      <td style={{ padding: '0.55rem', textAlign: 'right', fontWeight: 600, width: '100px' }}>
                        Q{parseFloat(item.precio_escala).toFixed(2)}
                      </td>
                      <td style={{ padding: '0.55rem', textAlign: 'center', width: '80px' }}>
                        {item.porcentaje_descuento_extra > 0 ? (
                          <span
                            className={`badge ${item.porcentaje_descuento_extra > descuentoMaxConfig ? 'badge-warning' : 'badge-success'}`}
                            style={{ fontSize: '0.75rem' }}
                          >
                            {item.porcentaje_descuento_extra}%
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td style={{ padding: '0.55rem', textAlign: 'right', fontWeight: 800, color: 'var(--toy-deep-blue)', width: '100px' }}>
                        Q{parseFloat(item.subtotal).toFixed(2)}
                      </td>
                      <td style={{ padding: '0.55rem', textAlign: 'center', width: '50px' }}>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => handleRemoveItem(idx)}
                          title="Eliminar producto"
                          style={{
                            width: '32px',
                            height: '32px',
                            padding: 0,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '8px',
                            flexShrink: 0
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Alerta de Descuento Especial (> 10%) */}
          {totalesCalculados.tieneDescuentoMayor && (
            <div
              style={{
                backgroundColor: 'rgba(255, 157, 46, 0.12)',
                border: '1.5px solid var(--toy-orange)',
                borderRadius: '14px',
                padding: '0.85rem 1rem',
                display: 'flex',
                gap: '0.75rem',
                alignItems: 'flex-start'
              }}
            >
              <AlertTriangle size={20} color="var(--toy-orange-dark)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <h5 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: 'var(--toy-orange-dark)' }}>
                  Aprobación requerida
                </h5>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: 'var(--toy-ink)' }}>
                  Al menos un producto tiene un descuento extra superior al límite permitido ({descuentoMaxConfig}%).
                  El pedido quedará en estado <strong>PENDIENTE DE APROBACIÓN</strong> hasta ser revisado por un Supervisor.
                </p>
              </div>
            </div>
          )}

          {/* Motivo de Descuento y Observaciones */}
          <div style={{ display: 'grid', gridTemplateColumns: totalesCalculados.tieneDescuentoMayor ? '1fr 1fr' : '1fr', gap: '1rem' }}>
            {totalesCalculados.tieneDescuentoMayor && (
              <FormField
                label="Motivo del Descuento Especial"
                error={formErrors.motivo_descuento_especial}
                required
              >
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej. Promoción institucional por apertura..."
                  value={formData.motivo_descuento_especial}
                  onChange={(e) => setFormData({ ...formData, motivo_descuento_especial: e.target.value })}
                />
              </FormField>
            )}

            <FormField label="Observaciones">
              <input
                type="text"
                className="form-control"
                placeholder="Notas internas sobre el pedido..."
                value={formData.observaciones}
                onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
              />
            </FormField>
          </div>

          {/* Barra de Totales */}
          <div
            style={{
              padding: '1rem 1.25rem',
              backgroundColor: '#F8F5EE',
              borderRadius: '16px',
              border: '1.5px solid var(--toy-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <div style={{ display: 'flex', gap: '1.5rem' }}>
              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--toy-muted)', fontWeight: 700 }}>Subtotal:</span>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--toy-ink)' }}>
                  Q{totalesCalculados.subtotalGeneral.toFixed(2)}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--toy-muted)', fontWeight: 700 }}>Descuento Extra:</span>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--toy-green-dark)' }}>
                  -Q{totalesCalculados.descuentoTotal.toFixed(2)}
                </div>
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.84rem', color: 'var(--toy-muted)', fontWeight: 700 }}>Total Final a Pagar:</span>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--toy-deep-blue)' }}>
                Q{totalesCalculados.totalPagar.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Checkbox enviar inmediatamente (solo al crear) */}
          {modalMode === 'create' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ToySwitch
                id="switch-enviar-inmediato"
                checked={formData.enviar_inmediatamente}
                onChange={(val) => setFormData({ ...formData, enviar_inmediatamente: val })}
              />
              <label
                htmlFor="switch-enviar-inmediato"
                style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--toy-ink)', cursor: 'pointer' }}
              >
                Enviar pedido inmediatamente a aprobación/facturación (saltar borrador)
              </label>
            </div>
          )}

          {/* Botones de acción */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setFormModalOpen(false)}
              disabled={submitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <CheckCircle size={16} />
              <span>{submitting ? 'Guardando...' : modalMode === 'create' ? 'Guardar Pedido' : 'Actualizar Pedido'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================
          MODAL: DETALLE Y GESTIÓN DE PEDIDO
         ======================================================== */}
      <Modal
        isOpen={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        title={selectedPedido ? `Detalle de Pedido #${selectedPedido.numero_pedido}` : 'Cargando Pedido...'}
        size="large"
      >
        {loadingDetail || !selectedPedido ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--toy-muted)' }}>
            Cargando información completa del pedido...
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Header / Info General */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
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
                  {renderEstadoBadge(selectedPedido.estado, selectedPedido.requiere_autorizacion)}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--toy-muted)', fontWeight: 700 }}>Cliente:</span>
                <div style={{ fontWeight: 700, color: 'var(--toy-ink)', fontSize: '0.9rem' }}>
                  {selectedPedido.cliente_nombre}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--toy-muted)' }}>
                  NIT: {selectedPedido.cliente_identificacion || 'C/F'}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--toy-muted)', fontWeight: 700 }}>Vendedor:</span>
                <div style={{ fontWeight: 700, color: 'var(--toy-ink)', fontSize: '0.88rem' }}>
                  {selectedPedido.vendedor_nombre}
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--toy-muted)' }}>
                  {selectedPedido.fecha_creacion ? new Date(selectedPedido.fecha_creacion).toLocaleString() : ''}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--toy-muted)', fontWeight: 700 }}>Total:</span>
                <div style={{ fontWeight: 800, color: 'var(--toy-deep-blue)', fontSize: '1.2rem' }}>
                  Q{parseFloat(selectedPedido.total || 0).toFixed(2)}
                </div>
              </div>
            </div>

            {/* Datos de Autorización si aplica */}
            {selectedPedido.supervisor_nombre && (
              <div
                style={{
                  backgroundColor: 'rgba(116, 201, 91, 0.12)',
                  border: '1.5px solid var(--toy-green)',
                  borderRadius: '12px',
                  padding: '0.75rem 1rem',
                  fontSize: '0.84rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--toy-green-dark)', fontWeight: 800 }}>
                  <ShieldCheck size={16} />
                  <span>Descuento Especial Autorizado por: {selectedPedido.supervisor_nombre}</span>
                </div>
                <p style={{ margin: '0.25rem 0 0', color: 'var(--toy-ink)' }}>
                  Motivo: <em>"{selectedPedido.motivo_descuento_especial}"</em>
                </p>
              </div>
            )}

            {/* Tabla de Líneas */}
            <div>
              <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.94rem', fontWeight: 800, color: 'var(--toy-ink)' }}>
                Productos del Pedido
              </h4>
              <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
                <table className="table" style={{ width: '100%', minWidth: '500px', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8F5EE', textAlign: 'left', borderBottom: '2px solid var(--toy-border)' }}>
                    <th style={{ padding: '0.5rem' }}>Producto</th>
                    <th style={{ padding: '0.5rem', textAlign: 'center' }}>Cantidad</th>
                    <th style={{ padding: '0.5rem', textAlign: 'right' }}>Precio Escala</th>
                    <th style={{ padding: '0.5rem', textAlign: 'center' }}>% Desc.</th>
                    <th style={{ padding: '0.5rem', textAlign: 'right' }}>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedPedido.detalles || []).map((det, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid var(--toy-border)' }}>
                      <td style={{ padding: '0.5rem' }}>
                        <div style={{ fontWeight: 700, color: 'var(--toy-ink)' }}>{det.producto_nombre}</div>
                        <code style={{ fontSize: '0.75rem' }}>{det.codigo_sku}</code>
                      </td>
                      <td style={{ padding: '0.5rem', textAlign: 'center', fontWeight: 700 }}>
                        {det.cantidad}
                      </td>
                      <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                        Q{parseFloat(det.precio_escala).toFixed(2)}
                      </td>
                      <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                        {parseFloat(det.porcentaje_descuento_extra) > 0 ? (
                          <span className="badge badge-warning" style={{ fontSize: '0.72rem' }}>
                            {det.porcentaje_descuento_extra}%
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 800, color: 'var(--toy-deep-blue)' }}>
                        Q{parseFloat(det.subtotal).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>

            {/* Barra de Acciones según Estado */}
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
                {selectedPedido.estado !== 'COMPLETADO' && selectedPedido.estado !== 'CANCELADO' && canCancel && (
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => setCancelModalOpen(true)}
                  >
                    <XCircle size={15} style={{ marginRight: '4px' }} />
                    Cancelar Pedido
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                {selectedPedido.estado === 'CREADO' && canCreate && (
                  <>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => handleOpenEdit(selectedPedido)}
                    >
                      <Pencil size={16} style={{ marginRight: '4px' }} />
                      Editar
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => handleEnviarPedido(selectedPedido.id_pedido)}
                    >
                      <Send size={16} style={{ marginRight: '4px' }} />
                      Enviar Pedido
                    </button>
                  </>
                )}

                {selectedPedido.estado === 'PENDIENTE_APROBACION' && canAuthorize && (
                  <button
                    type="button"
                    className="btn btn-warning"
                    onClick={() => {
                      setMotivoAutorizar(selectedPedido.motivo_descuento_especial || '');
                      setAuthorizeModalOpen(true);
                    }}
                    style={{ backgroundColor: 'var(--toy-orange)', color: '#FFFFFF' }}
                  >
                    <ShieldCheck size={16} style={{ marginRight: '4px' }} />
                    Autorizar Descuento Especial
                  </button>
                )}

                {selectedPedido.estado === 'APROBADO' && canRegisterVenta && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      setViewModalOpen(false);
                      navigate('/ventas', { state: { pedidoAprobado: selectedPedido } });
                    }}
                  >
                    <ShoppingBag size={16} style={{ marginRight: '4px' }} />
                    Facturar / Generar Venta
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ========================================================
          MODAL: AUTORIZAR DESCUENTO ESPECIAL (SUPERVISOR)
         ======================================================== */}
      <Modal
        isOpen={authorizeModalOpen}
        onClose={() => setAuthorizeModalOpen(false)}
        title="Autorizar Descuento Especial de Pedido"
        size="medium"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Resumen del Pedido */}
          <div
            style={{
              padding: '0.85rem 1rem',
              backgroundColor: '#FFFDF9',
              border: '1.5px solid var(--toy-border)',
              borderRadius: '14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.5rem'
            }}
          >
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--toy-muted)', fontWeight: 700 }}>Cliente:</div>
              <div style={{ fontWeight: 800, color: 'var(--toy-ink)', fontSize: '0.92rem' }}>
                {selectedPedido?.cliente_nombre}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--toy-muted)', fontWeight: 700 }}>Total Pedido:</div>
              <div style={{ fontWeight: 800, color: 'var(--toy-deep-blue)', fontSize: '1.05rem' }}>
                Q{parseFloat(selectedPedido?.total || 0).toFixed(2)}
              </div>
            </div>
          </div>

          {/* Tarjeta destacada con el Porqué / Motivo del descuento especial indicado por el vendedor */}
          <div
            style={{
              backgroundColor: 'rgba(255, 157, 46, 0.1)',
              border: '1.5px solid var(--toy-orange)',
              borderRadius: '14px',
              padding: '0.85rem 1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--toy-orange-dark)', fontWeight: 800, fontSize: '0.85rem' }}>
              <AlertTriangle size={16} />
              <span>Porqué del Descuento (Justificación del Vendedor):</span>
            </div>
            <div
              style={{
                fontSize: '0.92rem',
                color: 'var(--toy-ink)',
                fontWeight: 700,
                backgroundColor: '#FFFFFF',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid rgba(255, 157, 46, 0.3)',
                lineHeight: 1.4
              }}
            >
              {selectedPedido?.motivo_descuento_especial || 'No se indicó un motivo específico en la solicitud.'}
            </div>
          </div>

          {/* Desglose de productos que superan el límite de descuento */}
          {selectedPedido?.detalles && selectedPedido.detalles.some((d) => Number(d.porcentaje_descuento_extra) > descuentoMaxConfig) && (
            <div
              style={{
                backgroundColor: '#F8F5EE',
                borderRadius: '12px',
                padding: '0.75rem',
                fontSize: '0.82rem'
              }}
            >
              <span style={{ fontWeight: 700, color: 'var(--toy-ink)' }}>Productos con descuento superior al {descuentoMaxConfig}%:</span>
              <ul style={{ margin: '4px 0 0', paddingLeft: '1.25rem' }}>
                {selectedPedido.detalles
                  .filter((d) => Number(d.porcentaje_descuento_extra) > descuentoMaxConfig)
                  .map((d, idx) => (
                    <li key={idx} style={{ marginTop: '2px', color: 'var(--toy-ink)' }}>
                      <strong>{d.producto_nombre}</strong> ({d.cantidad} unids.) —{' '}
                      <span style={{ color: 'var(--toy-orange-dark)', fontWeight: 800 }}>
                        +{parseFloat(d.porcentaje_descuento_extra).toFixed(1)}% extra
                      </span>{' '}
                      (Subtotal: Q{parseFloat(d.subtotal).toFixed(2)})
                    </li>
                  ))}
              </ul>
            </div>
          )}

          <FormField label="Nota de Aprobación (Supervisor)" required>
            <input
              type="text"
              className="form-control"
              placeholder="Indica el motivo comercial de la aprobación (ej. Aprobado para cliente mayorista)..."
              value={motivoAutorizar}
              onChange={(e) => setMotivoAutorizar(e.target.value)}
            />
          </FormField>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setAuthorizeModalOpen(false)}
              disabled={authorizing}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleConfirmAuthorize}
              disabled={authorizing}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <CheckCircle size={16} />
              <span>{authorizing ? 'Autorizando...' : 'Confirmar Autorización'}</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* ========================================================
          CONFIRM MODAL: CANCELAR PEDIDO
         ======================================================== */}
      <ConfirmModal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        onConfirm={handleConfirmCancel}
        title="¿Cancelar este Pedido?"
        message={`¿Estás seguro de cancelar el pedido #${selectedPedido?.numero_pedido}? Esta acción no se puede deshacer y si tuviese facturación pendiente quedará anulada.`}
        confirmText={canceling ? 'Cancelando...' : 'Sí, Cancelar Pedido'}
        confirmVariant="danger"
      />
    </div>
  );
}
