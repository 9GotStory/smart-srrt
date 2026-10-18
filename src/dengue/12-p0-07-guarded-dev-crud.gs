/**
 * P0-07 — DEV-only guarded five-domain Apps Script CRUD candidate.
 * SOURCE-ONLY, NOT registered in native-sources.mjs. NO PUBLIC RPC.
 * Default OFF; pin existing spreadsheet, clinical labels and policy separately.
 * No hard delete or automatic 3-3-1 clinical clock judgments.
 *
 * Writes are journaled PENDING -> domain -> COMMITTED under ScriptLock.
 * Sheets are not transactional: interrupted PENDING is deliberately a HOLD,
 * NOT an automatic retry or duplicate write. Manual reconciliation required.
 */
var D331_P007_ENABLED_ = false;
var D331_P007_LIMIT_ = 500;
var D331_P007_KIND_ = {
  case: {
    sheet:'DengueCases',id:'CaseID',rev:'CaseRevision',status:'CaseStatus',
    entity:'CASE', capability:'dengue.case.write',
    create:['Classification','OnsetLocalDate','ReportingUnit','ReceivingUnit'],
    update:['Classification','OnsetLocalDate','ReportingUnit','ReceivingUnit','CaseStatus'],
    initial:'ACTIVE',terminal:['VOID']
  },
  plan: {
    sheet:'DenguePlans',id:'PlanID',rev:'PlanRevision',status:'PlanStatus',
    entity:'PLAN',capability:'dengue.plan.write',
    create:['TriggerCaseID','EpisodeKey'],
    update:['PlanStatus'],initial:'OPEN',terminal:['CLOSED','VOID']
  },
  action: {
    sheet:'DengueControlActions',id:'ActionID',rev:'ActionRevision',
    status:'ActionStatus',entity:'ACTION',capability:'dengue.action.write',
    create:['PlanID','StageKey','ActivityType','ScopeCode'],
    update:['ActionStatus','OutcomeCode'],initial:'PLANNED',
    terminal:['COMPLETED','CANCELLED']
  },
  survey: {
    sheet:'DengueEntomology',id:'SurveyID',rev:'SurveyRevision',
    status:'SurveyStatus',entity:'SURVEY',capability:'dengue.survey.write',
    create:['PlanID','CheckpointKey','ScopeCode','HousesInspected',
      'HousesPositive','ContainersInspected','ContainersPositive'],
    update:['SurveyStatus','HousesInspected','HousesPositive',
      'ContainersInspected','ContainersPositive'],
    initial:'DRAFT',terminal:['FINAL','VOID']
  },
  followup: {
    sheet:'DengueFollowups',id:'FollowupID',rev:'FollowupRevision',
    status:'FollowupStatus',entity:'FOLLOWUP',capability:'dengue.followup.write',
    create:['PlanID','CheckpointKey','DueAtUTC','LinkedActionID','LinkedSurveyID'],
    update:['FollowupStatus','OutcomeCode','LinkedActionID','LinkedSurveyID'],
    initial:'PENDING',terminal:['COMPLETE','SKIPPED']
  }
};
var D331_P007_NEXT_ = {
  case:{ACTIVE:['VOID']},
  plan:{OPEN:['CLOSED','VOID']},
  action:{PLANNED:['IN_PROGRESS','COMPLETED','CANCELLED'],
    IN_PROGRESS:['COMPLETED','CANCELLED']},
  survey:{DRAFT:['FINAL','VOID']},
  followup:{PENDING:['IN_PROGRESS','COMPLETE','SKIPPED'],
    IN_PROGRESS:['COMPLETE','SKIPPED']}
};

function d331P007Deny_(){ throw new Error('D331_WRITE_UNAVAILABLE'); }
function d331P007Id_(value){
  return typeof value==='string'&&d331IsUuid_(value)&&value===value.toLowerCase();
}
function d331P007Payload_(payload,allowed){
  if(!payload||typeof payload!=='object'||Array.isArray(payload))d331P007Deny_();
  var keys=Object.keys(payload);
  if(!keys.length||keys.some(function(k){return allowed.indexOf(k)<0;}))
    d331P007Deny_();
  keys.forEach(function(k){
    var v=payload[k];
    // Formulas and coercion prefixes are never accepted as text in Sheets.
    if(typeof v==='string' && /^[=+@]/.test(v))d331P007Deny_();
    if(v===null||v===undefined||typeof v==='object')d331P007Deny_();
  });
  return keys;
}
function d331P007Command_(eventId,command){
  if(!d331P007Id_(eventId)||!command||
      typeof command!=='object'||Array.isArray(command))d331P007Deny_();
  var allowedTop=['kind','mode','requestId','expectedEventRevision','payload',
    'entityId','expectedEntityRevision'];
  if(Object.keys(command).some(function(k){return allowedTop.indexOf(k)<0;}))
    d331P007Deny_();
  if(!Object.prototype.hasOwnProperty.call(D331_P007_KIND_,command.kind)||
      (command.mode!=='create'&&command.mode!=='update')||
      !d331P007Id_(command.requestId)||
      !Number.isSafeInteger(command.expectedEventRevision)||
      command.expectedEventRevision<1)d331P007Deny_();
  var spec=D331_P007_KIND_[command.kind];
  if(command.mode==='create'){
    if(command.entityId!==undefined||command.expectedEntityRevision!==undefined)
      d331P007Deny_();
    d331P007Payload_(command.payload,spec.create);
  } else {
    if(!d331P007Id_(command.entityId)||
       !Number.isSafeInteger(command.expectedEntityRevision)||
       command.expectedEntityRevision<1)d331P007Deny_();
    d331P007Payload_(command.payload,spec.update);
  }
  return spec;
}
function d331P007Object_(sheet,row){
  var names=d331P002aHeaders_(sheet),obj=Object.create(null);
  names.forEach(function(n,i){obj[n]=row[i];});
  return obj;
}
function d331P007Row_(sheet,obj){
  return d331P002aHeaders_(sheet).map(function(k){
    return Object.prototype.hasOwnProperty.call(obj,k)?obj[k]:'';
  });
}
function d331P007Read_(sheet,sheetName){
  var rows=d331P003bReadRows_(sheet,d331P002aHeaders_(sheetName).length,
    D331_P007_LIMIT_);
  rows.forEach(function(row){
    try{d331P002aValidateSyntheticRow_(sheetName,row);}
    catch(e){d331P007Deny_();}
  });
  return rows;
}
function d331P007Digest_(canonical){
  var bytes=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,
    canonical,Utilities.Charset.UTF_8);
  if(!Array.isArray(bytes)||bytes.length!==32)d331P007Deny_();
  return bytes.map(function(b){return ('0'+(b&255).toString(16)).slice(-2);}).join('');
}
function d331P007MutateRow_(spec,command,previous,userId,eventId,areaId,now){
  var row=Object.create(null);
  var mode=command.mode;
  if(mode==='update'){
    if(!previous||previous[spec.rev]!==command.expectedEntityRevision||
       spec.terminal.indexOf(previous[spec.status])>=0)d331P007Deny_();
    Object.keys(previous).forEach(function(k){row[k]=previous[k];});
  } else {
    row[spec.id]=String(Utilities.getUuid()).toLowerCase();
    if(!d331P007Id_(row[spec.id]))d331P007Deny_();
    row.EventID=eventId;
    row[spec.status]=spec.initial;
    row[spec.rev]=0;
    if(spec.sheet==='DengueCases'){
      row.CreatedAtUTC=now; row.CreatedByUserID=userId;
    }
    if(spec.sheet==='DenguePlans'){
      row.AreaID=areaId;row.CreatedAtUTC=now;row.CreatedByUserID=userId;
      row.ResponsibleUserID=userId;
      row.PolicyVersion=D331_P003B_APPROVED_POLICY_REVISION_;
    }
    if(spec.sheet==='DengueControlActions'){
      row.AreaID=areaId;row.RecordedAtUTC=now;row.RecordedByUserID=userId;
      row.ResponsibleUserID=userId;
    }
    if(spec.sheet==='DengueEntomology'){
      row.AreaID=areaId;row.SurveyorUserID=userId;row.RecordedAtUTC=now;
    }
    if(spec.sheet==='DengueFollowups'){
      row.ResponsibleUserID=userId;row.RecordedAtUTC=now;
    }
  }
  Object.keys(command.payload).forEach(function(k){row[k]=command.payload[k];});
  if(mode==='update'){
    var next=row[spec.status],before=previous[spec.status];
    if(next!==before &&
       (!D331_P007_NEXT_[command.kind][before]||
        D331_P007_NEXT_[command.kind][before].indexOf(next)<0))
      d331P007Deny_();
    if(spec.sheet==='DengueControlActions'&&next==='COMPLETED'&&
       before!=='COMPLETED')row.CompletedAtUTC=now;
    if(spec.sheet==='DengueEntomology'&&next==='FINAL'&&
       before!=='FINAL')row.SurveyedAtUTC=now;
    if(spec.sheet==='DengueFollowups'&&next==='COMPLETE'&&
       before!=='COMPLETE')row.CompletedAtUTC=now;
  }
  row[spec.rev]++;
  if(Object.prototype.hasOwnProperty.call(row,'UpdatedAtUTC'))row.UpdatedAtUTC=now;
  if(Object.prototype.hasOwnProperty.call(row,'UpdatedByUserID'))row.UpdatedByUserID=userId;
  row.LastMutationID=command.requestId;
  var result=d331P007Row_(spec.sheet,row);
  try{d331P002aValidateSyntheticRow_(spec.sheet,result);}
  catch(e){d331P007Deny_();}
  return {id:row[spec.id],revision:row[spec.rev],row:result};
}
function d331P007Prospective_(all,spec,targetRow,mode,existingIndex,eventId,areaId){
  var groups={DengueCases:'cases',DenguePlans:'plans',
    DengueControlActions:'actions',DengueEntomology:'surveys',
    DengueFollowups:'followups'};
  var snap={schemaVersion:2,eventId:eventId,areaId:areaId};
  Object.keys(groups).forEach(function(sheet){
    var allRows=all[sheet],key=groups[sheet];
    snap[key]=allRows.filter(function(row){return row[1]===eventId;}).map(function(r){
      return r.slice();
    });
    if(sheet===spec.sheet){
      if(mode==='create')snap[key].push(targetRow.slice());
      else snap[key][existingIndex]=targetRow.slice();
    }
  });
  try{ d331P006EvaluateOffline_(snap); }
  catch(e){d331P007Deny_();}
}

function d331P007Operate_(sessionToken,eventId,command){
  // Every dependent gate is disabled in the canonical source and must be
  // separately approved for real Development execution.
  if(D331_G1A_ENABLED!==true || D331_P003B_ENABLED_!==true ||
     D331_P007_ENABLED_!==true)d331P007Deny_();
  var spec=d331P007Command_(eventId,command);
  var lock=null,acquired=false;
  try{
    var expectedId=D331_P003B_APPROVED_DEV_SPREADSHEET_ID_;
    if(typeof expectedId!=='string'||!/^[A-Za-z0-9_-]{20,160}$/.test(expectedId)||
       !Array.isArray(D331_P003B_APPROVED_DISEASE_LABELS_)||
       !D331_P003B_APPROVED_DISEASE_LABELS_.length||
       !D331_P003B_APPROVED_POLICY_REVISION_)d331P007Deny_();
    lock=LockService.getScriptLock();
    if(!lock||!lock.tryLock(15000))d331P007Deny_();
    acquired=true;
    var configured=PropertiesService.getScriptProperties()
      .getProperty('DATABASE_SPREADSHEET_ID');
    if(configured!==expectedId)d331P007Deny_();
    var ss=SpreadsheetApp.openById(expectedId);
    if(!ss||ss.getId()!==expectedId)d331P007Deny_();
    var main=d331P003bGetRequiredSheet_(ss,'MainData',
      MAIN_HEADERS.concat(EVENT_META_HEADERS,[EVENT_OWNER_HEADER]));
    var users=d331P003bGetRequiredSheet_(ss,'UserAccounts',D331_P003B_USER_HEADERS_);
    var areas=d331P003bGetRequiredSheet_(ss,'AreaMaster',D331_P003B_AREA_HEADERS_);
    var tables=d331P005RequireSevenSheets_(ss);
    var user=d331P003bSessionUser_(sessionToken,users);
    var event=d331P003bOneRowById_(main,31,39,eventId,100000);
    var areaRows=d331P003bReadRows_(areas,10,10000);
    var now=new Date().toISOString();
    var grant=d331P003bGrant_(tables.D331AccessGrants,user.userId,eventId,
      spec.capability,now,D331_P003B_APPROVED_POLICY_REVISION_);
    var auth=d331N1bAuthorizeOffline_(user,event,areaRows,{
      approved:true,userId:grant.UserID,capabilities:[grant.Capability],
      allowedAreaIds:[grant.AreaID],allowedEventIds:[grant.EventID]
    },D331_P003B_APPROVED_DISEASE_LABELS_,spec.capability,true,
      command.expectedEventRevision);
    if(auth.areaId!==grant.AreaID)d331P007Deny_();

    // Build canonical digest independent of incoming payload key order.
    var keys=Object.keys(command.payload).sort(),pairs=keys.map(function(k){
      return [k,command.payload[k]];
    });
    var digest=d331P007Digest_(JSON.stringify([eventId,user.userId,
      spec.capability,command.mode,command.entityId||'',
      command.expectedEntityRevision||0,command.expectedEventRevision,pairs]));
    var ledgerSheet=tables.DengueRequestLedger;
    var ledgerRows=d331P007Read_(ledgerSheet,'DengueRequestLedger');
    var found=ledgerRows.filter(function(r){return r[0]===command.requestId;});
    if(found.length>1)d331P007Deny_();
    if(found.length===1){
      var saved=d331P007Object_('DengueRequestLedger',found[0]);
      if(saved.EventID!==eventId||saved.PrincipalID!==user.userId||
         saved.Operation!==spec.capability||saved.PayloadDigest!==digest)
        d331P007Deny_();
      if(saved.Phase!=='COMMITTED'||saved.EntityType!==spec.entity||
         !d331P007Id_(saved.EntityID))d331P007Deny_();
      return {status:'REPLAYED',kind:command.kind,entityId:saved.EntityID};
    }

    // Validate all domain records and FK snapshot BEFORE the first write.
    var all=Object.create(null);
    D331_P006_TABLES_.forEach(function(def){
      all[def[1]]=d331P007Read_(tables[def[1]],def[1]);
    });
    var target=all[spec.sheet],existingIndex=-1,previous=null;
    if(command.mode==='update'){
      var headers=d331P002aHeaders_(spec.sheet),col=headers.indexOf(spec.id);
      var matches=target.map(function(r,i){return r[col]===command.entityId?i:-1;})
        .filter(function(i){return i>=0;});
      if(matches.length!==1)d331P007Deny_();
      existingIndex=matches[0];
      previous=d331P007Object_(spec.sheet,target[existingIndex]);
      if(previous.EventID!==eventId)d331P007Deny_();
    }
    var prepared=d331P007MutateRow_(spec,command,previous,
      user.userId,eventId,auth.areaId,now);
    if(command.mode==='create' && target.some(function(row){
      return row[0]===prepared.id;
    }))d331P007Deny_();
    d331P007Prospective_(all,spec,prepared.row,command.mode,
      target.filter(function(r){return r[1]===eventId;})
        .findIndex(function(r){return r[0]===command.entityId;}),
      eventId,auth.areaId);

    var pending=[command.requestId,eventId,user.userId,spec.capability,
      digest,'PENDING','','',now,now];
    try{d331P002aValidateSyntheticRow_('DengueRequestLedger',pending);}
    catch(e){d331P007Deny_();}
    // Intent is persisted FIRST. Any interruption leaves PENDING -> HOLD.
    ledgerSheet.appendRow(pending);
    if(command.mode==='create'){
      tables[spec.sheet].appendRow(prepared.row);
    }else{
      tables[spec.sheet].getRange(existingIndex+2,1,1,prepared.row.length)
        .setValues([prepared.row]);
    }
    var committed=pending.slice();
    committed[5]='COMMITTED';committed[6]=spec.entity;
    committed[7]=prepared.id;committed[9]=new Date().toISOString();
    try{d331P002aValidateSyntheticRow_('DengueRequestLedger',committed);}
    catch(e){d331P007Deny_();}
    // Single-writer ScriptLock protects participating GAS writers; it does not
    // make Sheets a transaction or guard manual spreadsheet edits.
    ledgerSheet.getRange(ledgerSheet.getLastRow(),1,1,committed.length)
      .setValues([committed]);
    return {status:command.mode==='create'?'CREATED':'UPDATED',
      kind:command.kind,entityId:prepared.id,revision:prepared.revision};
  }catch(e){d331P007Deny_();}
  finally{if(acquired)lock.releaseLock();}
}
