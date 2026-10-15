/**
 * Motor de Cálculo Automático de Escalas de Precios por Volumen
 * Juguetería Quetzal - Living Design System & ERP
 *
 * Fórmula Continua Logarítmica:
 * Descuento(Q) = DescuentoMaximo * (log10(Q) / log10(10000))
 * Precio(Q) = round(PrecioBase * (1 - Descuento(Q)), 2)
 *
 * Garantiza estrictamente la regla de negocio de monotonía no creciente:
 * Para todo Q_{i+1} > Q_i => PrecioUnitario(Q_{i+1}) <= PrecioUnitario(Q_i)
 */

export const NIVELES_CANTIDAD = [1, 3, 6, 12, 25, 50, 100, 500, 1000, 10000];

export const NIVELES_METADATA = {
  1: { etiqueta: '1 ud', descripcion: 'Menudeo / Base', icono: 'Box' },
  3: { etiqueta: '3 uds', descripcion: 'Trío / Pack', icono: 'Package' },
  6: { etiqueta: '6 uds', descripcion: 'Media Docena', icono: 'Boxes' },
  12: { etiqueta: '12 uds', descripcion: 'Docena', icono: 'Layers' },
  25: { etiqueta: '25 uds', descripcion: 'Caja Pequeña', icono: 'Truck' },
  50: { etiqueta: '50 uds', descripcion: 'Caja Mediana', icono: 'Truck' },
  100: { etiqueta: '100 uds', descripcion: 'Mayorista', icono: 'Store' },
  500: { etiqueta: '500 uds', descripcion: 'Medio Millar', icono: 'Building' },
  1000: { etiqueta: '1,000 uds', descripcion: 'Millar Completo', icono: 'Building2' },
  10000: { etiqueta: '10,000 uds', descripcion: 'Volumen Institucional', icono: 'Warehouse' }
};

export const ESTRATEGIAS_PRECIO = {
  estandar: {
    id: 'estandar',
    nombre: 'Escala Estándar',
    descripcion: 'Descuento progresivo hasta 35% (Recomendado)',
    descuentoMax: 0.35,
    porcentajesFijos: {
      1: 0,
      3: 0.05,
      6: 0.08,
      12: 0.12,
      25: 0.16,
      50: 0.20,
      100: 0.24,
      500: 0.28,
      1000: 0.32,
      10000: 0.35
    }
  },
  agresivo: {
    id: 'agresivo',
    nombre: 'Mayorista Agresivo',
    descripcion: 'Alta rotación y volumen rápido hasta 50%',
    descuentoMax: 0.50,
    porcentajesFijos: {
      1: 0,
      3: 0.05,
      6: 0.10,
      12: 0.15,
      25: 0.20,
      50: 0.25,
      100: 0.30,
      500: 0.35,
      1000: 0.40,
      10000: 0.50
    }
  },
  conservador: {
    id: 'conservador',
    nombre: 'Margen Protegido',
    descripcion: 'Protección de rentabilidad hasta 20%',
    descuentoMax: 0.20,
    porcentajesFijos: {
      1: 0,
      3: 0.03,
      6: 0.05,
      12: 0.08,
      25: 0.10,
      50: 0.12,
      100: 0.15,
      500: 0.17,
      1000: 0.19,
      10000: 0.20
    }
  }
};

/**
 * Calcula automáticamente todas las escalas a partir del precio de menudeo (Nivel 1).
 *
 * @param {number|string} precioBase - Precio unitario de 1 unidad
 * @param {string} estrategiaKey - 'estandar' | 'agresivo' | 'conservador'
 * @returns {Object|null} Mapa { [cantidad]: string_precio_con_2_decimales }
 */
export function calcularEscalasAutomaticas(precioBase, estrategiaKey = 'estandar') {
  const p1 = parseFloat(precioBase);
  if (isNaN(p1) || p1 <= 0) {
    return null;
  }

  const estrategia = ESTRATEGIAS_PRECIO[estrategiaKey] || ESTRATEGIAS_PRECIO.estandar;
  const resultado = {};
  let ultimoPrecio = p1;

  for (const cant of NIVELES_CANTIDAD) {
    if (cant === 1) {
      resultado[1] = p1.toFixed(2);
      ultimoPrecio = p1;
      continue;
    }

    const pctDescuento = estrategia.porcentajesFijos[cant] ?? (
      estrategia.descuentoMax * (Math.log10(cant) / 4)
    );

    // Calcular precio y redondear a 2 decimales
    let precioCalc = Math.round((p1 * (1 - pctDescuento)) * 100) / 100;

    // Salvaguarda matemática de monotonía: nunca puede ser mayor al nivel anterior
    if (precioCalc > ultimoPrecio) {
      precioCalc = ultimoPrecio;
    }

    resultado[cant] = precioCalc.toFixed(2);
    ultimoPrecio = precioCalc;
  }

  return resultado;
}

/**
 * Retorna información detallada de una escala para mostrar en la interfaz
 */
export function obtenerDetalleEscala(cant, precioActual, precioBase) {
  const pBase = parseFloat(precioBase);
  const pAct = parseFloat(precioActual);

  if (isNaN(pBase) || isNaN(pAct) || pBase <= 0 || pAct <= 0) {
    return {
      porcentajeDescuento: 0,
      ahorroUnitario: 0,
      ahorroTotalLote: 0
    };
  }

  const ahorroUnitario = Math.max(0, pBase - pAct);
  const porcentajeDescuento = Math.round(((ahorroUnitario / pBase) * 100));
  const ahorroTotalLote = ahorroUnitario * cant;

  return {
    porcentajeDescuento,
    ahorroUnitario: ahorroUnitario.toFixed(2),
    ahorroTotalLote: ahorroTotalLote.toFixed(2)
  };
}
