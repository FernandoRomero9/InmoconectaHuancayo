# Inmoconecta CRM · Propuesta y demo

Propuesta comercial y demo funcional de un CRM inmobiliario para **Inmoconecta Huancayo**.

- `site/index.html`: propuesta para Alberto (qué resolvemos, recorrido del lead, módulos, comparativa, implementación).
- `site/demo.html`: CRM demo con datos de ejemplo. No necesita servidor ni base de datos.

## Qué muestra la demo

| Módulo | Qué se puede probar |
|---|---|
| Panel | Leads por día y por origen, tiempo de primera respuesta, embudo, ranking del equipo |
| Urgentes | Relojes en vivo de leads sin respuesta, visitas sin confirmar, ofertas sin respuesta, propiedades estancadas |
| Leads | Filtros por origen, campaña, etapa y asesor; ficha con historial, tiempos de espera y propiedades similares |
| Pipeline | Tablero con arrastrar y soltar entre etapas |
| Agenda | Visitas y tasaciones de los próximos 7 días |
| Propiedades | Stock con propietario, días en venta, campañas, interesados y reporte para el propietario |
| Captación | Propietarios que quieren vender, desde la solicitud hasta la publicación |
| Campañas | Inversión, costo por lead, por visita y por cierre en Meta y TikTok |
| Trazabilidad | Dónde y por qué se pierden los leads, velocidad de respuesta vs. resultado |
| Equipo, Automatizaciones, Integraciones | Turnos, reglas activables y cómo entra cada lead |

Botón **Simular lead** (o el interruptor **En vivo**) hace entrar leads de Meta o TikTok para ver asignación, alertas y reasignación automáticas.

Todos los nombres, teléfonos y cifras son ficticios. Los cambios se guardan solo en el navegador de quien usa la demo (botón «Reiniciar demo» para volver al inicio).

## Ver en local

Abrir `site/index.html` en el navegador, o servir la carpeta:

```bash
cd site && python3 -m http.server 8080
```

## Publicación

El workflow `.github/workflows/pages.yml` publica la carpeta `site/` en GitHub Pages en cada push. Si es la primera vez, en el repositorio ir a **Settings → Pages → Source: GitHub Actions**.
