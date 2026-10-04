/* ============================================================
   Axiom — SERVICE LAYER (connected to the real backend)
   Every function here still returns a Promise, exactly like the
   mock version did — so nothing in views.js, views_professor.js,
   components.js or app.js needed to change.

   Real architecture this talks to:
   Frontend -> Lambda Function URL -> Lambda -> DynamoDB
   File storage: S3 (via presigned URLs, see uploadFile)
   ============================================================ */
(function(){
  "use strict";
  var D = window.AX.data;
  var U = D.util;
  var BASE = window.AX.API_BASE;

  function delay(val, ms){
    return new Promise(function(resolve){ setTimeout(function(){ resolve(val); }, ms || 60); });
  }

  // ---- tiny fetch wrapper used by every service below ----
  function api(method, path, body){
    var opts = { method: method, headers: { "Content-Type": "application/json" } };
    if(body !== undefined) opts.body = JSON.stringify(body);
    return fetch(BASE + path, opts).then(function(res){
      if(!res.ok){
        return res.json().catch(function(){ return {}; }).then(function(errBody){
          throw new Error((errBody && errBody.error) || ("Request failed: " + res.status));
        });
      }
      if(res.status === 204) return null;
      return res.json();
    });
  }

  // ---------------- Auth (talks to /session, /login) ----------------
  var AuthService = {
    currentRole: "student", // 'student' | 'professor' — purely a local UI toggle
    _session: null,
    getSession: function(){
      var self = this;
      if(self._session){
        return Promise.resolve(Object.assign({}, self._session, { role: self.currentRole }));
      }
      return api("GET", "/session").then(function(data){
        self._session = data;
        return Object.assign({}, data, { role: self.currentRole });
      });
    },
    switchRole: function(role){
      this.currentRole = role;
      return delay({ role: role }, 60); // instant local switch, no network needed
    }
  };

  // ---------------- Task Service ----------------
  var TaskService = {
    getTasksForStudent: function(studentId){
      return api("GET", "/students/" + encodeURIComponent(studentId) + "/tasks").then(function(tasks){
        // cache which "external" tasks are already reported done, so
        // SubmissionService.isExternalDone can answer synchronously below
        tasks.forEach(function(t){
          if(t.submissionMethod === "external"){
            SubmissionService._extCache[t.id + "|" + studentId] = !!(t.submission && t.submission.status === "completed");
          }
        });
        return tasks;
      });
    },
    getTasksForProfessor: function(professorId){
      return api("GET", "/professors/" + encodeURIComponent(professorId) + "/tasks");
    },
    createTask: function(payload){
      var body = Object.assign({
        professorId: D.currentProfessor.id,
        professorName: D.currentProfessor.name
      }, payload);
      return api("POST", "/tasks", body);
    },
    // Conflict / workload detection for a section within a window of days.
    // Backend returns a rich object; we unwrap it to a plain task array to
    // match what views.js and views_professor.js already expect.
    getConflictsForSection: function(section, aroundDate, windowDays){
      windowDays = windowDays || 3;
      var qs = "window=" + windowDays;
      if(aroundDate){
        var dateStr = (aroundDate instanceof Date) ? U.fmtDate(aroundDate) : aroundDate;
        qs += "&date=" + encodeURIComponent(dateStr);
      }
      return api("GET", "/sections/" + encodeURIComponent(section) + "/conflicts?" + qs)
        .then(function(res){ return res.tasks; });
    }
  };

  // ---------------- Submission Service ----------------
  var SubmissionService = {
    _extCache: {}, // "taskId|studentId" -> true/false, filled by getTasksForStudent above

    submitOnline: function(taskId, studentId, fileName){
      return api("POST", "/tasks/" + encodeURIComponent(taskId) + "/submit", {
        studentId: studentId,
        fileName: fileName
      });
    },
    markOfflineComplete: function(taskId, studentId){
      return api("POST", "/tasks/" + encodeURIComponent(taskId) + "/mark-offline", {
        studentId: studentId
      });
    },
    reportExternalDone: function(taskId, studentId){
      return api("POST", "/tasks/" + encodeURIComponent(taskId) + "/report-external", {
        studentId: studentId
      }).then(function(res){
        SubmissionService._extCache[taskId + "|" + studentId] = true;
        return res;
      });
    },
    // Called synchronously by views.js / components.js, so it reads from
    // the cache populated by the last getTasksForStudent() call rather
    // than hitting the network itself.
    isExternalDone: function(taskId, studentId){
      return !!SubmissionService._extCache[taskId + "|" + studentId];
    },
    verifyOffline: function(taskId, studentId){
      return api("POST", "/tasks/" + encodeURIComponent(taskId) + "/verify", {
        studentId: studentId,
        verified: true
      });
    },
    getSubmissionsForTask: function(taskId){
      return api("GET", "/tasks/" + encodeURIComponent(taskId) + "/submissions");
    },
    // Asks the backend for a presigned S3 upload URL, then PUTs the file
    // straight to S3 if a bucket is configured. If no bucket is set up yet,
    // the backend returns a "mock" response and the UI still works normally.
    uploadFile: function(file){
      var name = (file && file.name) || "document.pdf";
      var contentType = (file && file.type) || "application/octet-stream";
      return api("POST", "/uploads/presign", { fileName: name, contentType: contentType })
        .then(function(res){
          if(res.uploadUrl){
            return fetch(res.uploadUrl, {
              method: "PUT",
              headers: { "Content-Type": contentType },
              body: file
            }).then(function(){ return { key: res.key, name: res.name }; });
          }
          return { key: res.key, name: res.name };
        });
    }
  };

  // ---------------- Announcement Service ----------------
  var AnnouncementService = {
    getForStudent: function(studentId){
      return api("GET", "/students/" + encodeURIComponent(studentId) + "/announcements");
    },
    getForProfessor: function(professorId){
      return api("GET", "/professors/" + encodeURIComponent(professorId) + "/announcements");
    },
    publish: function(payload){
      var body = Object.assign({
        professorId: D.currentProfessor.id,
        professorName: D.currentProfessor.name
      }, payload);
      return api("POST", "/announcements", body);
    }
  };

  // ---------------- Workload / Progress Service ----------------
  var WorkloadService = {
    getStudentWorkload: function(studentId){
      return api("GET", "/students/" + encodeURIComponent(studentId) + "/workload");
    },
    getSectionProgress: function(section){
      return api("GET", "/sections/" + encodeURIComponent(section) + "/progress");
    }
  };

  // ---------------- AI Task Extraction (rule-based, runs in Lambda) ----------------
  var AIExtractionService = {
    extract: function(text){
      return api("POST", "/ai/extract", { text: text });
    }
  };

  window.AX.services = {
    Auth: AuthService,
    Task: TaskService,
    Submission: SubmissionService,
    Announcement: AnnouncementService,
    Workload: WorkloadService,
    AIExtraction: AIExtractionService
  };
})();
