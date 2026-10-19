// Native Apps Script source of truth. One-Click is frozen historical output.
// Keep order stable: 04-browser-app.html owns the closing </body></html> tags.
export const GAS_SERVER_SOURCES = Object.freeze([
  'src/server/00-bootstrap.gs',
  'src/server/01-schema-and-db.gs',
  'src/server/02-auth-and-attachments.gs',
  'src/server/03-events-and-dashboard.gs',
  'src/server/04-admin-and-audit.gs',
  'src/server/05-reports-and-models.gs',
  'src/server/06-gemini-and-prompts.gs',
  // D331 N1-A: inert pure foundation only; G1-B1/B2 remain offline-only.
  'src/dengue/00-g1a-foundation.gs',
]);

export const GAS_HTML_SOURCES = Object.freeze([
  'src/web/00-document-head.html',
  'src/web/01-styles.html',
  'src/web/02-app-layout.html',
  'src/web/03-modals.html',
  'src/web/03a-dashboard-mobile.html',
  'src/web/03b-client-core.html',
  'src/web/03c-client-auth.html',
  'src/web/03d-client-dashboard.html',
  'src/web/03e-client-dashboard-export.html',
  'src/web/03f-client-event-controls.html',
  'src/web/03g-client-event-history.html',
  'src/web/03h-client-event-records.html',
  'src/web/03i-client-report-actions.html',
  'src/web/03j-client-report-job.html',
  'src/web/03k-client-report-generation.html',
  // C2C-A: source registration only; no page, route, grant, RPC or feature enable.
  'src/web/03l-client-d331-status.html',
  // P0-24: browser-only synthetic Event-case workspace within original Records.
  // No GS reader, RPC, patient data, or D331 runtime feature enablement.
  'src/web/03m-client-d331-mvp01-offline.html',
  'src/web/04-browser-app.html',
]);
