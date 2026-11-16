# Smart SRRT — One-Click Deployment Compatibility Contract

## Purpose

Preserve the operational simplicity of the current district-level installation while GitHub becomes the engineering source of truth.

## Current installation model to preserve

The v2026.09.08.1 guide uses this operational flow:

1. create one Google Sheet;
2. open Extensions → Apps Script;
3. place server code in Code.gs;
4. create an HTML file named Index;
5. run `installSmartSRRT()`;
6. authorize Sheets/Drive/Docs/External API scopes;
7. deploy as Web App;
8. maintain/update the existing Web App deployment URL.

The installer creates/repairs:

- MainData
- UserAccounts
- SystemSettings
- MasterData
- AreaMaster
- ContentLibrary
- AuditLogs
- VisitLogs
- system/report/logo Drive folders
- report template
- initial Super Admin when required

## Compatibility requirements

### C-01 Existing data preservation
Running installer/repair or an upgrade migration must not intentionally clear existing business data.

### C-02 Existing Web App URL
A normal version upgrade should support updating the existing deployment rather than requiring all users to receive a new URL.

### C-03 District isolation
The current recommended model of one district installation owning its own Sheet/runtime assets remains supported.

### C-04 No mandatory local developer tooling for end users
District operators should not be required to install Node.js, Git, clasp or a build environment merely to operate the system.

Developer tooling may be used to produce release artifacts.

### C-05 Admin configuration
Organization name, branding, operating status, area data and report configuration remain manageable without editing source code.

### C-06 Repairability
A repair path equivalent to the current `installSmartSRRTCore_` behavior must remain available for missing runtime assets.

### C-07 Upgrade safety
Schema changes require an explicit migration path; "replace code and hope installer repairs it" is not sufficient once persistent schema begins evolving.

### C-08 Deployment parity
A release artifact must contain the Apps Script project files required by runtime, including an `Index.html` entry point.

## GitHub vs deployment artifact

GitHub may use a modular development tree. The distributed Apps Script artifact may be assembled for simple installation.

Therefore:

```text
GitHub modular source
       ↓
validated release artifact
       ↓
Apps Script project
       ↓
install / migrate
       ↓
deploy Web App
```

The release artifact may be multi-file; "one-click" refers to operational setup simplicity, not a requirement that all server logic remain in one physical source file.

## Update compatibility

The existing field guidance that a new Web App version must be deployed after code changes remains an operational requirement.

P0 does not change the production deployment mechanism.

## P0 conclusion

Modernization is compatible with the One-Click goal if:

- runtime remains Apps Script for this scope,
- installation stays automated,
- migration is explicit,
- operators do not need developer tooling,
- existing URLs/data can be preserved.
