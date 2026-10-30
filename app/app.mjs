const $ = id => document.getElementById(id);
let token = new URLSearchParams(location.hash.slice(1)).get('token') ?? sessionStorage.getItem('engineer-token');
if (token) sessionStorage.setItem('engineer-token', token);
history.replaceState(null, '', location.pathname);
let state, pending = false, closed = false, sequence = 0, chain = Promise.resolve();
const clientId = crypto.randomUUID();
async function request(path, data) {
  const response = await fetch('/v1/' + path, {method:data ? 'POST' : 'GET', headers:{Authorization:'Bearer ' + token, ...(data ? {'Content-Type':'application/json'} : {})}, body:data ? JSON.stringify({...data, operationId:crypto.randomUUID()}) : undefined});
  const result = await response.json(); if (!response.ok) throw Error((result.code ?? 'operationFailed') + ': ' + result.message); return result;
}
function error(e) { $('message').textContent = e.message; $('message').className = 'error'; }
function message(text) { $('message').className = ''; $('message').textContent = text; }
function render(fill = false) {
  if (!state || closed) return;
  const s = state.status; $('title').textContent = state.document.metadata.name;
  $('format-footer').textContent=state.document.formatVersion===1?'Native v1 · pinned geometry / spatial profiles':'Legacy v0 · OCCT / PlaneGCS candidates';
  $('document-format').textContent=state.document.formatVersion===1?'Native document · Version 1':'Legacy provisional · Version 0';
  $('revision').textContent = s.revision; $('saved').textContent = s.savedRevision;
  $('state').textContent = pending ? 'Pending fields · Apply before saving' : s.dirty ? 'Unsaved changes' : 'All changes saved locally';
  $('connection').textContent = 'Connected · Local session';
  if (fill) { $('name').value = state.document.metadata.name; $('notes').value = state.document.metadata.notes; }
  for (const id of ['name','notes','save','apply','reset']) $(id).disabled = false;
  $('close').hidden = !!state.hosted; $('hosted').hidden = !state.hosted;
}
function run(action) { chain = chain.then(action).catch(error); return chain; }
function report(dirty) { return request('buffer', {clientId, sequence:++sequence, dirty}); }
for (const id of ['name','notes']) $(id).addEventListener('input', () => {
  pending = true; render(); run(() => report(true));
});
$('metadata').addEventListener('submit', event => {
  event.preventDefault(); const metadata = {name:$('name').value, notes:$('notes').value};
  run(async () => {
    state = {...await request('edit', {metadata, expectedRevision:state.status.revision}), hosted:state.hosted};
    pending = $('name').value !== metadata.name || $('notes').value !== metadata.notes;
    await report(pending); state = await request('document'); render(); message('Properties applied. Save to persist this revision.');
  });
});
$('reset').addEventListener('click', () => run(async () => { await report(false); pending = false; state = await request('document'); render(true); message('Fields reset to the working revision.'); }));
$('save').addEventListener('click', () => { message('Saving document…');run(async () => { const result = await request('save', {expectedRevision:state.status.revision}); state.status = result.status; render(); message('Document saved locally.'); }); });
$('close').addEventListener('click', () => $('close-dialog').showModal());
for (const button of document.querySelectorAll('[data-decision]')) button.addEventListener('click', () => run(async () => {
  const result = await request('close', {expectedRevision:state.status.revision, decision:button.dataset.decision});
  $('close-dialog').close();
  if (result.closed) { closed = true; pending = false; state.status.dirty = false; $('connection').textContent = 'Session closed'; $('state').textContent = 'Document closed'; for (const control of document.querySelectorAll('button,input,textarea')) control.disabled = true; message('Session closed. Reopen this document from the launcher.'); }
}));
window.addEventListener('beforeunload', event => { if (!closed && (pending || state?.status.dirty)) { event.preventDefault(); event.returnValue = ''; } });
run(async () => { state = await request('document'); render(true); });
window.addEventListener('engineer-document-changed',event=>{state={...event.detail,hosted:state?.hosted};render(!pending);});
let polling = false;
setInterval(() => {
  if (!state || closed || polling) return;
  polling = true;
  run(async () => {
  if (closed) { polling = false; return; }
  try {
    const current = await request('document');
    if (!pending) { const changed = current.status.revision !== state.status.revision; state = current; render(changed); }
    else if (current.status.revision !== state.status.revision) message('The document changed elsewhere. Reset fields to reload before applying.');
  } catch {
    if (closed) return;
    $('connection').textContent = 'Disconnected · Keep this tab to preserve pending fields';
    for (const id of ['name','notes','save','apply','reset','close']) $(id).disabled = true;
  } finally { polling = false; }
  });
}, 1000);
