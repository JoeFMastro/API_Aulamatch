/**
 * conflictos/service.js
 * Lógica de detección de conflictos (sección 10.5 — IMPLEMENTAR DESPUÉS).
 *
 * Se ejecuta en 3 momentos:
 *   1. Al crear/modificar una Asignacion (trigger síncrono)
 *   2. Al finalizar asignación automática masiva
 *   3. Por petición manual vía POST /api/conflictos/detectar
 *
 * Verificación 1 — Superposición horaria:
 *   Detectar si otra asignacion usa el mismo aula_id con bandas solapadas
 *   en el mismo día → marcar estado='CONFLICTO'
 *
 * Verificación 2 — Cupo excedido:
 *   Si comision.inscriptos > aula.capacidad → marcar estado='CONFLICTO'
 */
'use strict';
