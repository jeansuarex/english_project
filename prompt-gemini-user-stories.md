# User Stories — Shakespeare Platform

Generar PDF académico con: portada ("Parcial #3 - User Stories", grupo, fecha), índice, 2 secciones, apéndice MCP.

Formato: `Como <rol>, quiero <funcionalidad>, para <beneficio>.` + 2 CA. Las [MCP] incluyen: Tool, Auth, Agente.

---

## 1. INVENTARIO ACTUAL (MVP)

### 1.1 Autenticación
- **HU-001 [MCP]:** Como estudiante, quiero registrarme con email y nombre, para crear una cuenta. CA1: Registro requiere email y nombre. CA2: Se retorna token de sesión. Tool: `auth_register` | Auth: Pública | Agente: Registrar usuario.
- **HU-002:** Como estudiante, quiero iniciar sesión con mi email, para acceder a mi cuenta. CA1: Login requiere email registrado. CA2: Se retorna token válido.
- **HU-003:** Como estudiante, quiero cerrar sesión, para proteger mi cuenta. CA1: Sesión se elimina del servidor. CA2: Token deja de ser válido.
- **HU-004 [MCP]:** Como estudiante, quiero autenticarme con Clerk (OAuth/SSO), para iniciar sesión sin contraseñas. CA1: Clerk provee SignIn/SignUp. CA2: Backend verifica JWT de Clerk. Tool: `auth_verify_clerk` | Auth: Clerk JWT | Agente: Verificar identidad con Clerk.
- **HU-005 [MCP]:** Como estudiante, quiero ver mi perfil (nombre, email, plan, créditos), para conocer mi estado. CA1: Muestra datos del usuario. CA2: Información vía token de sesión. Tool: `user_get_profile` | Auth: Bearer Token | Agente: Consultar perfil del usuario.

### 1.2 Planes
- **HU-006:** Como visitante, quiero ver los planes de precios, para elegir el adecuado. CA1: Muestra 3 planes (Individual $70, Anthology $200/año, Globe $20/user/mes). CA2: Cada plan tiene precio y botón de acción.

### 1.3 Exámenes (Sesiones)
- **HU-007 [MCP]:** Como estudiante, quiero generar una sesión de examen con código de 6 dígitos, para rendir un examen. CA1: Código único de 6 dígitos. CA2: Sesión expira en 24h. Tool: `exam_create_session` | Auth: Bearer Token | Agente: Crear sesión de examen.
- **HU-008:** Como estudiante, quiero iniciar una sesión de examen, para comenzar a responder. CA1: Temporizador inicia. CA2: Estado cambia a "in_progress".
- **HU-009:** Como estudiante, quiero ver preguntas de opción múltiple, ensayo y completar espacios, para leer cada una. CA1: Opciones cliqueables. CA2: Área de texto para ensayos.
- **HU-010:** Como estudiante, quiero navegar entre preguntas con panel lateral, para responder en cualquier orden. CA1: Botones numerados por pregunta. CA2: Colores indican estado (verde=respondida, crema=no respondida).
- **HU-011:** Como estudiante, quiero ver temporizador regresivo, para saber tiempo restante. CA1: Se vuelve rojo a <5 min. CA2: Autoenvío al llegar a cero.
- **HU-012 [MCP]:** Como estudiante, quiero enviar mis respuestas, para obtener mi calificación. CA1: Se calcula puntuación automáticamente. CA2: Se actualizan estadísticas del usuario. Tool: `exam_submit_answers` | Auth: Bearer Token | Agente: Enviar respuestas y obtener resultado.
- **HU-013:** Como estudiante, quiero ver mi resultado (aprobado/reprobado), para saber mi puntuación. CA1: Indicador visual verde/rojo. CA2: Muestra puntuación vs mínima.

### 1.4 Historial
- **HU-014 [MCP]:** Como estudiante, quiero ver mi historial de exámenes, para revisar resultados anteriores. CA1: Tabla con fecha, puntuación y estado. CA2: Distintivo visual aprobado/reprobado. Tool: `exam_get_history` | Auth: Bearer Token | Agente: Consultar historial de exámenes.

### 1.5 Tests (Legacy)
- **HU-015 [MCP]:** Como estudiante, quiero programar un test, para agendar una evaluación. CA1: Test creado con estado "pending". CA2: Fecha según plan de suscripción. Tool: `test_schedule` | Auth: Bearer Token | Agente: Programar test de proficiencia.
- **HU-016:** Como estudiante, quiero activar un test pendiente, para comenzar evaluación de 15 días. CA1: Estado cambia a "active". CA2: Fecha de expiración a 15 días.
- **HU-017:** Como estudiante, quiero enviar respuestas de un test, para obtener nivel A1-C1. CA1: Puntuación según respuestas correctas. CA2: Asigna nivel de proficiencia.
- **HU-018 [MCP]:** Como estudiante, quiero consultar estado de mis tests, para saber pruebas disponibles. CA1: Retorna test activo, pendiente y último completado. Tool: `test_get_status` | Auth: Bearer Token | Agente: Consultar estado de tests.

### 1.6 Suscripciones y Pagos
- **HU-019 [MCP]:** Como estudiante, quiero crear una suscripción (basic=$50, annual=$200, enterprise=$20), para acceder a exámenes. CA1: Selecciona plan. CA2: Se crea customer en Stripe/mock. Tool: `subscription_create` | Auth: Bearer Token | Agente: Crear suscripción.
- **HU-020 [MCP]:** Como estudiante, quiero cancelar mi suscripción al final del período, para no ser cobrado. CA1: cancelAtPeriodEnd = true. CA2: Estado cambia a "cancelled" al expirar. Tool: `subscription_cancel` | Auth: Bearer Token | Agente: Cancelar suscripción.
- **HU-021:** Como administrador, quiero recibir webhooks de Stripe, para actualizar suscripciones automáticamente. CA1: checkout.session.completed activa suscripción. CA2: invoice.payment_failed marca "pending".
- **HU-022 [MCP]:** Como estudiante, quiero ver mi suscripción activa, para saber mi plan vigente. CA1: Muestra plan, estado y fechas. CA2: Indica si hay cancelación solicitada. Tool: `subscription_get_info` | Auth: Bearer Token | Agente: Consultar suscripción activa.

### 1.7 Magic Links
- **HU-023:** Como administrador, quiero enviar magic link por email, para invitar a un examen. CA1: Token único criptográfico. CA2: Email con diseño corporativo. CA3: Enlace expira en 24h.
- **HU-024:** Como estudiante, quiero verificar y usar un magic link, para acceder al examen. CA1: Verifica token no expirado. CA2: Verifica no usado. CA3: Se marca como usado.

### 1.8 Administración
- **HU-025:** Como administrador, quiero ver dashboard con estadísticas, para visión rápida de la plataforma. CA1: Tarjetas con Total Usuarios, Exámenes Activos, Completados, Ingresos. CA2: Tabla de actividad reciente.
- **HU-026:** Como administrador, quiero ver lista de usuarios, para gestionar cuentas. CA1: Tabla con nombre, email, plan, fecha. CA2: Botón de acción por fila.
- **HU-027:** Como administrador, quiero ver lista de exámenes, para gestionarlos. CA1: Tabla con título, preguntas, duración, precio, estado. CA2: Botón de edición.
- **HU-028:** Como administrador, quiero ver y editar planes de precios, para ajustar oferta. CA1: Muestra 3 planes con precios. CA2: Botón de edición por plan.

### 1.9 Infraestructura
- **HU-029:** Como desarrollador, quiero endpoint /health, para verificar servidor operativo. CA1: Retorna status ok y timestamp. CA2: No requiere autenticación.
- **HU-030:** Como desarrollador, quiero scripts de seed, para poblar BD con datos de prueba. CA1: seed-exam.ts crea examen con 8 preguntas. CA2: seed-results.ts crea intentos completados.
- **HU-031:** Como desarrollador, quiero Docker Compose, para desplegar consistentemente. CA1: API en puerto 3001. CA2: Web en puerto 5173. CA3: Admin en puerto 5174.

---

## 2. PRODUCTION READY (30 NUEVAS)

### 2.1 Seguridad
- **HU-032:** Como administrador, quiero autenticarme en el admin panel, para proteger datos sensibles. CA1: Login obligatorio. CA2: Solo rol "admin" accede.
- **HU-033:** Como desarrollador, quiero rate limiting en API, para prevenir abusos. CA1: 100 req/min en endpoints públicos. CA2: 30 req/min en auth. CA3: Código 429 al exceder.
- **HU-034 [MCP]:** Como estudiante, quiero gestionar API keys para MCP, para que Claude Code/Codex accedan a mis datos. CA1: Generar API key desde perfil. CA2: Revocar keys individualmente. Tool: `auth_manage_api_keys` | Auth: Bearer Token | Agente: Gestionar API keys MCP.

### 2.2 Pagos Reales (Stripe)
- **HU-035:** Como administrador, quiero Stripe en producción con webhooks reales, para procesar pagos reales. CA1: Secret key de producción. CA2: Webhooks firmados. CA3: Mock desactivado.
- **HU-036:** Como estudiante, quiero pagar con Stripe Checkout, para acceder a la plataforma. CA1: Redirección a Stripe Checkout. CA2: Webhook activa suscripción.
- **HU-037:** Como estudiante, quiero recibir facturas por email, para tener comprobantes. CA1: Stripe envía factura. CA2: Incluye detalle del plan y período.
- **HU-038:** Como estudiante, quiero ser notificado si mi pago falla, para actualizar método de pago. CA1: Email al fallar. CA2: Estado "past_due". CA3: 7 días para actualizar.

### 2.3 Recursos de Aprendizaje
- **HU-039:** Como administrador, quiero CRUD de recursos educativos, para poblar la plataforma. CA1: Recurso con tipo, título, contenido, dificultad. CA2: Almacenados en tabla resources.
- **HU-040 [MCP]:** Como estudiante, quiero ejercicios de listening con audio, para practicar comprensión auditiva. CA1: Reproductor de audio. CA2: Preguntas sobre el audio. Tool: `resource_get_listening` | Auth: Bearer/API Key | Agente: Recomendar ejercicios de listening.
- **HU-041:** Como estudiante, quiero flashcards con repetición espaciada, para memorizar vocabulario. CA1: Muestra palabra y definición. CA2: Usuario marca si recordó. CA3: Sistema programa próxima revisión.

### 2.4 Progreso
- **HU-042 [MCP]:** Como estudiante, quiero ver progreso por habilidad, para identificar fortalezas y debilidades. CA1: Puntuación 0-100 por habilidad. CA2: Evolución en el tiempo. Tool: `progress_get_skill_scores` | Auth: Bearer/API Key | Agente: Consultar puntuaciones por habilidad.
- **HU-043 [MCP]:** Como estudiante, quiero identificar áreas débiles automáticamente, para enfocar mi estudio. CA1: Analiza exámenes + recursos. CA2: Identifica 3 habilidades con menor puntuación. Tool: `progress_get_weak_areas` | Auth: Bearer/API Key | Agente: Determinar áreas de mejora.
- **HU-044:** Como estudiante, quiero dashboard visual de progreso con gráficos, para ver mi evolución. CA1: Gráfico radial de habilidades. CA2: Gráfico de barras de actividad semanal.

### 2.5 MCP y Asistente IA
- **HU-045 [MCP]:** Como estudiante, quiero chatear con asistente virtual que conoce mi progreso, para retroalimentación personalizada. CA1: Accede a mi historial completo. CA2: Preguntas en lenguaje natural. Tool: `mcp_chat` | Auth: API Key/Bearer | Agente: Conversar usando todas las tools MCP.
- **HU-046 [MCP]:** Como estudiante, quiero generar plan de estudio personalizado, para mejorar mis áreas débiles. CA1: Recursos específicos por área. CA2: Duración sugerida. Tool: `study_plan_generate` | Auth: API Key/Bearer | Agente: Generar plan de estudio personalizado.
- **HU-047 [MCP]:** Como estudiante, quiero crear examen personalizado enfocado en mis debilidades, para practicar específicamente. CA1: Preguntas de habilidades con menor puntuación. CA2: Dificultad adaptada. Tool: `exam_custom_create` | Auth: API Key/Bearer | Agente: Crear examen personalizado.
- **HU-048 [MCP]:** Como estudiante, quiero recomendaciones inteligentes de recursos, para practicar lo que necesito. CA1: Basadas en áreas débiles. CA2: Recursos no utilizados previamente. Tool: `resources_get_recommendations` | Auth: API Key/Bearer | Agente: Recomendar recursos educativos.
- **HU-049 [MCP]:** Como estudiante, quiero analizar mi escritura con IA, para recibir retroalimentación. CA1: Detecta errores gramaticales. CA2: Sugiere mejoras de vocabulario. Tool: `writing_analyze` | Auth: API Key/Bearer | Agente: Analizar escritura con IA.
- **HU-050 [MCP]:** Como estudiante, quiero resumen ejecutivo de mi progreso, para compartir con mi tutor. CA1: Puntuaciones por habilidad. CA2: Exámenes realizados y resultados. Tool: `progress_get_summary` | Auth: API Key/Bearer | Agente: Generar resumen de progreso.

### 2.6 Observabilidad
- **HU-051:** Como desarrollador, quiero logs estructurados JSON, para facilitar depuración. CA1: Timestamp, nivel, request ID. CA2: Errores con stack trace.
- **HU-052:** Como desarrollador, quiero métricas Prometheus en /metrics, para monitorear rendimiento. CA1: Peticiones/segundo. CA2: Latencia p50/p95/p99. CA3: Errores HTTP por código.

### 2.7 Testing
- **HU-053:** Como desarrollador, quiero tests unitarios de API, para verificar rutas individualmente. CA1: Tests de auth. CA2: Tests de CRUD usuarios/exámenes/suscripciones.
- **HU-054:** Como desarrollador, quiero tests de integración de flujos completos, para validar el sistema. CA1: Flujo registro → login → examen. CA2: Flujo suscripción y pago.

### 2.8 CI/CD
- **HU-055:** Como desarrollador, quiero CI con GitHub Actions, para garantizar calidad. CA1: Tests en cada push a main. CA2: Linting y typecheck en paralelo.
- **HU-056:** Como desarrollador, quiero despliegue automatizado a producción, para lanzar versiones rápido. CA1: Despliegue requiere aprobación. CA2: Incluye migraciones de BD.

### 2.9 UX
- **HU-057:** Como estudiante con discapacidad visual, quiero plataforma accesible WCAG 2.1 AA, para usar con lector de pantalla. CA1: Etiquetas ARIA. CA2: Contraste WCAG AA. CA3: Navegación por teclado.
- **HU-058:** Como estudiante hispanohablante, quiero la plataforma en español, para entender instrucciones. CA1: UI en español. CA2: Formato local de fechas/monedas.

### 2.10 Respaldo
- **HU-059:** Como administrador, quiero backups automáticos de BD, para restaurar ante fallos. CA1: Backup diario. CA2: Almacenamiento externo seguro.

### 2.11 Admin
- **HU-060:** Como administrador, quiero CRUD completo de usuarios, para administrar la plataforma. CA1: Buscar por nombre/email. CA2: Ver detalle con historial. CA3: Editar plan y rol.
- **HU-061:** Como administrador, quiero exportar reportes CSV/PDF, para analizar datos externamente. CA1: Reporte de usuarios. CA2: Reporte de ingresos. CA3: Reporte de progreso.

---

## APÉNDICE: TOOLS MCP

| Tool | Auth | Descripción |
|------|------|-------------|
| auth_register | Pública | Registrar usuario |
| auth_verify_clerk | Clerk JWT | Verificar identidad Clerk |
| user_get_profile | Bearer Token | Consultar perfil |
| exam_create_session | Bearer Token | Crear sesión examen |
| exam_submit_answers | Bearer Token | Enviar respuestas |
| exam_get_history | Bearer Token | Historial exámenes |
| test_schedule | Bearer Token | Programar test |
| test_get_status | Bearer Token | Estado tests |
| subscription_create | Bearer Token | Crear suscripción |
| subscription_cancel | Bearer Token | Cancelar suscripción |
| subscription_get_info | Bearer Token | Info suscripción |
| auth_manage_api_keys | Bearer Token | Gestionar API keys |
| resource_get_listening | Bearer/API Key | Ejercicios listening |
| progress_get_skill_scores | Bearer/API Key | Puntuaciones por habilidad |
| progress_get_weak_areas | Bearer/API Key | Áreas débiles |
| mcp_chat | API Key/Bearer | Chat asistente virtual |
| study_plan_generate | API Key/Bearer | Plan de estudio |
| exam_custom_create | API Key/Bearer | Examen personalizado |
| resources_get_recommendations | API Key/Bearer | Recomendar recursos |
| writing_analyze | API Key/Bearer | Analizar escritura IA |
| progress_get_summary | API Key/Bearer | Resumen progreso |
