/**
 * P0-03: synthetic-only composition of existing Smart SRRT Event/Area/Auth
 * contracts with the P0-02A Option A grant-row shape. UNREGISTERED.
 * The injected driver is forgeable: NEVER use this evaluator as live authority.
 * No GAS services, real session token, patient DTO, schema mutation or RPC.
 */
var D331_P003_SOURCE_KIND_ = 'D331_P003_SYNTHETIC_ONLY_V1';
var D331_P003_TARGET_ = 'SYNTHETIC-MEMORY-ONLY';
var D331_P003_DISEASE_ = 'SYNTHETIC_DENGUE_ONLY';
var D331_P003_OPERATIONS_ = ['dengue.case.read','dengue.case.write'];

function d331P003Deny_(){ throw new Error('D331_P003_DENIED'); }
function d331P003RequireSource_(source) {
  var methods=['binding','clock','session','mainHeaders','areaHeaders',
    'grantHeaders','mainRows','areaRows','grantRows','diseasePolicy'];
  if(!source || typeof source!=='object' || source.kind!==D331_P003_SOURCE_KIND_ ||
     methods.some(function(k){return typeof source[k]!=='function';})) d331P003Deny_();
}
function d331P003Request_(req) {
  if(!req || typeof req!=='object' || Array.isArray(req) ||
     Object.keys(req).some(function(k){
       return ['eventId','operation','expectedRevision'].indexOf(k)<0;
     }) || !d331IsUuid_(req.eventId) ||
     req.eventId!==req.eventId.toLowerCase() ||
     D331_P003_OPERATIONS_.indexOf(req.operation)<0) {
    throw new Error('D331_P003_INVALID_REQUEST');
  }
  var write=req.operation==='dengue.case.write';
  if((write && (!Number.isSafeInteger(req.expectedRevision) || req.expectedRevision<1)) ||
     (!write && Object.prototype.hasOwnProperty.call(req,'expectedRevision')))
     throw new Error('D331_P003_INVALID_REQUEST');
  return write;
}
function d331P003Headers_(got,wanted){
  if(!Array.isArray(got)||got.length!==wanted.length||
     got.some(function(h,i){return h!==wanted[i];})) d331P003Deny_();
}
function d331P003Rows_(rows,width,max){
  if(!Array.isArray(rows)||rows.length>max||
     rows.some(function(r){return !Array.isArray(r)||r.length!==width;})) d331P003Deny_();
  return rows;
}
function d331P003Policy_(policy,now) {
  // No field containing real disease labels can qualify in this mock boundary.
  if(!policy||policy.simulationOnly!==true||policy.approved!==true||
     typeof policy.version!=='string'||
     !/^TEST-D331-POLICY-[A-Z0-9-]{1,45}$/.test(policy.version)||
     !Array.isArray(policy.labels)||policy.labels.length!==1||
     policy.labels[0]!==D331_P003_DISEASE_||
     typeof policy.validFrom!=='string'||typeof policy.expiresAt!=='string') d331P003Deny_();
  if(!(d331IsoInstant_(policy.validFrom)<=now &&
       now<d331IsoInstant_(policy.expiresAt))) d331P003Deny_();
  return policy;
}
function d331P003Grant_(grantRows,user,eventId,operation,now,policyVersion){
  var names=d331P002aHeaders_('D331AccessGrants');
  var seenIds=Object.create(null), seenActiveTuples=Object.create(null);
  var matching=[];
  d331P003Rows_(grantRows,names.length,200).forEach(function(row){
    try { d331P002aValidateSyntheticRow_('D331AccessGrants',row); }
    catch(e){ d331P003Deny_(); }
    var grant=Object.create(null);
    names.forEach(function(k,i){grant[k]=row[i];});
    if(seenIds[grant.GrantID]) d331P003Deny_();
    seenIds[grant.GrantID]=true;
    var tuple=JSON.stringify([grant.UserID,grant.Capability,grant.AreaID,grant.EventID]);
    if(grant.State==='ACTIVE'){
      if(seenActiveTuples[tuple]) d331P003Deny_();
      seenActiveTuples[tuple]=true;
    }
    if(grant.UserID===user.userId&&grant.EventID===eventId&&
       grant.Capability===operation&&grant.State==='ACTIVE'){
      matching.push(grant);
    }
  });
  if(matching.length!==1)d331P003Deny_();
  var g=matching[0];
  if(g.PolicyRevision!==policyVersion||g.ApprovedByUserID===g.UserID||
     !(g.ValidFromUTC<=now&&now<g.ExpiresAtUTC)||!g.ApprovedAtUTC||
     !g.IssuedAtUTC||g.RevokedAtUTC||g.RevokedByUserID)d331P003Deny_();
  return g;
}
function d331P003Simulate_(source,request) {
  d331P003RequireSource_(source);
  var write=d331P003Request_(request);
  try {
    var binding=source.binding();
    if(!binding||binding.kind!==D331_P003_SOURCE_KIND_||
       binding.target!==D331_P003_TARGET_)d331P003Deny_();
    var now=d331IsoInstant_(source.clock());
    d331P003Headers_(source.mainHeaders(),D331_N1B2B_MAIN_HEADERS_);
    d331P003Headers_(source.areaHeaders(),D331_N1B2B_AREA_HEADERS_);
    d331P003Headers_(source.grantHeaders(),d331P002aHeaders_('D331AccessGrants'));
    var user=source.session();
    if(!user||user.status!=='active'||typeof user.userId!=='string'||
       !user.userId.trim()||user.userId!==user.userId.trim()) d331P003Deny_();
    var policy=d331P003Policy_(source.diseasePolicy(),now);
    var events=d331P003Rows_(source.mainRows(),39,1000).filter(function(row){
      return row[30]===request.eventId;
    });
    // This does NOT call the legacy first-match findEventRowById_.
    if(events.length!==1||events[0][5]!==D331_P003_DISEASE_) d331P003Deny_();
    var areas=d331P003Rows_(source.areaRows(),10,1000);
    var grant=d331P003Grant_(source.grantRows(),user,request.eventId,
      request.operation,now,policy.version);
    // Reuse existing pure MainData/AreaMaster and EventID/Revision guard.
    var projected=d331N1bAuthorizeOffline_(
      user,events[0],areas,
      {approved:true,userId:grant.UserID,capabilities:[grant.Capability],
       allowedAreaIds:[grant.AreaID],allowedEventIds:[grant.EventID]},
      policy.labels,request.operation,write,
      write?request.expectedRevision:undefined);
    if(projected.areaId!==grant.AreaID)d331P003Deny_();
    // Never an authorization token or patient DTO.
    return {simulationOnly:true,decision:'SIMULATED_ALLOW',
      eventId:projected.eventId,revision:projected.revision,
      areaId:projected.areaId,operation:request.operation,
      mode:write?'write':'read'};
  } catch(e) { d331P003Deny_(); }
}
