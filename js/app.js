/* ============================================================
   Axiom — APP SHELL & ROUTER
   ============================================================ */
(function(){
  "use strict";
  var D = window.AX.data, S = window.AX.services, C = window.AX.components, V = window.AX.views;

  var NAV = {
    student: [
      { key:"dashboard", label:"Dashboard", ic:"grid", view:V.studentDashboard },
      { key:"tasks", label:"My Tasks", ic:"list-check", view:V.studentTasks },
      { key:"calendar", label:"Calendar", ic:"calendar", view:V.studentCalendar },
      { key:"submissions", label:"Submissions", ic:"upload", view:V.studentSubmissions },
      { key:"announcements", label:"Announcements", ic:"megaphone", view:V.studentAnnouncements },
      { key:"catchup", label:"Catch Up", ic:"zap", view:V.studentCatchUp },
      { key:"profile", label:"Profile", ic:"user", view:V.studentProfile },
      { key:"notifications", label:"Notifications", ic:"bell", view:V.studentNotifications, hidden:true },
      { key:"progress", label:"My Progress", ic:"trend-up", view:V.studentProgress, hidden:true }
    ],
    professor: [
      { key:"dashboard", label:"Dashboard", ic:"grid", view:V.profDashboard },
      { key:"tasks", label:"Tasks", ic:"list-check", view:V.profTasks },
      { key:"create", label:"Create Task", ic:"plus", view:V.profCreateTask },
      { key:"students", label:"Students / Progress", ic:"cap", view:V.profStudents },
      { key:"announcements", label:"Announcements", ic:"megaphone", view:V.profAnnouncements },
      { key:"workload", label:"Workload", ic:"bar-chart", view:V.profWorkload },
      { key:"profile", label:"Profile", ic:"user", view:V.profProfile }
    ]
  };
  var TITLES = {
    dashboard:["Dashboard","Your day at a glance"], tasks:["Tasks","Everything assigned to you"],
    calendar:["Calendar","All deadlines in one view"], notifications:["Notifications","Reminders and alerts"],
    submissions:["Submissions","Track what you've turned in"], announcements:["Announcements","Updates from your professors"],
    progress:["My Progress","How you're tracking overall"], catchup:["Catch Up Mode","Your prioritized action list"],
    profile:["Profile","Your account details"], create:["Create Task","Publish a new academic task"],
    students:["Students / Progress","Track completion across your section"], workload:["Workload","Deadline load across your sections"]
  };

  window.AX.app = {
    role: "student", currentKey: "dashboard",
    refreshChrome: function(){ renderUserChip(); },
    // called by the role-selection gate once a role has been chosen
    enter: function(role){
      window.AX.app.role = role;
      S.Auth.switchRole(role);
      var target = '#/'+role+'/dashboard';
      if(window.location.hash === target){ route(); } else { window.location.hash = target; }
    }
  };

  function initials(name){ return name.split(' ').filter(function(w){return w.length>1||/[A-Za-z]/.test(w);}).slice(0,2).map(function(w){return w[0];}).join('').toUpperCase(); }

  function renderShell(){
    var app = document.getElementById('app');
    app.innerHTML =
      '<div class="sidebar-scrim" id="scrim"></div>'+
      '<aside class="sidebar" id="sidebar">'+
  '<div class="sidebar-resizer" id="sidebarResizer"></div>'+
        '<div class="brand" id="brandHome" role="button" tabindex="0" title="Back to role selection">'+
          '<div class="brand-mark">'+C.logoMark(18)+'</div>'+
          '<div class="brand-text">'+
            '<div class="brand-name">Axiom</div>'+
            '<div class="brand-sub">Academic task management</div>'+
          '</div>'+
        '</div>'+
        '<nav id="navList"></nav>'+
        '<div class="sidebar-footer">'+
          '<div class="role-switch"><button data-role="student" class="'+(window.AX.app.role==='student'?'active':'')+'">Student</button><button data-role="professor" class="'+(window.AX.app.role==='professor'?'active':'')+'">Professor</button></div>'+
          '<div class="user-chip" id="userChip"></div>'+
        '</div>'+
      '</aside>'+
      '<div class="main-col">'+
        '<div class="topbar">'+
          '<button class="icon-btn menu-toggle" id="menuToggle">☰</button>'+
          '<div><div class="page-title" id="pageTitle"></div><div class="page-sub" id="pageSub"></div></div>'+
          '<div class="topbar-spacer"></div>'+
          '<button class="icon-btn notif-btn" id="bellBtn" title="Notifications">'+C.icon('bell',15)+'<span class="hide-mobile">Notifications</span><span class="dot" id="bellDot" style="display:none;"></span></button>'+
        '</div>'+
        '<div class="content" id="content"></div>'+
      '</div>';

    var brandHome = document.getElementById('brandHome');
    function backToGate(){ if(window.AX.gate) window.AX.gate.show(); }
    brandHome.onclick = backToGate;
    brandHome.onkeydown = function(e){ if(e.key==='Enter' || e.key===' '){ e.preventDefault(); backToGate(); } };

    document.getElementById('menuToggle').onclick = function(){
      document.getElementById('sidebar').classList.toggle('open');
      document.getElementById('scrim').classList.toggle('open');
    };
    document.getElementById('scrim').onclick = function(){
      document.getElementById('sidebar').classList.remove('open');
      document.getElementById('scrim').classList.remove('open');
    };
    document.querySelectorAll('.role-switch [data-role]').forEach(function(b){
      b.onclick = function(){
        window.AX.app.role = b.dataset.role;
        S.Auth.switchRole(b.dataset.role);
        window.location.hash = '#/'+b.dataset.role+'/dashboard';
      };
    });
    document.getElementById('bellBtn').onclick = function(){
      window.location.hash = '#/'+window.AX.app.role+'/'+(window.AX.app.role==='student'?'notifications':'announcements');
    };
        var resizer = document.getElementById('sidebarResizer');

    if(resizer){
      var resizing = false;

      resizer.addEventListener('pointerdown', function(e){
        if(window.innerWidth <= 880) return;

        resizing = true;
        resizer.setPointerCapture(e.pointerId);

        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
      });

      resizer.addEventListener('pointermove', function(e){
        if(!resizing) return;

        var newWidth = Math.max(190, Math.min(400, e.clientX));

        document.documentElement.style.setProperty(
          '--sidebar-width',
          newWidth + 'px'
        );
      });

      resizer.addEventListener('pointerup', function(){
        resizing = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      });

      resizer.addEventListener('pointercancel', function(){
        resizing = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      });
    }
    renderUserChip();
    renderNavList();
    updateBell();
  }

  function renderUserChip(){
    var chip = document.getElementById('userChip');
    if(window.AX.app.role === 'student'){
      var stu = D.currentStudent;
      var av = stu.photo ? '<img src="'+stu.photo+'" alt="">' : stu.avatarInitials;
      chip.innerHTML = '<div class="avatar">'+av+'</div><div><div class="u-name">'+C.esc(stu.name)+'</div><div class="u-role">'+C.esc(stu.usn)+'</div></div>';
    } else {
      var prof = D.currentProfessor;
      chip.innerHTML = '<div class="avatar" style="background:var(--plum);">'+initials(prof.name.replace('Dr. ',''))+'</div><div><div class="u-name">'+C.esc(prof.name)+'</div><div class="u-role">'+C.esc(prof.dept)+'</div></div>';
    }
    chip.onclick = function(){ window.location.hash = '#/'+window.AX.app.role+'/profile'; };
  }

  function renderNavList(){
    var list = document.getElementById('navList');
    var items = NAV[window.AX.app.role].filter(function(it){ return !it.hidden; });
    list.innerHTML = items.map(function(it){
      return '<button class="nav-item" data-key="'+it.key+'"><span class="ic">'+C.icon(it.ic)+'</span>'+it.label+'</button>';
    }).join('');
    list.querySelectorAll('[data-key]').forEach(function(b){
      b.onclick = function(){ window.location.hash = '#/'+window.AX.app.role+'/'+b.dataset.key; };
    });
  }

  function updateBell(){
    var dot = document.getElementById('bellDot');
    if(!dot) return;
    if(window.AX.app.role === 'student'){
      S.Announcement.getForStudent(D.currentStudent.id).then(function(anns){
        dot.style.display = anns.some(function(a){return a.level==='emergency';}) ? 'block' : 'none';
      });
    } else {
      dot.style.display = 'none';
    }
  }

  function route(){
  var hash = window.location.hash.replace('#/','') || 'student/dashboard';
  var parts = hash.split('/');

  var role = (parts[0]==='professor') ? 'professor' : 'student';
  var key = parts[1] || 'dashboard';

  var items = NAV[role];

  /* =========================================================
     STUDENT: TASK DETAIL ROUTE
     URL format:
     #/student/task/TASK_ID
     ========================================================= */
  if(role === 'student' && key === 'task' && parts[2]){
    window.AX.app.role = 'student';
    window.AX.app.currentKey = 'task';

    document.querySelectorAll('.role-switch [data-role]').forEach(function(b){
      b.classList.toggle('active', b.dataset.role === 'student');
    });

    renderNavList();

    document.querySelectorAll('.nav-item').forEach(function(b){
      b.classList.toggle('active', b.dataset.key === 'tasks');
    });

    renderUserChip();

    document.getElementById('pageTitle').textContent = 'Task Detail';
    document.getElementById('pageSub').textContent = 'Assignment information and submission';

    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('scrim').classList.remove('open');

    var detailContent = document.getElementById('content');

    detailContent.scrollTop = 0;
    window.scrollTo(0,0);

    V.studentTaskDetail(detailContent, parts[2]);

    updateBell();
    return;
  }

  if(!items.some(function(i){
    return i.key === key;
  })){
    key = 'dashboard';
  }

  window.AX.app.role = role;
  window.AX.app.currentKey = key;

  document.querySelectorAll('.role-switch [data-role]').forEach(function(b){
    b.classList.toggle('active', b.dataset.role === role);
  });

  renderNavList();

  document.querySelectorAll('.nav-item').forEach(function(b){
    b.classList.toggle('active', b.dataset.key === key);
  });

  renderUserChip();

  var t = TITLES[key] || [key,''];

  document.getElementById('pageTitle').textContent = t[0];
  document.getElementById('pageSub').textContent = t[1];

  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('scrim').classList.remove('open');

  var content = document.getElementById('content');

  content.scrollTop = 0;
  window.scrollTo(0,0);

  var viewFn = items.find(function(i){
    return i.key === key;
  }).view;

  viewFn(content);

  updateBell();
}

  window.addEventListener('hashchange', route);
  document.addEventListener('DOMContentLoaded', function(){
    S.Auth.getSession().then(function(session){
      if(session.student) D.currentStudent = session.student;
      if(session.professor) D.currentProfessor = session.professor;
      renderShell();
      route();
    }).catch(function(err){
      document.getElementById('app').innerHTML =
        '<div style="padding:40px;font-family:sans-serif;color:#b33;max-width:520px;">' +
        '<h2>Could not connect to the Axiom backend</h2>' +
        '<p>Check that <code>API_BASE</code> in <code>js/config.js</code> is your real Lambda Function URL, ' +
        'and that it is reachable in the browser.</p>' +
        '<p style="color:#888;">Details: ' + err.message + '</p></div>';
    });
  });
})();
