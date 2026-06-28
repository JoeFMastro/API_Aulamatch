# Decisiones de Diseño y Desviaciones del Modelo Original

Este documento registra de manera formal las decisiones de diseño tomadas durante la implementación del backend de **AulaMatch**, justificando cualquier discrepancia con el documento de diseño original o los diagramas UML.

---

## 1. Permisos y Roles en Registro de Comisiones (`POST /api/comisiones`)

### Especificación Original (Sección 10.2)
El documento de diseño original establece que el endpoint para crear o registrar comisiones (`POST /api/comisiones`) tiene acceso restringido a:
*   **Solo Administrativo**

### Implementación Real
En el código fuente, la ruta está protegida permitiendo el acceso tanto al rol **Administrativo** como al rol **Coordinador**:
*   `COORDINADOR` y `ADMINISTRATIVO`

### Justificación
Esta es una **decisión consciente** y no una desviación accidental. Se decidió extender el permiso de creación de comisiones al rol de **Coordinador** por las siguientes razones:
1.  **Jerarquía de Roles:** En el modelo de negocio, el Coordinador posee un rol de supervisión y gestión global ("acceso total"). Restringirle la creación de comisiones mientras tiene permisos de asignación y resolución de conflictos resultaba contradictorio con su nivel de autoridad operativa.
2.  **Operatividad:** Permite resolver cuellos de botella administrativos en periodos críticos de planificación académica, donde el Coordinador necesita dar de alta comisiones de urgencia sin depender de un usuario con rol Administrativo.
3.  **Coherencia:** Mantiene la alineación con otros endpoints de gestión académica y de asignaciones donde el Coordinador tiene plenas facultades de escritura.
