/* ============================================================
   Axiom — COMPONENTS
   Small render-to-string helpers reused across views, plus a
   couple of imperative DOM helpers (toast, modal).
   ============================================================ */
(function(){
  "use strict";
  var U = window.AX.data.util;

  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }

  // ---- minimal line-icon set (replaces emoji across the app) ----
  var ICON_PATHS = {
    grid:        '<rect x="3" y="3" width="7" height="7" rx="1.4"/><rect x="14" y="3" width="7" height="7" rx="1.4"/><rect x="3" y="14" width="7" height="7" rx="1.4"/><rect x="14" y="14" width="7" height="7" rx="1.4"/>',
    "list-check":'<path d="M9 6h11"/><path d="M9 12h11"/><path d="M9 18h11"/><path d="m3 6 1.4 1.4L7 4.8"/><path d="m3 12 1.4 1.4L7 10.8"/><path d="m3 18 1.4 1.4L7 16.8"/>',
    calendar:    '<rect x="3" y="5" width="18" height="16" rx="2.2"/><path d="M8 3v4"/><path d="M16 3v4"/><path d="M3 10h18"/>',
    bell:        '<path d="M7 9a5 5 0 0 1 10 0c0 4 1.5 5.5 2 6.4H5c.5-.9 2-2.4 2-6.4Z"/><path d="M10 19a2 2 0 0 0 4 0"/>',
    upload:      '<path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M4 16.5V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2.5"/>',
    megaphone:   '<path d="M3 10v4a1 1 0 0 0 1 1h2l5 4V5L6 9H4a1 1 0 0 0-1 1Z"/><path d="M17 9a4 4 0 0 1 0 6"/><path d="M20 6a8 8 0 0 1 0 12"/>',
    "trend-up":  '<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
    zap:         '<path d="M12 2 4 14h7l-1 8 9-13h-7l1-7Z"/>',
    user:        '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4.2 5-6.2 8-6.2s6.5 2 8 6.2"/>',
    plus:        '<path d="M12 5v14"/><path d="M5 12h14"/>',
    cap:         '<path d="m2 9 10-5 10 5-10 5-10-5Z"/><path d="M6 11.5V16c0 1.4 3 3 6 3s6-1.6 6-3v-4.5"/>',
    "bar-chart": '<path d="M5 21V10"/><path d="M12 21V4"/><path d="M19 21v-7"/>',
    "alert-tri": '<path d="M12 4 2.5 20h19L12 4Z"/><path d="M12 10v4.2"/><path d="M12 17.2v.1"/>',
    "alert-circle":'<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5"/><path d="M12 16v.1"/>',
    pin:         '<path d="M12 21s7-6.1 7-11.4A7 7 0 0 0 5 9.6C5 14.9 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.2"/>',
    inbox:       '<path d="M4 12h4l2 3h4l2-3h4"/><path d="M5.5 5h13l2.5 7v6a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5v-6Z"/>',
    sparkle:     '<path d="M12 3v4"/><path d="M12 17v4"/><path d="M3 12h4"/><path d="M17 12h4"/><path d="m6 6 2.5 2.5"/><path d="m15.5 15.5 2.5 2.5"/><path d="m18 6-2.5 2.5"/><path d="m8.5 15.5-2.5 2.5"/>',
    check:       '<path d="m5 12 5 5 9-9"/>',
    "check-circle":'<circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.5 2.5L16 9.5"/>',
    clock:       '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
    camera:      '<rect x="3" y="7" width="18" height="13" rx="2.2"/><path d="M8 7 9.6 4.3h4.8L16 7"/><circle cx="12" cy="13.4" r="3.4"/>',
    x:           '<path d="M6 6l12 12"/><path d="M18 6 6 18"/>'
  };
  function icon(name, size){
    size = size || 16;
    var body = ICON_PATHS[name] || ICON_PATHS.sparkle;
    return '<svg viewBox="0 0 24 24" width="'+size+'" height="'+size+'" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+body+'</svg>';
  }

  // ---- Axiom brand mark (an "A" with a spark above its apex) ----
  function logoMark(size){
    size = size || 18;
    return '<svg viewBox="0 0 48 48" width="'+size+'" height="'+size+'" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+
      '<path d="M9 41 24 13 39 41"/><path d="M16.5 31h15"/><circle cx="24" cy="5.6" r="2.3" fill="currentColor" stroke="none"/>'+
    '</svg>';
  }

  function statusBadge(status){
    var map = {
      completed: ["badge-completed","✓ Completed"],
      pending: ["badge-pending","Pending"],
      overdue: ["badge-overdue","Overdue"],
      awaiting_verification: ["badge-awaiting","Awaiting Verification"]
    };
    var m = map[status] || ["badge-neutral", esc(status)];
    return '<span class="badge '+m[0]+'">'+m[1]+'</span>';
  }

  function methodTag(method){
    var map = { online:["tag-online","Online Upload"], offline:["tag-offline","Offline"], external:["tag-external","External Link"] };
    var m = map[method] || ["tag", method];
    return '<span class="tag '+m[0]+'">'+m[1]+'</span>';
  }

  function typeBarClass(type){
    return { Assignment:"bar-assignment", Test:"bar-test", Lab:"bar-lab", Project:"bar-project", Presentation:"bar-presentation" }[type] || "bar-assignment";
  }

  function dueLabel(dateStr){
    var d = U.daysUntil(dateStr);
    if(d < 0) return { text: Math.abs(d)+" day"+(Math.abs(d)===1?"":"s")+" overdue", cls:"badge-overdue" };
    if(d === 0) return { text:"Due today", cls:"badge-awaiting" };
    if(d === 1) return { text:"Due tomorrow", cls:"badge-awaiting" };
    if(d <= 7) return { text:"Due in "+d+" days", cls:"badge-pending" };
    return { text:U.fmtDateLabel(new Date(dateStr)), cls:"badge-neutral" };
  }

  function priorityDot(p){
    var color = p==="High" ? "var(--clay)" : (p==="Medium" ? "var(--amber)" : "var(--ink-faint)");
    return '<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:'+color+';margin-right:5px;"></span>'+esc(p);
  }

  // ---- workload ring (SVG donut) ----
  function workloadRing(pct, size){
    size = size || 76;
    var r = size/2 - 7, c = 2*Math.PI*r, off = c*(1-Math.min(pct,100)/100);
    var color = pct >= 70 ? "var(--clay)" : (pct >= 40 ? "var(--amber)" : "var(--sage)");
    return '' +
    '<div class="wm-ring" style="width:'+size+'px;height:'+size+'px;">'+
      '<svg width="'+size+'" height="'+size+'" viewBox="0 0 '+size+' '+size+'">'+
        '<circle cx="'+size/2+'" cy="'+size/2+'" r="'+r+'" fill="none" stroke="var(--line-soft)" stroke-width="7"/>'+
        '<circle cx="'+size/2+'" cy="'+size/2+'" r="'+r+'" fill="none" stroke="'+color+'" stroke-width="7" stroke-linecap="round" stroke-dasharray="'+c+'" stroke-dashoffset="'+off+'"/>'+
      '</svg>'+
      '<div class="wm-num">'+Math.round(pct)+'</div>'+
    '</div>';
  }

  // ---- task card (used across student My Tasks, Dashboard, Catch Up) ----
  function taskCard(task, opts){
    opts = opts || {};
    var due = dueLabel(task.dueDate);
    var statusHtml = "";
    if(task.submissionMethod === "external"){
      var done = window.AX.services.Submission.isExternalDone(task.id, opts.studentId);
      statusHtml = statusBadge(done ? "completed" : "pending");
    } else if(task.submission){
      statusHtml = statusBadge(task.submission.status);
    }
    var actions = opts.actionsHtml || "";
    return '' +
    '<div class="task-card" data-task-id="'+task.id+'">'+
      '<div class="task-bar '+typeBarClass(task.type)+'"></div>'+
      '<div class="task-main">'+
        '<div class="task-top">'+
          '<div>'+
            '<div class="task-title">'+esc(task.title)+'</div>'+
            '<div style="font-size:12px;color:var(--ink-soft);">'+esc(task.subjectCode)+' · '+esc(task.subjectName)+'</div>'+
          '</div>'+
          '<div style="text-align:right; flex-shrink:0;">'+
            '<span class="badge '+due.cls+'">'+due.text+'</span>'+
          '</div>'+
        '</div>'+
        '<div class="task-meta">'+
          '<span>'+esc(task.type)+'</span>'+
          '<span>'+priorityDot(task.priority)+' priority</span>'+
          methodTag(task.submissionMethod)+
          (statusHtml ? '<span>'+statusHtml+'</span>' : '')+
        '</div>'+
        (actions ? '<div class="task-actions">'+actions+'</div>' : '')+
      '</div>'+
    '</div>';
  }

  // ---- announcement banner ----
  function announcementBanner(a){
    var ic = a.level==="emergency" ? "alert-tri" : (a.level==="important" ? "alert-circle" : "pin");
    var cls = "banner-"+(a.level==="general" ? "info" : a.level);
    var levelLabel = a.level==="emergency" ? "Emergency" : a.level==="important" ? "Important" : "General";
    var badgeCls = a.level==="emergency" ? "badge-overdue" : a.level==="important" ? "badge-awaiting" : "badge-pending";
    return '' +
    '<div class="banner '+cls+'">'+
      '<div class="ic">'+icon(ic)+'</div>'+
      '<div style="flex:1; min-width:0;">'+
        '<div style="display:flex; align-items:center; gap:8px; margin-bottom:3px; flex-wrap:wrap;">'+
          '<div class="b-title" style="margin-bottom:0;">'+esc(a.title)+'</div>'+
          '<span class="badge '+badgeCls+'" style="font-size:10px; padding:1px 7px;">'+levelLabel+'</span>'+
        '</div>'+
        '<div>'+esc(a.body)+'</div>'+
        '<div style="margin-top:6px; font-size:11.5px; color:var(--ink-faint);">'+esc(a.professorName)+' · '+esc(a.subjectCode)+' · '+esc(U.fmtDateLabel(new Date(a.postedAt)))+'</div>'+
      '</div>'+
    '</div>';
  }

 function conflictWarning(count, windowDays, audience, tasks){
  if(count < 2) return "";

  var who = audience === "professor" ? "This section has" : "You have";

  var taskList = "";

  if(tasks && tasks.length){
    taskList =
      '<div class="conflict-task-list">' +
      tasks.slice(0, 4).map(function(t){
        return '<div class="conflict-task">' +
          '<span class="conflict-task-title">' + esc(t.title) + '</span>' +
          '<span class="conflict-task-date">' +
            U.fmtDateLabel(new Date(t.dueDate)) +
          '</span>' +
        '</div>';
      }).join('') +
      '</div>';
  }

  return '' +
    '<div class="conflict-card">' +
      '<div class="conflict-icon">'+icon('alert-tri')+'</div>' +
      '<div class="conflict-content">' +
        '<div class="conflict-title">Deadline conflict detected</div>' +
        '<div class="conflict-text">' +
          who + ' ' + count +
          ' major tasks due within ' + windowDays +
          ' days of each other.' +
        '</div>' +
        taskList +
        '<div class="conflict-note">' +
          'Axiom is highlighting this workload so you can plan ahead.' +
        '</div>' +
      '</div>' +
    '</div>';
}

  // ---- mini calendar (month grid) ----
  function calendarGrid(year, month, tasksByDate, todayStr){
    var first = new Date(year, month, 1);
    var startDow = first.getDay();
    var daysInMonth = new Date(year, month+1, 0).getDate();
    var dows = ["S","M","T","W","T","F","S"];
    var html = '<div class="calendar-grid">';
    dows.forEach(function(d){ html += '<div class="cal-dow">'+d+'</div>'; });
    for(var i=0;i<startDow;i++){ html += '<div></div>'; }
    for(var day=1; day<=daysInMonth; day++){
      var dateStr = year+"-"+String(month+1).padStart(2,'0')+"-"+String(day).padStart(2,'0');
      var dayTasks = tasksByDate[dateStr] || [];
      var isToday = dateStr === todayStr;
      html += '<div class="cal-cell '+(isToday?'today':'')+' '+(dayTasks.length?'has-task':'')+'" data-task-id="'+(dayTasks.length ? dayTasks[0].id : '')+'">';
      html += '<div class="cal-date">'+day+'</div>';
      dayTasks.slice(0,3).forEach(function(t){
        var cls = t.type==="Test" ? "badge-overdue" : (t.type==="Project"?"badge-awaiting":"badge-pending");
        html += '<span class="cal-dot '+cls+'" data-task-id="'+t.id+'">'+esc(t.title.slice(0,14))+'</span>';
      });
      if(dayTasks.length>3) html += '<span class="cal-dot badge-neutral">+'+(dayTasks.length-3)+' more</span>';
      html += '</div>';
    }
    html += '</div>';
    return html;
  }

  // ---- toast ----
  function toast(msg, icon){
    var wrap = document.getElementById('toastWrap');
    var el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = '<span>'+(icon||'✓')+'</span><span>'+esc(msg)+'</span>';
    wrap.appendChild(el);
    setTimeout(function(){ el.style.opacity='0'; el.style.transition='opacity .3s'; setTimeout(function(){ el.remove(); }, 300); }, 2600);
  }

  // ---- modal ----
  function openModal(innerHtml, onMount){
    closeModal();
    var backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.id = 'axModal';
    backdrop.innerHTML = '<div class="modal">'+innerHtml+'</div>';
    backdrop.addEventListener('click', function(e){ if(e.target === backdrop) closeModal(); });
    document.body.appendChild(backdrop);
    if(onMount) onMount(backdrop);
  }
  function closeModal(){
    var el = document.getElementById('axModal');
    if(el) el.remove();
  }

  var EMPTY_ICON_MAP = {
    '🎉':'check-circle', '✅':'check-circle', '📭':'inbox', '✨':'sparkle', '🔍':'alert-circle',
    '🔔':'bell', '📎':'upload', '📄':'inbox'
  };
  function emptyState(iconGlyph, title, desc){
    var key = EMPTY_ICON_MAP[iconGlyph] || 'sparkle';
    return '<div class="empty-state"><div class="ic">'+icon(key)+'</div><div class="t">'+esc(title)+'</div><div class="d">'+esc(desc)+'</div></div>';
  }

  function skeletonRows(n, height){
    var html = "";
    for(var i=0;i<n;i++){ html += '<div class="skeleton" style="height:'+(height||44)+'px; margin-bottom:9px;"></div>'; }
    return html;
  }

  window.AX.components = {
    esc: esc, icon: icon, logoMark: logoMark, typeBarClass: typeBarClass, statusBadge: statusBadge, methodTag: methodTag, dueLabel: dueLabel, priorityDot: priorityDot,
    workloadRing: workloadRing, taskCard: taskCard, announcementBanner: announcementBanner, conflictWarning: conflictWarning,
    calendarGrid: calendarGrid, toast: toast, openModal: openModal, closeModal: closeModal, emptyState: emptyState, skeletonRows: skeletonRows
  };
})();
