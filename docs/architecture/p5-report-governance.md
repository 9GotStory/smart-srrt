# P5 — Report Governance Contract

Scope: G-17, G-26, G-27  
SchemaVersion: 5

## Principle

AI is a drafting aid for the preliminary investigation report.

It is **not** the authoritative decision-maker for:

- investigation criteria
- Event type/classification
- epidemiological risk level

Those values remain controlled by the SRRT team's structured Event data.

## ReportRegistry

P5 adds a `ReportRegistry` sheet:

| Field | Purpose |
|---|---|
| ReportID | stable UUID for the generated-report record |
| EventID | stable link to MainData Event |
| DocumentID | Google Docs file ID |
| DocumentURL | Google Docs URL |
| GeneratedAt | generation timestamp |
| GeneratedBy | authenticated user |
| Model | actual successful Gemini model(s) |
| ApiVersion | actual successful API version(s) |
| PromptVersion | report-prompt contract version |
| TemplateDocID | template used |
| ReadinessWarnings | JSON list of warnings present at generation |
| Status | lightweight evidence state; initially `generated` |

This is an evidence registry, not a report workflow engine.

## Readiness

`getReportReadiness` separates two kinds of conditions.

### Configuration blockers

Generation cannot proceed when required runtime configuration is missing:

- Gemini API Key
- Template Google Doc ID
- Report folder ID

### Event-data warnings

Warnings are advisory:

- verification blank/pending
- investigation criteria blank/pending
- exact criteria `เข้าเกณฑ์` with no investigation date
- missing Event narrative/details
- missing recorded risk assessment

If warnings exist, the user must explicitly confirm that they want to create a preliminary report with incomplete data.

The warnings are then persisted with the generated ReportRegistry record.

## AI provenance

Report generation records the model/API version that actually produced successful output.

This matters because Gemini fallback can choose a different model from the initially resolved candidate.

P5 therefore returns provenance from each successful `callGeminiForReport_` call and stores the unique models/API versions used.

No API key or secret is stored in ReportRegistry.

## Prompt governance

The prompt explicitly instructs the AI to:

- preserve the Event type recorded by the SRRT team;
- preserve investigation criteria recorded by the SRRT team;
- preserve the recorded risk level;
- state when a value is not recorded;
- avoid independently raising/lowering risk;
- avoid independently declaring a case/cluster/outbreak classification;
- distinguish recorded facts from proposed actions.

AI may still:

- structure narrative text;
- summarize source facts;
- describe limitations;
- propose practical follow-up measures.

## Event → Report linkage

`listReportsForEvent(sessionToken, eventId)` provides authenticated traceability from an Event to every registered generated report.

The Reporter UI includes a **รายงานเดิม** action showing:

- generation time/user
- model
- prompt version
- readiness warnings
- Google Docs link

## Deliberate non-goals

P5 does not add:

- report approval
- review queue
- e-signature
- report version tree
- automatic rewriting of Event fields from AI output
- AI classification as canonical data

Those remain outside the approved scope.
