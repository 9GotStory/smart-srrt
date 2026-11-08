/** F03 Plans workflow. SOURCE ONLY, unregistered; no live authority or grants. */
var D331_F03_ENABLED_ = false;
var D331_F03_SCOPE_APPROVED_ = false;
function d331F03Ready_(){
  if(D331_F03_ENABLED_!==true||D331_F03_SCOPE_APPROVED_!==true||
     [typeof d331P007Authorize_,typeof d331P003bAuthorizedContext_,
      typeof d331P003bPlanOwner_,typeof d331P003bPlanAssignmentActor_,
      typeof d331P007WriteStatus_,typeof d331P007Operate_,typeof hasPermission_]
      .some(function(t){return t!=='function';}))throw new Error('D331_UNAVAILABLE');
  d331P007RequireReady_();
}
function d331F03Selection_(eventId,selection){
  if(!d331P007Id_(eventId)||!selection||typeof selection!=='object'||Array.isArray(selection)||
     Object.keys(selection).sort().join('|')!=='caseId|expectedCaseRevision|expectedEventRevision'||
     !d331P007Id_(selection.caseId)||!Number.isSafeInteger(selection.expectedCaseRevision)||
     selection.expectedCaseRevision<1||!Number.isSafeInteger(selection.expectedEventRevision)||
     selection.expectedEventRevision<1)d331P007Deny_();
}
function d331F03Parent_(tables,eventId,selection){
  var raw=d331P003bOneRowById_(tables.DengueCases,1,16,selection.caseId,D331_P007_LIMIT_);
  var row=d331P005DecodeCaseRow_(tables.DengueCases,raw);
  if(row[1]!==eventId||row[2]!==selection.expectedCaseRevision)d331P007Deny_();
  return row;
}

function d331F03List_(sessionToken,eventId,selection){
  d331F03Ready_();d331F03Selection_(eventId,selection);
  var lock=LockService.getScriptLock(),acquired=false;
  try{
    if(!lock||!lock.tryLock(15000))d331P007Deny_();acquired=true;
    var ctx=d331P003bAuthorizedContext_(sessionToken,eventId,'dengue.plan.read');
    if(ctx.recordStatus!=='active'||ctx.revision!==selection.expectedEventRevision)d331P007Deny_();
    var parent=d331F03Parent_(ctx.tables,eventId,selection),sheet=ctx.tables.DenguePlans;
    var count=sheet.getLastRow()-1,ids=Object.create(null),episodes=Object.create(null),plans=[];
    if(!Number.isSafeInteger(count)||count<0||count>D331_P007_LIMIT_)d331P007Deny_();
    // Bounded identifier index only across Events; full rows only for the selected Case.
    var index=count?sheet.getRange(2,1,count,3).getValues():[];
    if(!Array.isArray(index)||index.length!==count)d331P007Deny_();
    index.forEach(function(keys,i){
      if(!Array.isArray(keys)||keys.length!==3||keys.some(function(id){return !d331P007Id_(id);})||ids[keys[0]])d331P007Deny_();
      ids[keys[0]]=true;
      if(keys[1]!==eventId||keys[2]!==selection.caseId)return;
      var raw=sheet.getRange(i+2,1,1,15).getValues();
      if(!Array.isArray(raw)||raw.length!==1||!Array.isArray(raw[0]))d331P007Deny_();
      d331P002aValidateSyntheticRow_('DenguePlans',raw[0]);
      var p=d331P007Object_('DenguePlans',raw[0]);
      if(p.PlanID!==keys[0]||p.EventID!==eventId||p.TriggerCaseID!==selection.caseId||
         p.AreaID!==ctx.areaId||episodes[p.EpisodeKey]||(parent[3]==='VOID'&&p.PlanStatus==='OPEN'))d331P007Deny_();
      episodes[p.EpisodeKey]=true;
      plans.push({planId:p.PlanID,triggerCaseId:p.TriggerCaseID,episodeKey:p.EpisodeKey,
        planRevision:p.PlanRevision,planStatus:p.PlanStatus,responsibleUserId:p.ResponsibleUserID});
    });
    return {contractVersion:'D331_PLAN_LIST_V1',eventId:eventId,revision:ctx.revision,
      caseId:selection.caseId,caseRevision:selection.expectedCaseRevision,areaId:ctx.areaId,plans:plans};
  }finally{if(acquired)lock.releaseLock();}
}
function d331F03Owners_(sessionToken,eventId,selection){
  d331F03Ready_();d331F03Selection_(eventId,selection);
  var lock=LockService.getScriptLock(),acquired=false;
  try{
    if(!lock||!lock.tryLock(15000))d331P007Deny_();acquired=true;
    var ctx=d331P007Authorize_(sessionToken,eventId,D331_P007_KIND_.plan,selection.expectedEventRevision);
    d331F03Parent_(ctx.tables,eventId,selection);d331P003bPlanAssignmentActor_(ctx.user);
    var users=d331P003bReadRows_(ctx.users,14,10000),seen=Object.create(null),owners=[];
    users.forEach(function(user){
      if(typeof user[0]!=='string'||!user[0]||seen[user[0]])d331P007Deny_();seen[user[0]]=true;
      if(user[5]!=='active')return;
      try{owners.push(d331P003bPlanOwner_(ctx.users,ctx.tables.D331AccessGrants,user[0],
        eventId,ctx.auth.areaId,ctx.now));}catch(ignored){} // no current same-scope right: not eligible
    });
    return {contractVersion:'D331_PLAN_OWNERS_V1',eventId:eventId,revision:ctx.auth.revision,
      caseId:selection.caseId,caseRevision:selection.expectedCaseRevision,areaId:ctx.auth.areaId,owners:owners};
  }finally{if(acquired)lock.releaseLock();}
}
function d331F03Save_(sessionToken,eventId,command){
  d331F03Ready_();
  if(!command||typeof command!=='object'||Array.isArray(command)||
     Object.keys(command).some(function(k){return ['mode','requestId','expectedEventRevision',
       'caseId','expectedCaseRevision','payload','entityId','expectedEntityRevision'].indexOf(k)<0;}))d331P007Deny_();
  d331F03Selection_(eventId,{caseId:command.caseId,expectedCaseRevision:command.expectedCaseRevision,
    expectedEventRevision:command.expectedEventRevision});
  if(!command.payload||typeof command.payload!=='object'||Array.isArray(command.payload)||
     Object.keys(command.payload).some(function(k){return typeof command.payload[k]!=='string'||
       command.payload[k].trim()!==command.payload[k]||/^[=+@-]/.test(command.payload[k]);}))d331P007Deny_();
  var input={kind:'plan'};Object.keys(command).forEach(function(k){input[k]=command[k];});
  var value=d331P007Operate_(sessionToken,eventId,input);
  var result={contractVersion:'D331_PLAN_WRITE_V1',eventId:eventId,requestId:command.requestId,
    status:value.status,planId:value.entityId};
  if(value.status!=='REPLAYED')result.revision=value.revision;
  return result;
}
function d331F03Status_(sessionToken,eventId,requestId){
  d331F03Ready_();var value=d331P007WriteStatus_(sessionToken,eventId,requestId,'plan');
  var result={contractVersion:'D331_PLAN_WRITE_RECEIPT_V1',eventId:eventId,requestId:requestId,status:value.status};
  if(value.status==='COMMITTED')result.planId=value.entityId;
  return result;
}
