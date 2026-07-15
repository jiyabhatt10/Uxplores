// =============================================================================
// UXPLORES Admin Dashboard
// =============================================================================

const state = { cache: {}, currentTab: "overview" };

// Admin theme management (Light/Dark mode)
function initAdminTheme() {
  const htmlEl = document.getElementById('admin-html');
  const themeBtn = document.getElementById('theme-toggle-btn');
  const themeLabel = document.getElementById('theme-toggle-label');
  
  // Load saved theme or default to dark
  const savedTheme = localStorage.getItem('admin-theme') || 'dark';
  applyAdminTheme(savedTheme);

  function applyAdminTheme(theme) {
    if (theme === 'light') {
      htmlEl.setAttribute('data-theme', 'light');
      localStorage.setItem('admin-theme', 'light');
      themeLabel.textContent = 'Dark Mode';
    } else {
      htmlEl.removeAttribute('data-theme');
      localStorage.setItem('admin-theme', 'dark');
      themeLabel.textContent = 'Light Mode';
    }
  }

  window.toggleAdminTheme = function() {
    const current = htmlEl.getAttribute('data-theme');
    applyAdminTheme(current === 'light' ? 'dark' : 'light');
  };
}

document.addEventListener("DOMContentLoaded", () => {
  initAdminTheme();
  initSidebar();
  initTabs();
  initModal();
  loadTab("overview");

  document.getElementById("save-settings-btn").addEventListener("click", saveSettings);
  document.getElementById("change-password-btn").addEventListener("click", changePassword);
});

// -----------------------------------------------------------------------------
// Sidebar / tabs
// -----------------------------------------------------------------------------
function initSidebar() {
  const toggle = document.getElementById("sidebar-toggle");
  const sidebar = document.getElementById("admin-sidebar");
  if (!toggle) return;
  toggle.addEventListener("click", () => sidebar.classList.toggle("open"));
}

const TAB_META = {
  overview: { title: "Overview", sub: "Welcome back — here's what's happening with your site.", addLabel: null },
  projects: { title: "Projects", sub: "Manage the case studies shown on your Portfolio page.", addLabel: "Add Project" },
  services: { title: "Services", sub: "Manage the services shown on your Home & Services pages.", addLabel: "Add Service" },
  blog: { title: "Blog Posts", sub: "Manage the articles shown on your Blog page.", addLabel: "Add Post" },
  team: { title: "Team", sub: "Manage the team members shown on your About page.", addLabel: "Add Member" },
  contacts: { title: "Messages", sub: "Contact form submissions from your website.", addLabel: null },
  newsletter: { title: "Newsletter", sub: "Manage newsletter provider settings and subscribers.", addLabel: null },
  settings: { title: "Settings", sub: "Site-wide stats, contact info, and admin password.", addLabel: null },
};

function initTabs() {
  document.querySelectorAll(".admin-nav-item[data-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.getAttribute("data-tab");
      document.querySelectorAll(".admin-nav-item").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
      document.querySelector(`.tab-panel[data-panel="${tab}"]`).classList.add("active");

      const meta = TAB_META[tab];
      document.getElementById("page-title").textContent = meta.title;
      document.getElementById("page-sub").textContent = meta.sub;
      const addBtn = document.getElementById("add-btn");
      if (meta.addLabel) {
        addBtn.style.display = "inline-flex";
        document.getElementById("add-btn-label").textContent = meta.addLabel;
        addBtn.onclick = () => openForm(tab, null);
      } else {
        addBtn.style.display = "none";
      }

      document.getElementById("admin-sidebar").classList.remove("open");
      state.currentTab = tab;
      loadTab(tab);
    });
  });
}

function loadTab(tab) {
  if (tab === "overview") return;
  if (tab === "settings") return loadSettings();
  if (tab === "contacts") return loadContacts();
  if (tab === "newsletter") return loadNewsletter();
  loadEntityList(tab);
}

// -----------------------------------------------------------------------------
// Toast
// -----------------------------------------------------------------------------
function showToast(msg, type = "success") {
  const toast = document.getElementById("toast");
  document.getElementById("toast-msg").textContent = msg;
  toast.className = "admin-toast show " + type;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove("show"), 3000);
}

// -----------------------------------------------------------------------------
// Generic fetch helper
// -----------------------------------------------------------------------------
async function api(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (res.status === 401) {
    window.location.href = "/admin/login";
    throw new Error("Unauthorized");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

// -----------------------------------------------------------------------------
// Entity configs
// -----------------------------------------------------------------------------
const ENTITY = {
  projects: {
    endpoint: "/admin/api/projects",
    label: "Project",
    icon: "briefcase",
    listItem: (item) => ({
      thumb: item.image,
      title: item.title,
      sub: `${item.category} · ${item.tags.join(", ")}`,
      tag: item.category,
    }),
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "category", label: "Category", type: "select", options: ["web", "mobile", "branding", "saas"] },
      { name: "description", label: "Short Description (card)", type: "textarea" },
      { name: "full_description", label: "Full Description (modal)", type: "textarea" },
      { name: "tags", label: "Tags (comma separated)", type: "text", hint: "e.g. Mobile App, FinTech, UI/UX" },
      { name: "image", label: "Image URL", type: "text" },
      { name: "stat1_label", label: "Stat 1 Label", type: "text", row: "s1" },
      { name: "stat1_value", label: "Stat 1 Value", type: "text", row: "s1" },
      { name: "stat2_label", label: "Stat 2 Label", type: "text", row: "s2" },
      { name: "stat2_value", label: "Stat 2 Value", type: "text", row: "s2" },
      { name: "stat3_label", label: "Stat 3 Label", type: "text", row: "s3" },
      { name: "stat3_value", label: "Stat 3 Value", type: "text", row: "s3" },
      { name: "challenge", label: "The Challenge", type: "textarea" },
      { name: "solution", label: "The Solution", type: "textarea" },
      { name: "results", label: "The Results", type: "textarea" },
      { name: "featured", label: "Show in Home page featured projects", type: "checkbox" },
      { name: "order_index", label: "Display Order", type: "number" },
    ],
  },
  services: {
    endpoint: "/admin/api/services",
    label: "Service",
    icon: "layout-template",
    listItem: (item) => ({
      iconThumb: item.icon,
      gradient: [item.color_from, item.color_to],
      title: item.title,
      sub: item.description,
    }),
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "icon", label: "Icon name (Lucide)", type: "text", hint: "e.g. layout-template, code, pen-tool, smartphone, search, zap, globe, shield" },
      { name: "description", label: "Description", type: "textarea" },
      { name: "color_from", label: "Gradient Start", type: "color", row: "c" },
      { name: "color_to", label: "Gradient End", type: "color", row: "c" },
      { name: "order_index", label: "Display Order", type: "number" },
    ],
  },
  blog: {
    endpoint: "/admin/api/blog",
    label: "Blog Post",
    icon: "file-text",
    listItem: (item) => ({
      thumb: item.image,
      title: item.title,
      sub: `${item.category} · ${item.author} · ${item.date}`,
      tag: item.featured ? "featured" : item.category,
    }),
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "excerpt", label: "Excerpt", type: "textarea" },
      { name: "category", label: "Category", type: "select", options: ["design", "development", "strategy", "trends"] },
      { name: "author", label: "Author", type: "text", row: "a" },
      { name: "date_str", label: "Date (display text)", type: "text", row: "a", hint: "e.g. Jan 25, 2026" },
      { name: "read_time", label: "Read Time", type: "text", row: "a" },
      { name: "image", label: "Image URL", type: "text" },
      { name: "featured", label: "Feature at top of Blog page", type: "checkbox" },
      { name: "order_index", label: "Display Order", type: "number" },
    ],
  },
  team: {
    endpoint: "/admin/api/team",
    label: "Team Member",
    icon: "users",
    listItem: (item) => ({
      thumb: item.image,
      title: item.name,
      sub: item.role,
    }),
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "role", label: "Role", type: "text" },
      { name: "image", label: "Photo URL", type: "text" },
      { name: "description", label: "Short Bio", type: "textarea" },
      { name: "order_index", label: "Display Order", type: "number" },
    ],
  },
};

// -----------------------------------------------------------------------------
// List rendering
// -----------------------------------------------------------------------------
async function loadEntityList(tab) {
  const cfg = ENTITY[tab];
  const container = document.getElementById(`${tab}-list`);
  try {
    const items = await api(cfg.endpoint);
    state.cache[tab] = items;
    renderList(tab, items);
  } catch (err) {
    container.innerHTML = `<div class="empty-state">Failed to load: ${escapeHtml(err.message)}</div>`;
  }
}

function renderList(tab, items) {
  const cfg = ENTITY[tab];
  const container = document.getElementById(`${tab}-list`);
  if (!items.length) {
    container.innerHTML = `<div class="empty-state">${ICONS[cfg.icon] || ""}<div>No ${cfg.label.toLowerCase()}s yet. Click "Add" to create one.</div></div>`;
    return;
  }
  // Special rendering for Team tab: compact list with search & sort
  if (tab === "team") {
    container.innerHTML = `
      <div class="team-controls">
        <div class="team-search-wrap"><input id="team-search" class="team-search" placeholder="Search team members..." /></div>
        <div class="team-controls-right">
          <select id="team-sort" class="team-sort">
            <option value="order_index">Display Order</option>
            <option value="name">Name</option>
            <option value="recent">Recently Updated</option>
          </select>
          <button class="abtn abtn-outline" id="team-refresh">Refresh</button>
        </div>
      </div>
      <div class="team-grid"></div>
    `;

    const list = container.querySelector('.team-grid');
    const renderRow = (item) => {
      const avatar = item.image ? `<img class="team-avatar" src="${escapeAttr(item.image)}" onerror="this.style.visibility='hidden'">` : `<div class="team-avatar team-avatar-placeholder">${escapeHtml((item.name||'')[0]||'')}</div>`;
      const bioPreview = item.description ? escapeHtml(item.description) : '';
      return `
        <div class="team-row" draggable="true" data-id="${item.id}">
          <div class="team-row-left">${avatar}</div>
          <div class="team-row-body">
            <div class="team-row-top">
              <div class="team-name">${escapeHtml(item.name)}</div>
              <div class="team-role">${escapeHtml(item.role)}</div>
            </div>
            <div class="team-bio">${bioPreview}</div>
          </div>
          <div class="team-row-actions">
            <button class="abtn abtn-outline abtn-sm" onclick="openForm('team', ${item.id})">${ICONS['pencil']} Edit</button>
            <button class="abtn abtn-danger abtn-sm" onclick="deleteItem('team', ${item.id})">${ICONS['trash-2']} Delete</button>
          </div>
        </div>`;
    };

    // initial render
    list.innerHTML = items.map(renderRow).join('');

    // search
    document.getElementById('team-search').addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      Array.from(list.children).forEach(row => {
        const name = row.querySelector('.team-name').textContent.toLowerCase();
        const role = row.querySelector('.team-role').textContent.toLowerCase();
        row.style.display = (name.includes(q) || role.includes(q)) ? '' : 'none';
      });
    });

    // sort
    document.getElementById('team-sort').addEventListener('change', (e) => {
      const val = e.target.value;
      const arr = Array.from(items.slice());
      if (val === 'name') arr.sort((a,b)=> (a.name||'').localeCompare(b.name||''));
      else if (val === 'recent') arr.reverse();
      else arr.sort((a,b)=> (a.order_index||0) - (b.order_index||0));
      list.innerHTML = arr.map(renderRow).join('');
      attachDragHandlers();
    });
    document.getElementById('team-refresh').addEventListener('click', () => loadEntityList('team'));

    // drag & drop handlers (row-level, no visible handle)
    function attachDragHandlers() {
      let dragged = null;
      list.querySelectorAll('.team-row').forEach((row) => {
        row.addEventListener('dragstart', (e) => { dragged = row; row.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; });
        row.addEventListener('dragend', () => { if (dragged) dragged.classList.remove('dragging'); dragged = null; });
        row.addEventListener('dragover', (e) => { e.preventDefault(); const after = getDragAfterElement(list, e.clientY); if (after == null) list.appendChild(dragged); else list.insertBefore(dragged, after); });
      });
      list.addEventListener('drop', async () => {
        const rows = Array.from(list.querySelectorAll('.team-row'));
        for (let i = 0; i < rows.length; i++) {
          const id = rows[i].getAttribute('data-id');
          try { await api(`/admin/api/team/${id}`, { method: 'PUT', body: JSON.stringify({ order_index: i+1 }) }); } catch (err) { console.error('Order update failed', err); }
        }
        showToast('Team order updated.');
        loadEntityList('team');
      });
    }

    function getDragAfterElement(container, y) {
      const draggableElements = [...container.querySelectorAll('.team-row:not(.dragging)')];
      return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) return { offset: offset, element: child };
        return closest;
      }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    attachDragHandlers();
    return;
  }

  // default rendering for other entities
  container.innerHTML = items.map((item) => {
    const view = cfg.listItem(item);
    const thumbHtml = view.thumb
      ? `<img class="item-thumb" src="${escapeAttr(view.thumb)}" alt="" onerror="this.style.visibility='hidden'">`
      : view.iconThumb
      ? `<div class="item-icon-thumb" style="background: linear-gradient(135deg, ${escapeAttr(view.gradient[0])}, ${escapeAttr(view.gradient[1])});">${ICONS[view.iconThumb] || ICONS["layout-template"]}</div>`
      : `<div class="item-icon-thumb" style="background:#1a1d24;">${ICONS[cfg.icon] || ""}</div>`;

    return `
      <div class="item-row">
        ${thumbHtml}
        <div class="item-body">
          <div class="item-title">${escapeHtml(view.title)}</div>
          <div class="item-sub">${escapeHtml(view.sub || "")}</div>
          ${view.tag ? `<span class="item-tag">${escapeHtml(view.tag)}</span>` : ""}
        </div>
        <div class="item-actions">
          <button class="abtn abtn-outline abtn-sm abtn-icon" title="Edit" onclick="openForm('${tab}', ${item.id})">${ICONS["pencil"]}</button>
          <button class="abtn abtn-danger abtn-sm abtn-icon" title="Delete" onclick="deleteItem('${tab}', ${item.id})">${ICONS["trash-2"]}</button>
        </div>
      </div>`;
  }).join("");
}

async function deleteItem(tab, id) {
  const cfg = ENTITY[tab];
  if (!confirm(`Delete this ${cfg.label.toLowerCase()}? This cannot be undone.`)) return;
  try {
    await api(`${cfg.endpoint}/${id}`, { method: "DELETE" });
    showToast(`${cfg.label} deleted.`);
    loadEntityList(tab);
  } catch (err) {
    showToast(err.message, "error");
  }
}

// -----------------------------------------------------------------------------
// Modal form (add/edit)
// -----------------------------------------------------------------------------
function initModal() {
  document.getElementById("modal-backdrop").addEventListener("click", (e) => {
    if (e.target.id === "modal-backdrop") closeModal();
  });
}

function closeModal() {
  document.getElementById("modal-backdrop").classList.remove("open");
}

function openForm(tab, id) {
  const cfg = ENTITY[tab];
  const item = id ? (state.cache[tab] || []).find((i) => i.id === id) : null;
  const isEdit = !!item;

  const rows = {};
  cfg.fields.forEach((f) => {
    const key = f.row || f.name;
    if (!rows[key]) rows[key] = [];
    rows[key].push(f);
  });

  const seen = new Set();
  let fieldsHtml = "";
  cfg.fields.forEach((f) => {
    const key = f.row || f.name;
    if (seen.has(key)) return;
    seen.add(key);
    const group = rows[key];
    const rowClass = group.length === 3 ? "afield-row3" : group.length === 2 ? "afield-row" : "";
    const inner = group.map((gf) => renderField(gf, item)).join("");
    fieldsHtml += rowClass ? `<div class="${rowClass}">${inner}</div>` : inner;
  });

  const modal = document.getElementById("modal-content");
  modal.innerHTML = `
    <div class="admin-modal-head">
      <h3 class="admin-h">${isEdit ? "Edit" : "Add"} ${cfg.label}</h3>
      <button class="admin-modal-close" onclick="closeModal()">${ICONS["x"]}</button>
    </div>
    <form id="entity-form">${fieldsHtml}</form>
    <div class="admin-modal-actions">
      <button type="button" class="abtn abtn-outline" onclick="closeModal()">Cancel</button>
      <button type="button" class="abtn abtn-primary" id="entity-save-btn">${ICONS["check-circle-2"]}Save</button>
    </div>
  `;

  document.getElementById("entity-save-btn").addEventListener("click", () => saveEntity(tab, id));
  document.getElementById("modal-backdrop").classList.add("open");
}

// -----------------------------------------------------------------------------
// Blog: enhanced modal form (UI-only improvements, preserves saved fields)
// -----------------------------------------------------------------------------
function openBlogForm(item) {
  const isEdit = !!item;
  const modal = document.getElementById("modal-content");

  const data = item || { title: "", excerpt: "", category: "design", author: "", date_str: "", read_time: "", image: "", featured: false, order_index: 0 };

  modal.innerHTML = `
    <div class="admin-modal-head">
      <h3 class="admin-h">${isEdit ? "Edit" : "Add"} Blog Post</h3>
      <button class="admin-modal-close" onclick="closeModal()">${ICONS["x"]}</button>
    </div>
    <form id="entity-form">
      <div class="blog-grid">
        <div class="blog-main">
          <div class="afield"><label>Title <small class="char-count" data-for="title">0</small></label><input type="text" name="title" id="fld-title" value="${escapeAttr(data.title)}" required></div>
          <div class="afield"><label>Slug <small class="muted">(auto)</small></label><input type="text" id="fld-slug" placeholder="auto-generated from title"></div>

          <div class="afield"><label>Excerpt <small class="char-count" data-for="excerpt">0</small></label><textarea name="excerpt" id="fld-excerpt">${escapeHtml(data.excerpt)}</textarea><div class="afield-hint">Short summary shown on the blog listing page.</div></div>

          <div class="afield"><label>Article Content</label>
            <div class="rte-toolbar">
              <button type="button" data-cmd="bold">B</button>
              <button type="button" data-cmd="italic">I</button>
              <button type="button" data-cmd="h2">H2</button>
              <button type="button" data-cmd="ul">• List</button>
              <button type="button" data-cmd="link">Link</button>
            </div>
            <div id="rte" class="rte" contenteditable="true">${escapeHtml(data.excerpt)}</div>
            <input type="hidden" name="excerpt" id="fld-excerpt-hidden" value="${escapeAttr(data.excerpt)}">
            <div class="afield-hint">Rich text editor — content will be saved into the existing <code>excerpt</code> field.</div>
          </div>

          <div class="afield-row">
            <div class="afield"><label>Category</label>
              <select name="category" id="fld-category">
                <option value="design">design</option>
                <option value="development">development</option>
                <option value="strategy">strategy</option>
                <option value="trends">trends</option>
              </select>
            </div>
            <div class="afield"><label>Tags</label><input type="text" id="fld-tags" placeholder="UI, UX, AI, Design"><div class="afield-hint">Comma-separated. (UI only, not saved server-side)</div></div>
          </div>
        </div>

        <aside class="blog-side">
          <div class="afield"><label>Featured Image</label>
            <div class="image-uploader">
              <div class="image-preview" id="image-preview">${data.image ? `<img src="${escapeAttr(data.image)}" alt="">` : `<div class="empty">No image</div>`}</div>
              <input type="file" id="fld-image-file" accept="image/*">
              <div style="margin-top:0.5rem;"><label>or paste an image URL</label><input type="text" name="image" id="fld-image-url" value="${escapeAttr(data.image)}"></div>
            </div>
          </div>

          <div class="afield"><label>Author</label><input type="text" name="author" id="fld-author" value="${escapeAttr(data.author)}"></div>

          <div class="afield-row">
            <div class="afield"><label>Published Date</label><input type="date" id="fld-date"></div>
            <div class="afield"><label>Read Time</label><input type="text" name="read_time" id="fld-readtime" value="${escapeAttr(data.read_time)}" readonly></div>
          </div>

          <div class="afield"><label>Featured Post</label><div class="afield-check"><input type="checkbox" name="featured" id="fld-featured" ${data.featured ? 'checked' : ''}><label for="fld-featured">Show as featured</label></div></div>

          <div class="afield"><label>Display Order</label><input type="number" name="order_index" id="fld-order" value="${escapeAttr(data.order_index || 0)}"></div>

          <div class="afield"><label>SEO (optional)</label>
            <details>
              <summary>Meta settings</summary>
              <div style="margin-top:0.5rem;"><label>Meta Title</label><input id="fld-meta-title" placeholder="Optional"></div>
              <div style="margin-top:0.5rem;"><label>Meta Description <small class="char-count" data-for="meta-desc">0</small></label><textarea id="fld-meta-desc" rows="3"></textarea></div>
            </details>
          </div>
        </aside>
      </div>

      <div class="admin-modal-actions" style="margin-top:1.5rem;">
        <button type="button" class="abtn abtn-outline" onclick="closeModal()">Cancel</button>
        <button type="button" class="abtn abtn-primary" id="entity-save-btn">${ICONS["check-circle-2"]} Save</button>
      </div>
    </form>
  `;

  // Initialize values
  document.getElementById('fld-category').value = data.category || 'design';
  if (data.date_str) {
    try { const d = new Date(data.date_str); if (!isNaN(d)) document.getElementById('fld-date').value = d.toISOString().slice(0,10); } catch(e){}
  }

  // Wire RTE to hidden excerpt field
  const rte = document.getElementById('rte');
  const hiddenExcerpt = document.getElementById('fld-excerpt-hidden');
  const excerptArea = document.getElementById('fld-excerpt');
  const updateExcerpt = () => { hiddenExcerpt.value = rte.innerHTML; excerptArea.value = rte.innerHTML; updateReadTime(); updateCharCount('excerpt'); };
  rte.addEventListener('input', updateExcerpt);

  // Toolbar
  document.querySelectorAll('.rte-toolbar button').forEach((btn) => {
    btn.addEventListener('click', () => {
      const cmd = btn.getAttribute('data-cmd');
      if (cmd === 'h2') document.execCommand('formatBlock', false, 'h2');
      else if (cmd === 'ul') document.execCommand('insertUnorderedList');
      else if (cmd === 'link') { const url = prompt('Enter URL'); if (url) document.execCommand('createLink', false, url); }
      else document.execCommand(cmd);
      updateExcerpt();
    });
  });

  // Image upload preview
  const imgFile = document.getElementById('fld-image-file');
  const imgUrl = document.getElementById('fld-image-url');
  const preview = document.getElementById('image-preview');
  function setPreview(src) { preview.innerHTML = `<img src="${escapeAttr(src)}" alt="">`; document.getElementById('fld-image-url').value = src; }
  imgFile.addEventListener('change', (e) => { const f = e.target.files[0]; if (!f) return; const reader = new FileReader(); reader.onload = (ev) => setPreview(ev.target.result); reader.readAsDataURL(f); });
  imgUrl.addEventListener('change', (e) => setPreview(e.target.value));

  // Slug generation
  const titleEl = document.getElementById('fld-title');
  const slugEl = document.getElementById('fld-slug');
  titleEl.addEventListener('input', () => { if (!slugEl.value) slugEl.value = slugify(titleEl.value); updateCharCount('title'); });

  // read time auto-calc
  const readEl = document.getElementById('fld-readtime');
  function updateReadTime() { const text = rte.innerText || rte.textContent || ''; const words = (text.trim().match(/\S+/g)||[]).length; const mins = Math.max(1, Math.round(words / 200)); readEl.value = `${mins} min read`; }
  function updateCharCount(name) {
    document.querySelectorAll(`.char-count[data-for="${name}"]`).forEach(el=>{
      const v = name === 'title' ? (document.getElementById('fld-title').value.length) : name === 'excerpt' ? (document.getElementById('fld-excerpt').value.length) : (document.getElementById('fld-meta-desc') ? document.getElementById('fld-meta-desc').value.length : 0);
      el.textContent = `${v}`;
    });
  }
  document.getElementById('fld-title').addEventListener('input', ()=>updateCharCount('title'));
  document.getElementById('fld-excerpt').addEventListener('input', ()=>updateCharCount('excerpt'));
  const metaDesc = document.getElementById('fld-meta-desc'); if (metaDesc) metaDesc.addEventListener('input', ()=>updateCharCount('meta-desc'));

  // Sync RTE initial content
  updateExcerpt(); updateCharCount('title'); updateCharCount('excerpt'); updateCharCount('meta-desc');

  // Save handler (uses existing saveEntity but ensure we only submit allowed BLOG_FIELDS)
  document.getElementById('entity-save-btn').addEventListener('click', async () => {
    const payload = {};
    payload.title = document.getElementById('fld-title').value.trim();
    payload.excerpt = document.getElementById('fld-excerpt-hidden').value;
    payload.category = document.getElementById('fld-category').value;
    payload.author = document.getElementById('fld-author').value.trim();
    const dateVal = document.getElementById('fld-date').value; payload.date_str = dateVal ? new Date(dateVal).toLocaleDateString() : document.getElementById('fld-date').value || '';
    payload.read_time = document.getElementById('fld-readtime').value;
    payload.image = document.getElementById('fld-image-url').value.trim();
    payload.featured = document.getElementById('fld-featured').checked;
    payload.order_index = parseInt(document.getElementById('fld-order').value || '0', 10);

    if (!payload.title) { alert('Title is required'); return; }
    if (!payload.excerpt || payload.excerpt.trim().length < 10) { if (!confirm('Excerpt looks very short. Continue saving?')) return; }

    try {
      if (item && item.id) {
        await api(`/admin/api/blog/${item.id}`, { method: 'PUT', body: JSON.stringify(payload) });
        showToast('Blog Post updated.');
      } else {
        await api('/admin/api/blog', { method: 'POST', body: JSON.stringify(payload) });
        showToast('Blog Post created.');
      }
      closeModal(); loadEntityList('blog');
    } catch (err) { showToast(err.message, 'error'); }
  });

  document.getElementById('modal-backdrop').classList.add('open');
}

function slugify(str) { return String(str).toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,''); }

function renderField(f, item) {
  const value = item ? (item[f.name] ?? "") : (f.type === "checkbox" ? false : (f.default ?? ""));
  const hint = f.hint ? `<div class="afield-hint">${escapeHtml(f.hint)}</div>` : "";

  if (f.type === "textarea") {
    return `<div class="afield"><label>${f.label}</label><textarea name="${f.name}">${escapeHtml(Array.isArray(value) ? value.join(", ") : String(value))}</textarea>${hint}</div>`;
  }
  if (f.type === "select") {
    const opts = f.options.map((o) => `<option value="${o}" ${o === value ? "selected" : ""}>${o}</option>`).join("");
    return `<div class="afield"><label>${f.label}</label><select name="${f.name}">${opts}</select>${hint}</div>`;
  }
  if (f.type === "checkbox") {
    return `<div class="afield afield-check"><input type="checkbox" name="${f.name}" id="fld-${f.name}" ${value ? "checked" : ""}><label for="fld-${f.name}" style="margin:0;">${f.label}</label></div>`;
  }
  if (f.type === "color") {
    return `<div class="afield"><label>${f.label}</label><div class="color-swatch-row"><input type="color" name="${f.name}" value="${escapeAttr(value || "#1FA2FF")}"><input type="text" data-color-text value="${escapeAttr(value || "")}" style="flex:1;"></div>${hint}</div>`;
  }
  if (f.type === "number") {
    return `<div class="afield"><label>${f.label}</label><input type="number" name="${f.name}" value="${escapeAttr(value || 0)}">${hint}</div>`;
  }
  const displayVal = Array.isArray(value) ? value.join(", ") : value;
  return `<div class="afield"><label>${f.label}</label><input type="text" name="${f.name}" value="${escapeAttr(displayVal)}" ${f.required ? "required" : ""}>${hint}</div>`;
}

async function saveEntity(tab, id) {
  const cfg = ENTITY[tab];
  const form = document.getElementById("entity-form");
  const payload = {};

  cfg.fields.forEach((f) => {
    const el = form.querySelector(`[name="${f.name}"]`);
    if (!el) return;
    if (f.type === "checkbox") payload[f.name] = el.checked;
    else if (f.type === "number") payload[f.name] = parseInt(el.value || "0", 10);
    else payload[f.name] = el.value;
  });

  if (payload.tags) payload.tags = payload.tags.split(",").map((t) => t.trim()).filter(Boolean);

  try {
    if (id) {
      await api(`${cfg.endpoint}/${id}`, { method: "PUT", body: JSON.stringify(payload) });
      showToast(`${cfg.label} updated.`);
    } else {
      await api(cfg.endpoint, { method: "POST", body: JSON.stringify(payload) });
      showToast(`${cfg.label} created.`);
    }
    closeModal();
    loadEntityList(tab);
  } catch (err) {
    showToast(err.message, "error");
  }
}

// sync color picker <-> text field
document.addEventListener("input", (e) => {
  if (e.target.matches('.afield input[type="color"]')) {
    const textEl = e.target.parentElement.querySelector("[data-color-text]");
    if (textEl) textEl.value = e.target.value;
  }
  if (e.target.matches("[data-color-text]")) {
    const colorEl = e.target.parentElement.querySelector('input[type="color"]');
    if (colorEl && /^#[0-9a-fA-F]{6}$/.test(e.target.value)) colorEl.value = e.target.value;
  }
});

// -----------------------------------------------------------------------------
// Contacts
// -----------------------------------------------------------------------------
async function loadContacts() {
  const container = document.getElementById("contacts-list");
  try {
    const items = await api("/admin/api/contacts");
    if (!items.length) {
      container.innerHTML = `<div class="empty-state">${ICONS["inbox"]}<div>No messages yet.</div></div>`;
      return;
    }
    container.innerHTML = items.map((c) => `
      <div class="item-row contact-row ${c.is_read ? "" : "unread"}">
        <div class="item-body" style="width:100%;">
          <div class="contact-row-top">
            <div>
              <div class="contact-row-name">${escapeHtml(c.name)}</div>
              <div class="contact-row-email">${escapeHtml(c.email)}</div>
            </div>
            <div class="contact-row-date">${escapeHtml(c.created_at)}</div>
          </div>
          <div class="contact-row-meta">
            ${c.company ? `<span>${escapeHtml(c.company)}</span>` : ""}
            ${c.project_type ? `<span>${escapeHtml(c.project_type)}</span>` : ""}
            ${c.budget ? `<span>${escapeHtml(c.budget)}</span>` : ""}
          </div>
          <div class="contact-row-msg">${escapeHtml(c.message)}</div>
        </div>
        <div class="item-actions" style="flex-direction:column;">
          <button class="abtn abtn-outline abtn-sm" onclick="toggleRead(${c.id}, ${!c.is_read})">${c.is_read ? "Mark Unread" : "Mark Read"}</button>
          <button class="abtn abtn-danger abtn-sm abtn-icon" title="Delete" onclick="deleteContact(${c.id})">${ICONS["trash-2"]}</button>
        </div>
      </div>`).join("");
  } catch (err) {
    container.innerHTML = `<div class="empty-state">Failed to load: ${escapeHtml(err.message)}</div>`;
  }
}

async function toggleRead(id, isRead) {
  try {
    await api(`/admin/api/contacts/${id}`, { method: "PATCH", body: JSON.stringify({ is_read: isRead }) });
    loadContacts();
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function deleteContact(id) {
  if (!confirm("Delete this message? This cannot be undone.")) return;
  try {
    await api(`/admin/api/contacts/${id}`, { method: "DELETE" });
    showToast("Message deleted.");
    loadContacts();
  } catch (err) {
    showToast(err.message, "error");
  }
}

// -----------------------------------------------------------------------------
// Settings
// -----------------------------------------------------------------------------
async function loadSettings() {
  try {
    const settings = await api("/admin/api/settings");
    document.querySelectorAll("[data-setting]").forEach((el) => {
      el.value = settings[el.getAttribute("data-setting")] || "";
    });
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function saveSettings() {
  const payload = {};
  document.querySelectorAll("[data-setting]").forEach((el) => {
    payload[el.getAttribute("data-setting")] = el.value;
  });
  try {
    await api("/admin/api/settings", { method: "POST", body: JSON.stringify(payload) });
    showToast("Settings saved.");
  } catch (err) {
    showToast(err.message, "error");
  }
}

function showNewsletterFields(provider) {
  const providerMap = {
    SMTP: ["newsletter-smtp-fields"],
    Resend: ["newsletter-resend-fields"],
    SendGrid: ["newsletter-sendgrid-fields"],
    "Amazon SES": ["newsletter-ses-fields"],
  };
  ["newsletter-smtp-fields","newsletter-resend-fields","newsletter-sendgrid-fields","newsletter-ses-fields"].forEach((id) => {
    document.getElementById(id).style.display = providerMap[provider] && providerMap[provider].includes(id) ? "block" : "none";
  });
}

async function loadNewsletter() {
  try {
    const config = await api("/admin/api/newsletter/config");
    document.getElementById("newsletter-provider").value = config.provider || "Resend";
    document.getElementById("newsletter-smtp-host").value = config.smtp_host || "";
    document.getElementById("newsletter-smtp-port").value = config.smtp_port || "587";
    document.getElementById("newsletter-smtp-username").value = config.smtp_username || "";
    document.getElementById("newsletter-smtp-password").value = config.smtp_password_present ? "********" : "";
    document.getElementById("newsletter-smtp-encryption").value = config.smtp_encryption || "TLS";
    document.getElementById("newsletter-resend-api-key").value = config.resend_api_key_present ? "********" : "";
    document.getElementById("newsletter-sendgrid-api-key").value = config.sendgrid_api_key_present ? "********" : "";
    document.getElementById("newsletter-ses-access-key").value = config.ses_access_key_present ? "********" : "";
    document.getElementById("newsletter-ses-secret-key").value = config.ses_secret_key_present ? "********" : "";
    document.getElementById("newsletter-ses-region").value = config.ses_region || "us-east-1";
    document.getElementById("newsletter-from-email").value = config.from_email || "";
    document.getElementById("newsletter-site-url").value = config.site_url || "";
    showNewsletterFields(config.provider || "Resend");

    document.getElementById("newsletter-search").value = "";
    document.getElementById("newsletter-status-filter").value = "";
    document.getElementById("newsletter-export-btn").onclick = exportNewsletterSubscribers;
    document.getElementById("newsletter-provider").addEventListener("change", (e) => showNewsletterFields(e.target.value));
    document.getElementById("save-newsletter-config-btn").onclick = saveNewsletterConfig;
    document.getElementById("newsletter-search").addEventListener("input", refreshSubscriberFilter);
    document.getElementById("newsletter-status-filter").addEventListener("change", refreshSubscriberFilter);

    loadNewsletterSubscribers();
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function saveNewsletterConfig() {
  const payload = {
    provider: document.getElementById("newsletter-provider").value,
    smtp_host: document.getElementById("newsletter-smtp-host").value,
    smtp_port: document.getElementById("newsletter-smtp-port").value,
    smtp_username: document.getElementById("newsletter-smtp-username").value,
    smtp_password: document.getElementById("newsletter-smtp-password").value,
    smtp_encryption: document.getElementById("newsletter-smtp-encryption").value,
    resend_api_key: document.getElementById("newsletter-resend-api-key").value,
    sendgrid_api_key: document.getElementById("newsletter-sendgrid-api-key").value,
    ses_access_key: document.getElementById("newsletter-ses-access-key").value,
    ses_secret_key: document.getElementById("newsletter-ses-secret-key").value,
    ses_region: document.getElementById("newsletter-ses-region").value,
    from_email: document.getElementById("newsletter-from-email").value,
    site_url: document.getElementById("newsletter-site-url").value,
  };

  try {
    await api("/admin/api/newsletter/config", { method: "POST", body: JSON.stringify(payload) });
    showToast("Newsletter settings saved.");
    loadNewsletter();
  } catch (err) {
    showToast(err.message, "error");
  }
}

let newsletterSubscriberCache = [];

async function loadNewsletterSubscribers() {
  const status = document.getElementById("newsletter-status-filter").value;
  const query = document.getElementById("newsletter-search").value.trim();
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (query) params.set("q", query);

  try {
    const data = await api(`/admin/api/newsletter/subscribers?${params.toString()}`);
    newsletterSubscriberCache = data.subscribers || [];
    document.getElementById("newsletter-total-count").textContent = data.total || 0;
    document.getElementById("newsletter-active-count").textContent = data.active_count || 0;
    document.getElementById("newsletter-pending-count").textContent = data.pending_count || 0;
    document.getElementById("newsletter-unsubscribed-count").textContent = data.unsubscribed_count || 0;
    renderNewsletterSubscribers(newsletterSubscriberCache);
  } catch (err) {
    document.getElementById("newsletter-subscriber-table").innerHTML = `<div class="empty-state">Failed to load: ${escapeHtml(err.message)}</div>`;
  }
}

function renderNewsletterSubscribers(items) {
  if (!items.length) {
    document.getElementById("newsletter-subscriber-table").innerHTML = `<div class="empty-state">No subscribers found.</div>`;
    return;
  }

  const rows = items.map((sub) => `
    <tr>
      <td>${escapeHtml(sub.email)}</td>
      <td>${escapeHtml(sub.created_at)}</td>
      <td>${escapeHtml(sub.status)}</td>
      <td>${sub.verified_at ? escapeHtml(sub.verified_at) : 'No'}</td>
      <td><button class="abtn abtn-danger abtn-sm" onclick="deleteNewsletterSubscriber(${sub.id})">Delete</button></td>
    </tr>
  `).join("");

  document.getElementById("newsletter-subscriber-table").innerHTML = `
    <table class="admin-table">
      <thead>
        <tr>
          <th>Email</th>
          <th>Subscription Date</th>
          <th>Status</th>
          <th>Verified</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function refreshSubscriberFilter() {
  loadNewsletterSubscribers();
}

async function deleteNewsletterSubscriber(id) {
  if (!confirm('Delete this subscriber? This cannot be undone.')) return;
  try {
    await api(`/admin/api/newsletter/subscribers/${id}`, { method: 'DELETE' });
    showToast('Subscriber deleted.');
    loadNewsletterSubscribers();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function exportNewsletterSubscribers() {
  const status = document.getElementById('newsletter-status-filter').value;
  const query = document.getElementById('newsletter-search').value.trim();
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (query) params.set('q', query);
  window.location.href = `/admin/api/newsletter/subscribers/export?${params.toString()}`;
}

async function changePassword() {
  const current = document.getElementById("current-password").value;
  const next = document.getElementById("new-password").value;
  if (!current || !next) { showToast("Fill in both password fields.", "error"); return; }
  try {
    await api("/admin/api/change-password", { method: "POST", body: JSON.stringify({ current_password: current, new_password: next }) });
    showToast("Password updated.");
    document.getElementById("current-password").value = "";
    document.getElementById("new-password").value = "";
  } catch (err) {
    showToast(err.message, "error");
  }
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
}
function escapeAttr(str) {
  return escapeHtml(str).replace(/"/g, "&quot;");
}

// Small inline icon set used for dynamically-built admin UI (subset of Lucide)
const ICONS = {
  "briefcase": '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>',
  "layout-template": '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="7" x="3" y="3" rx="1"/><rect width="9" height="7" x="3" y="14" rx="1"/><rect width="5" height="7" x="16" y="14" rx="1"/></svg>',
  "file-text": '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>',
  "users": '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  "inbox": '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>',
  "pencil": '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg>',
  "trash-2": '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>',
  "x": '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
  "check-circle-2": '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>',
};

// -----------------------------------------------------------------------------
// Team: enhanced Add/Edit modal
// -----------------------------------------------------------------------------
function openTeamForm(item) {
  const isEdit = !!item;
  const modal = document.getElementById('modal-content');
  const data = item || { name: '', role: '', image: '', description: '', order_index: 0 };

  modal.innerHTML = `
    <div class="admin-modal-head">
      <h3 class="admin-h">${isEdit ? 'Edit' : 'Add'} Team Member</h3>
      <button class="admin-modal-close" onclick="closeModal()">${ICONS['x']}</button>
    </div>
    <form id="entity-form">
      <div class="blog-grid"> <!-- reuse grid spacing: main (fields) + side (photo) -->
        <div class="blog-main">
          <div class="afield"><label>Name</label><input type="text" name="name" id="fld-name" value="${escapeAttr(data.name)}" required></div>
          <div class="afield"><label>Role</label>
            <div style="display:flex;gap:.5rem;"><select id="fld-role-sel">
              <option>CEO</option><option>Founder</option><option>Executive Director</option><option>Product Manager</option><option>UI Designer</option><option>UX Designer</option><option>Developer</option><option>Marketing Lead</option><option>Other</option>
            </select><input id="fld-role-custom" placeholder="Custom role" style="flex:1;display:none;"></div>
          </div>
          <div class="afield"><label>Professional Bio <small class="char-count" data-for="bio">0</small></label><textarea id="fld-bio" rows="6">${escapeHtml(data.description||'')}</textarea></div>

          <div class="afield-row">
            <div class="afield"><label>Email (optional)</label><input type="email" id="fld-email" placeholder="john@company.com"></div>
            <div class="afield"><label>Status</label>
              <select id="fld-status"><option value="active">Active</option><option value="hidden">Hidden</option></select>
            </div>
          </div>

          <div class="afield"><label>Social links (optional)</label>
            <input id="fld-linkedin" placeholder="LinkedIn URL"><input id="fld-twitter" placeholder="Twitter / X URL" style="margin-top:.5rem;"><input id="fld-website" placeholder="Website or portfolio" style="margin-top:.5rem;">
          </div>
        </div>

        <aside class="blog-side">
          <div class="afield"><label>Profile Photo</label>
            <div class="image-uploader">
              <div class="image-preview" id="team-image-preview">${data.image?`<img src="${escapeAttr(data.image)}">`:'<div class="empty">No image</div>'}</div>
              <input type="file" id="fld-photo-file" accept="image/*">
              <div style="margin-top:.5rem;"><label>or paste image URL</label><input type="text" id="fld-photo-url" value="${escapeAttr(data.image)}"></div>
            </div>
          </div>

          <div class="afield"><label>Display Priority</label><input type="number" id="fld-order" value="${escapeAttr(data.order_index||0)}"></div>
        </aside>
      </div>

      <div class="admin-modal-actions" style="margin-top:1rem;">
        <button type="button" class="abtn abtn-outline" onclick="closeModal()">Cancel</button>
        <button type="button" class="abtn abtn-primary" id="team-save-btn">${ICONS['check-circle-2']} ${isEdit? 'Save Changes' : 'Add Member'}</button>
      </div>
    </form>
  `;

  // role selection logic
  const roleSel = document.getElementById('fld-role-sel');
  const roleCustom = document.getElementById('fld-role-custom');
  roleSel.addEventListener('change', () => { if (roleSel.value === 'Other') roleCustom.style.display = 'block'; else { roleCustom.style.display = 'none'; roleCustom.value = ''; }});
  if (['CEO','Founder','Executive Director','Product Manager','UI Designer','UX Designer','Developer','Marketing Lead'].includes(data.role)) roleSel.value = data.role; else if (data.role) { roleSel.value = 'Other'; roleCustom.style.display='block'; roleCustom.value = data.role; }

  // photo preview
  const photoFile = document.getElementById('fld-photo-file');
  const photoUrl = document.getElementById('fld-photo-url');
  const preview = document.getElementById('team-image-preview');
  function setPreview(src){ preview.innerHTML = `<img src="${escapeAttr(src)}" alt="">`; photoUrl.value = src; }
  photoFile.addEventListener('change', (e)=>{ const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = (ev)=> setPreview(ev.target.result); r.readAsDataURL(f); });
  photoUrl.addEventListener('change', (e)=> setPreview(e.target.value));

  // bio char count
  const bio = document.getElementById('fld-bio');
  function updateBioCount(){ document.querySelectorAll('.char-count[data-for="bio"]').forEach(el=>el.textContent = String(bio.value.length)); }
  bio.addEventListener('input', updateBioCount); updateBioCount();

  document.getElementById('team-save-btn').addEventListener('click', async ()=>{
    const payload = {};
    payload.name = document.getElementById('fld-name').value.trim();
    payload.role = (roleSel.value==='Other' ? (roleCustom.value.trim()||'Other') : roleSel.value);
    payload.description = document.getElementById('fld-bio').value.trim();
    payload.image = document.getElementById('fld-photo-url').value.trim();
    payload.order_index = parseInt(document.getElementById('fld-order').value||'0',10);

    if (!payload.name) { alert('Name is required'); return; }

    try {
      if (item && item.id) { await api(`/admin/api/team/${item.id}`, { method: 'PUT', body: JSON.stringify(payload) }); showToast('Team member updated.'); }
      else { await api('/admin/api/team', { method: 'POST', body: JSON.stringify(payload) }); showToast('Team member added.'); }
      closeModal(); loadEntityList('team');
    } catch (err) { showToast(err.message,'error'); }
  });
  document.getElementById('modal-backdrop').classList.add('open');
}

// Improved Project Form - Client-friendly UI
function openProjectForm(item) {
  const isEdit = !!item;
  const data = item || {
    title: '', category: 'web', description: '', full_description: '', tags: '',
    image: '', stat1_label: '', stat1_value: '', stat2_label: '', stat2_value: '',
    stat3_label: '', stat3_value: '', challenge: '', solution: '', results: '',
    featured: false, order_index: 0
  };

  const modal = document.getElementById('modal-content');
  const tagsArray = (typeof data.tags === 'string' ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : data.tags || []);

  modal.innerHTML = `
    <div class="admin-modal-head">
      <h3 class="admin-h">${isEdit ? 'Edit' : 'Add'} Project</h3>
      <button class="admin-modal-close" onclick="closeModal()">${ICONS['x']}</button>
    </div>
    <form id="entity-form">
      <div class="project-form-grid">
        <!-- Main Content Area -->
        <div class="project-form-main">
          <!-- Basic Information Section -->
          <div class="form-section">
            <h4 class="form-section-title">📋 Basic Information</h4>
            
            <div class="afield">
              <label>Project Title <span class="required">*</span></label>
              <input type="text" name="title" value="${escapeAttr(data.title)}" required placeholder="e.g., FinTech Revolution">
            </div>

            <div class="afield-row">
              <div class="afield">
                <label>Category</label>
                <select name="category">
                  <option value="web" ${data.category === 'web' ? 'selected' : ''}>🌐 Web</option>
                  <option value="mobile" ${data.category === 'mobile' ? 'selected' : ''}>📱 Mobile</option>
                  <option value="branding" ${data.category === 'branding' ? 'selected' : ''}>🎨 Branding</option>
                  <option value="saas" ${data.category === 'saas' ? 'selected' : ''}>☁️ SaaS</option>
                </select>
              </div>
              <div class="afield">
                <label>Featured Project</label>
                <label class="afield-check">
                  <input type="checkbox" name="featured" ${data.featured ? 'checked' : ''}>
                  <span>Show on home page</span>
                </label>
              </div>
            </div>
          </div>

          <!-- Featured Image Section -->
          <div class="form-section">
            <h4 class="form-section-title">🖼️ Featured Image</h4>
            <div class="image-uploader">
              <div class="image-preview" id="project-image-preview">
                ${data.image ? `<img src="${escapeAttr(data.image)}" alt="Project">` : '<div class="empty">No image selected</div>'}
              </div>
              <input type="text" name="image" id="project-image-url" value="${escapeAttr(data.image)}" placeholder="Image URL (alternative)" style="font-size:0.85rem; color:var(--muted);">
            </div>
          </div>

          <!-- Project Description Section -->
          <div class="form-section">
            <h4 class="form-section-title">📝 Description</h4>
            
            <div class="afield">
              <label>Short Description <small class="char-count" data-for="description">${(data.description || '').length}</small> / 200</label>
              <textarea name="description" id="fld-description" maxlength="200" placeholder="Displayed on the project listing page">${escapeHtml(data.description)}</textarea>
              <div class="afield-hint">How clients will see your project at first glance.</div>
            </div>

            <div class="afield">
              <label>Full Description <small class="char-count" data-for="full_description">${(data.full_description || '').length}</small></label>
              <textarea name="full_description" id="fld-full_description" placeholder="Displayed inside the project details modal">${escapeHtml(data.full_description)}</textarea>
              <div class="afield-hint">Tell the complete story of this project.</div>
            </div>
          </div>

          <!-- Tags Section -->
          <div class="form-section">
            <h4 class="form-section-title">🏷️ Project Tags</h4>
            <div id="project-tags-container" class="project-tags">
              <div class="project-tags-list">
                ${tagsArray.map(tag => `<span class="project-tag"><span>${escapeHtml(tag)}</span><button type="button" class="tag-remove" onclick="removeProjectTag(this)">${ICONS['x']}</button></span>`).join('')}
              </div>
              <input type="hidden" name="tags" id="project-tags-input" value="${escapeAttr(data.tags)}">
              <div class="tag-input-wrapper">
                <input type="text" id="project-tag-input" placeholder="Add tag and press Enter" class="tag-input">
                <button type="button" class="abtn abtn-sm abtn-outline" onclick="addProjectTag()">Add Tag</button>
              </div>
            </div>
          </div>

          <!-- Project Metrics Section -->
          <div class="form-section">
            <h4 class="form-section-title">📊 Project Metrics</h4>
            <div class="metrics-group">
              <div class="metric-card">
                <input type="text" name="stat1_label" placeholder="Metric 1" value="${escapeAttr(data.stat1_label)}">
                <input type="text" name="stat1_value" placeholder="Value" value="${escapeAttr(data.stat1_value)}">
              </div>
              <div class="metric-card">
                <input type="text" name="stat2_label" placeholder="Metric 2" value="${escapeAttr(data.stat2_label)}">
                <input type="text" name="stat2_value" placeholder="Value" value="${escapeAttr(data.stat2_value)}">
              </div>
              <div class="metric-card">
                <input type="text" name="stat3_label" placeholder="Metric 3" value="${escapeAttr(data.stat3_label)}">
                <input type="text" name="stat3_value" placeholder="Value" value="${escapeAttr(data.stat3_value)}">
              </div>
            </div>
            <div class="afield-hint">Display key project statistics (e.g., "Users: 150K", "Growth: 300%")</div>
          </div>

          <!-- Case Study Section -->
          <div class="form-section">
            <h4 class="form-section-title">🎯 Case Study</h4>
            
            <div class="afield">
              <label>The Challenge</label>
              <textarea name="challenge" placeholder="What was the main problem or opportunity?">${escapeHtml(data.challenge)}</textarea>
            </div>

            <div class="afield">
              <label>The Solution</label>
              <textarea name="solution" placeholder="How did you approach and solve it?">${escapeHtml(data.solution)}</textarea>
            </div>

            <div class="afield">
              <label>The Results</label>
              <textarea name="results" placeholder="What were the outcomes?">${escapeHtml(data.results)}</textarea>
            </div>
          </div>

          <!-- Publishing Section -->
          <div class="form-section">
            <h4 class="form-section-title">📌 Publishing</h4>
            <div class="afield">
              <label>Project Position</label>
              <input type="number" name="order_index" value="${data.order_index}" placeholder="0">
              <div class="afield-hint">Lower numbers appear first in the portfolio.</div>
            </div>
          </div>
        </div>

        <!-- Preview Panel -->
        <div class="project-form-preview">
          <div class="preview-section">
            <h4 class="form-section-title">📱 Preview</h4>
            <div class="project-preview-card">
              <div id="preview-image" class="preview-project-image">
                ${data.image ? `<img src="${escapeAttr(data.image)}" alt="Project">` : '<div class="empty-preview">No image</div>'}
              </div>
              <div class="preview-project-info">
                <div class="preview-category">${(data.category || 'web').toUpperCase()}</div>
                <div id="preview-title" class="preview-project-title">${escapeHtml(data.title) || 'Project Title'}</div>
                <div id="preview-desc" class="preview-project-desc">${escapeHtml(data.description) || 'Short description appears here'}</div>
                ${data.stat1_label ? `<div class="preview-stat"><strong>${escapeHtml(data.stat1_label)}:</strong> ${escapeHtml(data.stat1_value)}</div>` : ''}
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
    <div class="admin-modal-actions">
      <button type="button" class="abtn abtn-outline" onclick="closeModal()">Cancel</button>
      <button type="button" class="abtn abtn-primary" id="entity-save-btn">${ICONS['check-circle-2']}${isEdit ? 'Update Project' : 'Create Project'}</button>
    </div>
  `;

  // Character counters
  document.getElementById('fld-description').addEventListener('input', (e) => {
    document.querySelector('[data-for="description"]').textContent = e.target.value.length;
  });
  document.getElementById('fld-full_description').addEventListener('input', (e) => {
    document.querySelector('[data-for="full_description"]').textContent = e.target.value.length;
  });

  // Image preview update
  document.getElementById('project-image-url').addEventListener('input', (e) => {
    const preview = document.getElementById('project-image-preview');
    if (e.target.value) {
      preview.innerHTML = `<img src="${escapeAttr(e.target.value)}" alt="Project" onerror="this.style.display='none'">`;
    } else {
      preview.innerHTML = '<div class="empty">No image selected</div>';
    }
    // Update main preview too
    const previewImg = document.getElementById('preview-image');
    if (e.target.value) {
      previewImg.innerHTML = `<img src="${escapeAttr(e.target.value)}" alt="Project" onerror="this.innerHTML='<div class=\\\"empty-preview\\\">No image</div>'">`;
    } else {
      previewImg.innerHTML = '<div class="empty-preview">No image</div>';
    }
  });

  // Live preview updates for title and description
  const titleInput = document.querySelector('input[name="title"]');
  const descInput = document.querySelector('textarea[name="description"]');
  const categorySelect = document.querySelector('select[name="category"]');
  
  titleInput.addEventListener('input', (e) => {
    document.getElementById('preview-title').textContent = e.target.value || 'Project Title';
  });
  descInput.addEventListener('input', (e) => {
    document.getElementById('preview-desc').textContent = e.target.value || 'Short description appears here';
  });
  categorySelect.addEventListener('change', (e) => {
    document.querySelector('.preview-category').textContent = (e.target.value || 'web').toUpperCase();
  });

  // Save handler
  document.getElementById("entity-save-btn").addEventListener("click", () => saveProjectEntity('projects', item?.id || null));
  document.getElementById('modal-backdrop').classList.add('open');
}

// Project tag management
window.addProjectTag = function() {
  const input = document.getElementById('project-tag-input');
  const tag = input.value.trim();
  if (!tag) return;
  const container = document.querySelector('.project-tags-list');
  const tagsInput = document.getElementById('project-tags-input');
  
  const tagSpan = document.createElement('span');
  tagSpan.className = 'project-tag';
  tagSpan.innerHTML = `<span>${escapeHtml(tag)}</span><button type="button" class="tag-remove" onclick="removeProjectTag(this)">${ICONS['x']}</button>`;
  container.appendChild(tagSpan);
  
  // Update hidden input
  const current = tagsInput.value ? tagsInput.value.split(',').map(t => t.trim()) : [];
  current.push(tag);
  tagsInput.value = current.join(', ');
  input.value = '';
};

window.removeProjectTag = function(btn) {
  const tag = btn.parentElement;
  const tagText = tag.querySelector('span').textContent;
  tag.remove();
  
  const tagsInput = document.getElementById('project-tags-input');
  const current = tagsInput.value.split(',').map(t => t.trim()).filter(t => t !== tagText);
  tagsInput.value = current.join(', ');
};

// Handle Enter key for tag input
document.addEventListener('keypress', (e) => {
  if (e.target.id === 'project-tag-input' && e.key === 'Enter') {
    e.preventDefault();
    window.addProjectTag();
  }
});

// Save project with proper field mapping
async function saveProjectEntity(tab, id) {
  const form = document.getElementById('entity-form');
  const payload = {};

  // Map form fields to API payload
  const fieldsMap = {
    title: 'title', category: 'category', description: 'description',
    full_description: 'full_description', image: 'image',
    stat1_label: 'stat1_label', stat1_value: 'stat1_value',
    stat2_label: 'stat2_label', stat2_value: 'stat2_value',
    stat3_label: 'stat3_label', stat3_value: 'stat3_value',
    challenge: 'challenge', solution: 'solution', results: 'results',
    featured: 'featured', order_index: 'order_index'
  };

  Object.keys(fieldsMap).forEach(fieldName => {
    const el = form.querySelector(`[name="${fieldName}"]`);
    if (!el) return;
    if (el.type === 'checkbox') payload[fieldsMap[fieldName]] = el.checked;
    else if (el.type === 'number') payload[fieldsMap[fieldName]] = parseInt(el.value || '0', 10);
    else payload[fieldsMap[fieldName]] = el.value;
  });

  // Handle tags separately
  const tagsInput = form.querySelector('#project-tags-input');
  if (tagsInput) {
    payload.tags = tagsInput.value.split(',').map(t => t.trim()).filter(Boolean);
  }

  try {
    const cfg = ENTITY['projects'];
    if (id) {
      await api(`${cfg.endpoint}/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      showToast('Project updated.');
    } else {
      await api(cfg.endpoint, { method: 'POST', body: JSON.stringify(payload) });
      showToast('Project created.');
    }
    closeModal();
    loadEntityList('projects');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Replace default openForm for team and blog to use specialized modals
const originalOpenForm = window.openForm;  // Capture the original function before redefining
window.openForm = function(tab, id) {
  if (tab === 'projects') {
    const item = id ? (state.cache['projects']||[]).find(i=>i.id===id) : null;
    openProjectForm(item);
    return;
  }
  if (tab === 'team') {
    const item = id ? (state.cache['team']||[]).find(i=>i.id===id) : null;
    openTeamForm(item);
    return;
  }
  if (tab === 'blog') {
    const item = id ? (state.cache['blog']||[]).find(i=>i.id===id) : null;
    openBlogForm(item);
    return;
  }
  if (tab === 'services') {
    const item = id ? (state.cache['services']||[]).find(i=>i.id===id) : null;
    openServicesForm(item);
    return;
  }
  return originalOpenForm(tab, id);
};

// Services themes for visual selector
const SERVICE_THEMES = [
  { id: 'ocean', label: 'Ocean Blue', from: '#1FA2FF', to: '#38BDF8', emoji: '🔵' },
  { id: 'royal', label: 'Royal Purple', from: '#8B5CF6', to: '#D8B4FE', emoji: '🟣' },
  { id: 'emerald', label: 'Emerald', from: '#10B981', to: '#6EE7B7', emoji: '🟢' },
  { id: 'sunset', label: 'Sunset', from: '#F97316', to: '#FED7AA', emoji: '🟠' },
  { id: 'crimson', label: 'Crimson', from: '#EF4444', to: '#FECACA', emoji: '🔴' },
  { id: 'midnight', label: 'Midnight', from: '#1F2937', to: '#6B7280', emoji: '⚫' },
];

// Icons for services (common icon names mapped to SVG paths for display)
const SERVICE_ICONS_LIST = [
  { name: 'pen-tool', label: 'Pen Tool', svg: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15.707 2.293a1 1 0 0 0-1.414 0L2.293 15.293a1 1 0 0 0 0 1.414l11.414 11.414a1 1 0 0 0 1.414 0l13-13a1 1 0 0 0 0-1.414L15.707 2.293z"/></svg>' },
  { name: 'code', label: 'Code', svg: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>' },
  { name: 'smartphone', label: 'Mobile', svg: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="12" height="20" x="6" y="2" rx="2"/><path d="M12 18h.01"/></svg>' },
  { name: 'layout-template', label: 'Template', svg: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="7" x="3" y="3" rx="1"/><rect width="9" height="7" x="3" y="14" rx="1"/><rect width="5" height="7" x="16" y="14" rx="1"/></svg>' },
  { name: 'zap', label: 'Performance', svg: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>' },
  { name: 'globe', label: 'Web', svg: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2c-4.4 8-6 11-6 15s2.7 8 6 8 6-4 6-8c0-4-1.6-7-6-15z"/></svg>' },
  { name: 'shield', label: 'Security', svg: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11.972 2.265a1 1 0 0 1 .056 0l8.992 2.568c.5.143.917.587.999 1.205.321 2.483.566 5.674-.415 8.359-1.145 3.193-3.948 5.588-6.64 7.055a1 1 0 0 1-1.968 0c-2.692-1.467-5.495-3.862-6.64-7.055-.981-2.685-.737-5.876-.415-8.359.082-.618.499-1.062.999-1.205l8.992-2.568z"/></svg>' },
  { name: 'search', label: 'SEO', svg: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>' },
];

function openServicesForm(item) {
  const isEdit = !!item;
  const modal = document.getElementById('modal-content');
  const data = item || { title: '', description: '', icon: 'pen-tool', color_from: '#1FA2FF', color_to: '#38BDF8', order_index: 0 };

  // Find matching theme based on colors
  const selectedTheme = SERVICE_THEMES.find(t => t.from === data.color_from && t.to === data.color_to) || SERVICE_THEMES[0];

  modal.innerHTML = `
    <div class="admin-modal-head">
      <h3 class="admin-h">${isEdit ? 'Edit' : 'Add'} Service</h3>
      <button class="admin-modal-close" onclick="closeModal()">${ICONS['x']}</button>
    </div>
    <form id="entity-form">
      <div class="service-form-grid">
        <div class="service-form-main">
          <!-- Basic Information -->
          <div class="form-section">
            <h4 class="form-section-title">Basic Information</h4>
            <div class="afield">
              <label>Service Title <small class="char-count" data-for="title">0</small></label>
              <input type="text" id="fld-title" value="${escapeAttr(data.title)}" required>
            </div>
            <div class="afield">
              <label>Description <small class="char-count" data-for="desc">0</small></label>
              <textarea id="fld-desc" rows="4">${escapeHtml(data.description)}</textarea>
              <div class="afield-hint">Short description displayed on the website. (Max 200 characters)</div>
            </div>
          </div>

          <!-- Appearance -->
          <div class="form-section">
            <h4 class="form-section-title">Appearance</h4>

            <!-- Theme Selector -->
            <div class="afield">
              <label>Design Theme</label>
              <div class="theme-selector">
                ${SERVICE_THEMES.map(t => `
                  <button type="button" class="theme-option ${selectedTheme.id === t.id ? 'active' : ''}" 
                    data-theme-id="${t.id}"
                    onclick="event.preventDefault(); selectServiceTheme('${t.id}', '${t.from}', '${t.to}')" title="${t.label}">
                    <span class="theme-emoji">${t.emoji}</span>
                    <span class="theme-name">${t.label}</span>
                  </button>
                `).join('')}
              </div>
            </div>

            <!-- Icon Picker -->
            <div class="afield">
              <label>Service Icon</label>
              <div class="icon-search">
                <input type="text" id="icon-search" placeholder="Search icons..." class="icon-search-input" />
              </div>
              <div class="icon-grid" id="icon-grid">
                ${SERVICE_ICONS_LIST.map(ic => `
                  <button type="button" class="icon-option ${data.icon === ic.name ? 'active' : ''}" 
                    onclick="selectServiceIcon('${ic.name}')" title="${ic.label}" data-icon-name="${ic.name}" data-icon-label="${ic.label}">
                    ${ic.svg}
                  </button>
                `).join('')}
              </div>
            </div>
          </div>

          <!-- Settings -->
          <div class="form-section">
            <h4 class="form-section-title">Settings</h4>
            <div class="afield">
              <label>Service Position</label>
              <input type="number" id="fld-order" value="${escapeAttr(data.order_index || 0)}">
              <div class="afield-hint">Lower numbers appear first</div>
            </div>
          </div>
        </div>

        <!-- Preview Panel -->
        <aside class="service-form-preview">
          <div class="preview-section">
            <h4 class="form-section-title">Preview</h4>
            <div class="service-preview" id="service-preview">
              <div class="preview-icon-container" id="preview-icon-bg" style="background: linear-gradient(135deg, ${data.color_from}, ${data.color_to});">
                <div id="preview-icon">${SERVICE_ICONS_LIST.find(ic => ic.name === data.icon)?.svg || ''}</div>
              </div>
              <div class="preview-title" id="preview-title">${escapeHtml(data.title) || 'Service Title'}</div>
              <div class="preview-desc" id="preview-desc">${escapeHtml(data.description).slice(0, 80) || 'Service description...'}</div>
            </div>
            <div class="preview-hint">Changes update instantly above</div>
          </div>
        </aside>
      </div>

      <div class="admin-modal-actions" style="margin-top:1.5rem;">
        <button type="button" class="abtn abtn-outline" onclick="closeModal()">Cancel</button>
        <button type="button" class="abtn abtn-primary" id="service-save-btn">${ICONS["check-circle-2"]} ${isEdit ? 'Save Changes' : 'Add Service'}</button>
      </div>
    </form>
  `;

  // Character counters
  const titleEl = document.getElementById('fld-title');
  const descEl = document.getElementById('fld-desc');
  function updateCharCount(name) {
    document.querySelectorAll(`.char-count[data-for="${name}"]`).forEach(el => {
      const count = name === 'title' ? titleEl.value.length : descEl.value.length;
      el.textContent = count;
    });
  }
  titleEl.addEventListener('input', () => { updateCharCount('title'); updatePreview(); });
  descEl.addEventListener('input', () => { updateCharCount('desc'); updatePreview(); });

  // Icon search
  const iconSearch = document.getElementById('icon-search');
  iconSearch.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('.icon-option').forEach(btn => {
      const label = btn.getAttribute('data-icon-label').toLowerCase();
      btn.style.display = label.includes(q) ? '' : 'none';
    });
  });

  // Live preview updates
  window.selectServiceTheme = (id, from, to) => {
    document.querySelectorAll('.theme-option').forEach(b => b.classList.remove('active'));
    document.querySelector(`[data-theme-id="${id}"]`).classList.add('active');
    document.getElementById('preview-icon-bg').style.background = `linear-gradient(135deg, ${from}, ${to})`;
  };
  
  window.selectServiceIcon = (iconName) => {
    document.querySelectorAll('.icon-option').forEach(b => b.classList.remove('active'));
    event.target.closest('.icon-option').classList.add('active');
    const icon = SERVICE_ICONS_LIST.find(ic => ic.name === iconName);
    if (icon) document.getElementById('preview-icon').innerHTML = icon.svg;
  };

  function updatePreview() {
    document.getElementById('preview-title').textContent = titleEl.value || 'Service Title';
    document.getElementById('preview-desc').textContent = (descEl.value.slice(0, 80) || 'Service description...');
  }

  // Save handler
  document.getElementById('service-save-btn').addEventListener('click', async () => {
    const selectedThemeEl = document.querySelector('.theme-option.active');
    const selectedThemeId = selectedThemeEl ? selectedThemeEl.getAttribute('data-theme-id') : SERVICE_THEMES[0].id;
    const selectedThemeData = SERVICE_THEMES.find(t => t.id === selectedThemeId) || SERVICE_THEMES[0];
    
    const selectedIconEl = document.querySelector('.icon-option.active');
    const selectedIcon = selectedIconEl ? selectedIconEl.getAttribute('data-icon-name') : data.icon;

    const payload = {
      title: titleEl.value.trim(),
      description: descEl.value.trim(),
      icon: selectedIcon,
      color_from: selectedThemeData.from,
      color_to: selectedThemeData.to,
      order_index: parseInt(document.getElementById('fld-order').value || '0', 10)
    };

    if (!payload.title) { alert('Service title is required'); return; }

    try {
      if (item && item.id) {
        await api(`/admin/api/services/${item.id}`, { method: 'PUT', body: JSON.stringify(payload) });
        showToast('Service updated.');
      } else {
        await api('/admin/api/services', { method: 'POST', body: JSON.stringify(payload) });
        showToast('Service created.');
      }
      closeModal(); loadEntityList('services');
    } catch (err) { showToast(err.message, 'error'); }
  });

  updateCharCount('title'); updateCharCount('desc');
  document.getElementById('modal-backdrop').classList.add('open');
}
