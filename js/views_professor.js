/* ============================================================
   Axiom — PROFESSOR VIEWS
   ============================================================ */
(function(){
  "use strict";
  var D = window.AX.data, S = window.AX.services, C = window.AX.components, U = D.util, esc = C.esc;
  var statCard = window.AX.views._statCard, wireNav = window.AX.views._wireNav;

  /* =========================================================
     PROFESSOR: DASHBOARD
     ========================================================= */
  function profDashboard(el){
    var prof = D.currentProfessor;
    el.innerHTML = C.skeletonRows(3,90);
    Promise.all([S.Task.getTasksForProfessor(prof.id), S.Announcement.getForProfessor(prof.id)]).then(function(res){
      var tasks = res[0], anns = res[1];
      var openTasks = tasks.filter(function(t){ return U.daysUntil(t.dueDate) >= -2; });
      var pendingVerify = 0, totalSubs = 0, doneSubs = 0;
      tasks.forEach(function(t){
        var subs = D.submissions.filter(function(s){return s.taskId===t.id;});
        totalSubs += subs.length;
        doneSubs += subs.filter(function(s){return s.status==='completed';}).length;
        pendingVerify += subs.filter(function(s){return s.status==='awaiting_verification';}).length;
      });
      var uniqueSections = Array.from(new Set(prof.sections));

      var conflictPromises = uniqueSections.map(function(sec){ return S.Task.getConflictsForSection(sec, null, 3).then(function(c){ return {sec:sec, c:c}; }); });
      Promise.all(conflictPromises).then(function(conflictResults){
        var html = '<div class="grid grid-4">';
        html += statCard(openTasks.length, "Active tasks", "");
        html += statCard(pendingVerify, "Awaiting your verification", "amber");
        html += statCard(totalSubs? Math.round(doneSubs/totalSubs*100)+'%':'—', "Overall completion", "sage");
        html += statCard(prof.sections.length, "Sections taught", "");
        html += '</div><div style="height:16px;"></div>';

        conflictResults.forEach(function(r){
          if(r.c.length>1) html += C.conflictWarning(r.c.length, 3, "professor", r.c);
        });

        html += '<div class="grid grid-2" style="margin-top:14px;">';
        html += '<div class="card"><div class="section-head"><h2>Recent tasks</h2><button class="link-btn" data-nav="tasks">View all</button></div>';
        if(!tasks.length) html += C.emptyState('📋','No tasks yet','Create your first task to get started.');
        else tasks.slice(-4).reverse().forEach(function(t){
          var subs = D.submissions.filter(function(s){return s.taskId===t.id;});
          var done = subs.filter(function(s){return s.status==='completed';}).length;
          html += '<div class="list-row"><div style="flex:1;"><div style="font-weight:600;font-size:13.5px;">'+esc(t.title)+'</div><div style="font-size:11.5px;color:var(--ink-soft);">'+esc(t.subjectCode)+' · '+esc(t.section)+' · Due '+U.fmtDateLabel(U.parseDate(t.dueDate))+'</div></div>'+
            (subs.length? '<span class="badge badge-neutral">'+done+'/'+subs.length+' done</span>':'')+'</div>';
        });
        html += '</div>';

        html += '<div class="card"><div class="section-head"><h2>Your recent announcements</h2><button class="link-btn" data-nav="announcements">Manage</button></div>';
        if(!anns.length) html += C.emptyState('📢','No announcements','Publish one to reach your students instantly.');
        else anns.slice(0,2).forEach(function(a){ html += C.announcementBanner(a) + '<div style="height:8px;"></div>'; });
        html += '</div></div>';

        html += '<div style="height:16px;"></div><div class="card">'+
          '<div class="section-head" style="margin-bottom:10px;"><h2>Quick actions</h2></div>'+
          '<div style="display:flex; gap:10px; flex-wrap:wrap;">'+
          '<button class="btn btn-primary" data-nav="create">+ Create task</button>'+
          '<button class="btn btn-secondary" data-nav="announcements">Publish announcement</button>'+
          '<button class="btn btn-secondary" data-nav="workload">View workload</button>'+
          '</div></div>';

        el.innerHTML = html;
        wireNav(el);
      });
    });
  }

  /* =========================================================
     PROFESSOR: TASKS
     ========================================================= */
  function profTasks(el){
    var prof = D.currentProfessor;
    el.innerHTML = C.skeletonRows(4,80);
    S.Task.getTasksForProfessor(prof.id).then(function(tasks){
      tasks = tasks.slice().sort(function(a,b){ return U.parseDate(a.dueDate)-U.parseDate(b.dueDate); });
      var html = '<div class="section-head"><h2>Your tasks ('+tasks.length+')</h2><button class="btn btn-primary btn-sm" data-nav="create">+ New task</button></div>';
      if(!tasks.length) html += '<div class="card">'+C.emptyState('📋','No tasks created yet','Create your first assignment, test, lab or project.')+'</div>';
      tasks.forEach(function(t){
        var subs = D.submissions.filter(function(s){return s.taskId===t.id;});
        var done = subs.filter(function(s){return s.status==='completed';}).length;
        var awaiting = subs.filter(function(s){return s.status==='awaiting_verification';}).length;
        var pct = subs.length ? Math.round(done/subs.length*100) : 0;
        html += '<div class="task-card"><div class="task-bar '+({Assignment:'bar-assignment',Test:'bar-test',Lab:'bar-lab',Project:'bar-project',Presentation:'bar-presentation'}[t.type])+'"></div>'+
          '<div class="task-main"><div class="task-top"><div><div class="task-title">'+esc(t.title)+'</div>'+
          '<div style="font-size:12px;color:var(--ink-soft);">'+esc(t.subjectCode)+' · '+esc(t.section)+'</div></div>'+
          '<span class="badge '+C.dueLabel(t.dueDate).cls+'">'+C.dueLabel(t.dueDate).text+'</span></div>'+
          '<div class="task-meta">'+esc(t.type)+C.methodTag(t.submissionMethod)+
          (subs.length? '<span>'+done+'/'+subs.length+' completed</span>':'<span>External — self-reported</span>')+
          (awaiting? '<span style="color:var(--amber); font-weight:600;">'+awaiting+' awaiting verification</span>':'')+
          '</div>'+
          (subs.length? '<div class="progress-track" style="margin-top:9px;"><div class="progress-fill" style="width:'+pct+'%;"></div></div>':'')+
          '<div class="task-actions"><button class="btn btn-secondary btn-sm" data-view="'+t.id+'">View submissions</button></div>'+
          '</div></div>';
      });
      el.innerHTML = html;
      wireNav(el);
      el.querySelectorAll('[data-view]').forEach(function(b){ b.onclick=function(){ openSubmissionsModal(tasks.find(function(t){return t.id===b.dataset.view;})); }; });
    });
  }

  function openSubmissionsModal(task){
    C.openModal(
      '<div class="modal-head"><h3>'+esc(task.title)+'</h3><button class="modal-close" id="mClose">✕</button></div>'+
      '<div id="subBody">'+C.skeletonRows(4,40)+'</div>',
      function(modal){
        modal.querySelector('#mClose').onclick = C.closeModal;
        S.Submission.getSubmissionsForTask(task.id).then(function(subs){
          var body = modal.querySelector('#subBody');
          if(task.submissionMethod==='external'){
            body.innerHTML = C.emptyState('🔗','External submission','This task uses an external link. Completion is self-reported by students and not centrally tracked here yet.');
            return;
          }
          var html = '<div class="table-wrap"><table><thead><tr><th>Student</th><th>USN</th><th>Status</th><th></th></tr></thead><tbody>';
          subs.sort(function(a,b){return a.student.name.localeCompare(b.student.name);}).forEach(function(s){
            html += '<tr><td>'+esc(s.student.name)+'</td><td class="usn">'+esc(s.student.usn)+'</td><td>'+C.statusBadge(s.status)+'</td>'+
              '<td>'+(s.status==='awaiting_verification' ? '<button class="btn btn-primary btn-sm" data-verify="'+s.studentId+'">Verify</button>' : (s.fileName? '<span style="font-size:11.5px;color:var(--ink-soft);">'+esc(s.fileName)+'</span>':''))+'</td></tr>';
          });
          html += '</tbody></table></div>';
          body.innerHTML = html;
          body.querySelectorAll('[data-verify]').forEach(function(b){
            b.onclick = function(){
              S.Submission.verifyOffline(task.id, b.dataset.verify).then(function(){
                C.toast('Submission verified','✓'); openSubmissionsModal(task);
              });
            };
          });
        });
      }
    );
  }

  /* =========================================================
     PROFESSOR: CREATE TASK (+ AI extraction)
     ========================================================= */
  function profCreateTask(el){
    var prof = D.currentProfessor;
    var subjectsAvail = D.subjects.filter(function(s){ return prof.subjects.indexOf(s.code)!==-1; });

    var html = '<div class="grid grid-2" style="align-items:start;">';

    // AI extraction panel
    html += '<div class="card" style="grid-column:1/-1;">'+
      '<div class="section-head"><h2 style="display:flex;align-items:center;gap:8px;">'+C.icon('sparkle',17)+' AI Task Extraction (optional)</h2></div>'+
      '<p style="font-size:12.5px;color:var(--ink-soft);margin-bottom:10px;">Describe the task in plain language, e.g. "Complete Experiment 5 and submit the record by Friday." Review the extracted fields before anything is published — nothing goes live automatically.</p>'+
      '<textarea id="aiInput" placeholder="Type a natural-language task description…"></textarea>'+
      '<div style="margin-top:10px;"><button class="btn btn-secondary btn-sm" id="aiExtractBtn">Extract task details</button> <span id="aiStatus" style="font-size:12px;color:var(--ink-soft);"></span></div>'+
      '</div>';

    html += '<div class="card" style="grid-column:1/-1;">'+
      '<div class="section-head"><h2>Task details</h2></div>'+
      '<form id="taskForm">'+
      '<div class="grid grid-2">'+
        field('title','Title','text','e.g. Lab 6 — Socket Programming') +
        selectField('type','Type', ["Assignment","Test","Lab","Project","Presentation"]) +
      '</div>'+
      '<div class="grid grid-2">'+
        selectField('subjectCode','Subject', subjectsAvail.map(function(s){return s.code+' — '+s.name;})) +
        selectField('section','Section', prof.sections) +
      '</div>'+
      '<div class="grid grid-2">'+
        field('dueDate','Due date','date') +
        selectField('priority','Priority', ["Low","Medium","High"]) +
      '</div>'+
      '<div class="field"><label>Submission method</label><div class="chip-row" id="methodChips">'+
        ['online','offline','external'].map(function(m,i){ return '<button type="button" class="filter-chip '+(i===0?'active':'')+'" data-m="'+m+'">'+(m==='online'?'Online Upload':m==='offline'?'Offline':'External Link')+'</button>'; }).join('')+
      '</div></div>'+
      '<div class="field" id="externalUrlField" style="display:none;"><label>External submission URL</label><input class="input" id="externalUrl" placeholder="https://forms.example.com/…"></div>'+
      '<div class="field"><label>Instructions</label><textarea id="instructions" placeholder="What should students do?"></textarea></div>'+
      '<div class="field"><label>Attachment</label><div style="border:1.5px dashed var(--line);border-radius:8px;padding:14px;text-align:center;font-size:12.5px;color:var(--ink-soft);cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px;" id="attachZone">'+C.icon('upload',15)+' Click to attach reference material (optional)</div></div>'+
      '<div id="conflictBox"></div>'+
      '<div style="display:flex; gap:8px; margin-top:6px;"><button type="submit" class="btn btn-primary">Publish task</button><button type="button" class="btn btn-secondary" id="resetForm">Reset</button></div>'+
      '</form></div>';
    html += '</div>';
    el.innerHTML = html;

    function field(id,label,type,ph){ return '<div class="field"><label>'+label+'</label><input class="input" id="'+id+'" type="'+type+'" placeholder="'+(ph||'')+'"></div>'; }
    function selectField(id,label,opts){ return '<div class="field"><label>'+label+'</label><select id="'+id+'">'+opts.map(function(o){return '<option value="'+esc(o.split(' — ')[0])+'">'+esc(o)+'</option>';}).join('')+'</select></div>'; }

    var method = "online";
    el.querySelectorAll('#methodChips [data-m]').forEach(function(b){
      b.onclick = function(){
        method = b.dataset.m;
        el.querySelectorAll('#methodChips [data-m]').forEach(function(x){x.classList.remove('active');});
        b.classList.add('active');
        el.querySelector('#externalUrlField').style.display = method==='external' ? 'block' : 'none';
      };
    });

    // AI extraction wiring
    el.querySelector('#aiExtractBtn').onclick = function(){
      var text = el.querySelector('#aiInput').value.trim();
      if(!text){ C.toast('Type a description first',''); return; }
      el.querySelector('#aiStatus').textContent = 'Extracting…';
      S.AIExtraction.extract(text).then(function(res){
        el.querySelector('#aiStatus').textContent = 'Extracted — review below and edit anything before publishing.';
        el.querySelector('#title').value = res.title;
        el.querySelector('#type').value = res.type;
        el.querySelector('#dueDate').value = res.dueDate;
        var subjSel = el.querySelector('#subjectCode');
        if([].some.call(subjSel.options, function(o){return o.value===res.subjectCode;})) subjSel.value = res.subjectCode;
        method = res.submissionMethod;
        el.querySelectorAll('#methodChips [data-m]').forEach(function(x){ x.classList.toggle('active', x.dataset.m===method); });
        el.querySelector('#externalUrlField').style.display = method==='external' ? 'block' : 'none';
        el.querySelector('#instructions').value = text;
        C.toast('Draft extracted — confirm the fields before publishing', '✨');
      });
    };

    // live conflict check on due date change
    el.querySelector('#dueDate').addEventListener('change', function(){
      var section = el.querySelector('#section').value;
      var due = el.querySelector('#dueDate').value;
      if(!due) return;
      S.Task.getConflictsForSection(section, due, 3).then(function(conflicts){
        var box = el.querySelector('#conflictBox');
        if(conflicts.length){
          box.innerHTML = '<div class="banner banner-important" style="margin-top:4px;"><div class="ic">'+C.icon('alert-circle')+'</div><div>'+
            '<div class="b-title">'+conflicts.length+' existing task'+(conflicts.length===1?'':'s')+' already due within 3 days of this date</div>'+
            '<div>'+conflicts.map(function(c){ return esc(c.title)+' ('+esc(c.type)+', due '+U.fmtDateLabel(U.parseDate(c.dueDate))+')'; }).join(' · ')+'</div>'+
            '<div style="margin-top:4px; font-size:12px; opacity:.8;">This is informational only — the deadline won\u2019t be changed automatically.</div></div></div>';
        } else box.innerHTML = '';
      });
    });

    el.querySelector('#resetForm').onclick = function(){ el.querySelector('#taskForm').reset(); el.querySelector('#conflictBox').innerHTML=''; el.querySelector('#aiStatus').textContent=''; };

    el.querySelector('#taskForm').onsubmit = function(e){
      e.preventDefault();
      var title = el.querySelector('#title').value.trim();
      var dueDate = el.querySelector('#dueDate').value;
      if(!title || !dueDate){ C.toast('Title and due date are required',''); return; }
      var subjSel = el.querySelector('#subjectCode');
      var subj = subjectsAvail.find(function(s){return s.code===subjSel.value;}) || subjectsAvail[0];
      var payload = {
        title: title,
        type: el.querySelector('#type').value,
        subjectCode: subj.code,
        subjectName: subj.name,
        section: el.querySelector('#section').value,
        dueDate: dueDate,
        priority: el.querySelector('#priority').value,
        submissionMethod: method,
        externalUrl: method==='external' ? el.querySelector('#externalUrl').value : null,
        instructions: el.querySelector('#instructions').value,
        maxMarks: 20,
        hasAttachment: false
      };
      S.Task.createTask(payload).then(function(){
        C.toast('Task published to '+payload.section, '✓');
        window.location.hash = '#/professor/tasks';
      });
    };
  }

  /* =========================================================
     PROFESSOR: STUDENTS / PROGRESS
     ========================================================= */
  function profStudents(el){
    var prof = D.currentProfessor;
    var state = { section: prof.sections[0], q: "" };
    el.innerHTML = C.skeletonRows(5,50);
    render();

    function render(){
      S.Workload.getSectionProgress(state.section).then(function(rows){
        rows = rows.filter(function(r){ return !state.q || r.student.name.toLowerCase().indexOf(state.q.toLowerCase())!==-1 || r.student.usn.toLowerCase().indexOf(state.q.toLowerCase())!==-1; });
        var html = '<div class="card" style="margin-bottom:14px;"><div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">'+
          '<div class="chip-row">'+prof.sections.map(function(s){ return '<button class="filter-chip '+(state.section===s?'active':'')+'" data-sec="'+s+'">'+s+'</button>'; }).join('')+'</div>'+
          '<input class="input" id="searchStu" placeholder="Search by name or USN…" style="max-width:240px; margin-left:auto;" value="'+esc(state.q)+'">'+
          '</div></div>';
        html += '<div class="card"><div class="table-wrap"><table><thead><tr><th>Student</th><th>USN</th><th>Completion</th><th>Tasks</th></tr></thead><tbody>';
        if(!rows.length) html += '<tr><td colspan="4">'+C.emptyState('🔍','No students found','Try a different search or section.')+'</td></tr>';
        rows.sort(function(a,b){return a.student.name.localeCompare(b.student.name);}).forEach(function(r){
          html += '<tr><td>'+esc(r.student.name)+'</td><td class="usn">'+esc(r.student.usn)+'</td>'+
            '<td style="width:160px;"><div class="progress-track"><div class="progress-fill" style="width:'+r.pct+'%; background:'+(r.pct>=70?'var(--sage)':r.pct>=40?'var(--amber)':'var(--clay)')+';"></div></div></td>'+
            '<td>'+r.completed+'/'+r.total+'</td></tr>';
        });
        html += '</tbody></table></div></div>';
        el.innerHTML = html;
        el.querySelectorAll('[data-sec]').forEach(function(b){ b.onclick=function(){ state.section=b.dataset.sec; render(); }; });
        var search = el.querySelector('#searchStu');
        search.oninput = function(){ state.q = search.value; render(); search.focus(); search.setSelectionRange(search.value.length,search.value.length); };
      });
    }
  }

  /* =========================================================
     PROFESSOR: ANNOUNCEMENTS
     ========================================================= */
  function profAnnouncements(el){
    var prof = D.currentProfessor;
    el.innerHTML = C.skeletonRows(3,90);
    S.Announcement.getForProfessor(prof.id).then(render);

    function render(anns){
      var subjectsAvail = D.subjects.filter(function(s){ return prof.subjects.indexOf(s.code)!==-1; });
      var html = '<div class="card" style="margin-bottom:16px;">'+
        '<div class="section-head"><h2>Publish announcement</h2></div>'+
        '<form id="annForm">'+
        '<div class="field"><label>Urgency level</label><div class="chip-row" id="levelChips">'+
          ['emergency','important','general'].map(function(l,i){ return '<button type="button" class="filter-chip '+(i===2?'active':'')+'" data-l="'+l+'">'+l.charAt(0).toUpperCase()+l.slice(1)+'</button>'; }).join('')+
        '</div></div>'+
        '<div class="grid grid-2">'+
        '<div class="field"><label>Subject</label><select id="annSubject">'+subjectsAvail.map(function(s){return '<option value="'+s.code+'">'+s.code+' — '+esc(s.name)+'</option>';}).join('')+'</select></div>'+
        '<div class="field"><label>Section</label><select id="annSection">'+prof.sections.map(function(s){return '<option>'+s+'</option>';}).join('')+'</select></div>'+
        '</div>'+
        '<div class="field"><label>Title</label><input class="input" id="annTitle" placeholder="Short, clear headline"></div>'+
        '<div class="field"><label>Message</label><textarea id="annBody" placeholder="Details students need to know"></textarea></div>'+
        '<button type="submit" class="btn btn-primary">Publish to section</button>'+
        '</form></div>';

      html += '<div class="section-head"><h2>Your announcements</h2></div>';
      if(!anns.length) html += '<div class="card">'+C.emptyState('📢','Nothing published yet','Announcements you publish will appear here.')+'</div>';
      else anns.forEach(function(a){ html += C.announcementBanner(a) + '<div style="height:10px;"></div>'; });

      el.innerHTML = html;
      var level = "general";
      el.querySelectorAll('#levelChips [data-l]').forEach(function(b){
        b.onclick = function(){ level=b.dataset.l; el.querySelectorAll('#levelChips [data-l]').forEach(function(x){x.classList.remove('active');}); b.classList.add('active'); };
      });
      el.querySelector('#annForm').onsubmit = function(e){
        e.preventDefault();
        var title = el.querySelector('#annTitle').value.trim();
        var body = el.querySelector('#annBody').value.trim();
        if(!title || !body){ C.toast('Title and message are required',''); return; }
        S.Announcement.publish({ level:level, title:title, body:body, subjectCode:el.querySelector('#annSubject').value, section:el.querySelector('#annSection').value }).then(function(){
          C.toast('Announcement published','✓');
          S.Announcement.getForProfessor(prof.id).then(render);
        });
      };
    }
  }

  /* =========================================================
     PROFESSOR: WORKLOAD DASHBOARD
     ========================================================= */
  function profWorkload(el){
    var prof = D.currentProfessor;
    el.innerHTML = C.skeletonRows(3,90);
    S.Task.getTasksForProfessor(prof.id).then(function(mine){
      var allSectionTasks = D.tasks.filter(function(t){ return prof.sections.indexOf(t.section)!==-1; });
      var thisWeek = allSectionTasks.filter(function(t){ var d=U.daysUntil(t.dueDate); return d>=0 && d<=7; });
      var byType = {};
      thisWeek.forEach(function(t){ byType[t.type]=(byType[t.type]||0)+1; });
      var intensity = Math.min(100, thisWeek.length*12);

      var conflictPromises = Array.from(new Set(prof.sections)).map(function(sec){ return S.Task.getConflictsForSection(sec,null,3).then(function(c){return {sec:sec,c:c};}); });
      Promise.all(conflictPromises).then(function(cr){
        var html = '<div class="grid grid-3">';
        html += '<div class="card stat-card"><div class="workload-meter">'+C.workloadRing(intensity)+'<div><div class="stat-label">Section workload this week</div><div style="font-size:12px;color:var(--ink-faint);margin-top:3px;">'+thisWeek.length+' tasks due</div></div></div></div>';
        html += statCard(mine.length, "Tasks you've created", "");
        html += statCard(prof.sections.join(', '), "Sections", "");
        html += '</div><div style="height:16px;"></div>';

        cr.forEach(function(r){ if(r.c.length>1){ html+= C.conflictWarning(r.c.length,3,'professor'); html+='<div style="height:10px;"></div>'; } });

        html += '<div class="card"><div class="section-head"><h2>Due this week, by type</h2></div>';
        if(!thisWeek.length) html += C.emptyState('🌤️','Light week ahead','No tasks due across your sections in the next 7 days.');
        else Object.keys(byType).forEach(function(k){
          var pct = Math.round(byType[k]/thisWeek.length*100);
          html += '<div style="margin-bottom:12px;"><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:5px;"><span style="font-weight:600;">'+k+'</span><span style="color:var(--ink-soft);">'+byType[k]+'</span></div>'+
            '<div class="progress-track"><div class="progress-fill" style="width:'+pct+'%;"></div></div></div>';
        });
        html += '</div><div style="height:14px;"></div>';

        html += '<div class="card"><div class="section-head"><h2>This week\u2019s tasks across your sections</h2></div>';
        if(thisWeek.length) thisWeek.sort(function(a,b){return U.parseDate(a.dueDate)-U.parseDate(b.dueDate);}).forEach(function(t){
          html += '<div class="list-row"><div style="flex:1;"><div style="font-weight:600;font-size:13.5px;">'+esc(t.title)+'</div>'+
            '<div style="font-size:11.5px;color:var(--ink-soft);">'+esc(t.subjectCode)+' · '+esc(t.section)+' · '+esc(t.professorName)+'</div></div>'+
            '<span class="badge '+C.dueLabel(t.dueDate).cls+'">'+C.dueLabel(t.dueDate).text+'</span></div>';
        });
        html += '</div>';
        el.innerHTML = html;
      });
    });
  }

  /* =========================================================
     PROFESSOR: PROFILE
     ========================================================= */
  function profProfile(el){
    var prof = D.currentProfessor;
    el.innerHTML = '<div class="card" style="max-width:520px;">'+
      '<div style="display:flex; gap:16px; align-items:center; margin-bottom:18px;">'+
      '<div class="avatar" style="width:58px;height:58px;font-size:20px;background:var(--blue);color:#fff;">'+esc(prof.name.split(' ').slice(-2).map(function(n){return n[0];}).join(''))+'</div>'+
      '<div><h2 style="font-size:19px;">'+esc(prof.name)+'</h2><div style="font-size:13px;color:var(--ink-soft);">'+esc(prof.dept)+' Department</div></div></div>'+
      row('Email', prof.email) + row('Subjects', prof.subjects.join(', ')) + row('Sections', prof.sections.join(', ')) +
      '<div style="margin-top:16px;"><button class="btn btn-secondary btn-sm" disabled>Edit profile (coming soon)</button></div></div>';
    function row(l,v){ return '<div style="display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--line-soft);font-size:13.5px;"><span style="color:var(--ink-soft);">'+l+'</span><span style="font-weight:600;">'+esc(v)+'</span></div>'; }
  }

  Object.assign(window.AX.views, {
    profDashboard: profDashboard, profTasks: profTasks, profCreateTask: profCreateTask,
    profStudents: profStudents, profAnnouncements: profAnnouncements, profWorkload: profWorkload, profProfile: profProfile
  });
})();
