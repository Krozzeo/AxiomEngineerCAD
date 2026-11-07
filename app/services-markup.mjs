const meter=label=>`<div class="ai-token-meter" role="progressbar" aria-label="${label}" aria-valuemin="0" aria-valuemax="100"><span></span><strong>0%</strong></div>`;
const icon=name=>`<img src="/icons/${name}.svg" alt="">`;
const limit=(name,label,min,max)=>`<div class="ai-limit-row"><label for="ai-${name}">${label}</label><span class="ai-limit-value"><input id="ai-${name}" name="${name}" type="number" min="${min}" max="${max}"><label class="round-check"><input type="checkbox" data-unlimited="${name}">Limitless</label></span></div>`;
const reload=(attr,label)=>`<button type="button" class="icon-button" ${attr} aria-label="${label}" title="${label}">${icon('reload')}</button>`;

// Ported from the MIT-licensed Game Engine editor at fc26132. Keep the
// presentation together so CAD service adapters can evolve independently.
export const aiConfigMarkup=`<div class="ai-config-body">
  <form id="ai-config-form">
    <p data-account></p><a data-hub>Manage account in Platform</a>
    <label class="ai-config-row">Model <span class="ai-model-picker"><select name="model" aria-label="AI model"><option value="">Same as Hub</option></select>${reload('data-models','Reload available models')}</span></label>
    <label class="ai-config-row">Reasoning effort <select name="reasoning"></select></label>
    <div class="ai-limit-grid">
      ${limit('maxRequests','Requests / task',2,50)}
      ${limit('maxTools','Tool calls / task',1,60)}
      ${limit('maxProjectTokens','Token budget / project',1,1000000000)}
      ${limit('maxOutputTokens','Output tokens / request',512,16384)}
      ${limit('maxSeconds','Seconds / task',15,300)}
    </div>
    <p>Provider-reported input and output tokens accumulate across tasks, disconnects and editor restarts. Increasing the limit preserves usage. One response can exceed the remaining balance and stop the task. Unreported usage is flagged. This is a local project budget.</p>
    ${limit('maxTaskTokens','Tokens / task',1,1000000000)}
    <p data-usage role="status"></p>
    ${meter('Project tokens used')}
    <div class="actions"><button type="button" data-test>Test selected model</button><button type="button" data-save>Save project settings</button><button type="button" data-reset-usage>Reset project counter</button></div>
    <p data-status role="status"></p>
  </form>
  <label>Assistant instructions<textarea name="instructions" maxlength="4000" rows="4" placeholder="Project goals and working constraints"></textarea></label>
  <button type="button" data-instructions>Save instructions</button>
</div>`;

export const githubMarkup=`<p data-account role="status"></p><p data-error role="alert"></p>
  <section><h3>Account</h3><a data-hub>Manage account in Axiom Platform</a>
  <div class="actions gh-account"><span data-account-detail></span>${reload('data-refresh','Refresh GitHub account')}</div></section>
  <fieldset>
    <section><h3>Destination</h3>
      <div class="gh-mode" role="group" aria-label="Repository destination mode"><button type="button" data-mode="create">Create a new repository</button><button type="button" data-mode="existing">Use existing repository</button></div>
      <div data-destination="create"><label>Repository name<input name="newName" maxlength="100"></label><label><input name="private" type="checkbox" checked>Private repository</label><button type="button" data-create>Create Repository</button></div>
      <div data-destination="existing" hidden><label>Repository <span class="gh-repository-row"><select name="repositories" aria-label="Available repositories"><option value="">Choose a repository</option></select>${reload('data-list','Refresh repositories')}</span></label>
        <label>Owner / repository<input name="repository" placeholder="owner/repository"></label><label>Publication branch<input name="branch" value="axiom-publication"></label>
        <label><input name="createBranch" type="checkbox">Create this branch if it does not exist</label><button type="button" data-save>Save destination</button>
      </div>
    </section>
    <section><h3>Publication</h3><p>Publishes saved MAIN. Save project changes before reviewing the snapshot.</p>
      <p data-preview-summary role="status"></p><button type="button" data-review-details hidden>Review changes</button>
      <label>Commit summary (optional)<input name="message" maxlength="120"></label>
      <button type="button" data-review disabled>Review saved changes</button>
      <button type="button" data-reconcile hidden>Check unconfirmed publication</button>
    </section>
  </fieldset>`;

export const chatMarkup=`<div class="ai-chat">
  <div class="ai-chat-header">
    ${meter('AI project tokens used')}
    <p class="ai-chat-notice">AI changes are isolated proposals. Review and accept them explicitly before saving. CAD context is shared with your configured provider when enabled in More info.</p>
    <details class="ai-task-details"><summary>More info…</summary><div class="ai-task-popover">
      <header class="ai-task-history"><strong id="ai-task-requests">Requests 0/0</strong><span>
        <button id="ai-task-copy" class="icon-button" aria-label="Copy task details" title="Copy task details"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><rect x="8" y="8" width="12" height="13" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M15 8V3H3v13h5" fill="none" stroke="currentColor" stroke-width="2"/></svg></button>
        <button id="ai-task-download" class="icon-button" aria-label="Download complete AI history" title="Download complete project AI history">${icon('download')}</button>
        <button id="ai-task-previous" class="icon-button" aria-label="Previous task">${icon('chevron-up')}</button>
        <button id="ai-task-next" class="icon-button" aria-label="Next task">${icon('chevron-down')}</button>
        <span id="ai-task-page" aria-label="Task page">0 / 0</span>
      </span></header>
      <label class="cad-context-switch"><input name="share" form="ai-chat-form" type="checkbox" role="switch" checked> Share current CAD context with the configured provider</label>
      <p id="ai-task-status" role="status"></p><div id="ai-request-usage"></div><ol id="ai-task-steps"></ol>
    </div></details>
  </div>
  <div class="ai-chat-messages" role="log" aria-live="polite"></div>
  <div class="actions ai-plan" data-plan hidden></div>
  <form id="ai-chat-form">
    <textarea id="ai-chat-input" name="message" rows="1" maxlength="8000" aria-label="Message to AI Assistant" placeholder="Inspect the model, make changes and verify the result…"></textarea>
    <div class="chat-attachments" data-attachments></div>
    <input name="svg" type="file" accept=".svg,image/svg+xml" aria-label="Orthographic SVG" hidden>
    <div class="actions">
      <button type="submit" disabled>Send</button><button type="button" data-stop disabled>Cancel task</button>
      <button type="button" data-review disabled>Review changes</button><button type="button" data-preview disabled>Preview</button><button type="button" data-apply disabled>Apply</button><button type="button" data-discard disabled>Discard</button>
      <button type="button" data-attach class="icon-button" aria-label="Attach orthographic SVG" title="Attach orthographic SVG">${icon('attachment')}</button>
      <label class="ai-confirm"><input name="confirm" type="checkbox" role="switch" checked>Require confirmation</label>
    </div>
    <div class="actions" data-branch hidden></div>
    <p id="ai-chat-error" role="status"></p>
  </form>
</div>`;

export function paintTokenMeter(meter,used,limit){
  const percent=limit?100*used/limit:0,shown=Math.min(100,percent);
  meter.setAttribute('aria-valuenow',String(Math.round(shown)));
  meter.setAttribute('aria-valuetext',limit?percent.toFixed(1)+'%':used.toLocaleString()+' tokens, limitless');
  meter.querySelector('span').style.width=shown+'%';
  meter.querySelector('strong').textContent=limit?percent.toFixed(1)+'%':'∞';
}
