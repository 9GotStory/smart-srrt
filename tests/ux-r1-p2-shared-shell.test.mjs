import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {nativeHtml} from './helpers/native-current.mjs';

const read = file => fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const layout = read('src/web/02-app-layout.html');
const css = read('src/styles/shared-ui.css');
const stagedStyles = read('src/web/01-styles.html');

test('UX-R1/P2 keeps five existing page names, role classes and click handlers',()=>{
  const nav = layout.slice(layout.indexOf('<div class="nav"'),layout.indexOf('<div class="auth-card"'));
  const pages = [...nav.matchAll(/data-page="([^"]+)"/g)].map(x=>x[1]);
  assert.deepEqual(pages,['dashboard','records','reporter','admin','library']);
  for(const page of pages) assert.ok(nav.includes("onclick=\"showPage('"+page+"',this)\""));
  assert.match(nav,/class="auth-only" data-page="records"/);
  assert.match(nav,/class="auth-only" data-page="reporter"/);
  assert.match(nav,/class="manager-only" data-page="admin"/);
  assert.match(nav,/data-page="dashboard" aria-current="page"/);
  assert.match(nav,/role="navigation" aria-label="เมนูหลัก"/);
  assert.match(nav,/class="srrt-nav-label" aria-hidden="true"/);
  assert.equal((layout.match(/<section id="page-/g)||[]).length,5);
});

test('UX-R1/P2 mounts redesigned landmarks without replacing dynamic settings or user controls',()=>{
  for(const id of ['logoImg','sideTitle','sideOrg','authBox',
    'openSidebarBtn','mainContent','appName','appSubtitle','bannerText','closedBox']){
    assert.equal((layout.match(new RegExp('id="'+id+'"','g'))||[]).length,1,
      'Missing/duplicate existing DOM ID: '+id);
  }
  assert.match(layout,/class="topbar srrt-shell-header"/);
  assert.match(layout,/class="banner srrt-shell-banner" style="flex:1"/);
  assert.match(layout,/class="srrt-brand-kicker"/);
  assert.match(layout,/class="srrt-shell-eyebrow"/);
  assert.match(layout,/class="srrt-sidebar-note"/);
  assert.match(layout,/id="openSidebarBtn"[^>]*aria-controls="sidebar" aria-expanded="false"/);
  assert.match(layout,/id="mainContent" tabindex="-1"/);
  assert.match(layout,/class="srrt-skip-link"/);
  assert.ok(nativeHtml.includes(layout),'Native HTML must assemble canonical layout source');
});

test('UX-R1/P2 scoped CSS keeps responsive drawer, selected navigation, reduced-motion and readable workspace',()=>{
  for(const selector of ['.app .sidebar','.app .nav button.active',
    '.app .auth-card','.app .srrt-shell-banner','.app .main',
    '.app .table-wrap','.app .hamb']){
    assert.ok(css.includes(selector),'Missing scoped rule: '+selector);
  }
  assert.match(css,/@media\(max-width:980px\)/);
  assert.match(css,/@media\(max-width:560px\)/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css,/var\(--primary\)/);
  assert.match(css,/\.sidebar:not\(\.open\)/);
  assert.match(css,/nav button:focus-visible/);
  assert.doesNotMatch(css,/<\/style|<script|@import|url\(/i);
});

test('UX-R1/P2 generated styles retain authored CSS and Tailwind without touching backend',()=>{
  assert.ok(stagedStyles.includes(css),'Native CSS partial must include exact authored shared stylesheet');
  assert.match(stagedStyles,/UX-R2 Tailwind CSS v4/);
  assert.match(stagedStyles,/tw\\:flex|tw\\\\:flex|tw:flex/);
  assert.ok(nativeHtml.includes(stagedStyles),'Native assembled HTML must include CSS partial');
  assert.ok(nativeHtml.includes('srrt-shell-header'));
  assert.ok(nativeHtml.includes('srrt-sidebar-note'));
});
