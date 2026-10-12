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
]);

export const GAS_HTML_SOURCES = Object.freeze([
  'src/web/00-document-head.html',
  'src/web/01-styles.html',
  'src/web/02-app-layout.html',
  'src/web/03-modals.html',
  'src/web/03a-dashboard-mobile.html',
  'src/web/03b-client-core.html',
  'src/web/03c-client-auth.html',
  'src/web/04-browser-app.html',
]);
