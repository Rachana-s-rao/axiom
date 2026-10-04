/* ============================================================
   Axiom — MOCK DATA LAYER
   This file simulates what would eventually live in DynamoDB.
   Everything here is fictional. Swap this file's contents for
   real API responses when the backend exists — nothing in
   services.js or views.js needs to change shape.
   ============================================================ */
(function(){
  "use strict";

  // ---- seeded PRNG so demo data is stable within a session ----
  function mulberry32(seed){
    return function(){
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  var rand = mulberry32(20260919);
  function pick(arr){ return arr[Math.floor(rand()*arr.length)]; }
  function pickN(arr,n){ var c=arr.slice(), out=[]; while(out.length<n && c.length){ out.push(c.splice(Math.floor(rand()*c.length),1)[0]); } return out; }
  function randInt(min,max){ return Math.floor(rand()*(max-min+1))+min; }

  var TODAY = new Date(2026,8,19); // Sept 19, 2026
  function addDays(d,n){ var r=new Date(d); r.setDate(r.getDate()+n); return r; }
  function fmtDate(d){ return d.toISOString().slice(0,10); }
  function fmtDateLabel(d){
    return d.toLocaleDateString('en-US',{month:'short', day:'numeric', year: d.getFullYear()!==TODAY.getFullYear()?'numeric':undefined});
  }
  function daysUntil(dateStr){
    var d = new Date(dateStr+'T23:59:59');
    return Math.ceil((d - TODAY) / 86400000);
  }

  var FIRST_NAMES = ["Aarav","Meera","Rohan","Ishita","Kabir","Ananya","Vihaan","Diya","Aditya","Sara","Arjun","Nikita","Dev","Priya","Yash","Tanvi","Rahul","Neha","Karan","Simran","Ravi","Pooja","Sanjay","Kavya","Aman","Riya","Varun","Sneha","Manav","Ira","Kunal","Zoya","Nikhil","Anya","Harsh","Mira","Siddharth","Tara","Rajat","Aisha","Devansh","Lakshmi","Vivek","Nandini","Arnav","Kiara","Ayaan","Myra","Reyansh","Aaradhya","Shaurya","Anika","Advait","Sana","Dhruv","Radhika","Om","Trisha","Parth","Isha"];
  var LAST_NAMES = ["Sharma","Iyer","Reddy","Nair","Gupta","Rao","Kulkarni","Menon","Patel","Verma","Bose","Chatterjee","Pillai","Desai","Joshi","Mehta","Kapoor","Shetty","Bhat","Agarwal"];
  var PROF_FIRST = ["Anil","Suma","Ramesh","Kavitha","Prakash","Lakshmi","Srinivas","Geeta","Manoj","Vidya","Ashok","Padma","Ganesh","Uma","Vikram"];
  var SUBJECTS = [
    {code:"CS301", name:"Data Structures & Algorithms", dept:"CSE"},
    {code:"CS304", name:"Database Management Systems", dept:"CSE"},
    {code:"CS309", name:"Operating Systems", dept:"CSE"},
    {code:"CS312", name:"Computer Networks", dept:"CSE"},
    {code:"CS315", name:"Machine Learning Fundamentals", dept:"CSE"},
    {code:"MA302", name:"Discrete Mathematics", dept:"CSE"},
    {code:"EC301", name:"Digital Signal Processing", dept:"ECE"},
    {code:"HS301", name:"Technical Communication", dept:"CSE"}
  ];
  var SECTIONS = ["CSE-A","CSE-B","CSE-C","ECE-A"];

  // ---------------- Professors ----------------
  var professors = [];
  (function(){
    var used = {};
    var n = 14;
    for(var i=0;i<n;i++){
      var fn = PROF_FIRST[i % PROF_FIRST.length];
      var ln = LAST_NAMES[(i*3+2) % LAST_NAMES.length];
      var subs = pickN(SUBJECTS, randInt(1,2));
      var secs = pickN(SECTIONS, randInt(1,2));
      professors.push({
        id: "prof-"+(i+1),
        name: "Dr. "+fn+" "+ln,
        email: (fn+"."+ln).toLowerCase()+"@axiom.edu",
        dept: subs[0].dept,
        subjects: subs.map(function(s){return s.code;}),
        sections: secs
      });
    }
  })();

  // ---------------- Students ----------------
  var students = [];
  (function(){
    var n = 60;
    for(var i=0;i<n;i++){
      var fn = pick(FIRST_NAMES);
      var ln = pick(LAST_NAMES);
      var section = SECTIONS[i % SECTIONS.length];
      var usn = "1AX22"+ (section.slice(0,2)) + String(100+i).slice(-3);
      students.push({
        id: "stu-"+(i+1),
        usn: usn,
        name: fn+" "+ln,
        email: (fn+"."+ln+i).toLowerCase()+"@students.axiom.edu",
        section: section,
        year: 3,
        avatarInitials: (fn[0]+ln[0]).toUpperCase()
      });
    }
  })();

  // current logged-in demo identities
  var CURRENT_STUDENT = students[3]; // Ishita Rao-ish, CSE-A/B
  CURRENT_STUDENT = students.find(function(s){return s.section==="CSE-A";}) || students[0];
  var CURRENT_PROFESSOR = professors[0];

  // ---------------- Tasks ----------------
  var TASK_TYPES = ["Assignment","Test","Lab","Project","Presentation"];
  var tasks = [];
  (function(){
    var titles = {
      Assignment: ["Problem Set on Binary Trees","Normalization Exercise Sheet","Process Scheduling Report","Subnetting Practice Set","Linear Regression Writeup","Graph Traversal Assignment","Socket Programming Exercise"],
      Test: ["Unit Test 2 — Sorting & Recursion","Mid-Semester Test","Surprise Quiz — Joins & Indexing","Class Test — Deadlock Handling"],
      Lab: ["Lab 5 — Hash Table Implementation","Lab 7 — SQL Joins Practical","Lab 4 — Producer-Consumer Problem","Lab 6 — Socket Programming","Lab 3 — Decision Tree Classifier"],
      Project: ["Mini Project Proposal","DBMS Mini Project — ER Diagram Phase","Capstone Project Milestone 2","ML Project — Model Selection Report"],
      Presentation: ["Research Paper Presentation","Project Progress Presentation","Seminar — Emerging Networking Trends"]
    };
    var subMethods = ["online","offline","external"];
    var id = 1;
    // Spread tasks across a window from -10 days to +30 days for realistic overdue/upcoming/conflict demo states
    var offsets = [-9,-6,-4,-2,-1, 0, 1,1,2,2,3,3,3, 4,5, 6,6, 7,8, 9,10, 12,14, 16,18, 21,25,28];
    offsets.forEach(function(off, idx){
      var type = TASK_TYPES[idx % TASK_TYPES.length];
      var subj = SUBJECTS[idx % SUBJECTS.length];
      var prof = professors.find(function(p){ return p.subjects.indexOf(subj.code) !== -1; }) || pick(professors);
      var section = pick(prof.sections);
      var method = subMethods[idx % subMethods.length];
      var due = addDays(TODAY, off);
      var priority = off <= 2 ? "High" : (off <= 7 ? "Medium" : "Low");
      tasks.push({
        id: "task-"+(id++),
        title: pick(titles[type]),
        type: type,
        subjectCode: subj.code,
        subjectName: subj.name,
        professorId: prof.id,
        professorName: prof.name,
        section: section,
        dueDate: fmtDate(due),
        priority: priority,
        submissionMethod: method, // online | offline | external
        externalUrl: method === "external" ? "https://forms.axiom.edu/submit/"+id : null,
        hasAttachment: idx % 3 === 0,
        instructions: "Complete the "+type.toLowerCase()+" as discussed in class and submit before the deadline. Refer to the shared notes for "+subj.name+".",
        maxMarks: type === "Test" ? 50 : (type === "Project" ? 100 : 20),
        createdAt: fmtDate(addDays(due,-14))
      });
    });
  })();

  // ---------------- Submissions (per student, for online/offline tasks) ----------------
  var submissions = []; // {taskId, studentId, status, submittedAt, fileName, verified}
  (function(){
    var sectionStudents = {};
    students.forEach(function(s){ (sectionStudents[s.section] = sectionStudents[s.section]||[]).push(s); });

    tasks.forEach(function(task){
      if(task.submissionMethod === "external") return; // external tracked separately (self-report only for current student demo)
      var roster = sectionStudents[task.section] || [];
      var overdue = daysUntil(task.dueDate) < 0;
      roster.forEach(function(stu){
        var r = rand();
        var status;
        if(task.submissionMethod === "online"){
          if(overdue){
            status = r < 0.78 ? "completed" : "overdue";
          } else {
            status = r < 0.4 ? "completed" : "pending";
          }
        } else { // offline
          if(overdue){
            if(r < 0.55) status = "completed"; // verified
            else if(r < 0.8) status = "awaiting_verification";
            else status = "overdue";
          } else {
            status = r < 0.3 ? "awaiting_verification" : "pending";
          }
        }
        submissions.push({
          id: task.id+"-"+stu.id,
          taskId: task.id,
          studentId: stu.id,
          status: status,
          submittedAt: (status !== "pending" && status !== "overdue") ? fmtDate(addDays(new Date(task.dueDate), -randInt(0,2))) : null,
          fileName: (task.submissionMethod === "online" && status !== "pending" && status !== "overdue") ? "submission_"+stu.usn+".pdf" : null,
          verified: status === "completed"
        });
      });
    });

    // ensure current student has a rich, demo-friendly mix on well-known tasks
  })();

  // ---------------- Announcements ----------------
  var announcements = [];
  (function(){
    var seed = [
      {level:"emergency", title:"CS309 Mid-Sem Test moved to Sept 20 — venue changed", body:"Due to a scheduling conflict with the seminar hall, the Operating Systems mid-semester test has been moved to tomorrow, Sept 20, 9:00 AM, in Room 214 instead of the main hall. Please bring your hall tickets.", subjectCode:"CS309", section:"CSE-A", daysAgo:0},
      {level:"emergency", title:"CS312 Lab 6 submission portal down — deadline extended", body:"The submission portal is temporarily unavailable. The deadline for Lab 6 has been extended by 24 hours. We'll confirm once the portal is back up.", subjectCode:"CS312", section:"CSE-A", daysAgo:1},
      {level:"important", title:"DBMS Mini Project groups must be finalized by Friday", body:"All groups for the DBMS mini project must be finalized and submitted through the group form by this Friday. Groups not finalized will be auto-assigned.", subjectCode:"CS304", section:"CSE-A", daysAgo:1},
      {level:"important", title:"Guest lecture on distributed systems — attendance counted", body:"There will be a guest lecture this Thursday on distributed systems fundamentals. Attendance will count toward your internal participation marks.", subjectCode:"CS309", section:"CSE-A", daysAgo:2},
      {level:"general", title:"Revised office hours for this week", body:"Office hours have moved to 3–4:30 PM on Wednesday this week only, due to a department meeting in the morning slot.", subjectCode:"CS301", section:"CSE-A", daysAgo:3},
      {level:"general", title:"Reference material for ML Fundamentals uploaded", body:"Additional reference slides and a worked example set for the Machine Learning Fundamentals module have been uploaded to the shared drive.", subjectCode:"CS315", section:"CSE-B", daysAgo:4},
      {level:"important", title:"Network Lab systems under maintenance Sept 22", body:"The networking lab systems will be under maintenance on Sept 22. Lab 6 sessions for that day are rescheduled to Sept 24.", subjectCode:"CS312", section:"CSE-A", daysAgo:2}
    ];
    seed.forEach(function(a, i){
      var prof = professors.find(function(p){ return p.subjects.indexOf(a.subjectCode) !== -1; }) || professors[0];
      announcements.push({
        id: "ann-"+(i+1),
        level: a.level,
        title: a.title,
        body: a.body,
        subjectCode: a.subjectCode,
        section: a.section,
        professorId: prof.id,
        professorName: prof.name,
        postedAt: fmtDate(addDays(TODAY, -a.daysAgo))
      });
    });
  })();

  window.AX.data = {
    TODAY: TODAY,
    students: students,
    professors: professors,
    subjects: SUBJECTS,
    sections: SECTIONS,
    tasks: tasks,
    submissions: submissions,
    announcements: announcements,
    currentStudent: CURRENT_STUDENT,
    currentProfessor: CURRENT_PROFESSOR,
    util: { addDays: addDays, fmtDate: fmtDate, fmtDateLabel: fmtDateLabel, daysUntil: daysUntil, randInt: randInt, pick: pick }
  };
})();
