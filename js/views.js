/* ============================================================
   Axiom — VIEWS
   One render function per screen. Each takes a container element,
   fetches through the service layer (Promises, like real API
   calls), and renders + wires up interactivity.
   ============================================================ */
(function(){
  "use strict";
  var D = window.AX.data, S = window.AX.services, C = window.AX.components, U = D.util, esc = C.esc;

  function statCard(num, label, tone){
    var color = tone==="clay"?"var(--clay)":tone==="amber"?"var(--amber)":tone==="sage"?"var(--sage)":"var(--ink)";
    return '<div class="card stat-card"><div class="stat-num" style="color:'+color+'">'+num+'</div><div class="stat-label">'+esc(label)+'</div></div>';
  }

  /* =========================================================
     STUDENT: DASHBOARD
     ========================================================= */
  function studentDashboard(el){
    el.innerHTML = '<div class="dash-stats">'+C.skeletonRows(1,132)+C.skeletonRows(1,132)+C.skeletonRows(1,132)+C.skeletonRows(1,132)+'</div>';
    var stu = D.currentStudent;
    Promise.all([
      S.Workload.getStudentWorkload(stu.id),
      S.Announcement.getForStudent(stu.id),
      S.Task.getConflictsForSection(stu.section, null, 3),
      S.Task.getTasksForStudent(stu.id)
    ]).then(function(res){
      var wl = res[0], anns = res[1], conflicts = res[2], tasks = res[3];
      var emergency = anns.filter(function(a){return a.level==="emergency";});
      var otherAnns = anns.filter(function(a){return a.level!=="emergency";});
      var upcoming = wl.upcoming.slice().sort(function(a,b){return U.parseDate(a.dueDate)-U.parseDate(b.dueDate);}).slice(0,4);

      // progress by subject
      var bySubject = {};
      function isDone(t){ return t.submissionMethod==="external" ? S.Submission.isExternalDone(t.id, stu.id) : !!(t.submission && t.submission.status==="completed"); }
      tasks.forEach(function(t){
        var key = t.subjectCode;
        bySubject[key] = bySubject[key] || { name:t.subjectName, total:0, done:0 };
        bySubject[key].total++;
        if(isDone(t)) bySubject[key].done++;
      });
      var subjectKeys = Object.keys(bySubject);
      var totalDone = tasks.filter(isDone).length;
      var overallPct = tasks.length ? Math.round(totalDone/tasks.length*100) : 0;

      var needs = wl.overdue.length + wl.upcoming.length;
      var levelWord = wl.intensity>=70 ? "Heavy week" : (wl.intensity>=40 ? "Moderate week" : "Light week");
      var catchupLine = needs === 0 ? 'Nothing overdue and nothing due in the next 7 days.'
        : (wl.overdue.length ? wl.overdue.length+' overdue and '+wl.upcoming.length+' due this week, in priority order.'
                             : wl.upcoming.length+' due this week, in priority order.');
      var dateLabel = D.TODAY.toLocaleDateString('en-US',{weekday:'long', month:'long', day:'numeric'});

      function kpi(ic, label, valueHtml, caption, tone){
        return '<div class="card kpi'+(tone?' tone-'+tone:'')+'">'+
          '<div class="kpi-head"><span class="kpi-ic">'+C.icon(ic,15)+'</span><span>'+label+'</span></div>'+
          '<div class="kpi-value">'+valueHtml+'</div>'+
          '<div class="kpi-cap">'+caption+'</div>'+
        '</div>';
      }
      function deadlineRow(t){
        var due = C.dueLabel(t.dueDate);
        return '<div class="dash-item is-link" data-task-id="'+t.id+'" role="link" tabindex="0">'+
          '<span class="dash-bar '+C.typeBarClass(t.type)+'"></span>'+
          '<div class="dash-item-main"><div class="dash-item-title">'+esc(t.title)+'</div>'+
          '<div class="dash-item-sub">'+esc(t.subjectCode)+' · '+esc(t.type)+'</div></div>'+
          '<span class="badge '+due.cls+'">'+due.text+'</span>'+
        '</div>';
      }
      function progressRow(k){
        var st = bySubject[k];
        var pct = st.total ? Math.round(st.done/st.total*100) : 0;
        return '<div class="dash-item">'+
          '<div class="dash-item-main">'+
            '<div class="dash-item-top"><span class="dash-item-title">'+esc(k)+' <span class="dash-item-name">'+esc(st.name)+'</span></span><span class="dash-frac">'+st.done+'/'+st.total+'</span></div>'+
            '<div class="progress-track"><div class="progress-fill" style="width:'+pct+'%;"></div></div>'+
          '</div>'+
        '</div>';
      }
      function announcementRow(a){
        var ic = a.level==="important" ? "alert-circle" : "pin";
        return '<div class="dash-item">'+
          '<span class="dash-ic lvl-'+a.level+'">'+C.icon(ic,15)+'</span>'+
          '<div class="dash-item-main"><div class="dash-item-title">'+esc(a.title)+'</div>'+
          '<div class="dash-item-sub">'+esc(a.professorName)+' · '+esc(a.subjectCode)+'</div></div>'+
          '<span class="dash-date">'+esc(U.fmtDateLabel(U.parseDate(a.postedAt)))+'</span>'+
        '</div>';
      }

      var html = '';

      /* ---- intro ---- */
      html += '<div class="dashboard-intro">'+
        '<div><h1 class="dashboard-heading">Stay on top of your semester</h1>'+
        '<p class="dashboard-description">Here\u2019s what needs your attention right now.</p></div>'+
        '<div class="dashboard-date">'+dateLabel+'</div>'+
      '</div>';

      /* ---- alerts (full width) ---- */
      if(emergency.length){
        html += emergency.map(C.announcementBanner).join('') + '<div style="height:6px;"></div>';
      }
      html += C.conflictWarning(conflicts.length, 3, "student", conflicts);

      /* ---- row 1: four equal KPI cards ---- */
      html += '<div class="dash-stats">'+
        kpi('bar-chart','Workload', C.workloadRing(wl.intensity), levelWord)+
        kpi('alert-circle','Overdue', '<span class="kpi-num">'+wl.overdue.length+'</span>', wl.overdue.length ? 'Needs attention now' : 'Nothing overdue', wl.overdue.length ? 'clay' : '')+
        kpi('clock','Due this week', '<span class="kpi-num">'+wl.upcoming.length+'</span>', 'In the next 7 days', wl.upcoming.length ? 'amber' : '')+
        kpi('check-circle','Completed', '<span class="kpi-num">'+wl.completed.length+'</span><span class="kpi-of">of '+wl.total+'</span>', overallPct+'% of all tasks', 'sage')+
      '</div>';

      /* ---- row 2: deadlines | progress ---- */
      html += '<div class="dash-row">';
      html += '<section class="card dash-card"><div class="section-head"><h2>Upcoming deadlines</h2><button class="link-btn" data-nav="tasks">View all tasks</button></div>'+
        '<div class="dash-list">'+
          (upcoming.length ? upcoming.map(deadlineRow).join('') : '<div class="dash-empty">'+C.emptyState('🎉','All caught up','Nothing due in the next 7 days.')+'</div>')+
        '</div></section>';

      html += '<section class="card dash-card"><div class="section-head"><h2>Progress by subject</h2><span class="dash-meta">'+overallPct+'% overall</span></div>'+
        '<div class="dash-list">'+
          (subjectKeys.length ? subjectKeys.slice(0,4).map(progressRow).join('') : '<div class="dash-empty">'+C.emptyState('✨','Nothing tracked yet','Progress appears once tasks are assigned.')+'</div>')+
        '</div></section>';
      html += '</div>';

      /* ---- row 3: announcements | catch up ---- */
      html += '<div class="dash-row">';
      html += '<section class="card dash-card"><div class="section-head"><h2>Announcements</h2><button class="link-btn" data-nav="announcements">See all</button></div>'+
        '<div class="dash-list">'+
          (otherAnns.length ? otherAnns.slice(0,3).map(announcementRow).join('') : '<div class="dash-empty">'+C.emptyState('📭','No other announcements','Urgent notices appear above.')+'</div>')+
        '</div></section>';

      html += '<section class="card dash-card dash-catchup">'+
        '<div class="section-head"><h2>Catch Up Mode</h2></div>'+
        '<div class="catchup-body">'+
          '<div class="catchup-num">'+needs+'</div>'+
          '<div class="catchup-text"><strong>'+(needs===1?'task needs':'tasks need')+' you</strong>'+
          '<span>'+catchupLine+'</span></div>'+
        '</div>'+
        '<button class="btn btn-light" data-nav="catchup">Open Catch Up</button>'+
      '</section>';
      html += '</div>';

      el.innerHTML = html;
      wireNav(el);
      el.querySelectorAll('[data-task-id]').forEach(function(row){
        function open(){ window.location.hash = '#/student/task/' + row.dataset.taskId; }
        row.addEventListener('click', open);
        row.addEventListener('keydown', function(e){ if(e.key==='Enter' || e.key===' '){ e.preventDefault(); open(); } });
      });
    });
  }

  /* =========================================================
     STUDENT: MY TASKS
     ========================================================= */
  function studentTasks(el){
    var state = { type:"All", status:"All" };
    var stu = D.currentStudent;
    el.innerHTML = C.skeletonRows(4, 78);
    S.Task.getTasksForStudent(stu.id).then(function(tasks){
      render(tasks);
    });

    function statusOf(t){
      if(t.submissionMethod==="external") return S.Submission.isExternalDone(t.id, stu.id) ? "completed" : (U.daysUntil(t.dueDate)<0 ? "overdue" : "pending");
      return t.submission ? t.submission.status : "pending";
    }

    function render(tasks){
      var types = ["All"].concat(Array.from(new Set(tasks.map(function(t){return t.type;}))));
      var statuses = ["All","pending","completed","overdue","awaiting_verification"];
      var filtered = tasks.filter(function(t){
        if(state.type!=="All" && t.type!==state.type) return false;
        if(state.status!=="All" && statusOf(t)!==state.status) return false;
        return true;
      }).sort(function(a,b){return U.parseDate(a.dueDate)-U.parseDate(b.dueDate);});

      var html = '<div class="card" style="margin-bottom:14px;">';
      html += '<div class="chip-row" style="margin-bottom:10px;">'+types.map(function(t){
        return '<button class="filter-chip '+(state.type===t?'active':'')+'" data-type="'+t+'">'+t+'</button>';
      }).join('')+'</div>';
      html += '<div class="chip-row">'+statuses.map(function(s){
        var label = s==="All"?"All statuses":s==="awaiting_verification"?"Awaiting verification":s.charAt(0).toUpperCase()+s.slice(1);
        return '<button class="filter-chip '+(state.status===s?'active':'')+'" data-status="'+s+'">'+label+'</button>';
      }).join('')+'</div>';
      html += '</div>';

      html += '<div id="taskList">';
      if(!filtered.length) html += '<div class="card">'+C.emptyState('🔍','No tasks match','Try a different filter combination.')+'</div>';
      else filtered.forEach(function(t){ html += taskCardWithActions(t, stu); });
      html += '</div>';

      el.innerHTML = html;
      
      el.querySelectorAll('[data-task-id]').forEach(function(card){
  card.onclick = function(e){
    if(e.target.closest('button, a')) return;

    window.location.hash = '#/student/task/' + card.dataset.taskId;
  };
});

      el.querySelectorAll('[data-type]').forEach(function(b){ b.onclick = function(){ state.type=b.dataset.type; render(tasks); }; });
      el.querySelectorAll('[data-status]').forEach(function(b){ b.onclick = function(){ state.status=b.dataset.status; render(tasks); }; });
      wireTaskActions(el, tasks, stu, function(){ S.Task.getTasksForStudent(stu.id).then(render); });
    }
  }

  function taskCardWithActions(t, stu){
    var actions = "";
    if(t.submissionMethod === "online"){
      var st = t.submission ? t.submission.status : "pending";
      if(st === "pending" || st === "overdue") actions = '<button class="btn btn-primary btn-sm" data-upload="'+t.id+'">Upload submission</button>';
      else actions = '<span style="font-size:12px;color:var(--sage);">📎 '+esc(t.submission.fileName)+'</span>';
    } else if(t.submissionMethod === "offline"){
      var st2 = t.submission ? t.submission.status : "pending";
      if(st2 === "pending" || st2 === "overdue") actions = '<button class="btn btn-secondary btn-sm" data-markdone="'+t.id+'">Mark as completed</button>';
      else if(st2 === "awaiting_verification") actions = '<span style="font-size:12px;color:var(--amber);">⏳ Waiting for professor to verify</span>';
      else actions = '<span style="font-size:12px;color:var(--sage);">✓ Verified by professor</span>';
    } else {
      var done = S.Submission.isExternalDone(t.id, stu.id);
      actions = '<a class="btn btn-secondary btn-sm" href="'+t.externalUrl+'" target="_blank" rel="noopener">Open external form ↗</a>';
      if(!done) actions += ' <button class="btn btn-ghost btn-sm" data-extdone="'+t.id+'">I\u2019ve submitted this</button>';
      else actions += ' <span style="font-size:12px;color:var(--sage);">✓ Marked done by you</span>';
    }
    return C.taskCard(t, { studentId: stu.id, actionsHtml: actions });
  }

  function wireTaskActions(el, tasks, stu, onDone){
    el.querySelectorAll('[data-upload]').forEach(function(b){
      b.onclick = function(){ openUploadModal(tasks.find(function(t){return t.id===b.dataset.upload;}), stu, onDone); };
    });
    el.querySelectorAll('[data-markdone]').forEach(function(b){
      b.onclick = function(){
        S.Submission.markOfflineComplete(b.dataset.markdone, stu.id).then(function(){
          C.toast('Marked as completed — awaiting professor verification', '⏳'); onDone();
        });
      };
    });
    el.querySelectorAll('[data-extdone]').forEach(function(b){
      b.onclick = function(){
        S.Submission.reportExternalDone(b.dataset.extdone, stu.id).then(function(){
          C.toast('Nice — noted as submitted', '✓'); onDone();
        });
      };
    });
  }

  function openUploadModal(task, stu, onDone){
    C.openModal(
      '<div class="modal-head"><h3>Upload submission</h3><button class="modal-close" id="mClose">✕</button></div>'+
      '<p style="font-size:13px;color:var(--ink-soft);margin-bottom:14px;">'+esc(task.title)+' · '+esc(task.subjectCode)+'</p>'+
      '<div class="field"><label>File</label>'+
        '<div id="dropZone" style="border:1.5px dashed var(--line); border-radius:10px; padding:26px; text-align:center; cursor:pointer; font-size:13px; color:var(--ink-soft);">'+
        '<div style="font-size:22px;margin-bottom:6px;">📄</div>Click to choose a file<br><span style="font-size:11.5px;">PDF, DOCX, ZIP up to 25MB</span>'+
        '<input type="file" id="fileInput" style="display:none;"></div>'+
      '</div>'+
      '<div id="uploadProgress" style="display:none;"><div class="progress-track"><div class="progress-fill" id="pfill" style="width:0%;"></div></div><div style="font-size:11.5px;color:var(--ink-soft);margin-top:6px;" id="pText">Uploading to secure storage…</div></div>'+
      '<div style="margin-top:16px; display:flex; gap:8px; justify-content:flex-end;">'+
      '<button class="btn btn-secondary" id="mCancel">Cancel</button>'+
      '<button class="btn btn-primary" id="mSubmit" disabled>Submit</button></div>',
      function(modal){
        var chosen = null;
        modal.querySelector('#mClose').onclick = C.closeModal;
        modal.querySelector('#mCancel').onclick = C.closeModal;
        var dz = modal.querySelector('#dropZone'), fi = modal.querySelector('#fileInput'), submitBtn = modal.querySelector('#mSubmit');
        dz.onclick = function(){ fi.click(); };
        fi.onchange = function(){
          if(fi.files[0]){ chosen = fi.files[0]; dz.innerHTML = '<div style="font-size:20px;">✅</div>Selected: <strong>'+esc(chosen.name)+'</strong>'; submitBtn.disabled = false; }
        };
        submitBtn.onclick = function(){
          submitBtn.disabled = true; submitBtn.textContent = 'Uploading…';
          modal.querySelector('#uploadProgress').style.display='block';
          var fill = modal.querySelector('#pfill'), pct=0;
          var iv = setInterval(function(){ pct=Math.min(96,pct+Math.random()*30); fill.style.width=pct+'%'; }, 140);
          S.Submission.uploadFile(chosen).then(function(res){
            return S.Submission.submitOnline(task.id, stu.id, res.name);
          }).then(function(){
            clearInterval(iv); fill.style.width='100%';
            setTimeout(function(){ C.closeModal(); C.toast('Submission uploaded successfully','✓'); onDone(); }, 250);
          });
        };
      }
    );
  }

  /* =========================================================
     STUDENT: CALENDAR
     ========================================================= */
  function studentCalendar(el){
    var stu = D.currentStudent;
    var view = { year: D.TODAY.getFullYear(), month: D.TODAY.getMonth() };
    el.innerHTML = C.skeletonRows(1,320);
    S.Task.getTasksForStudent(stu.id).then(function(tasks){ render(tasks); });

    function render(tasks){
      var byDate = {};
      tasks.forEach(function(t){ (byDate[t.dueDate] = byDate[t.dueDate]||[]).push(t); });
      var monthName = new Date(view.year, view.month, 1).toLocaleDateString('en-US',{month:'long', year:'numeric'});
      var html = '<div class="card">';
      html += '<div class="section-head"><h2>'+monthName+'</h2><div style="display:flex;gap:6px;">'+
        '<button class="btn btn-secondary btn-sm" id="prevM">‹</button>'+
        '<button class="btn btn-secondary btn-sm" id="todayM">Today</button>'+
        '<button class="btn btn-secondary btn-sm" id="nextM">›</button></div></div>';
      html += C.calendarGrid(view.year, view.month, byDate, U.fmtDate(D.TODAY));
      html += '</div>';
      el.innerHTML = html;

el.querySelectorAll('[data-task-id]').forEach(function(cell){
  cell.onclick = function(){
    if(!cell.dataset.taskId) return;
    window.location.hash = '#/student/task/' + cell.dataset.taskId;
  };
});
      el.querySelector('#prevM').onclick = function(){ view.month--; if(view.month<0){view.month=11;view.year--;} render(tasks); };
      el.querySelector('#nextM').onclick = function(){ view.month++; if(view.month>11){view.month=0;view.year++;} render(tasks); };
      el.querySelector('#todayM').onclick = function(){ view.year=D.TODAY.getFullYear(); view.month=D.TODAY.getMonth(); render(tasks); };
    }
  }

  /* =========================================================
     STUDENT: NOTIFICATIONS
     ========================================================= */
  function studentNotifications(el){
    var stu = D.currentStudent;
    el.innerHTML = C.skeletonRows(5,60);
    Promise.all([S.Workload.getStudentWorkload(stu.id), S.Announcement.getForStudent(stu.id)]).then(function(res){
      var wl = res[0], anns = res[1];
      var items = [];
      anns.forEach(function(a){ items.push({ time:a.postedAt, kind:'ann', level:a.level, data:a }); });
      wl.upcoming.forEach(function(t){ items.push({ time:t.dueDate, kind:'reminder', data:t }); });
      wl.overdue.forEach(function(t){ items.push({ time:t.dueDate, kind:'overdue', data:t }); });
      items.sort(function(a,b){ return U.parseDate(b.time)-U.parseDate(a.time); });

      var html = '<div class="card">';
      if(!items.length) html += C.emptyState('🔔','No notifications','Reminders and announcements will show up here.');
      else items.forEach(function(it){
        var ic = it.kind==='ann' ? (it.level==='emergency'?'alert-tri':it.level==='important'?'alert-circle':'pin') : it.kind==='overdue' ? 'clock' : 'calendar';
        var tone = it.kind==='ann' ? (it.level==='emergency'?'var(--clay)':it.level==='important'?'var(--amber)':'var(--blue)') : it.kind==='overdue' ? 'var(--clay)' : 'var(--ink-soft)';
        var text = it.kind==='ann' ? it.data.title : it.kind==='overdue' ? '"'+it.data.title+'" is overdue' : '"'+it.data.title+'" due '+C.dueLabel(it.data.dueDate).text.toLowerCase();
        html += '<div class="list-row"><div style="color:'+tone+';">'+C.icon(ic,17)+'</div><div style="flex:1;"><div style="font-size:13.5px;font-weight:600;">'+esc(text)+'</div>'+
          '<div style="font-size:11.5px;color:var(--ink-faint);">'+U.fmtDateLabel(U.parseDate(it.time))+'</div></div></div>';
      });
      html += '</div>';
      el.innerHTML = html;
    });
  }

  /* =========================================================
     STUDENT: SUBMISSIONS
     ========================================================= */
  function studentSubmissions(el){
    var stu = D.currentStudent;
    var filter = "All";
    el.innerHTML = C.skeletonRows(4,50);
    S.Task.getTasksForStudent(stu.id).then(function(tasks){ render(tasks); });

    function statusOf(t){
      if(t.submissionMethod==="external") return S.Submission.isExternalDone(t.id, stu.id) ? "completed" : (U.daysUntil(t.dueDate)<0?"overdue":"pending");
      return t.submission ? t.submission.status : "pending";
    }
    function render(tasks){
      var tabs = ["All","completed","pending","overdue","awaiting_verification"];
      var rows = tasks.filter(function(t){ return filter==="All" || statusOf(t)===filter; }).sort(function(a,b){return U.parseDate(b.dueDate)-U.parseDate(a.dueDate);});
      var html = '<div class="chip-row" style="margin-bottom:14px;">'+tabs.map(function(t){
        var label = t==="All"?"All":t==="awaiting_verification"?"Awaiting verification":t.charAt(0).toUpperCase()+t.slice(1);
        return '<button class="filter-chip '+(filter===t?'active':'')+'" data-f="'+t+'">'+label+'</button>';
      }).join('')+'</div>';
      html += '<div class="card"><div class="table-wrap"><table><thead><tr><th>Task</th><th>Subject</th><th>Method</th><th>Due date</th><th>Status</th></tr></thead><tbody>';
      if(!rows.length) html += '<tr><td colspan="5">'+C.emptyState('📭','Nothing here','No submissions match this filter.')+'</td></tr>';
      rows.forEach(function(t){
        html += '<tr><td>'+esc(t.title)+'</td><td>'+esc(t.subjectCode)+'</td><td>'+C.methodTag(t.submissionMethod)+'</td>'+
          '<td>'+U.fmtDateLabel(U.parseDate(t.dueDate))+'</td><td>'+C.statusBadge(statusOf(t))+'</td></tr>';
      });
      html += '</tbody></table></div></div>';
      el.innerHTML = html;

el.querySelectorAll('[data-task-id]').forEach(function(card){
  card.onclick = function(e){
    if(e.target.closest('button, a')) return;

    window.location.hash = '#/student/task/' + card.dataset.taskId;
  };
});

el.querySelectorAll('[data-type]').forEach(function(b){
  b.onclick = function(){
    state.type=b.dataset.type;
    render(tasks);
  };
});
    }
  }

  /* =========================================================
     STUDENT: ANNOUNCEMENTS
     ========================================================= */
  function studentAnnouncements(el){
    var stu = D.currentStudent;
    var filter = "All";
    el.innerHTML = C.skeletonRows(3,90);
    S.Announcement.getForStudent(stu.id).then(function(anns){ render(anns); });
    function render(anns){
      var levels = ["All","emergency","important","general"];
      var filtered = filter==="All" ? anns : anns.filter(function(a){return a.level===filter;});
      var html = '<div class="chip-row" style="margin-bottom:14px;">'+levels.map(function(l){
        return '<button class="filter-chip '+(filter===l?'active':'')+'" data-l="'+l+'">'+(l==="All"?"All":l.charAt(0).toUpperCase()+l.slice(1))+'</button>';
      }).join('')+'</div>';
      if(!filtered.length) html += '<div class="card">'+C.emptyState('📭','No announcements','Nothing posted for this filter yet.')+'</div>';
      else html += filtered.map(function(a){ return C.announcementBanner(a); }).join('<div style="height:10px;"></div>');
      el.innerHTML = html;
      el.querySelectorAll('[data-l]').forEach(function(b){ b.onclick=function(){ filter=b.dataset.l; render(anns); }; });
    }
  }

  /* =========================================================
     STUDENT: PROGRESS
     ========================================================= */
  function studentProgress(el){
    var stu = D.currentStudent;
    el.innerHTML = C.skeletonRows(3,90);
    S.Task.getTasksForStudent(stu.id).then(function(tasks){
      var bySubject = {};
      tasks.forEach(function(t){
        var key = t.subjectCode;
        bySubject[key] = bySubject[key] || { name:t.subjectName, total:0, done:0 };
        bySubject[key].total++;
        var done = t.submissionMethod==="external" ? S.Submission.isExternalDone(t.id, stu.id) : (t.submission && t.submission.status==="completed");
        if(done) bySubject[key].done++;
      });
      var totalDone = tasks.filter(function(t){ return t.submissionMethod==="external" ? S.Submission.isExternalDone(t.id, stu.id) : (t.submission && t.submission.status==="completed"); }).length;
      var overallPct = tasks.length ? Math.round(totalDone/tasks.length*100) : 0;

      var html = '<div class="grid grid-3">';
      html += '<div class="card stat-card"><div class="workload-meter">'+C.workloadRing(overallPct)+'<div><div class="stat-label">Overall completion</div><div style="font-size:12px;color:var(--ink-faint);margin-top:3px;">'+totalDone+' of '+tasks.length+' tasks</div></div></div></div>';
      html += statCard(tasks.filter(function(t){return U.daysUntil(t.dueDate)<0 && (t.submission?t.submission.status!=='completed':true);}).length, "Overdue", "clay");
      html += statCard(Object.keys(bySubject).length, "Active subjects", "sage");
      html += '</div><div style="height:16px;"></div>';

      html += '<div class="card"><div class="section-head"><h2>Progress by subject</h2></div>';
      Object.keys(bySubject).forEach(function(k){
        var s = bySubject[k];
        var pct = s.total ? Math.round(s.done/s.total*100) : 0;
        html += '<div style="margin-bottom:14px;"><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:5px;">'+
          '<span style="font-weight:600;">'+esc(k)+' · '+esc(s.name)+'</span><span style="color:var(--ink-soft);">'+s.done+'/'+s.total+'</span></div>'+
          '<div class="progress-track"><div class="progress-fill" style="width:'+pct+'%; background:'+(pct>=70?'var(--sage)':pct>=40?'var(--amber)':'var(--clay)')+';"></div></div></div>';
      });
      html += '</div>';
      el.innerHTML = html;
    });
  }

  /* =========================================================
     STUDENT: CATCH UP MODE
     ========================================================= */
  function studentCatchUp(el){
    var stu = D.currentStudent;
    el.innerHTML = C.skeletonRows(4,70);
    S.Workload.getStudentWorkload(stu.id).then(function(wl){
      var dueSoon = wl.upcoming.filter(function(t){ return U.daysUntil(t.dueDate) <= 2; });
      var dueThisWeek = wl.upcoming.filter(function(t){ return U.daysUntil(t.dueDate) > 2; });
      var sections = [
        { title:"Overdue — handle first", items: wl.overdue, tone:"clay" },
        { title:"Due very soon (next 2 days)", items: dueSoon, tone:"amber" },
        { title:"Due later this week", items: dueThisWeek, tone:"blue" }
      ];
      var totalItems = wl.overdue.length + dueSoon.length + dueThisWeek.length;
      var html = '<div class="card" style="margin-bottom:18px; display:flex; align-items:center; gap:16px;">'+
        '<div style="flex:1;"><div style="font-size:14px; line-height:1.5;">A prioritized list, ordered by urgency — overdue first, then what\u2019s coming up.</div></div>'+
        '<div style="text-align:right; flex-shrink:0;"><div style="font-family:var(--font-display); font-size:22px; font-weight:550;">'+totalItems+'</div><div style="font-size:11px;color:var(--ink-soft);">to clear</div></div>'+
      '</div>';
      var counter = 1;
      sections.forEach(function(sec){
        html += '<div class="section-head">'+
          '<h2 style="display:flex; align-items:center; gap:9px;"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--'+sec.tone+');"></span>'+sec.title+'</h2>'+
          '<span style="font-size:12px; color:var(--ink-faint); font-weight:600;">'+sec.items.length+'</span></div>';
        if(!sec.items.length){ html += '<div class="card">'+C.emptyState('✨','Nothing here','You\u2019re clear in this category.')+'</div>'; }
        else sec.items.sort(function(a,b){return U.parseDate(a.dueDate)-U.parseDate(b.dueDate);}).forEach(function(t){
          html += '<div class="task-card" style="align-items:center;">'+
            '<div style="font-family:var(--font-display); font-weight:550; font-size:16px; color:var(--ink-faint); width:22px;">'+(counter++)+'</div>'+
            '<div class="task-bar" style="background:var(--'+sec.tone+');"></div>'+
            '<div class="task-main"><div class="task-title">'+esc(t.title)+'</div>'+
            '<div class="task-meta"><span>'+esc(t.subjectCode)+'</span>'+C.methodTag(t.submissionMethod)+'<span>'+C.dueLabel(t.dueDate).text+'</span></div></div>'+
            '<button class="btn btn-secondary btn-sm" data-nav="tasks">Open →</button>'+
            '</div>';
        });
        html += '<div style="height:14px;"></div>';
      });
      el.innerHTML = html;
      wireNav(el);
    });
  }
  /* =========================================================
   STUDENT: TASK DETAIL
   ========================================================= */
function studentTaskDetail(el, taskId){
  var stu = D.currentStudent;

  el.innerHTML = C.skeletonRows(3, 100);

  S.Task.getTasksForStudent(stu.id).then(function(tasks){

    var task = tasks.find(function(t){
      return t.id === taskId;
    });

    if(!task){
      el.innerHTML =
        '<div class="card">'+
          '<h2>Task not found</h2>'+
          '<p style="color:var(--ink-soft);margin-top:8px;">'+
            'This assignment could not be found.'+
          '</p>'+
          '<div style="margin-top:14px;">'+
            '<button class="btn btn-secondary btn-sm" id="backTasks">'+
              '← Back to My Tasks'+
            '</button>'+
          '</div>'+
        '</div>';

      el.querySelector('#backTasks').onclick = function(){
        window.location.hash = '#/student/tasks';
      };

      return;
    }

    /* =====================================================
       DETERMINE CURRENT SUBMISSION STATUS
       ===================================================== */

    var status;

    if(task.submissionMethod === "external"){
      status = S.Submission.isExternalDone(task.id, stu.id)
        ? "completed"
        : (U.daysUntil(task.dueDate) < 0 ? "overdue" : "pending");
    }else{
      status = task.submission
        ? task.submission.status
        : "pending";
    }


    /* =====================================================
       SUBMISSION AREA
       ===================================================== */

    var submissionHtml = "";

    if(task.submissionMethod === "online"){

      if(status === "pending" || status === "overdue"){

        submissionHtml =
          '<div style="margin-top:14px;">'+
            '<button class="btn btn-primary" id="uploadSubmission">'+
              '📤 Upload submission'+
            '</button>'+
          '</div>';

      }else if(task.submission){

        submissionHtml =
          '<div style="margin-top:14px;">'+
            '<div style="font-size:13px;color:var(--sage);font-weight:600;">'+
              '✓ Submission uploaded'+
            '</div>'+
            '<div style="font-size:12px;color:var(--ink-soft);margin-top:5px;">'+
              '📎 '+esc(task.submission.fileName || "Submitted file")+
            '</div>'+
            (task.submission.submittedAt
              ? '<div style="font-size:11.5px;color:var(--ink-faint);margin-top:4px;">Submitted '+esc(task.submission.submittedAt)+'</div>'
              : '')+
          '</div>';
      }

    }else if(task.submissionMethod === "offline"){

      if(status === "pending" || status === "overdue"){

        submissionHtml =
          '<div style="margin-top:14px;">'+
            '<button class="btn btn-secondary" id="markCompleted">'+
              '✓ Mark as completed'+
            '</button>'+
          '</div>';

      }else if(status === "awaiting_verification"){

        submissionHtml =
          '<div style="margin-top:14px;font-size:13px;color:var(--amber);">'+
            '⏳ Waiting for professor to verify your submission.'+
          '</div>';

      }else if(status === "completed"){

        submissionHtml =
          '<div style="margin-top:14px;font-size:13px;color:var(--sage);font-weight:600;">'+
            '✓ Verified by professor'+
          '</div>';
      }

    }else if(task.submissionMethod === "external"){

      submissionHtml =
        '<div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap;">'+
          '<a class="btn btn-secondary" href="'+esc(task.externalUrl || "#")+'" target="_blank" rel="noopener">'+
            'Open external form ↗'+
          '</a>'+
          (!S.Submission.isExternalDone(task.id, stu.id)
            ? '<button class="btn btn-ghost" id="externalDone">I’ve submitted this</button>'
            : '')+
        '</div>';
    }


    /* =====================================================
       REFERENCE / ATTACHMENT AREA
       ===================================================== */

    var referenceHtml = "";

    if(task.hasAttachment){

      referenceHtml =
        '<div class="card" style="margin-top:14px;">'+
          '<div class="section-head">'+
            '<h2>Reference material</h2>'+
          '</div>'+
          '<div style="display:flex;align-items:center;gap:10px;padding:12px;border:1px solid var(--line-soft);border-radius:10px;">'+
            '<div style="font-size:22px;">📎</div>'+
            '<div>'+
              '<div style="font-size:13px;font-weight:600;">Reference attachment</div>'+
              '<div style="font-size:11.5px;color:var(--ink-soft);">'+
                'Provided by your professor'+
              '</div>'+
            '</div>'+
          '</div>'+
        '</div>';

    }


    /* =====================================================
       SUBMISSION METHOD LABEL
       ===================================================== */

    var methodLabel = "Not specified";

    if(task.submissionMethod === "online"){
      methodLabel = "Online upload";
    }else if(task.submissionMethod === "offline"){
      methodLabel = "Offline / in class";
    }else if(task.submissionMethod === "external"){
      methodLabel = "External form";
    }


    /* =====================================================
       MAIN PAGE
       ===================================================== */

    var html =

      /* Back button */
      '<div style="margin-bottom:14px;">'+
        '<button class="btn btn-secondary btn-sm" id="backTasks">'+
          '← Back to My Tasks'+
        '</button>'+
      '</div>'+

      /* Header */
      '<div class="card" style="margin-bottom:14px;">'+

        '<div style="font-size:12px;color:var(--ink-soft);">'+
          esc(task.type || "Assignment")+
        '</div>'+

        '<h2 style="font-size:22px;margin:5px 0 8px;">'+
          esc(task.title)+
        '</h2>'+

        '<div style="font-size:13px;color:var(--ink-soft);">'+
          esc(task.subjectCode || "")+
          (task.subjectName ? " · "+esc(task.subjectName) : "")+
        '</div>'+

      '</div>'+

      /* Information + Instructions */
      '<div class="grid grid-2">'+

        '<div class="card">'+

          '<div class="section-head">'+
            '<h2>Task Information</h2>'+
          '</div>'+

          '<div style="display:grid;gap:0;">'+

            '<div class="task-detail-row">'+
              '<span>Professor</span>'+
              '<strong>'+esc(task.professorName || "Professor")+'</strong>'+
            '</div>'+

            '<div class="task-detail-row">'+
              '<span>Subject</span>'+
              '<strong>'+esc(task.subjectCode || "—")+'</strong>'+
            '</div>'+

            '<div class="task-detail-row">'+
              '<span>Section</span>'+
              '<strong>'+esc(task.section || "—")+'</strong>'+
            '</div>'+

            '<div class="task-detail-row">'+
              '<span>Task type</span>'+
              '<strong>'+esc(task.type || "Assignment")+'</strong>'+
            '</div>'+

            '<div class="task-detail-row">'+
              '<span>Issued</span>'+
              '<strong>'+esc(task.createdAt || "—")+'</strong>'+
            '</div>'+

            '<div class="task-detail-row">'+
              '<span>Due date</span>'+
              '<strong>'+U.fmtDateLabel(U.parseDate(task.dueDate))+'</strong>'+
            '</div>'+

            '<div class="task-detail-row">'+
              '<span>Priority</span>'+
              '<strong>'+esc(task.priority || "—")+'</strong>'+
            '</div>'+

            '<div class="task-detail-row">'+
              '<span>Submission method</span>'+
              '<strong>'+esc(methodLabel)+'</strong>'+
            '</div>'+

          '</div>'+

        '</div>'+

        '<div class="card">'+

          '<div class="section-head">'+
            '<h2>Instructions</h2>'+
          '</div>'+

          '<div style="font-size:13.5px;line-height:1.7;white-space:pre-wrap;">'+
            esc(task.instructions || "No additional instructions were provided.")+
          '</div>'+

        '</div>'+

      '</div>'+

      /* Status + Submission */
      '<div class="grid grid-2" style="margin-top:14px;">'+

        '<div class="card">'+

          '<div class="section-head">'+
            '<h2>Status</h2>'+
          '</div>'+

          '<div style="font-size:13px;">'+
            C.statusBadge(status)+
          '</div>'+

          submissionHtml+

        '</div>'+

        '<div class="card">'+

          '<div class="section-head">'+
            '<h2>Submission</h2>'+
          '</div>'+

          '<div class="task-detail-row">'+
            '<span>Method</span>'+
            '<strong>'+esc(methodLabel)+'</strong>'+
          '</div>'+

          '<div class="task-detail-row">'+
            '<span>Status</span>'+
            '<strong>'+C.statusBadge(status)+'</strong>'+
          '</div>'+

          (task.submission && task.submission.fileName
            ? '<div class="task-detail-row">'+
                '<span>File</span>'+
                '<strong>'+esc(task.submission.fileName)+'</strong>'+
              '</div>'
            : '')+

        '</div>'+

      '</div>'+

      referenceHtml;


    el.innerHTML = html;


    /* =====================================================
       BUTTON WIRING
       ===================================================== */

    el.querySelector('#backTasks').onclick = function(){
      window.location.hash = '#/student/tasks';
    };


    var uploadBtn = el.querySelector('#uploadSubmission');

    if(uploadBtn){
      uploadBtn.onclick = function(){
        openUploadModal(task, stu, function(){
          studentTaskDetail(el, taskId);
        });
      };
    }


    var markCompleted = el.querySelector('#markCompleted');

    if(markCompleted){
      markCompleted.onclick = function(){

        markCompleted.disabled = true;
        markCompleted.textContent = "Saving…";

        S.Submission.markOfflineComplete(task.id, stu.id).then(function(){

          C.toast(
            'Marked as completed — awaiting professor verification',
            '⏳'
          );

          studentTaskDetail(el, taskId);

        });

      };
    }


    var externalDone = el.querySelector('#externalDone');

    if(externalDone){
      externalDone.onclick = function(){

        externalDone.disabled = true;
        externalDone.textContent = "Saving…";

        S.Submission.reportExternalDone(task.id, stu.id).then(function(){

          C.toast(
            'Nice — noted as submitted',
            '✓'
          );

          studentTaskDetail(el, taskId);

        });

      };
    }

  });
}
  /* =========================================================
     STUDENT: PROFILE
     ========================================================= */
  function studentProfile(el){
    var stu = D.currentStudent;
    render(false);

    function render(editing){
      var av = stu.photo ? '<img src="'+stu.photo+'" alt="">' : esc(stu.avatarInitials);
      el.innerHTML = '<div class="card" style="max-width:480px;">'+
        '<div style="display:flex; gap:16px; align-items:center; margin-bottom:20px;">'+
          '<div class="profile-photo" id="photoWrap">'+av+
            '<label class="profile-photo-edit" for="photoInput">'+C.icon('camera',18)+'</label>'+
            '<input type="file" id="photoInput" accept="image/*" style="display:none;">'+
          '</div>'+
          '<div><h2 style="font-size:19px;">'+esc(stu.name)+'</h2><div style="font-size:13px;color:var(--ink-soft);">'+esc(stu.section)+' · Year '+stu.year+'</div></div>'+
        '</div>'+
        (editing ? editForm() : viewRows()) +
        '<div style="margin-top:18px; display:flex; gap:8px;">'+
          (editing
            ? '<button class="btn btn-primary btn-sm" id="saveProfile">Save changes</button><button class="btn btn-secondary btn-sm" id="cancelProfile">Cancel</button>'
            : '<button class="btn btn-secondary btn-sm" id="editProfile">Edit profile</button>')+
        '</div>'+
      '</div>';

      function viewRows(){
        return row("USN", stu.usn) + row("Email", stu.email) + row("Section", stu.section) + row("Year", "Year "+stu.year);
      }
      function editForm(){
        return ''+
          '<div class="profile-field"><label>Full name</label><input class="input" id="fName" value="'+esc(stu.name)+'"></div>'+
          '<div class="profile-field"><label>Email</label><input class="input" id="fEmail" type="email" value="'+esc(stu.email)+'"></div>'+
          '<div class="profile-field"><label>Section</label><input class="input" id="fSection" value="'+esc(stu.section)+'"></div>'+
          '<div class="profile-field"><label>Year</label><select class="input" id="fYear">'+
            [1,2,3,4].map(function(y){ return '<option value="'+y+'" '+(y===stu.year?'selected':'')+'>Year '+y+'</option>'; }).join('')+
          '</select></div>'+
          '<div class="profile-field" style="margin-bottom:0;"><label>USN</label><input class="input" value="'+esc(stu.usn)+'" disabled style="opacity:.6;"></div>';
      }
      function row(l,v){ return '<div class="profile-view-row"><span class="k">'+l+'</span><span class="v">'+esc(v)+'</span></div>'; }

      var photoInput = el.querySelector('#photoInput');
      if(photoInput){
        photoInput.onchange = function(e){
          var file = e.target.files && e.target.files[0];
          if(!file) return;
          var reader = new FileReader();
          reader.onload = function(ev){
            stu.photo = ev.target.result;
            window.AX.app.refreshChrome();
            render(editing);
          };
          reader.readAsDataURL(file);
        };
      }
      var editBtn = el.querySelector('#editProfile');
      if(editBtn) editBtn.onclick = function(){ render(true); };
      var cancelBtn = el.querySelector('#cancelProfile');
      if(cancelBtn) cancelBtn.onclick = function(){ render(false); };
      var saveBtn = el.querySelector('#saveProfile');
      if(saveBtn) saveBtn.onclick = function(){
        stu.name = el.querySelector('#fName').value.trim() || stu.name;
        stu.email = el.querySelector('#fEmail').value.trim() || stu.email;
        stu.section = el.querySelector('#fSection').value.trim() || stu.section;
        stu.year = parseInt(el.querySelector('#fYear').value, 10) || stu.year;
        window.AX.app.refreshChrome();
        C.toast('Profile updated', '✓');
        render(false);
      };
    }
  }

  function wireNav(el){
    el.querySelectorAll('[data-nav]').forEach(function(b){
      b.onclick = function(){ window.location.hash = '#/'+window.AX.app.role+'/'+b.dataset.nav; };
    });
  }

  window.AX.views = window.AX.views || {};
  Object.assign(window.AX.views, {
    studentDashboard: studentDashboard, studentTasks: studentTasks,studentTaskDetail: studentTaskDetail, studentCalendar: studentCalendar,
    studentNotifications: studentNotifications, studentSubmissions: studentSubmissions, studentAnnouncements: studentAnnouncements,
    studentProgress: studentProgress, studentCatchUp: studentCatchUp, studentProfile: studentProfile,
    _wireNav: wireNav, _statCard: statCard
  });
})();
