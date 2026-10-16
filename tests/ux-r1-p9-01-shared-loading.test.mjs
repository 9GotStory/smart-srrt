// UX-R1/P9-01 Shared Loading Foundation — synthetic browser-only tests.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../src/web/03b-client-core.html',import.meta.url),'utf8');
function fixture(){
  const nodes=new Map(),rpcCalls=[];
  const get=id=>{
    if(!nodes.has(id)){
      const attrs=new Map();
      nodes.set(id,{
        id,disabled:false,hidden:false,isConnected:true,innerHTML:'<i class="icon"></i> เริ่มต้น',
        textContent:'',dataset:{},
        setAttribute(k,v){attrs.set(k,String(v))},
        getAttribute(k){return attrs.get(k)??null},
        removeAttribute(k){attrs.delete(k)}
      });
    }
    return nodes.get(id);
  };
  const context=vm.createContext({
    document:{getElementById:get,addEventListener(){}},
    localStorage:{getItem(){return null}},
    google:{script:{run:new Proxy({}, {get(_target,key){rpcCalls.push(String(key));throw Error('Unexpected RPC')}})}},
    setTimeout(){},console
  });
  new vm.Script(source.replace(/^<script>\s*/,'').replace(/\s*<\/script>\s*$/,''),{filename:'03b-client-core.html'}).runInContext(context);
  const evalIn=expr=>vm.runInContext(expr,context);
  return {context,get,evalIn,rpcCalls};
}
test('P9-01 action synchronously claims button/section, announces loading and rejects duplicates',()=>{
  const h=fixture(),button=h.get('save'),section=h.get('record'),status=h.get('state');
  const first=h.evalIn("uiBeginAction('record:save',{buttonId:'save',sectionId:'record',statusId:'state',pendingText:'กำลังบันทึกข้อมูล...'})");
  assert.ok(first);
  assert.equal(button.disabled,true);
  assert.equal(button.getAttribute('aria-busy'),'true');
  assert.equal(section.getAttribute('aria-busy'),'true');
  assert.equal(section.getAttribute('data-ui-state'),'loading');
  assert.equal(status.getAttribute('role'),'status');
  assert.equal(status.getAttribute('aria-live'),'polite');
  assert.equal(status.textContent,'กำลังบันทึกข้อมูล...');
  assert.equal(button.textContent,'กำลังบันทึกข้อมูล...');
  assert.equal(h.evalIn("uiBeginAction('record:save',{buttonId:'save'})"),null);
  assert.equal(h.evalIn("uiBeginAction('different:key',{buttonId:'save'})"),null);
  assert.equal(h.evalIn("uiBeginAction('different:section',{sectionId:'record'})"),null);
  assert.equal(h.rpcCalls.length,0);
  assert.equal(h.evalIn("uiFinishAction(uiPendingActions.get('record:save'),'success','บันทึกสำเร็จ')"),true);
  assert.equal(button.disabled,false);
  assert.equal(button.innerHTML,'<i class="icon"></i> เริ่มต้น');
  assert.equal(button.getAttribute('aria-busy'),'false');
  assert.equal(section.getAttribute('aria-busy'),'false');
  assert.equal(section.getAttribute('data-ui-state'),'success');
  assert.equal(status.textContent,'บันทึกสำเร็จ');
});
test('P9-01 different actions run independently and error restores only own region',()=>{
  const h=fixture();
  const a=h.evalIn("uiBeginAction('a',{buttonId:'aBtn',sectionId:'aPanel',statusId:'aStatus'})");
  const b=h.evalIn("uiBeginAction('b',{buttonId:'bBtn',sectionId:'bPanel',statusId:'bStatus'})");
  assert.ok(a&&b);
  assert.equal(h.evalIn("uiFinishAction(uiPendingActions.get('a'),'error','เครือข่ายขัดข้อง')"),true);
  assert.equal(h.get('aBtn').disabled,false);
  assert.equal(h.get('bBtn').disabled,true);
  assert.equal(h.get('bPanel').getAttribute('aria-busy'),'true');
  assert.equal(h.get('aStatus').textContent,'เครือข่ายขัดข้อง');
  assert.equal(h.evalIn("uiFinishAction(uiPendingActions.get('b'),'ready')"),true);
  assert.equal(h.get('bStatus').hidden,true);
});
test('P9-01 invalidation prevents late async finally from touching a new owner',()=>{
  const h=fixture();
  const first=h.evalIn("uiBeginAction('admin:users',{buttonId:'refresh',sectionId:'users'})");
  assert.equal(h.evalIn("uiInvalidateAllActions()"),undefined);
  assert.equal(h.get('refresh').disabled,false);
  const second=h.evalIn("uiBeginAction('admin:users',{buttonId:'refresh',sectionId:'users'})");
  assert.ok(second);
  h.context.stale=first;
  assert.equal(h.evalIn("uiFinishAction(stale,'success','stale data')"),false);
  assert.equal(h.get('refresh').disabled,true);
  assert.equal(h.get('users').getAttribute('data-ui-state'),'loading');
  assert.equal(h.evalIn("uiFinishAction(uiPendingActions.get('admin:users'),'ready')"),true);
});
test('P9-01 unknown, empty and error are distinct; status uses plain text',()=>{
  const h=fixture();
  h.evalIn("uiSetSectionState('table','tableStatus','loading','กำลังโหลด')");
  assert.equal(h.get('table').getAttribute('aria-busy'),'true');
  h.evalIn("uiSetSectionState('table','tableStatus','empty','ยังไม่มีข้อมูล')");
  assert.equal(h.get('table').getAttribute('data-ui-state'),'empty');
  assert.equal(h.get('tableStatus').textContent,'ยังไม่มีข้อมูล');
  h.evalIn("uiSetSectionState('table','tableStatus','error','<script>invalid</script>')");
  assert.equal(h.get('tableStatus').textContent,'<script>invalid</script>');
  h.evalIn("uiSetSectionState('table','tableStatus','unknown','ยังยืนยันผลไม่ได้')");
  assert.equal(h.get('table').getAttribute('aria-busy'),'false');
  assert.equal(h.get('table').getAttribute('data-ui-state'),'unknown');
  assert.equal(h.get('tableStatus').textContent,'ยังยืนยันผลไม่ได้');
  assert.throws(()=>h.evalIn("uiSetSectionState('table','tableStatus','invented')"),/Invalid UI action state/);
  assert.equal(h.rpcCalls.length,0);
});
test('P9-01 button canEnable recomputes permissions; cancelled/error paths are usable',()=>{
  const h=fixture();
  h.evalIn("uiBeginAction('security:save',{buttonId:'save'})");
  assert.equal(h.evalIn("uiFinishAction(uiPendingActions.get('security:save'),'error','บันทึกไม่สำเร็จ',{canEnable:()=>false})"),true);
  assert.equal(h.get('save').disabled,true);
  const cancelled=h.evalIn("uiBeginAction('other',{buttonId:'other'})");
  h.context.cancelled=cancelled;
  assert.equal(h.evalIn("uiInvalidateAction(cancelled)"),true);
  assert.equal(h.get('other').disabled,false);
  assert.equal(h.evalIn("uiFinishAction(cancelled,'success','should not repaint')"),false);
  assert.throws(()=>h.evalIn("uiBeginAction('')"),/UI action key required/);
});
test('P9-01 detached nodes are not repainted and helper never globally intercepts gs',()=>{
  const h=fixture();
  const lease=h.evalIn("uiBeginAction('attachment:download',{buttonId:'download',sectionId:'attachment'})");
  h.context.detached=lease;
  h.get('download').isConnected=false;
  h.get('attachment').isConnected=false;
  assert.equal(h.evalIn("uiFinishAction(detached,'ready')"),true);
  assert.equal(h.get('download').disabled,true);
  assert.equal(h.get('attachment').getAttribute('aria-busy'),'true');
  assert.match(source,/function gs\(fn,\.\.\.args\)\{return new Promise/);
  assert.equal(h.rpcCalls.length,0);
});

test('P9-01 shared status region cannot be stolen by a separate pending action',()=>{
  const h=fixture();
  const first=h.evalIn("uiBeginAction('users:refresh',{buttonId:'users',statusId:'sharedStatus'})");
  assert.ok(first);
  assert.equal(h.evalIn("uiBeginAction('areas:refresh',{buttonId:'areas',statusId:'sharedStatus'})"),null);
  assert.equal(h.get('areas').disabled,false);
  assert.equal(h.evalIn("uiFinishAction(uiPendingActions.get('users:refresh'),'ready')"),true);
  assert.ok(h.evalIn("uiBeginAction('areas:refresh',{buttonId:'areas',statusId:'sharedStatus'})"));
});
test('P9-01 unknown mutation does not silently unlock the action or imply success',()=>{
  const h=fixture();
  h.evalIn("uiBeginAction('report:create',{buttonId:'reportBtn',statusId:'reportStatus'})");
  assert.equal(h.evalIn("uiFinishAction(uiPendingActions.get('report:create'),'unknown','ยังยืนยันผลไม่ได้',{canEnable:()=>true})"),true);
  assert.equal(h.get('reportBtn').disabled,true);
  assert.equal(h.get('reportBtn').getAttribute('aria-busy'),'false');
  assert.equal(h.get('reportStatus').textContent,'ยังยืนยันผลไม่ได้');
  assert.equal(h.evalIn("uiBeginAction('report:create',{buttonId:'reportBtn'})"),null);
});
