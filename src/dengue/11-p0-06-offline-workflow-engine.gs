/**
 * P0-06 Dengue 3-3-1 workflow core — OFFLINE/SYNTHETIC ONLY.
 *
 * Consume complete pre-supplied synthetic snapshots, never Google Sheet rows
 * sourced from a real user or a public RPC. No server-origin attestation,
 * authentication, persistence, SLA policy, Gemini, logging or PHI projection.
 * This file is deliberately UNREGISTERED in tools/native-sources.mjs.
 *
 * Dependencies: 00-g1a-foundation.gs and 07-p0-02a-mvp-schema-contract.gs.
 * Five domain tabs only; ledger/grant issuance is a different, gated layer.
 */
var D331_P006_MAX_ROWS_ = 500;
var D331_P006_TABLES_ = [
  ['cases','DengueCases','CaseID'],
  ['plans','DenguePlans','PlanID'],
  ['actions','DengueControlActions','ActionID'],
  ['surveys','DengueEntomology','SurveyID'],
  ['followups','DengueFollowups','FollowupID']
];

function d331P006Deny_() { throw new Error('D331_P006_WORKFLOW_DENIED'); }

function d331P006Rows_(snapshot,key,sheet,idColumn,eventId) {
  if (!Object.prototype.hasOwnProperty.call(snapshot,key) ||
      !Array.isArray(snapshot[key]) || snapshot[key].length > D331_P006_MAX_ROWS_)
    d331P006Deny_();
  var fields=d331P002aHeaders_(sheet),index=Object.create(null);
  var mapped=snapshot[key].map(function(raw){
    try { d331P002aValidateSyntheticRow_(sheet,raw); }
    catch (ignored) { d331P006Deny_(); }
    var obj=Object.create(null);
    fields.forEach(function(field,i){obj[field]=raw[i];});
    if (obj.EventID!==eventId ||
        Object.prototype.hasOwnProperty.call(index,obj[idColumn])) d331P006Deny_();
    index[obj[idColumn]]=obj;
    return obj;
  });
  return {rows:mapped,index:index};
}

function d331P006Metric_(inspected,positive){
  // Empty denominators are UNKNOWN, never a percentage of zero.
  var pair=d331CountPair_(inspected,positive);
  return pair.percent===null?null:pair.percent;
}

function d331P006EvaluateOffline_(snapshot) {
  if (!snapshot || typeof snapshot!=='object' || Array.isArray(snapshot) ||
      Object.keys(snapshot).some(function(k){
        return ['schemaVersion','eventId','areaId','cases','plans',
          'actions','surveys','followups'].indexOf(k)<0;
      }) || snapshot.schemaVersion!==2 || D331_P002A_SCHEMA_VERSION_!==2 ||
      !d331IsUuid_(snapshot.eventId) ||
      snapshot.eventId!==snapshot.eventId.toLowerCase() ||
      typeof snapshot.areaId!=='string' || !snapshot.areaId ||
      snapshot.areaId!==snapshot.areaId.trim()) d331P006Deny_();

  var records=Object.create(null);
  D331_P006_TABLES_.forEach(function(def){
    records[def[0]]=d331P006Rows_(
      snapshot,def[0],def[1],def[2],snapshot.eventId);
  });

  var cases=records.cases.index;
  var plans=records.plans.index;
  var actions=records.actions.index;
  var surveys=records.surveys.index;

  records.plans.rows.forEach(function(plan){
    var trigger=cases[plan.TriggerCaseID];
    if (!trigger || plan.AreaID!==snapshot.areaId ||
        (trigger.CaseStatus==='VOID'&&plan.PlanStatus==='OPEN'))
      d331P006Deny_();
  });
  records.actions.rows.forEach(function(action){
    var plan=plans[action.PlanID];
    if (!plan || plan.AreaID!==snapshot.areaId ||
        action.AreaID!==plan.AreaID) d331P006Deny_();
  });
  records.surveys.rows.forEach(function(survey){
    var plan=plans[survey.PlanID];
    if (!plan || plan.AreaID!==snapshot.areaId ||
        survey.AreaID!==plan.AreaID) d331P006Deny_();
  });
  records.followups.rows.forEach(function(followup){
    var plan=plans[followup.PlanID];
    if (!plan || plan.AreaID!==snapshot.areaId) d331P006Deny_();
    if (followup.LinkedActionID) {
      var action=actions[followup.LinkedActionID];
      if (!action || action.PlanID!==followup.PlanID)
        d331P006Deny_();
    }
    if (followup.LinkedSurveyID) {
      var survey=surveys[followup.LinkedSurveyID];
      if (!survey || survey.PlanID!==followup.PlanID)
        d331P006Deny_();
    }
  });

  var metrics=records.surveys.rows.map(function(survey){
    return {
      checkpoint:survey.CheckpointKey,
      scope:survey.ScopeCode,
      hiPercent:d331P006Metric_(survey.HousesInspected,survey.HousesPositive),
      ciPercent:d331P006Metric_(survey.ContainersInspected,survey.ContainersPositive)
    };
  });

  // Safe synthetic workflow summary only: no identifiers or personal details.
  // No 3-3-1 clock, target or on-time judgment without approved policy.
  return {
    status:'SYNTHETIC_WORKFLOW_ONLY',
    canWrite:false,
    canEnable:false,
    clinicalPolicyApproved:false,
    counts:{
      cases:records.cases.rows.length,
      plans:records.plans.rows.length,
      actions:records.actions.rows.length,
      surveys:records.surveys.rows.length,
      followups:records.followups.rows.length
    },
    surveyMetrics:metrics,
    slaAssessment:'NOT_EVALUATED'
  };
}
