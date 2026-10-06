# Smart SRRT — Server Function & Browser RPC Inventory

Baseline: `main@799418cad8d570f5ec0adcb37a641977b25f9650`

## Summary

- Server function declarations: **90**
- Unique server function names: **89**
- Browser RPC call occurrences: **29**
- Unique browser RPC targets: **25**
- Browser RPC targets without a server function: **0**
- Duplicate server function names: **forceGeminiModelAuto**

## Browser → Apps Script RPC contract

- `addRecord`
- `deleteArea`
- `deleteRecord`
- `exportData`
- `generateReportFromWeb`
- `getAnalytics`
- `getAppBoot`
- `getDashboardData`
- `getInstallationStatus`
- `getSystemSettings`
- `importAreas`
- `listAreas`
- `listAuditLogs`
- `listContent`
- `listUsers`
- `login`
- `logout`
- `registerUser`
- `repairInstallation`
- `saveArea`
- `saveContent`
- `saveSystemSettings`
- `updateRecord`
- `updateUser`
- `uploadLogo`

All 25 current browser RPC targets have a matching server-side function in the baseline.

## Server function inventory

- `doGet`
- `include`
- `onOpen`
- `installSmartSRRT`
- `setupDatabase`
- `installSmartSRRTCore_`
- `resetSuperAdminPassword`
- `showDatabaseInfo`
- `ensureSystemAssets_`
- `getOrCreateFolder_`
- `isGoogleDocAvailable_`
- `createDefaultReportTemplate_`
- `ensureSheet_`
- `seedSettings_`
- `upsertSettingDirect_`
- `seedMasterData_`
- `seedSuperAdmin_`
- `formatSheets_`
- `getDb_`
- `getSheet_`
- `getSheetByIdOrName_`
- `getSettingsMap_`
- `getPublicSettings_`
- `keyValueMap_`
- `hashPassword_`
- `getCurrentUserHint_`
- `hasPermission_`
- `requireAuth_`
- `makeSessionToken_`
- `getUserByToken_`
- `findUserByEmail_`
- `login`
- `logout`
- `registerUser`
- `publicUser_`
- `getAppBoot`
- `getMasterData`
- `getPublishedContent`
- `getDashboardData`
- `rowToObject_`
- `isoToThaiDate_`
- `thaiDateToIso_`
- `addRecord`
- `updateRecord`
- `deleteRecord`
- `saveRowData_`
- `getAnalytics`
- `countBy_`
- `listUsers`
- `updateUser`
- `getAreaMaster`
- `listAreas`
- `saveArea`
- `deleteArea`
- `importAreas`
- `areaKey_`
- `uploadLogo`
- `upsertSettingAsUser_`
- `getInstallationStatus`
- `repairInstallation`
- `listContent`
- `saveContent`
- `getSystemSettings`
- `saveSystemSettings`
- `listAuditLogs`
- `writeAudit_`
- `logVisit_`
- `exportData`
- `generateReportFromWeb`
- `analyzeWithGemini_`
- `resolveGeminiModel_`
- `resolveGeminiModelInfo_`
- `findBestGeminiModel_`
- `findGeminiModelInList_`
- `listGeminiModelsForVersion_`
- `normalizeGeminiModelName_`
- `clearGeminiModelCache_`
- `clearGeminiModelCache`
- `forceGeminiModelAuto`
- `listAvailableGeminiModels`
- `testGeminiConnection`
- `getGeminiRetryModelQueue_`
- `add`
- `callGeminiForReport_`
- `buildReportPromptPart_`
- `replacePlaceholderWithParagraphs_`
- `buildReportPrompt_`
- `safePromptValue_`
- `forceGeminiModelStable`

## Baseline anomalies

### Duplicate function declaration

`forceGeminiModelAuto` is declared more than once in the current server file. In Apps Script / JavaScript, the later function declaration wins. This must be characterized before modularization; P0 must not silently choose a behavior without confirming which declaration is effective.

## P0 rule

This inventory is a characterization artifact. It does not authorize renaming, removing, or changing RPC contracts during P0.
