'use strict';

/**
 * reportes/controller.js
 * Maneja las peticiones HTTP y delega la lógica de negocio a service.js.
 */

const service = require('./service');

const DIAS_VALIDOS = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];

/**
 * Escapa valores para cumplir con el formato estándar de CSV.
 * @param {any} val
 * @returns {string}
 */
function escapeCSV(val) {
  if (val === undefined || val === null) return '';
  if (val instanceof Date) return val.toISOString();
  let str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    str = '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

/**
 * GET /api/reportes/asignaciones
 * Exporta el estado de asignaciones en formato JSON o CSV.
 */
async function reporteAsignaciones(req, res, next) {
  try {
    const { anio, cuatrimestre, estado, formato } = req.query;

    if (!anio || !cuatrimestre) {
      const err = new Error('Los parámetros "anio" y "cuatrimestre" son obligatorios.');
      err.status = 400;
      throw err;
    }

    // Filtro automático de Unidad Académica según el rol del usuario
    let unidadAcademicaId;
    if (req.user.rol === 'ADMINISTRATIVO') {
      unidadAcademicaId = req.user.unidadAcademicaId;
    } else {
      unidadAcademicaId = req.query.unidad_academica_id
        ? Number(req.query.unidad_academica_id)
        : undefined;
    }

    const asignaciones = await service.obtenerAsignaciones({
      anio,
      cuatrimestre,
      unidadAcademicaId,
      estado
    });

    if (formato === 'csv') {
      const headers = [
        'comision_codigo',
        'materia_nombre',
        'carreras',
        'unidad_academica_nombre',
        'docente_apellido',
        'docente_nombre',
        'cupo',
        'inscriptos',
        'aula_numero',
        'edificio_nombre',
        'horario',
        'modalidad',
        'turno',
        'estado_asignacion',
        'es_manual',
        'fecha_asignacion'
      ];

      const csvRows = [headers.join(',')];

      for (const row of asignaciones) {
        const line = [
          escapeCSV(row.comision_codigo),
          escapeCSV(row.materia_nombre),
          escapeCSV(Array.isArray(row.carreras) ? row.carreras.join(';') : ''),
          escapeCSV(row.unidad_academica_nombre),
          escapeCSV(row.docente_apellido),
          escapeCSV(row.docente_nombre),
          escapeCSV(row.cupo),
          escapeCSV(row.inscriptos),
          escapeCSV(row.aula_numero),
          escapeCSV(row.edificio_nombre),
          escapeCSV(row.horario),
          escapeCSV(row.modalidad),
          escapeCSV(row.turno),
          escapeCSV(row.estado_asignacion),
          escapeCSV(row.es_manual),
          escapeCSV(row.fecha_asignacion)
        ];
        csvRows.push(line.join(','));
      }

      const csvContent = csvRows.join('\r\n');

      // Responder con archivo descargable y soporte UTF-8 (con BOM para Excel)
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="asignaciones_${anio}_${cuatrimestre}.csv"`);
      return res.send(Buffer.from('\uFEFF' + csvContent, 'utf-8'));
    }

    // Por defecto, responder JSON
    res.json(asignaciones);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/reportes/disponibilidad
 * Retorna la disponibilidad y ocupación de aulas agrupadas por edificio.
 */
async function disponibilidad(req, res, next) {
  try {
    const { anio, cuatrimestre, edificio_id, dia } = req.query;

    if (!anio || !cuatrimestre) {
      const err = new Error('Los parámetros "anio" y "cuatrimestre" son obligatorios.');
      err.status = 400;
      throw err;
    }

    if (dia) {
      const diaUpper = dia.toUpperCase();
      if (!DIAS_VALIDOS.includes(diaUpper)) {
        const err = new Error(`Día de la semana inválido. Valores permitidos: ${DIAS_VALIDOS.join(', ')}`);
        err.status = 400;
        throw err;
      }
    }

    const reporte = await service.obtenerDisponibilidad({
      anio,
      cuatrimestre,
      edificioId: edificio_id ? Number(edificio_id) : undefined,
      dia
    });

    res.json(reporte);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  reporteAsignaciones,
  disponibilidad
};
