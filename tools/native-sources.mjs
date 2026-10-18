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
  // D331 P0-13: backend source registration only. All D331 flags are OFF,
  // no new public RPCs, test grants, policy or spreadsheet writes.
  'src/dengue/00-g1a-foundation.gs',
  'src/dengue/03-n1b1-trusted-event-contract.gs',
  'src/dengue/07-p0-02a-mvp-schema-contract.gs',
  'src/dengue/09-p0-03b-dev-readonly-adapter.gs',
  'src/dengue/10-p0-05-v2-schema-compat.gs',
  'src/dengue/11-p0-06-offline-workflow-engine.gs',
  'src/dengue/12-p0-07-guarded-dev-crud.gs',
  'src/dengue/13-p0-08-dev-readonly-preflight.gs',
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
  'src/web/04-browser-app.html',
]);
