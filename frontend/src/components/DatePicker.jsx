import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, X } from 'lucide-react';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const MONTH_SHORT = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
];

const DAY_LABELS = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'];

/**
 * Componente DatePicker clásico con la estética "Playful Premium" de Juguetería Quetzal
 * Compatible con strings 'YYYY-MM-DD'.
 * Muestra el valor en formato dd/mm/aa.
 * Soporta navegación clásica (días, meses, años) y respeta min / max sin desplegables molestos.
 */
export default function DatePicker({
  value = '',
  onChange,
  placeholder = 'dd/mm/aa',
  min,
  max,
  disabled = false,
  align = 'left',
  width = '130px',
  style = {}
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  // Modo de vista: 'days' | 'months' | 'years'
  const [viewMode, setViewMode] = useState('days');

  // Fecha visualizada en el calendario (año y mes)
  const [viewDate, setViewDate] = useState(() => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m] = value.split('-').map(Number);
      return new Date(y, m - 1, 1);
    }
    return new Date();
  });

  // Rango de inicio para la vista de años (bloques de 12 años)
  const [yearRangeStart, setYearRangeStart] = useState(() => {
    const currentYear = value && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? parseInt(value.split('-')[0], 10)
      : new Date().getFullYear();
    return Math.floor(currentYear / 12) * 12;
  });

  // Sincronizar viewDate cuando value cambie externamente
  useEffect(() => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m] = value.split('-').map(Number);
      setViewDate(new Date(y, m - 1, 1));
      setYearRangeStart(Math.floor(y / 12) * 12);
    }
  }, [value]);

  // Cerrar al hacer click afuera y reiniciar vista a 'days'
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setViewMode('days');
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [open]);

  // Navegación de años (<< y >>)
  const handlePrevYear = (e) => {
    e.stopPropagation();
    setViewDate((prev) => new Date(prev.getFullYear() - 1, prev.getMonth(), 1));
  };

  const handleNextYear = (e) => {
    e.stopPropagation();
    setViewDate((prev) => new Date(prev.getFullYear() + 1, prev.getMonth(), 1));
  };

  // Navegación de meses (< y >)
  const handlePrevMonth = (e) => {
    e.stopPropagation();
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = (e) => {
    e.stopPropagation();
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Ir al día actual (siempre que respete min / max)
  const handleToday = (e) => {
    e.stopPropagation();
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const str = `${yyyy}-${mm}-${dd}`;

    if (max && str > max) return;
    if (min && str < min) return;

    onChange?.(str);
    setViewDate(new Date(yyyy, today.getMonth(), 1));
    setViewMode('days');
    setOpen(false);
  };

  // Limpiar fecha
  const handleClear = (e) => {
    e.stopPropagation();
    onChange?.('');
    setViewMode('days');
    setOpen(false);
  };

  // Seleccionar un día
  const handleSelectDay = (day) => {
    const yyyy = viewDate.getFullYear();
    const mm = String(viewDate.getMonth() + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const str = `${yyyy}-${mm}-${dd}`;

    if (max && str > max) return;
    if (min && str < min) return;

    onChange?.(str);
    setViewMode('days');
    setOpen(false);
  };

  // Seleccionar un mes desde la vista de meses
  const handleSelectMonth = (monthIdx) => {
    setViewDate((prev) => new Date(prev.getFullYear(), monthIdx, 1));
    setViewMode('days');
  };

  // Seleccionar un año desde la vista de años
  const handleSelectYear = (year) => {
    setViewDate((prev) => new Date(year, prev.getMonth(), 1));
    setViewMode('months');
  };

  // Días del mes y offsets
  const calendarData = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Domingo
    const totalDays = new Date(year, month + 1, 0).getDate();

    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
    const todayDate = today.getDate();

    let selectedDay = null;
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [vy, vm, vd] = value.split('-').map(Number);
      if (vy === year && vm - 1 === month) {
        selectedDay = vd;
      }
    }

    return {
      year,
      month,
      firstDayIndex,
      totalDays,
      isCurrentMonth,
      todayDate,
      selectedDay
    };
  }, [viewDate, value]);

  // Formato numérico dd/mm/aa
  const formattedDisplay = useMemo(() => {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return '';
    const [y, m, d] = value.split('-').map(Number);
    const dayStr = String(d).padStart(2, '0');
    const monthStr = String(m).padStart(2, '0');
    const yearStr = String(y).slice(-2);
    return `${dayStr}/${monthStr}/${yearStr}`;
  }, [value]);

  // Comprobar si "Hoy" está deshabilitado
  const todayDisabled = useMemo(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const str = `${yyyy}-${mm}-${dd}`;
    return Boolean((max && str > max) || (min && str < min));
  }, [min, max]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        display: 'inline-block',
        width,
        userSelect: 'none',
        ...style
      }}
    >
      {/* Botón trigger del DatePicker */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={() => {
          if (!disabled) {
            setOpen((prev) => {
              if (!prev) setViewMode('days');
              return !prev;
            });
          }
        }}
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            setOpen((prev) => !prev);
          }
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.35rem',
          height: '40px',
          padding: '0 0.55rem',
          backgroundColor: '#FFFFFF',
          border: `1.5px solid ${open ? 'var(--toy-blue)' : 'var(--toy-border)'}`,
          borderRadius: '12px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          boxShadow: open ? '0 0 0 3px rgba(25, 168, 232, 0.15)' : 'none',
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
          fontSize: '0.84rem',
          color: value ? 'var(--toy-ink)' : 'var(--toy-muted)',
          fontWeight: 700
        }}
        title={formattedDisplay || placeholder}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', overflow: 'hidden' }}>
          <CalendarIcon
            size={14}
            color={value || open ? 'var(--toy-blue)' : 'var(--toy-muted)'}
            style={{ flexShrink: 0 }}
          />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {formattedDisplay || placeholder}
          </span>
        </div>

        {value && !disabled && (
          <span
            role="button"
            tabIndex={0}
            onClick={handleClear}
            title="Borrar fecha"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              backgroundColor: 'rgba(58, 42, 34, 0.08)',
              color: 'var(--toy-muted)',
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            <X size={11} strokeWidth={2.6} />
          </span>
        )}
      </div>

      {/* Popover del Calendario */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            [align === 'right' ? 'right' : 'left']: 0,
            zIndex: 110,
            backgroundColor: '#FFFFFF',
            borderRadius: '18px',
            border: '1.5px solid var(--toy-border)',
            boxShadow: '0 12px 32px rgba(58, 42, 34, 0.16), 0 4px 12px rgba(58, 42, 34, 0.08)',
            padding: '0.85rem',
            width: '270px',
            animation: 'toyModalIn 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}
        >
          {/* ====================================================
              VISTA 1: DÍAS DEL MES (CLASSIC VIEW)
             ==================================================== */}
          {viewMode === 'days' && (
            <>
              {/* Header con navegación de año (<< >>) y mes (< >) y botón central */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '0.65rem'
                }}
              >
                <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={handlePrevYear}
                    className="btn btn-secondary btn-sm"
                    style={{
                      width: '24px',
                      height: '24px',
                      padding: 0,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '6px'
                    }}
                    title="Año anterior"
                  >
                    <ChevronsLeft size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="btn btn-secondary btn-sm"
                    style={{
                      width: '24px',
                      height: '24px',
                      padding: 0,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '6px'
                    }}
                    title="Mes anterior"
                  >
                    <ChevronLeft size={14} />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setViewMode('months')}
                  title="Cambiar mes o año"
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '0.86rem',
                    fontWeight: 800,
                    color: 'var(--toy-ink)',
                    cursor: 'pointer',
                    padding: '3px 8px',
                    borderRadius: '8px',
                    transition: 'background-color 0.15s ease, color 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(25, 168, 232, 0.1)';
                    e.currentTarget.style.color = 'var(--toy-blue)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'var(--toy-ink)';
                  }}
                >
                  {MONTH_NAMES[calendarData.month]} {calendarData.year}
                </button>

                <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="btn btn-secondary btn-sm"
                    style={{
                      width: '24px',
                      height: '24px',
                      padding: 0,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '6px'
                    }}
                    title="Mes siguiente"
                  >
                    <ChevronRight size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextYear}
                    className="btn btn-secondary btn-sm"
                    style={{
                      width: '24px',
                      height: '24px',
                      padding: 0,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '6px'
                    }}
                    title="Año siguiente"
                  >
                    <ChevronsRight size={14} />
                  </button>
                </div>
              </div>

              {/* Días de la semana */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  textAlign: 'center',
                  marginBottom: '0.35rem'
                }}
              >
                {DAY_LABELS.map((d, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      color: i === 0 || i === 6 ? 'var(--toy-orange-dark)' : 'var(--toy-muted)'
                    }}
                  >
                    {d}
                  </span>
                ))}
              </div>

              {/* Rejilla de días */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  gap: '3px'
                }}
              >
                {/* Espacios vacíos antes del primer día */}
                {Array.from({ length: calendarData.firstDayIndex }).map((_, i) => (
                  <div key={`blank-${i}`} style={{ height: '30px' }} />
                ))}

                {/* Días del mes */}
                {Array.from({ length: calendarData.totalDays }).map((_, i) => {
                  const dayNum = i + 1;
                  const isSelected = calendarData.selectedDay === dayNum;
                  const isToday = calendarData.isCurrentMonth && calendarData.todayDate === dayNum;

                  const yyyy = viewDate.getFullYear();
                  const mm = String(viewDate.getMonth() + 1).padStart(2, '0');
                  const dd = String(dayNum).padStart(2, '0');
                  const dayDateStr = `${yyyy}-${mm}-${dd}`;

                  const isBeforeMin = Boolean(min && dayDateStr < min);
                  const isAfterMax = Boolean(max && dayDateStr > max);
                  const isDayDisabled = isBeforeMin || isAfterMax;

                  return (
                    <button
                      key={`day-${dayNum}`}
                      type="button"
                      disabled={isDayDisabled}
                      onClick={() => !isDayDisabled && handleSelectDay(dayNum)}
                      style={{
                        height: '30px',
                        width: '100%',
                        padding: 0,
                        border: isToday && !isSelected ? '1.5px solid var(--toy-blue)' : 'none',
                        borderRadius: '8px',
                        backgroundColor: isSelected ? 'var(--toy-blue)' : 'transparent',
                        color: isDayDisabled ? 'var(--toy-muted)' : isSelected ? '#FFFFFF' : isToday ? 'var(--toy-deep-blue)' : 'var(--toy-ink)',
                        fontWeight: isSelected || isToday ? 800 : 600,
                        fontSize: '0.8rem',
                        cursor: isDayDisabled ? 'not-allowed' : 'pointer',
                        opacity: isDayDisabled ? 0.35 : 1,
                        boxShadow: isSelected ? '0 2px 0 var(--toy-deep-blue)' : 'none',
                        transition: 'all 0.12s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected && !isDayDisabled) {
                          e.currentTarget.style.backgroundColor = '#F8EED9';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected && !isDayDisabled) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      {dayNum}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* ====================================================
              VISTA 2: SELECTOR DE MESES
             ==================================================== */}
          {viewMode === 'months' && (
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '0.85rem'
                }}
              >
                <button
                  type="button"
                  onClick={handlePrevYear}
                  className="btn btn-secondary btn-sm"
                  style={{
                    width: '26px',
                    height: '26px',
                    padding: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '8px'
                  }}
                  title="Año anterior"
                >
                  <ChevronLeft size={15} />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setYearRangeStart(Math.floor(viewDate.getFullYear() / 12) * 12);
                    setViewMode('years');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '0.92rem',
                    fontWeight: 800,
                    color: 'var(--toy-ink)',
                    cursor: 'pointer',
                    padding: '3px 8px',
                    borderRadius: '8px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(25, 168, 232, 0.1)';
                    e.currentTarget.style.color = 'var(--toy-blue)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'var(--toy-ink)';
                  }}
                >
                  {viewDate.getFullYear()} ▾
                </button>

                <button
                  type="button"
                  onClick={handleNextYear}
                  className="btn btn-secondary btn-sm"
                  style={{
                    width: '26px',
                    height: '26px',
                    padding: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '8px'
                  }}
                  title="Año siguiente"
                >
                  <ChevronRight size={15} />
                </button>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '6px'
                }}
              >
                {MONTH_SHORT.map((mShort, idx) => {
                  const isCurrent = viewDate.getMonth() === idx;
                  const monthFirstDay = `${viewDate.getFullYear()}-${String(idx + 1).padStart(2, '0')}-01`;
                  const lastDayOfMonth = new Date(viewDate.getFullYear(), idx + 1, 0).getDate();
                  const monthLastDay = `${viewDate.getFullYear()}-${String(idx + 1).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;
                  const isMonthDisabled = Boolean((max && monthFirstDay > max) || (min && monthLastDay < min));

                  return (
                    <button
                      key={mShort}
                      type="button"
                      disabled={isMonthDisabled}
                      onClick={() => !isMonthDisabled && handleSelectMonth(idx)}
                      style={{
                        height: '36px',
                        border: isCurrent ? '1.5px solid var(--toy-blue)' : '1px solid var(--toy-border-light)',
                        borderRadius: '10px',
                        backgroundColor: isCurrent ? 'rgba(25, 168, 232, 0.15)' : '#FFFFFF',
                        color: isMonthDisabled ? 'var(--toy-muted)' : isCurrent ? 'var(--toy-deep-blue)' : 'var(--toy-ink)',
                        fontWeight: 700,
                        fontSize: '0.84rem',
                        cursor: isMonthDisabled ? 'not-allowed' : 'pointer',
                        opacity: isMonthDisabled ? 0.35 : 1,
                        transition: 'all 0.12s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!isCurrent && !isMonthDisabled) e.currentTarget.style.backgroundColor = '#F8EED9';
                      }}
                      onMouseLeave={(e) => {
                        if (!isCurrent && !isMonthDisabled) e.currentTarget.style.backgroundColor = '#FFFFFF';
                      }}
                    >
                      {mShort}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ====================================================
              VISTA 3: SELECTOR DE AÑOS
             ==================================================== */}
          {viewMode === 'years' && (
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '0.85rem'
                }}
              >
                <button
                  type="button"
                  onClick={() => setYearRangeStart((prev) => prev - 12)}
                  className="btn btn-secondary btn-sm"
                  style={{
                    width: '26px',
                    height: '26px',
                    padding: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '8px'
                  }}
                  title="Años anteriores"
                >
                  <ChevronLeft size={15} />
                </button>

                <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--toy-ink)' }}>
                  {yearRangeStart} - {yearRangeStart + 11}
                </span>

                <button
                  type="button"
                  onClick={() => setYearRangeStart((prev) => prev + 12)}
                  className="btn btn-secondary btn-sm"
                  style={{
                    width: '26px',
                    height: '26px',
                    padding: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '8px'
                  }}
                  title="Años siguientes"
                >
                  <ChevronRight size={15} />
                </button>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '6px'
                }}
              >
                {Array.from({ length: 12 }, (_, i) => yearRangeStart + i).map((y) => {
                  const isCurrent = viewDate.getFullYear() === y;
                  const isYearDisabled = Boolean((max && `${y}-01-01` > max) || (min && `${y}-12-31` < min));

                  return (
                    <button
                      key={y}
                      type="button"
                      disabled={isYearDisabled}
                      onClick={() => !isYearDisabled && handleSelectYear(y)}
                      style={{
                        height: '36px',
                        border: isCurrent ? '1.5px solid var(--toy-blue)' : '1px solid var(--toy-border-light)',
                        borderRadius: '10px',
                        backgroundColor: isCurrent ? 'rgba(25, 168, 232, 0.15)' : '#FFFFFF',
                        color: isYearDisabled ? 'var(--toy-muted)' : isCurrent ? 'var(--toy-deep-blue)' : 'var(--toy-ink)',
                        fontWeight: 700,
                        fontSize: '0.84rem',
                        cursor: isYearDisabled ? 'not-allowed' : 'pointer',
                        opacity: isYearDisabled ? 0.35 : 1,
                        transition: 'all 0.12s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!isCurrent && !isYearDisabled) e.currentTarget.style.backgroundColor = '#F8EED9';
                      }}
                      onMouseLeave={(e) => {
                        if (!isCurrent && !isYearDisabled) e.currentTarget.style.backgroundColor = '#FFFFFF';
                      }}
                    >
                      {y}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer con acciones rápidas: Hoy y Limpiar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '0.65rem',
              paddingTop: '0.5rem',
              borderTop: '1px solid var(--toy-border-light)'
            }}
          >
            <button
              type="button"
              disabled={todayDisabled}
              onClick={handleToday}
              className="btn btn-secondary btn-sm"
              style={{
                fontSize: '0.74rem',
                padding: '0.2rem 0.6rem',
                height: '24px',
                borderRadius: '6px',
                opacity: todayDisabled ? 0.4 : 1,
                cursor: todayDisabled ? 'not-allowed' : 'pointer'
              }}
            >
              Hoy
            </button>

            {value && (
              <button
                type="button"
                onClick={handleClear}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  color: 'var(--toy-red)',
                  cursor: 'pointer',
                  padding: '0.2rem 0.4rem'
                }}
              >
                Limpiar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
