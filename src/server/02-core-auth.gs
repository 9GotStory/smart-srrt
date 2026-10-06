function getDb_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('DATABASE_SPREADSHEET_ID');
  if (!id) {
    var active = SpreadsheetApp.getActiveSpreadsheet();
    if (!active) throw new Error('ยังไม่ได้ตั้งค่า DATABASE_SPREADSHEET_ID กรุณา Run installSmartSRRT() ก่อน');
    id = active.getId();
    props.setProperty('DATABASE_SPREADSHEET_ID', id);
  }
  return SpreadsheetApp.openById(id);
}

function getSheet_(name) {
  var ss = getDb_();
  var sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error('ไม่พบชีท: ' + name + ' กรุณา Run setupDatabase()');
  return sheet;
}

function getSheetByIdOrName_(settingKey, fallbackName) {
  var ss = getDb_();
  var setting = getSettingsMap_();
  var sheetId = setting[settingKey];
  if (sheetId) {
    var sheets = ss.getSheets();
    for (var i=0; i<sheets.length; i++) {
      if (String(sheets[i].getSheetId()) === String(sheetId)) return sheets[i];
    }
  }
  return ss.getSheetByName(fallbackName);
}

function getSettingsMap_() {
  var sheet = getSheet_(CONFIG.SHEETS.SETTINGS);
  var values = sheet.getDataRange().getValues();
  var map = {};
  values.slice(1).forEach(function(r) { if (r[0]) map[String(r[0])] = r[1]; });
  return map;
}

function getPublicSettings_(settings) {
  settings = settings || {};
  var keys = ['APP_NAME','APP_SUBTITLE','ORG_NAME','CONTACT_INFO','LOGO_URL','BANNER_TEXT','PRIMARY_COLOR','SECONDARY_COLOR','SYSTEM_STATUS','ALLOW_SELF_REGISTER','INSTALL_VERSION'];
  var out = {};
  keys.forEach(function(k){ if (settings[k] !== undefined) out[k] = settings[k]; });
  return out;
}

function keyValueMap_(values, keyIndex, valueIndex) {
  var map = {};
  values.slice(1).forEach(function(r) { if (r[keyIndex]) map[String(r[keyIndex])] = r[valueIndex]; });
  return map;
}

function hashPassword_(plain) {
  var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(plain), Utilities.Charset.UTF_8);
  return raw.map(function(b){ var v = (b < 0 ? b + 256 : b).toString(16); return v.length === 1 ? '0' + v : v; }).join('');
}

function getCurrentUserHint_() {
  return Session.getActiveUser().getEmail() || 'anonymous';
}

function hasPermission_(role, action) {
  var permissions = {
    'Super Admin': ['view','create','edit','delete','report','users','settings','master','audit','export','approve'],
    'Manager': ['view','create','edit','delete','report','users','settings','master','audit','export','approve'],
    'Admin': ['view','create','edit','report','export'],
    'Staff': ['view','export']
  };
  return (permissions[role] || []).indexOf(action) >= 0;
}

function requireAuth_(sessionToken, action) {
  var user = getUserByToken_(sessionToken);
  if (!user || user.status !== 'active') throw new Error('กรุณาเข้าสู่ระบบ หรือบัญชียังไม่ผ่านการอนุมัติ');
  if (action && !hasPermission_(user.role, action)) throw new Error('สิทธิ์ไม่เพียงพอสำหรับการทำรายการนี้');
  if (['create','edit','delete','report'].indexOf(action) >= 0) {
    var systemStatus = String(getSettingsMap_().SYSTEM_STATUS || 'open').toLowerCase();
    if (systemStatus === 'closed') throw new Error('ระบบถูกปิดการบันทึก/แก้ไขชั่วคราวโดยผู้ดูแลระบบ');
  }
  return user;
}

function makeSessionToken_(email) {
  var token = Utilities.getUuid() + '.' + Utilities.getUuid();
  CacheService.getScriptCache().put('srrt_session_' + token, email, 21600);
  return token;
}

function findUserById_(userId) {
  userId = String(userId || '').trim();
  if (!userId) return null;
  var values = getSheet_(CONFIG.SHEETS.USERS).getDataRange().getValues();
  for (var i=1; i<values.length; i++) {
    if (String(values[i][0]) === userId) {
      return {
        rowNumber: i + 1,
        userId: values[i][0],
        name: values[i][1],
        email: values[i][2],
        passwordHash: values[i][3],
        role: values[i][4],
        status: values[i][5],
        org: values[i][6],
        tambon: values[i][7],
        amphoe: values[i][8],
        province: values[i][9]
      };
    }
  }
  return null;
}

function getUserByToken_(token) {
  if (!token) return null;
  var email = CacheService.getScriptCache().get('srrt_session_' + token);
  if (!email) return null;
  return findUserByEmail_(email);
}

function findUserByEmail_(email) {
  var sheet = getSheet_(CONFIG.SHEETS.USERS);
  var values = sheet.getDataRange().getValues();
  for (var i=1; i<values.length; i++) {
    if (String(values[i][2]).toLowerCase() === String(email).toLowerCase()) {
      return {
        rowNumber: i + 1,
        userId: values[i][0],
        name: values[i][1],
        email: values[i][2],
        passwordHash: values[i][3],
        role: values[i][4],
        status: values[i][5],
        org: values[i][6],
        tambon: values[i][7],
        amphoe: values[i][8],
        province: values[i][9]
      };
    }
  }
  return null;
}

function login(payload) {
  var email = String(payload.email || '').trim().toLowerCase();
  var password = String(payload.password || '');
  var user = findUserByEmail_(email);
  if (!user || user.passwordHash !== hashPassword_(password)) return {ok:false, message:'อีเมลหรือรหัสผ่านไม่ถูกต้อง'};
  if (user.status !== 'active') return {ok:false, message:'บัญชียังไม่พร้อมใช้งาน สถานะ: ' + user.status};
  var token = makeSessionToken_(email);
  getSheet_(CONFIG.SHEETS.USERS).getRange(user.rowNumber, 14).setValue(new Date());
  writeAudit_(user, 'LOGIN', CONFIG.SHEETS.USERS, user.userId, '', 'เข้าสู่ระบบ');
  return {ok:true, token:token, user: publicUser_(user)};
}

function logout(sessionToken) {
  CacheService.getScriptCache().remove('srrt_session_' + sessionToken);
  return true;
}

function registerUser(payload) {
  var settings = getSettingsMap_();
  if (String(settings.ALLOW_SELF_REGISTER).toLowerCase() !== 'true') throw new Error('ระบบปิดการสมัครผู้ใช้ใหม่');
  var email = String(payload.email || '').trim().toLowerCase();
  if (!email || !payload.password || !payload.name) throw new Error('กรุณากรอกชื่อ อีเมล และรหัสผ่าน');
  if (String(payload.password).length < 4) throw new Error('รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร');
  if (findUserByEmail_(email)) throw new Error('อีเมลนี้มีในระบบแล้ว');
  getSheet_(CONFIG.SHEETS.USERS).appendRow([
    Utilities.getUuid(), payload.name, email, hashPassword_(payload.password), CONFIG.ROLES.STAFF, 'pending', payload.org || '', payload.tambon || '', payload.amphoe || '', payload.province || '', new Date(), '', '', ''
  ]);
  writeAudit_({email:email, role:'SelfRegister'}, 'REGISTER', CONFIG.SHEETS.USERS, email, '', 'สมัครผู้ใช้ใหม่');
  return 'สมัครใช้งานเรียบร้อยแล้ว รอผู้ดูแลระบบอนุมัติ';
}

function publicUser_(u) {
  return {userId:u.userId, name:u.name, email:u.email, role:u.role, status:u.status, org:u.org, tambon:u.tambon, amphoe:u.amphoe, province:u.province};
}

