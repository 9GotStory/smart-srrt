/**
 * Smart SRRT D331 P0-03B — source-only candidate of DEV read-only GAS adapter.
 * NOT registered in native manifest, NO RPC, NO sheet writes or migrations.
 * FEATURE OFF, no approved DEV ID or disease policy in source by default.
 * Existing Smart SRRT Auth session-v2 semantics are rechecked against pinned DB.
 * `getDb_`, `getSheet_`, `getUserByToken_` and legacy first-hit Event
 * helpers MUST NOT be called here: they can fallback, mutate or be ambiguous.
 */
var D331_P003B_ENABLED_ = false;
var D331_P003B_APPROVED_DEV_SPREADSHEET_ID_ = '';
var D331_P003B_APPROVED_DISEASE_LABELS_ = [];
var D331_P003B_APPROVED_POLICY_REVISION_ = '';
var D331_P003B_USER_HEADERS_ = [
  'UserID','ชื่อ-สกุล','Email','PasswordHash','Role','Status',
  'หน่วยงาน','ตำบล','อำเภอ','จังหวัด','วันที่ลงทะเบียน',
  'อนุมัติโดย','วันที่อนุมัติ','LastLogin'
];
var D331_P003B_AREA_HEADERS_ = [
  'AreaID','จังหวัด','อำเภอ','ตำบล','หมู่','ชื่อหมู่บ้าน',
  'รหัสหมู่บ้าน','Active','UpdatedAt','UpdatedBy'
];

function d331P003bDeny_() { throw new Error('D331_UNAVAILABLE'); }
function d331P003bGetRequiredSheet_(ss,name,headers) {
  var sheet=ss.getSheetByName(name);
  if (!sheet || sheet.getLastColumn()!==headers.length ||
      sheet.getLastRow()<1) d331P003bDeny_();
  var raw=sheet.getRange(1,1,1,headers.length).getValues();
  if (!Array.isArray(raw)||raw.length!==1||!Array.isArray(raw[0])||
      raw[0].length!==headers.length ||
      raw[0].some(function(h,i){return h!==headers[i];})) d331P003bDeny_();
  return sheet;
}
function d331P003bReadRows_(sheet,width,maximum) {
  var count=sheet.getLastRow()-1;
  if (count<0||count>maximum)d331P003bDeny_();
  if (!count) return [];
  var rows=sheet.getRange(2,1,count,width).getValues();
  if (!Array.isArray(rows)||rows.length!==count||
      rows.some(function(row){return !Array.isArray(row)||row.length!==width;}))
    d331P003bDeny_();
  return rows;
}
function d331P003bOneRowById_(sheet,idCol,width,id,maxRows) {
  var count=sheet.getLastRow()-1;
  if (count<1||count>maxRows)d331P003bDeny_();
  var ids=sheet.getRange(2,idCol,count,1).getValues();
  if (!Array.isArray(ids)||ids.length!==count)d331P003bDeny_();
  var index=-1;
  ids.forEach(function(value,i){
    if (!Array.isArray(value)||value.length!==1)d331P003bDeny_();
    if (value[0]===id) {
      if (index!==-1)d331P003bDeny_();
      index=i;
    }
  });
  if (index<0)d331P003bDeny_();
  var values=sheet.getRange(index+2,1,1,width).getValues();
  if (!Array.isArray(values)||values.length!==1||
      !Array.isArray(values[0])||values[0].length!==width||
      values[0][idCol-1]!==id) d331P003bDeny_();
  return values[0];
}
function d331P003bSessionUser_(sessionToken,userSheet) {
  // Cache session-v2 verifier tag; never trust a client role or userId.
  if (typeof sessionToken!=='string'||
      !/^[0-9a-f-]{36}\.[0-9a-f-]{36}$/i.test(sessionToken))d331P003bDeny_();
  var encoded=CacheService.getScriptCache().get('srrt_session_'+sessionToken);
  if (typeof encoded!=='string'||!encoded)d331P003bDeny_();
  var session;
  try {session=JSON.parse(encoded);} catch(e){d331P003bDeny_();}
  if (!session||session.v!==2||typeof session.id!=='string'||
      !session.id||session.id!==session.id.trim()||
      typeof session.tag!=='string'||!/^[a-f0-9]{64}$/.test(session.tag))
    d331P003bDeny_();
  // Exact matching unique UserID, no first-match helper / mutating getDb_.
  var user=d331P003bOneRowById_(userSheet,1,14,session.id,10000);
  if (user[5]!=='active'||typeof user[3]!=='string'||!user[3]||
      !passwordConstantEqual_(session.tag,sessionCredentialTag_(user[3])))
    d331P003bDeny_();
  return {userId:user[0],status:user[5]}; // no password hash escapes
}
function d331P003bGrant_(sheet,userId,eventId,operation,now,policyRevision) {
  var headers=d331P002aHeaders_('D331AccessGrants');
  var rows=d331P003bReadRows_(sheet,headers.length,2000);
  var ids=Object.create(null),tuples=Object.create(null),matches=[];
  rows.forEach(function(row){
    // Invalid authority rows fail closed, even if not the requested recipient.
    d331P002aValidateSyntheticRow_('D331AccessGrants',row);
    var grant=Object.create(null);
    headers.forEach(function(h,i){grant[h]=row[i];});
    if (Object.prototype.hasOwnProperty.call(ids,grant.GrantID))d331P003bDeny_();
    ids[grant.GrantID]=true;
    if (grant.State==='ACTIVE') {
      var key=JSON.stringify([grant.UserID,grant.Capability,grant.AreaID,grant.EventID]);
      if(Object.prototype.hasOwnProperty.call(tuples,key))d331P003bDeny_();
      tuples[key]=true;
    }
    if (grant.State==='ACTIVE'&&grant.UserID===userId&&
        grant.EventID===eventId&&grant.Capability===operation) matches.push(grant);
  });
  if(matches.length!==1)d331P003bDeny_();
  var g=matches[0];
  if (g.PolicyRevision!==policyRevision||
      g.ApprovedByUserID===g.UserID||
      g.ValidFromUTC>now||now>=g.ExpiresAtUTC||
      g.ApprovedAtUTC>now||g.IssuedAtUTC>now||
      g.RevokedAtUTC||g.RevokedByUserID)d331P003bDeny_();
  return g;
}
function d331P003bReadOnly_(sessionToken,eventId) {
  // A future source change + binding/clinical/access review is mandatory.
  // A browser cannot turn the hard-coded feature OFF to ON.
  if (D331_G1A_ENABLED!==true||D331_P003B_ENABLED_!==true)
    d331P003bDeny_();
  try {
    if (typeof eventId!=='string'||!d331IsUuid_(eventId)||
        eventId!==eventId.toLowerCase())d331P003bDeny_();
    var expectedId=D331_P003B_APPROVED_DEV_SPREADSHEET_ID_;
    if (typeof expectedId!=='string'||!/^[A-Za-z0-9_-]{20,160}$/.test(expectedId)||
        !Array.isArray(D331_P003B_APPROVED_DISEASE_LABELS_)||
        D331_P003B_APPROVED_DISEASE_LABELS_.length<1||
        !D331_P003B_APPROVED_POLICY_REVISION_)d331P003bDeny_();
    // No fallback and NO PropertiesService.setProperty.
    var configured=PropertiesService.getScriptProperties()
      .getProperty('DATABASE_SPREADSHEET_ID');
    if (configured!==expectedId)d331P003bDeny_();
    var ss=SpreadsheetApp.openById(expectedId);
    if (!ss||ss.getId()!==expectedId)d331P003bDeny_();

    // Assert all critical headers before reading any event or user rows.
    var main=d331P003bGetRequiredSheet_(ss,'MainData',
      MAIN_HEADERS.concat(EVENT_META_HEADERS,[EVENT_OWNER_HEADER]));
    var users=d331P003bGetRequiredSheet_(ss,'UserAccounts',D331_P003B_USER_HEADERS_);
    var areas=d331P003bGetRequiredSheet_(ss,'AreaMaster',D331_P003B_AREA_HEADERS_);
    // Validate all seven real D331 v2 sheet headers before using any data.
    // Six domain tables remain unread: grant table is the sole D331 data
    // source of this disabled read-only authorization path.
    var d331Sheets=d331P005RequireSevenSheets_(ss);
    var grants=d331Sheets.D331AccessGrants;

    var user=d331P003bSessionUser_(sessionToken,users);
    var mainRow=d331P003bOneRowById_(main,31,39,eventId,100000);
    var areaRows=d331P003bReadRows_(areas,10,10000);
    var now=new Date().toISOString();
    var grant=d331P003bGrant_(grants,user.userId,eventId,
      'dengue.case.read',now,D331_P003B_APPROVED_POLICY_REVISION_);

    // Existing pure Domain and Event/Area authorization guards.
    var allowed=d331N1bAuthorizeOffline_(user,mainRow,areaRows,
      {approved:true,userId:grant.UserID,
       capabilities:[grant.Capability],allowedAreaIds:[grant.AreaID],
       allowedEventIds:[grant.EventID]},
      D331_P003B_APPROVED_DISEASE_LABELS_,
      'dengue.case.read',false,undefined);
    if (allowed.areaId!==grant.AreaID)d331P003bDeny_();
    return {eventId:allowed.eventId,revision:allowed.revision,
      areaId:allowed.areaId,mode:'read'};
  } catch(e) {d331P003bDeny_();}
}
