/**
 * academico/service.js
 * Lógica de consultas académicas.
 *
 * IMPORTANTE — filtros por rol (sección 10.4):
 *   ADMINISTRATIVO: siempre filtrar por unidadAcademicaId del JWT
 *   COORDINADOR: sin restricción de UA
 *
 * Enums válidos:
 *   modalidad   → PRESENCIAL | VIRTUAL | HIBRIDA
 *   turno       → MANANA | TARDE | NOCHE
 *   cuatrimestre → 1 | 2
 *   tipo_clase  → TEORICA | PRACTICA | TEORICO_PRACTICA
 */
'use strict';
