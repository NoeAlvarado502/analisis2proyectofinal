import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import React from '../../frontend/node_modules/react/index.js';
import { app } from '../src/app.js';
import { pool } from '../src/db/pool.js';

// Mock de dependencias de contexto/router/api del frontend para evaluar los componentes en Node
const apiMock = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn()
};

vi.mock('../../frontend/src/api/client.js', () => ({
  default: apiMock
}));

vi.mock('../../frontend/src/auth/AuthContext.jsx', () => ({
  useAuth: () => ({
    user: { id_usuario: 1, nombre_completo: 'Admin Test', rol: 'Administrador' },
    can: () => true,
    hasPermission: () => true
  })
}));

vi.mock('../../frontend/src/components/Toast.jsx', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn()
  })
}));

vi.mock('../../frontend/src/context/SearchContext.jsx', () => ({
  useSearch: () => ({
    query: '',
    setQuery: vi.fn(),
    setPlaceholder: vi.fn()
  })
}));

vi.mock('../../frontend/node_modules/react-router-dom/dist/index.js', () => ({
  useLocation: () => ({ state: null, pathname: '/' }),
  useNavigate: () => vi.fn()
}));

vi.mock('../../frontend/node_modules/react-router/dist/index.js', () => ({
  useLocation: () => ({ state: null, pathname: '/' }),
  useNavigate: () => vi.fn()
}));

/**
 * Harness minimalista de hooks de React para ejecutar componentes funcionales
 * en entorno Node y capturar estados, efectos y árbol de elementos React.
 */
function createComponentHarness(Component, initialProps = {}) {
  const states = [];
  const effects = [];
  const callbacks = [];
  let hookIndex = 0;

  const dispatcher = {
    useState(initialValue) {
      const idx = hookIndex++;
      if (!(idx in states)) {
        states[idx] = typeof initialValue === 'function' ? initialValue() : initialValue;
      }
      const setState = (updater) => {
        states[idx] = typeof updater === 'function' ? updater(states[idx]) : updater;
      };
      return [states[idx], setState];
    },
    useEffect(cb, deps) {
      const idx = hookIndex++;
      effects[idx] = cb;
    },
    useLayoutEffect() {
      hookIndex++;
    },
    useCallback(cb) {
      const idx = hookIndex++;
      callbacks[idx] = cb;
      return cb;
    },
    useMemo(cb) {
      hookIndex++;
      return cb();
    },
    useRef(initialValue) {
      const idx = hookIndex++;
      if (!(idx in states)) {
        states[idx] = { current: initialValue };
      }
      return states[idx];
    },
    useContext(ctx) {
      hookIndex++;
      return (
        ctx._currentValue || {
          basename: '/',
          navigator: { push: () => {}, replace: () => {}, go: () => {}, createHref: () => '' },
          static: false,
          location: { pathname: '/', search: '', hash: '', state: null, key: 'default' },
          future: { v7_relativeSplatPath: false },
          matches: [],
          isDataRoute: false
        }
      );
    }
  };

  const internals =
    React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED?.ReactCurrentDispatcher ||
    React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;

  function render(props = initialProps) {
    hookIndex = 0;
    const prev = internals.current || internals.H;
    if ('current' in internals) internals.current = dispatcher;
    if ('H' in internals) internals.H = dispatcher;
    try {
      return Component(props);
    } finally {
      if ('current' in internals) internals.current = prev;
      if ('H' in internals) internals.H = prev;
    }
  }

  async function runEffects() {
    for (const eff of effects) {
      if (typeof eff === 'function') {
        await eff();
      }
    }
  }

  return { render, runEffects, states, callbacks };
}

function findElements(node, predicate, results = []) {
  if (!node || typeof node !== 'object') return results;
  if (Array.isArray(node)) {
    for (const child of node) findElements(child, predicate, results);
    return results;
  }
  if (predicate(node)) {
    results.push(node);
  }
  if (node.props && node.props.children) {
    findElements(node.props.children, predicate, results);
  }
  if (node.props) {
    for (const [k, v] of Object.entries(node.props)) {
      if (k !== 'children' && v && typeof v === 'object') {
        findElements(v, predicate, results);
      }
    }
  }
  return results;
}

function extractText(node) {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (node.props && node.props.children !== undefined) return extractText(node.props.children);
  return '';
}

describe('Reproducción y Regresión de Bugs del Sistema', () => {
  let supervisorToken;
  let operadorToken;
  const timestamp = Date.now();

  beforeAll(async () => {
    const loginSup = await request(app)
      .post('/api/auth/login')
      .send({ email: 'supervisor@jugueteria.local', password: 'Admin1234!' });
    supervisorToken = loginSup.body.data.token;

    const loginOp = await request(app)
      .post('/api/auth/login')
      .send({ email: 'operador@jugueteria.local', password: 'Admin1234!' });
    operadorToken = loginOp.body.data.token;
  });

  // ============================================================================
  // BUG 1: ComprasPage - botón "Nueva compra" pasa SyntheticBaseEvent como prefillItem
  // ============================================================================
  it('Bug 1: Hacer clic en "Nueva compra" en ComprasPage no debe tratar el evento de clic como prefillItem', async () => {
    apiMock.get.mockReset();
    apiMock.get.mockImplementation(async (url) => {
      if (url === '/compras/sugerir-comprobante') return { data: { sugerencia: 'COMP-0099' } };
      if (url === '/proveedores') return { data: [{ id_proveedor: 1, razon_social: 'Prov 1' }] };
      return { data: [] };
    });

    const { default: ComprasPage } = await import('../../frontend/src/pages/ComprasPage.jsx');
    const harness = createComponentHarness(ComprasPage);
    const tree1 = harness.render();

    const btnNuevaCompra = findElements(
      tree1,
      (el) => el.type === 'button' && el.props?.['aria-label'] === 'Nueva compra'
    )[0];
    expect(btnNuevaCompra).toBeDefined();

    // Simular exactamente lo que hace React al hacer clic: pasar SyntheticBaseEvent al handler onClick
    const fakeClickEvent = { type: 'click', preventDefault: () => {}, stopPropagation: () => {} };
    await btnNuevaCompra.props.onClick(fakeClickEvent);

    // No debe haber llamado a /compras/ultimo-costo/undefined
    const calledUrls = apiMock.get.mock.calls.map((c) => c[0]);
    expect(calledUrls).not.toContain('/compras/ultimo-costo/undefined');

    // Al re-renderizar, formData.observaciones debe estar vacío ''
    const formDataState = harness.states.find(
      (s) => s && typeof s === 'object' && 'numero_comprobante' in s && 'observaciones' in s
    );
    expect(formDataState).toBeDefined();
    expect(formDataState.observaciones).toBe('');
  });

  // ============================================================================
  // BUG 2: InventarioPage - guardar stock mínimo llama a ruta inexistente /productos/:id/stock-minimo
  // ============================================================================
  it('Bug 2: Guardar stock mínimo en InventarioPage debe llamar a PATCH /inventario/:id/stock-minimo', async () => {
    apiMock.patch.mockReset();
    apiMock.patch.mockResolvedValue({ data: { ok: true } });
    apiMock.get.mockReset();
    apiMock.get.mockResolvedValue({ data: [], meta: { total: 0, totalPages: 1 } });

    const { default: InventarioPage } = await import('../../frontend/src/pages/InventarioPage.jsx');
    const harness = createComponentHarness(InventarioPage);
    let tree = harness.render();

    // Renderizar las acciones de una fila en columnsExistencias y abrir modal de stock mínimo
    const dataTables = findElements(tree, (el) => el.props?.columns && Array.isArray(el.props.columns));
    expect(dataTables.length).toBeGreaterThan(0);
    const accionesCol = dataTables[0].props.columns.find((c) => c.key === 'acciones');
    const accionesTree = accionesCol.render({ id_producto: 42, nombre: 'Muñeca Test', stock_minimo: 5, stock_actual: 10 });
    const btnConfigMinimo = findElements(
      accionesTree,
      (el) => el.type === 'button' && el.props?.title?.includes('stock mínimo')
    )[0];
    expect(btnConfigMinimo).toBeDefined();

    btnConfigMinimo.props.onClick();
    tree = harness.render();

    // Encontrar el formulario de stock mínimo y enviarlo
    const forms = findElements(tree, (el) => el.type === 'form' && typeof el.props?.onSubmit === 'function');
    expect(forms.length).toBeGreaterThan(0);
    await forms[0].props.onSubmit({ preventDefault: () => {} });

    expect(apiMock.patch).toHaveBeenCalledWith('/inventario/42/stock-minimo', { stock_minimo: 5 });
  });

  // ============================================================================
  // BUG 3: InventarioPage - columnas de Kardex leen row.fecha y row.usuario_nombre en vez de fecha_hora y usuario
  // ============================================================================
  it('Bug 3: La tabla de Kardex en InventarioPage debe mostrar fecha_hora y usuario devueltos por el backend', async () => {
    const { default: InventarioPage } = await import('../../frontend/src/pages/InventarioPage.jsx');
    const harness = createComponentHarness(InventarioPage);
    let tree = harness.render();

    const btnTabKardex = findElements(tree, (el) => el.type === 'button' && extractText(el).includes('Kardex'))[0];
    btnTabKardex.props.onClick();
    tree = harness.render();

    const dataTables = findElements(tree, (el) => el.props?.columns && Array.isArray(el.props.columns));
    expect(dataTables.length).toBeGreaterThan(0);
    const columnsKardex = dataTables[0].props.columns;

    const sampleRow = {
      id_movimiento: 1,
      fecha_hora: '2026-10-30T14:30:00.000Z',
      tipo_movimiento: 'ENTRADA',
      producto: 'Pista Hot Wheels',
      codigo_sku: 'JUG-001',
      cantidad: 20,
      stock_anterior: 10,
      stock_posterior: 30,
      documento_id: 'COMP-0001',
      motivo: 'Compra recibida',
      usuario: 'María Supervisor'
    };

    const colFecha = columnsKardex.find((c) => c.header === 'Fecha / Hora');
    const colOperador = columnsKardex.find((c) => c.header === 'Operador');

    const fechaText = extractText(colFecha.render(sampleRow));
    const operadorText = extractText(colOperador.render(sampleRow));

    expect(fechaText).not.toBe('-');
    expect(operadorText).toBe('María Supervisor');
  });

  // ============================================================================
  // BUG 4: InventarioPage - movimientos SALIDA se muestran con '+' y color verde en Kardex
  // ============================================================================
  it('Bug 4: Un movimiento SALIDA en el Kardex de InventarioPage debe mostrarse con signo negativo y color rojo', async () => {
    const { default: InventarioPage } = await import('../../frontend/src/pages/InventarioPage.jsx');
    const harness = createComponentHarness(InventarioPage);
    let tree = harness.render();

    const btnTabKardex = findElements(tree, (el) => el.type === 'button' && extractText(el).includes('Kardex'))[0];
    btnTabKardex.props.onClick();
    tree = harness.render();

    const dataTables = findElements(tree, (el) => el.props?.columns && Array.isArray(el.props.columns));
    const columnsKardex = dataTables[0].props.columns;
    const colCantidad = columnsKardex.find((c) => c.header === 'Cantidad');

    const salidaRow = {
      tipo_movimiento: 'SALIDA',
      cantidad: 5
    };

    const cell = colCantidad.render(salidaRow);
    const cellText = extractText(cell);

    expect(cellText).toBe('-5 uds');
    expect(cell.props.style.color).toBe('var(--toy-red)');
  });

  // ============================================================================
  // BUG 7: ReportesPage - loadCatalogs llama a /productos/catalogo/categorias y /productos/catalogo/marcas (404)
  // ============================================================================
  it('Bug 7: ReportesPage debe cargar los catálogos desde /categorias y /marcas', async () => {
    apiMock.get.mockReset();
    apiMock.get.mockResolvedValue({ data: [] });

    const { default: ReportesPage } = await import('../../frontend/src/pages/ReportesPage.jsx');
    const harness = createComponentHarness(ReportesPage);
    harness.render();
    await harness.runEffects();

    const calledUrls = apiMock.get.mock.calls.map((c) => c[0]);
    expect(calledUrls).toContain('/categorias');
    expect(calledUrls).toContain('/marcas');
    expect(calledUrls).not.toContain('/productos/catalogo/categorias');
    expect(calledUrls).not.toContain('/productos/catalogo/marcas');
  });

  // ============================================================================
  // BUG 8: ReportesPage - SearchableSelect de productos en Kardex no recibe la prop options
  // ============================================================================
  it('Bug 8: El filtro SearchableSelect de productos en Kardex de ReportesPage debe recibir options con los productos', async () => {
    apiMock.get.mockReset();
    apiMock.get.mockImplementation(async (url) => {
      if (url === '/reportes/kardex') {
        return {
          data: {
            filas: [],
            kpis: { total_entradas: 0, total_salidas: 0, total_ajustes: 0, variacion_neta: 0 },
            metadatos: {
              productos: [{ id_producto: 15, codigo_sku: 'SKU-15', nombre: 'Tren Eléctrico' }]
            }
          }
        };
      }
      return { data: [] };
    });

    const { default: ReportesPage } = await import('../../frontend/src/pages/ReportesPage.jsx');
    const harness = createComponentHarness(ReportesPage);
    harness.render();
    await harness.runEffects();
    const tree = harness.render();

    const productSelect = findElements(
      tree,
      (el) => el.props?.placeholder === 'Todos los productos'
    )[0];

    expect(productSelect).toBeDefined();
    expect(Array.isArray(productSelect.props.options)).toBe(true);
    expect(productSelect.props.options.length).toBeGreaterThan(0);
    expect(productSelect.props.options).toContainEqual(
      expect.objectContaining({ value: '15', label: 'Tren Eléctrico' })
    );
  });

  // ============================================================================
  // BUG 11: HomePage - lee ped.cliente_nombre e item.cantidad_ventas en lugar de ped.cliente e item.ventas
  // ============================================================================
  it('Bug 11: HomePage debe mostrar ped.cliente en Pedidos por Autorizar e item.ventas en el tooltip de la gráfica', async () => {
    apiMock.get.mockReset();
    apiMock.get.mockResolvedValue({
      data: {
        indicadores: {
          ventas_del_mes: { monto: 500, cantidad: 4 },
          compras_del_mes: { monto: 200, cantidad: 1 },
          pedidos_pendientes_aprobacion: 1,
          productos_en_alerta: 0,
          por_cobrar: { monto: 0, cantidad: 0 },
          clientes_activos: 5
        },
        ventas_por_mes: [{ mes: '2026-10', monto: 500, ventas: 4 }],
        top_productos: [],
        pedidos_por_estado: [],
        alertas_stock: [],
        pedidos_pendientes: [
          {
            id_pedido: 77,
            numero_pedido: 'PED-0077',
            cliente: 'Distribuidora El Sol S.A.',
            total: 350,
            descuento_total: 50
          }
        ]
      }
    });

    const { default: HomePage } = await import('../../frontend/src/pages/HomePage.jsx');
    const harness = createComponentHarness(HomePage);
    harness.render();
    await harness.runEffects();
    const tree = harness.render();

    const titles = findElements(tree, (el) => el.type === 'title');
    expect(titles.length).toBeGreaterThan(0);
    const titleText = extractText(titles[0]);
    expect(titleText).toContain('(4 ventas)');

    const fullText = extractText(tree);
    expect(fullText).toContain('Distribuidora El Sol S.A.');
  });

  // ============================================================================
  // CASO SOSPECHOSO 1: PedidosPage - handleOpenEdit asigna stock_actual: 9999 en lugar del stock real
  // ============================================================================
  it('Caso sospechoso 1: Al editar un pedido en estado CREADO, las líneas deben conservar el stock_actual real del producto y no 9999', async () => {
    apiMock.get.mockReset();
    apiMock.get.mockImplementation(async (url) => {
      if (url === '/pedidos/sugerir-numero') return { data: { sugerencia: 'PED-0010', descuento_max_sin_autorizacion: 10 } };
      if (url === '/clientes') return { data: [{ id_cliente: 1, nombre_razon_social: 'Cliente 1' }] };
      if (url === '/productos') {
        return {
          data: [{ id_producto: 55, codigo_sku: 'SKU-55', nombre: 'Robot Real', precio_menudeo: 100, stock_actual: 25 }]
        };
      }
      if (url === '/pedidos/10') {
        return {
          data: {
            id_pedido: 10,
            numero_pedido: 'PED-0010',
            id_cliente: 1,
            estado: 'CREADO',
            detalles: [
              {
                id_producto: 55,
                codigo_sku: 'SKU-55',
                producto_nombre: 'Robot Real',
                cantidad: 2,
                precio_escala: 100,
                porcentaje_descuento_extra: 0,
                monto_descuento_extra: 0,
                subtotal: 200
              }
            ]
          }
        };
      }
      return { data: [] };
    });

    const { default: PedidosPage } = await import('../../frontend/src/pages/PedidosPage.jsx');
    const harness = createComponentHarness(PedidosPage);
    harness.render();
    await harness.runEffects();
    const tree = harness.render();

    const dataTables = findElements(tree, (el) => el.props?.columns && Array.isArray(el.props.columns));
    const accionesCol = dataTables[0].props.columns.find((c) => c.key === 'acciones');
    const accionesCell = accionesCol.render({ id_pedido: 10, estado: 'CREADO' });
    const btnEdit = findElements(
      accionesCell,
      (el) => el.type === 'button' && el.props?.title?.includes('Editar')
    )[0];
    expect(btnEdit).toBeDefined();

    await btnEdit.props.onClick();

    const detallesState = harness.states.find(
      (s) => Array.isArray(s) && s.length === 1 && s[0]?.id_producto === 55 && 'precio_escala' in s[0]
    );
    expect(detallesState).toBeDefined();
    expect(detallesState[0].stock_actual).toBe(25);
  });

  // ============================================================================
  // CASO SOSPECHOSO 2: Generación de correlativos REC-xxxx y AJ-xxxx cuando el último registro no es numérico
  // ============================================================================
  it('Caso sospechoso 2: VentasService.crear con pago_inicial e InventarioService.registrarAjuste no deben colisionar con 0001 si el último folio tiene sufijo alfanumérico', async () => {
    // 1. Crear producto, abastecer stock, crear cliente y aprobar pedido
    const prodRes = await request(app)
      .post('/api/productos')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({
        codigo_sku: `SKU-CORR-${timestamp}`,
        nombre: `Juguete Correlativo ${timestamp}`,
        id_categoria: 1,
        id_marca: 1,
        stock_minimo: 5,
        escalas: [{ cantidad_minima: 1, precio_unitario: 50.00 }]
      });
    expect(prodRes.status).toBe(201);
    const prodId = prodRes.body.data.id_producto;

    // Primer ajuste automático (asegura que AJU-0001 exista) y luego un ajuste con folio manual 'AJU-MANUAL-...'
    const aj1 = await request(app)
      .post('/api/inventario/ajustes')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({ id_producto: prodId, tipo_movimiento: 'AJUSTE', cantidad: 20, motivo: 'Ajuste 1' });
    expect(aj1.status).toBe(201);

    const ajManual = await request(app)
      .post('/api/inventario/ajustes')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({
        id_producto: prodId,
        tipo_movimiento: 'AJUSTE',
        cantidad: 10,
        documento_id: `AJU-MANUAL-${timestamp}`,
        motivo: 'Ajuste con código manual'
      });
    expect(ajManual.status).toBe(201);

    // El siguiente ajuste automático NO debe reiniciar a AJU-0001
    const aj2 = await request(app)
      .post('/api/inventario/ajustes')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({ id_producto: prodId, tipo_movimiento: 'AJUSTE', cantidad: 5, motivo: 'Ajuste 2 automático' });
    expect(aj2.status).toBe(201);
    expect(aj2.body.data.documento_id).not.toBe('AJU-0001');

    // 2. Probar VentasService.crear con pago_inicial después de un recibo con código manual 'REC-MANUAL-...'
    const cliRes = await request(app)
      .post('/api/clientes')
      .set('Authorization', `Bearer ${operadorToken}`)
      .send({
        nombre_razon_social: `Cliente Corr ${timestamp}`,
        identificacion: `NIT-${timestamp}`
      });
    expect(cliRes.status).toBe(201);
    const cliId = cliRes.body.data.id_cliente;

    // Pedido 1 -> Venta 1 -> Pago con numero_recibo manual 'REC-MANUAL-...'
    const ped1 = await request(app)
      .post('/api/pedidos')
      .set('Authorization', `Bearer ${operadorToken}`)
      .send({
        id_cliente: cliId,
        enviar_inmediatamente: true,
        detalles: [{ id_producto: prodId, cantidad: 1, porcentaje_descuento_extra: 0 }]
      });
    const venta1 = await request(app)
      .post('/api/ventas')
      .set('Authorization', `Bearer ${operadorToken}`)
      .send({ id_pedido: ped1.body.data.id_pedido });

    const pagoManual = await request(app)
      .post('/api/pagos')
      .set('Authorization', `Bearer ${operadorToken}`)
      .send({
        id_venta: venta1.body.data.id_venta,
        numero_recibo: `REC-MANUAL-${timestamp}`,
        monto: 50.00,
        metodo_pago: 'EFECTIVO'
      });
    expect(pagoManual.status).toBe(201);

    // Pedido 2 -> Venta 2 con pago_inicial automático (cuando ya existe REC-0001 y el último pago es REC-MANUAL-...)
    const ped2 = await request(app)
      .post('/api/pedidos')
      .set('Authorization', `Bearer ${operadorToken}`)
      .send({
        id_cliente: cliId,
        enviar_inmediatamente: true,
        detalles: [{ id_producto: prodId, cantidad: 1, porcentaje_descuento_extra: 0 }]
      });

    const venta2 = await request(app)
      .post('/api/ventas')
      .set('Authorization', `Bearer ${operadorToken}`)
      .send({
        id_pedido: ped2.body.data.id_pedido,
        pago_inicial: { monto: 50.00, metodo_pago: 'EFECTIVO' }
      });

    expect(venta2.status).toBe(201);
    expect(venta2.body.data.pagos).toHaveLength(1);
    expect(venta2.body.data.pagos[0].numero_recibo).toMatch(/^REC-\d+$/);
  });

  // ============================================================================
  // BUG 5 (Opción A): GET /api/productos incluye escalas y PedidosPage calcula escalas de mayoreo
  // ============================================================================
  it('Bug 5: GET /api/productos debe incluir escalas y PedidosPage debe aplicar el precio de escala de mayoreo según la cantidad', async () => {
    const prodRes = await request(app)
      .post('/api/productos')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({
        codigo_sku: `SKU-B5-${timestamp}`,
        nombre: `Juguete Mayoreo Bug 5 ${timestamp}`,
        id_categoria: 1,
        id_marca: 1,
        stock_minimo: 5,
        escalas: [
          { cantidad_minima: 1, precio_unitario: 100.00 },
          { cantidad_minima: 12, precio_unitario: 70.00 }
        ]
      });
    expect(prodRes.status).toBe(201);
    const idProd = prodRes.body.data.id_producto;

    const listRes = await request(app)
      .get('/api/productos')
      .set('Authorization', `Bearer ${operadorToken}`)
      .query({ q: `SKU-B5-${timestamp}` });

    expect(listRes.status).toBe(200);
    const prodListado = listRes.body.data.find((p) => p.id_producto === idProd);
    expect(prodListado).toBeDefined();
    expect(Array.isArray(prodListado.escalas)).toBe(true);
    expect(prodListado.escalas).toHaveLength(2);

    // Verificar en PedidosPage que al seleccionar el producto del listado con cantidad 12 aplica Q70.00
    apiMock.get.mockReset();
    apiMock.get.mockImplementation(async (url) => {
      if (url === '/pedidos/sugerir-numero') return { data: { sugerencia: 'PED-0099', descuento_max_sin_autorizacion: 10 } };
      if (url === '/clientes') return { data: [{ id_cliente: 1, nombre_razon_social: 'Cliente Mayoreo' }] };
      if (url === '/productos') {
        return {
          data: [{ ...prodListado, stock_actual: 50 }]
        };
      }
      return { data: [] };
    });

    const { default: PedidosPage } = await import('../../frontend/src/pages/PedidosPage.jsx');
    const harness = createComponentHarness(PedidosPage);
    harness.render();
    await harness.runEffects();

    // Simular selección de producto y cantidad 12 en itemInput
    const itemInputIdx = harness.states.findIndex(
      (s) => s && typeof s === 'object' && 'id_producto' in s && 'porcentaje_descuento_extra' in s
    );
    harness.states[itemInputIdx] = { id_producto: String(idProd), cantidad: 12, porcentaje_descuento_extra: 0 };
    const tree = harness.render();

    const fullText = extractText(tree);
    expect(fullText).toContain('70.00');
  });

  // ============================================================================
  // BUG 6 (Opción B): Reserva/compromiso de stock en pedidos APROBADO y ventas PENDIENTE
  // ============================================================================
  it('Bug 6: Impide sobrevender stock ya comprometido en pedidos APROBADO o en ventas PENDIENTE', async () => {
    // Crear producto con 15 unidades de stock
    const prodRes = await request(app)
      .post('/api/productos')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({
        codigo_sku: `SKU-B6-${timestamp}`,
        nombre: `Juguete Reserva Stock ${timestamp}`,
        id_categoria: 1,
        id_marca: 1,
        stock_minimo: 2,
        escalas: [{ cantidad_minima: 1, precio_unitario: 100.00 }]
      });
    expect(prodRes.status).toBe(201);
    const prodId = prodRes.body.data.id_producto;

    await request(app)
      .post('/api/inventario/ajustes')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({ id_producto: prodId, tipo_movimiento: 'AJUSTE', cantidad: 15, motivo: 'Stock inicial 15 uds' });

    const cliRes = await request(app)
      .post('/api/clientes')
      .set('Authorization', `Bearer ${operadorToken}`)
      .send({ nombre_razon_social: `Cliente B6 ${timestamp}`, identificacion: `NIT-6${timestamp}` });
    const cliId = cliRes.body.data.id_cliente;

    // 1. Pedido 1 por 10 unidades -> APROBADO (compromete 10 de las 15 unidades; quedan 5 disponibles)
    const ped1 = await request(app)
      .post('/api/pedidos')
      .set('Authorization', `Bearer ${operadorToken}`)
      .send({
        id_cliente: cliId,
        enviar_inmediatamente: true,
        detalles: [{ id_producto: prodId, cantidad: 10, porcentaje_descuento_extra: 0 }]
      });
    expect(ped1.status).toBe(201);
    expect(ped1.body.data.estado).toBe('APROBADO');

    // 2. Intentar Pedido 2 por 10 unidades mientras Pedido 1 está APROBADO -> debe rechazarse (solo quedan 5 disponibles)
    const ped2 = await request(app)
      .post('/api/pedidos')
      .set('Authorization', `Bearer ${operadorToken}`)
      .send({
        id_cliente: cliId,
        enviar_inmediatamente: true,
        detalles: [{ id_producto: prodId, cantidad: 10, porcentaje_descuento_extra: 0 }]
      });
    expect(ped2.status).toBe(409);
    expect(ped2.body.error.code).toBe('BUSINESS_RULE_VIOLATION');

    // 3. Facturar Pedido 1 con pago parcial (Venta 1 queda PENDIENTE, Pedido 1 pasa a EN_PROCESO)
    const venta1 = await request(app)
      .post('/api/ventas')
      .set('Authorization', `Bearer ${operadorToken}`)
      .send({
        id_pedido: ped1.body.data.id_pedido,
        pago_inicial: { monto: 400.00, metodo_pago: 'EFECTIVO' }
      });
    expect(venta1.status).toBe(201);
    expect(venta1.body.data.estado).toBe('PENDIENTE');

    // 4. Intentar Pedido 3 por 10 unidades mientras Venta 1 está PENDIENTE -> debe rechazarse
    const ped3 = await request(app)
      .post('/api/pedidos')
      .set('Authorization', `Bearer ${operadorToken}`)
      .send({
        id_cliente: cliId,
        enviar_inmediatamente: true,
        detalles: [{ id_producto: prodId, cantidad: 10, porcentaje_descuento_extra: 0 }]
      });
    expect(ped3.status).toBe(409);
    expect(ped3.body.error.code).toBe('BUSINESS_RULE_VIOLATION');

    // 5. Liquidar el saldo restante de Venta 1 (Q600.00) -> pasa a COMPLETADA sin quedar bloqueada
    const pagoFinal = await request(app)
      .post('/api/pagos')
      .set('Authorization', `Bearer ${operadorToken}`)
      .send({
        id_venta: venta1.body.data.id_venta,
        monto: 600.00,
        metodo_pago: 'EFECTIVO'
      });
    expect(pagoFinal.status).toBe(201);
    expect(pagoFinal.body.data.venta.estado).toBe('COMPLETADA');
  });

  // ============================================================================
  // BUG 9 (Opción A): KPIs de Kardex (total_ajustes) y Valoración (margen_bruto_potencial y porcentaje_margen_global)
  // ============================================================================
  it('Bug 9: GET /api/reportes/kardex incluye total_ajustes y ReportesPage muestra utilidad potencial y margen promedio en Valoración', async () => {
    const resKardex = await request(app)
      .get('/api/reportes/kardex')
      .set('Authorization', `Bearer ${supervisorToken}`);
    expect(resKardex.status).toBe(200);
    expect(resKardex.body.data.kpis.total_ajustes).toBeDefined();
    expect(resKardex.body.data.kpis.variacion_neta).toBe(
      resKardex.body.data.kpis.total_entradas - resKardex.body.data.kpis.total_salidas
    );

    // Verificar en ReportesPage pestaña 'valoracion' que lee margen_bruto_potencial y porcentaje_margen_global
    apiMock.get.mockReset();
    apiMock.get.mockImplementation(async (url) => {
      if (url === '/reportes/valoracion') {
        return {
          data: {
            filas: [],
            kpis: {
              valor_total_costo: 2000,
              valor_total_comercial: 3750,
              margen_bruto_potencial: 1750,
              porcentaje_margen_global: 46.67,
              skus_alerta_agotados: 0,
              total_unidades_bodega: 25
            }
          }
        };
      }
      return { data: [] };
    });

    const { default: ReportesPage } = await import('../../frontend/src/pages/ReportesPage.jsx');
    const harness = createComponentHarness(ReportesPage);
    let tree = harness.render();

    const btnTabValoracion = findElements(
      tree,
      (el) => el.type === 'button' && extractText(el).includes('Valoración')
    )[0];
    btnTabValoracion.props.onClick();
    tree = harness.render();
    await harness.runEffects();
    tree = harness.render();

    const text = extractText(tree);
    expect(text).toContain('1,750.00');
    expect(text).toContain('46.67%');
  });

  // ============================================================================
  // BUG 10 (Opción A): Excluir documentos ANULADA de los totales de Reportes de Ventas y Compras
  // ============================================================================
  it('Bug 10: Los reportes de Ventas y Compras excluyen los documentos con estado ANULADA de los totales generales y pies de tabla', async () => {
    // Verificar en ReportesPage que ventasTotalesFooter y comprasTotalesFooter excluyen estado === 'ANULADA'
    apiMock.get.mockReset();
    apiMock.get.mockImplementation(async (url) => {
      if (url === '/reportes/ventas') {
        return {
          data: {
            filas: [
              { id_venta: 1, numero_factura: 'FAC-1', subtotal: 500, descuento: 0, total: 500, saldo_pendiente: 0, estado: 'COMPLETADA' },
              { id_venta: 2, numero_factura: 'FAC-2', subtotal: 300, descuento: 0, total: 300, saldo_pendiente: 0, estado: 'ANULADA' }
            ],
            kpis: { total_facturado_completadas: 500, total_descuentos: 0, total_saldo_pendiente: 0, total_facturas: 2 }
          }
        };
      }
      return { data: [] };
    });

    const { default: ReportesPage } = await import('../../frontend/src/pages/ReportesPage.jsx');
    const harness = createComponentHarness(ReportesPage);
    let tree = harness.render();

    const btnTabVentas = findElements(
      tree,
      (el) => el.type === 'button' && extractText(el).includes('Ventas')
    )[0];
    btnTabVentas.props.onClick();
    tree = harness.render();
    await harness.runEffects();
    tree = harness.render();

    const tfoot = findElements(tree, (el) => el.type === 'tfoot')[0];
    expect(tfoot).toBeDefined();
    const tfootText = extractText(tfoot);
    expect(tfootText).toContain('500.00');
    expect(tfootText).not.toContain('800.00');
  });

  // ============================================================================
  // CASO SOSPECHOSO 3 (Opción A): Rechazar con 422 productos duplicados en detalles de compras/pedidos y consolidar en UI de Pedidos
  // ============================================================================
  it('Caso sospechoso 3: Rechaza con 422 líneas con id_producto duplicado en POST /api/compras y POST /api/pedidos', async () => {
    const resCompraDup = await request(app)
      .post('/api/compras')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({
        id_proveedor: 1,
        detalles: [
          { id_producto: 1, cantidad: 5, costo_unitario: 20 },
          { id_producto: 1, cantidad: 3, costo_unitario: 20 }
        ]
      });
    expect(resCompraDup.status).toBe(422);
    expect(resCompraDup.body.error.code).toBe('VALIDATION_ERROR');

    const resPedidoDup = await request(app)
      .post('/api/pedidos')
      .set('Authorization', `Bearer ${operadorToken}`)
      .send({
        id_cliente: 1,
        detalles: [
          { id_producto: 1, cantidad: 2, porcentaje_descuento_extra: 0 },
          { id_producto: 1, cantidad: 3, porcentaje_descuento_extra: 0 }
        ]
      });
    expect(resPedidoDup.status).toBe(422);
    expect(resPedidoDup.body.error.code).toBe('VALIDATION_ERROR');
  });

  // ============================================================================
  // CASO SOSPECHOSO 4: Obligar motivo_descuento_especial cuando porcentaje_descuento_extra supera DESCUENTO_MAX_SIN_AUTORIZACION configurado en Inicio
  // ============================================================================
  it('Caso sospechoso 4: Exige motivo_descuento_especial cuando el porcentaje de descuento supera el valor configurado en DESCUENTO_MAX_SIN_AUTORIZACION', async () => {
    const loginAdmin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@jugueteria.local', password: 'Admin1234!' });
    const adminToken = loginAdmin.body.data.token;

    // Cambiar el porcentaje máximo en Inicio a 12.00%
    await request(app)
      .put('/api/configuraciones/DESCUENTO_MAX_SIN_AUTORIZACION')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ valor: '12.00' });

    try {
      // Crear producto y cliente con stock
      const prodRes = await request(app)
        .post('/api/productos')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .send({
          codigo_sku: `SKU-CS4-${timestamp}`,
          nombre: `Juguete Desc Dinamico ${timestamp}`,
          id_categoria: 1,
          id_marca: 1,
          stock_minimo: 1,
          escalas: [{ cantidad_minima: 1, precio_unitario: 100.00 }]
        });
      const prodId = prodRes.body.data.id_producto;

      await request(app)
        .post('/api/inventario/ajustes')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .send({ id_producto: prodId, tipo_movimiento: 'AJUSTE', cantidad: 20, motivo: 'Stock CS4' });

      const cliRes = await request(app)
        .post('/api/clientes')
        .set('Authorization', `Bearer ${operadorToken}`)
        .send({ nombre_razon_social: `Cliente CS4 ${timestamp}`, identificacion: `NIT-4${timestamp}` });
      const cliId = cliRes.body.data.id_cliente;

      // 1. Con 15% (> 12% configurado en Inicio) y SIN motivo_descuento_especial -> debe fallar con 422
      const resSinNota = await request(app)
        .post('/api/pedidos')
        .set('Authorization', `Bearer ${operadorToken}`)
        .send({
          id_cliente: cliId,
          detalles: [{ id_producto: prodId, cantidad: 2, porcentaje_descuento_extra: 15 }]
        });
      expect(resSinNota.status).toBe(422);

      // 2. Con 12% (<= 12% configurado en Inicio) y SIN motivo_descuento_especial -> debe permitirlo (201)
      const resEnLimite = await request(app)
        .post('/api/pedidos')
        .set('Authorization', `Bearer ${operadorToken}`)
        .send({
          id_cliente: cliId,
          detalles: [{ id_producto: prodId, cantidad: 2, porcentaje_descuento_extra: 12 }]
        });
      expect(resEnLimite.status).toBe(201);
    } finally {
      // Restaurar a 10.00%
      await request(app)
        .put('/api/configuraciones/DESCUENTO_MAX_SIN_AUTORIZACION')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ valor: '10.00' });
    }
  });

  // ============================================================================
  // PATRÓN SIMILAR A (Bug 1): VentasPage.jsx — handleOpenFacturar valida preselectedPedido.id_pedido
  // ============================================================================
  it('Patrón A (similar a Bug 1): VentasPage handleOpenFacturar ignora eventos u objetos sin id_pedido y no asigna "undefined"', async () => {
    const { default: VentasPage } = await import('../../frontend/src/pages/VentasPage.jsx');
    apiMock.get.mockImplementation(async (url) => {
      if (url === '/pedidos') return { data: [] };
      if (url === '/ventas') return { data: [], meta: { totalPages: 1, total: 0 } };
      return { data: [] };
    });

    const harness = createComponentHarness(VentasPage);
    harness.render();

    // Encontrar handleOpenFacturar (tercer useCallback en VentasPage: fetchVentas, fetchPagos, fetchPedidosAprobados, handleOpenFacturar)
    const fns = harness.callbacks.filter(Boolean);
    const handleOpenFacturar = fns[3];
    expect(typeof handleOpenFacturar).toBe('function');

    // Simular invocación accidental con un SyntheticEvent o un objeto sin id_pedido
    await handleOpenFacturar({ type: 'click', target: {} });

    // Ningún estado en VentasPage (selectedPedidoId) debe quedar como el string 'undefined'
    expect(harness.states).not.toContain('undefined');
  });

  // ============================================================================
  // PATRÓN SIMILAR B (Caso sospechoso 1): PedidosService.obtenerPorId incluye stock_actual en detalles
  // ============================================================================
  it('Patrón B (similar a Caso sospechoso 1): GET /api/pedidos/:id incluye stock_actual real en cada renglón de detalles', async () => {
    const prodRes = await request(app)
      .post('/api/productos')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({
        codigo_sku: `SKU-PATB-${timestamp}`,
        nombre: `Juguete PatB ${timestamp}`,
        id_categoria: 1,
        id_marca: 1,
        stock_minimo: 2,
        escalas: [{ cantidad_minima: 1, precio_unitario: 40.00 }]
      });
    const prodId = prodRes.body.data.id_producto;

    await request(app)
      .post('/api/inventario/ajustes')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({ id_producto: prodId, tipo_movimiento: 'AJUSTE', cantidad: 17, motivo: 'Stock PatB' });

    const cliRes = await request(app)
      .post('/api/clientes')
      .set('Authorization', `Bearer ${operadorToken}`)
      .send({ nombre_razon_social: `Cliente PatB ${timestamp}`, identificacion: `NIT-7${timestamp}` });
    const cliId = cliRes.body.data.id_cliente;

    const pedRes = await request(app)
      .post('/api/pedidos')
      .set('Authorization', `Bearer ${operadorToken}`)
      .send({
        id_cliente: cliId,
        detalles: [{ id_producto: prodId, cantidad: 3, porcentaje_descuento_extra: 0 }]
      });
    expect(pedRes.status).toBe(201);

    const getRes = await request(app)
      .get(`/api/pedidos/${pedRes.body.data.id_pedido}`)
      .set('Authorization', `Bearer ${operadorToken}`);
    expect(getRes.status).toBe(200);
    expect(Number(getRes.body.data.detalles[0].stock_actual)).toBe(17);
  });

  // ============================================================================
  // PATRÓN SIMILAR C (Caso sospechoso 2): Autogeneración transaccional de correlativos en Compras, Pedidos, Ventas y Pagos
  // evita colisiones (ER_DUP_ENTRY) en llamadas concurrentes sin folio explícito
  // ============================================================================
  it('Patrón C (similar a Caso sospechoso 2): Autogeneración de correlativos en Compras, Pedidos, Ventas y Pagos dentro de la transacción evita colisiones en llamadas concurrentes', async () => {
    const { ComprasService } = await import('../src/modules/compras/compras.service.js');
    const { PedidosService } = await import('../src/modules/pedidos/pedidos.service.js');
    const { VentasService } = await import('../src/modules/ventas/ventas.service.js');
    const { PagosService } = await import('../src/modules/pagos/pagos.service.js');

    const provRes = await request(app)
      .post('/api/proveedores')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({ razon_social: `Prov PatC ${timestamp}`, identificacion_fiscal: `NIT-8${timestamp}`, contacto_nombre: 'Contacto' });
    const idProv = provRes.body.data.id_proveedor;

    const cliRes = await request(app)
      .post('/api/clientes')
      .set('Authorization', `Bearer ${operadorToken}`)
      .send({ nombre_razon_social: `Cli PatC ${timestamp}`, identificacion: `NIT-8${timestamp}` });
    const idCli = cliRes.body.data.id_cliente;

    const prodRes = await request(app)
      .post('/api/productos')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({
        codigo_sku: `SKU-PATC-${timestamp}`,
        nombre: `Juguete PatC ${timestamp}`,
        id_categoria: 1,
        id_marca: 1,
        stock_minimo: 1,
        escalas: [{ cantidad_minima: 1, precio_unitario: 25.00 }]
      });
    const idProd = prodRes.body.data.id_producto;

    await request(app)
      .post('/api/inventario/ajustes')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({ id_producto: idProd, tipo_movimiento: 'AJUSTE', cantidad: 30, motivo: 'Stock PatC' });

    // 1. Dos compras concurrentes sin numero_comprobante no deben colisionar en el mismo correlativo
    const [c1, c2] = await Promise.all([
      ComprasService.crear({ id_proveedor: idProv, detalles: [{ id_producto: idProd, cantidad: 1, costo_unitario: 10 }] }, 1),
      ComprasService.crear({ id_proveedor: idProv, detalles: [{ id_producto: idProd, cantidad: 1, costo_unitario: 10 }] }, 1)
    ]);
    expect(c1.numero_comprobante).not.toBe(c2.numero_comprobante);

    // 2. Dos pedidos concurrentes sin numero_pedido no deben colisionar
    const [p1, p2] = await Promise.all([
      PedidosService.crear({ id_cliente: idCli, enviar_inmediatamente: true, detalles: [{ id_producto: idProd, cantidad: 1, porcentaje_descuento_extra: 0 }] }, 1),
      PedidosService.crear({ id_cliente: idCli, enviar_inmediatamente: true, detalles: [{ id_producto: idProd, cantidad: 1, porcentaje_descuento_extra: 0 }] }, 1)
    ]);
    expect(p1.numero_pedido).not.toBe(p2.numero_pedido);

    // 3. Dos ventas concurrentes sin numero_factura no deben colisionar
    const [v1, v2] = await Promise.all([
      VentasService.crear({ id_pedido: p1.id_pedido }, 1),
      VentasService.crear({ id_pedido: p2.id_pedido }, 1)
    ]);
    expect(v1.numero_factura).not.toBe(v2.numero_factura);

    // 4. Dos pagos concurrentes sin numero_recibo no deben colisionar
    const [pg1, pg2] = await Promise.all([
      PagosService.crear({ id_venta: v1.id_venta, monto: 5, metodo_pago: 'EFECTIVO' }, 1),
      PagosService.crear({ id_venta: v1.id_venta, monto: 5, metodo_pago: 'EFECTIVO' }, 1)
    ]);
    expect(pg1.pago.numero_recibo).not.toBe(pg2.pago.numero_recibo);
  });

  // ============================================================================
  // PATRÓN SIMILAR D (Caso sospechoso 4): Enviar pedido borrador valida DESCUENTO_MAX_SIN_AUTORIZACION actual
  // y PedidosPage.handleOpenEdit refresca descuentoMaxConfig
  // ============================================================================
  it('Patrón D (similar a Caso sospechoso 4): Al enviar un pedido CREADO o abrir su edición se aplica el DESCUENTO_MAX_SIN_AUTORIZACION vigente en Inicio', async () => {
    const loginAdmin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@jugueteria.local', password: 'Admin1234!' });
    const adminToken = loginAdmin.body.data.token;

    // 1. Subir temporalmente el límite en Inicio a 20% y crear un pedido borrador con 15% sin nota
    await request(app)
      .put('/api/configuraciones/DESCUENTO_MAX_SIN_AUTORIZACION')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ valor: '20.00' });

    try {
      const prodRes = await request(app)
        .post('/api/productos')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .send({
          codigo_sku: `SKU-PATD-${timestamp}`,
          nombre: `Juguete PatD ${timestamp}`,
          id_categoria: 1,
          id_marca: 1,
          stock_minimo: 1,
          escalas: [{ cantidad_minima: 1, precio_unitario: 100.00 }]
        });
      const prodId = prodRes.body.data.id_producto;

      await request(app)
        .post('/api/inventario/ajustes')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .send({ id_producto: prodId, tipo_movimiento: 'AJUSTE', cantidad: 25, motivo: 'Stock PatD' });

      const cliRes = await request(app)
        .post('/api/clientes')
        .set('Authorization', `Bearer ${operadorToken}`)
        .send({ nombre_razon_social: `Cliente PatD ${timestamp}`, identificacion: `NIT-9${timestamp}` });
      const cliId = cliRes.body.data.id_cliente;

      const pedBorrador = await request(app)
        .post('/api/pedidos')
        .set('Authorization', `Bearer ${operadorToken}`)
        .send({
          id_cliente: cliId,
          detalles: [{ id_producto: prodId, cantidad: 2, porcentaje_descuento_extra: 15 }]
        });
      expect(pedBorrador.status).toBe(201);
      const idPedido = pedBorrador.body.data.id_pedido;

      // 2. El administrador baja el porcentaje en Inicio a 10.00%
      await request(app)
        .put('/api/configuraciones/DESCUENTO_MAX_SIN_AUTORIZACION')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ valor: '10.00' });

      // 3. Intentar enviar el pedido borrador sin motivo_descuento_especial ahora que 15% > 10% debe fallar con 422
      const resEnviarSinNota = await request(app)
        .patch(`/api/pedidos/${idPedido}/enviar`)
        .set('Authorization', `Bearer ${operadorToken}`)
        .send({});
      expect(resEnviarSinNota.status).toBe(422);

      // 4. Enviar proporcionando motivo_descuento_especial debe guardarlo y pasar a PENDIENTE_APROBACION
      const resEnviarConNota = await request(app)
        .patch(`/api/pedidos/${idPedido}/enviar`)
        .set('Authorization', `Bearer ${operadorToken}`)
        .send({ motivo_descuento_especial: 'Autorización solicitada tras cambio de umbral en Inicio' });
      expect(resEnviarConNota.status).toBe(200);
      expect(resEnviarConNota.body.data.estado).toBe('PENDIENTE_APROBACION');
      expect(resEnviarConNota.body.data.motivo_descuento_especial).toBe('Autorización solicitada tras cambio de umbral en Inicio');
    } finally {
      await request(app)
        .put('/api/configuraciones/DESCUENTO_MAX_SIN_AUTORIZACION')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ valor: '10.00' });
    }
  });

  // ============================================================================
  // PATRÓN SIMILAR E (Bug 5): ProductosPage.jsx handleOpenEdit preserva escalas personalizadas del producto
  // ============================================================================
  it('Patrón E (similar a Bug 5): ProductosPage handleOpenEdit conserva las escalas personalizadas guardadas en vez de sobrescribirlas con calcularEscalasAutomaticas', async () => {
    const { default: ProductosPage } = await import('../../frontend/src/pages/ProductosPage.jsx');
    const prodMock = {
      id_producto: 888,
      codigo_sku: 'SKU-PATE-888',
      nombre: 'Juguete Escalas Personalizadas',
      id_categoria: 1,
      id_marca: 1,
      stock_minimo: 5,
      edad_minima_meses: 36,
      precio_menudeo: 100,
      activo: 1,
      escalas: [
        { cantidad_minima: 1, precio_unitario: 100.00 },
        { cantidad_minima: 12, precio_unitario: 70.00 }
      ]
    };

    apiMock.get.mockImplementation(async (url) => {
      if (url === `/productos/${prodMock.id_producto}`) {
        return { data: prodMock };
      }
      return { data: [] };
    });

    const harness = createComponentHarness(ProductosPage);
    const tree = harness.render();

    const tables = findElements(tree, (el) => typeof el.type === 'function' && el.type.name === 'DataTable');
    const colAcciones = tables[0].props.columns.find((c) => c.key === 'acciones');
    const accionesCell = colAcciones.render(prodMock);
    const editBtn = findElements(accionesCell, (el) => el.type === 'button' && el.props?.title === 'Editar producto y escalas')[0];

    await editBtn.props.onClick();

    // escalasState en ProductosPage; la escala de 12 unidades debe mantener '70' (personalizada) y NO '85.00' (automática estándar)
    const escalasState = harness.states.find(
      (s) => s && typeof s === 'object' && !Array.isArray(s) && '12' in s && '25' in s
    );
    expect(Number(escalasState[12])).toBe(70);
  });
});
