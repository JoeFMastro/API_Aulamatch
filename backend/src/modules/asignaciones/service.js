/**
 * asignaciones/service.js
 * Lógica de asignación de aulas.
 *
 * Motor automático (sección 10.3 — IMPLEMENTAR EN ETAPA POSTERIOR):
 *   1. Obtener comisiones sin aula del período (anio, cuatrimestre)
 *   2. Ordenar por cupo descendente
 *   3. Para cada comisión: buscar aulas compatibles por tipo y capacidad
 *   4. Priorizar edificio de preferencia de la UA
 *   5. Verificar superposición horaria con existeSuperposicion()
 *   6. Crear registro en tabla `asignacion` con estado='ASIGNADA', es_manual=false
 *
 * Filtros disponibles en GET /api/asignaciones:
 *   UA, carrera, edificio, turno, modalidad, estado
 *
 * Estado válidos: PENDIENTE | ASIGNADA | CONFLICTO
 */
'use strict';
