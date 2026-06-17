/* app.js — Camila Grimaldi · Architecture
   Vanilla-JS implementation of the portfolio SPA (no framework, no build step).
   Recreates the React/Babel prototype 1:1 in plain JS: hash routing, hero
   carousel, project/research galleries with a fullscreen lightbox, a mobile
   menu, the homepage scroll-overlay nav, and a mailto contact form.
   Depends on data.js (window.CG_PROJECTS, window.CG_RESEARCH). */
(function () {
  "use strict";

  var PROJECTS = window.CG_PROJECTS || [];
  var RESEARCH = window.CG_RESEARCH || { items: [] };
  var root = document.getElementById("root");

  /* ----------------------------------------------------------------------- */
  /*  CONTACT FORM BACKEND (Web3Forms)                                        */
  /*  Submissions are delivered by Web3Forms to the inbox tied to the access  */
  /*  key below. To activate real delivery:                                   */
  /*    1. Go to https://web3forms.com                                        */
  /*    2. Enter  arq.cgrimaldi@gmail.com  and press "Create Access Key".     */
  /*    3. Web3Forms emails you a key (a long id like                         */
  /*       "a1b2c3d4-1234-5678-9abc-1234567890ab").                           */
  /*    4. Paste that key between the quotes below, replacing the placeholder.*/
  /*  Until a real key is set, the form falls back to opening the visitor's   */
  /*  own mail app (mailto) so the button still does something.               */
  var WEB3FORMS_ACCESS_KEY = "06fe2bdd-c7bd-442b-a6e7-4fd49b226946";
  var CONTACT_EMAIL = "arq.cgrimaldi@gmail.com";
  function hasFormKey() {
    return WEB3FORMS_ACCESS_KEY && WEB3FORMS_ACCESS_KEY.indexOf("YOUR-ACCESS-KEY") !== 0;
  }

  /* ---- helpers ----------------------------------------------------------- */
  // In the offline bundle assets were inlined; here we just URL-encode the path.
  function asset(p) { return encodeURI(p); }
  function pad(n) { return String(n).padStart(2, "0"); }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  // Encode a route object for a data-go attribute (single-quoted in markup).
  function go(r) { return "data-go='" + esc(JSON.stringify(r)) + "'"; }

  // Convert [[...]] markers into bold+italic emphasis (text is escaped first).
  function renderRich(text) {
    var parts = String(text).split(/\[\[(.*?)\]\]/g);
    return parts.map(function (seg, i) {
      return i % 2 === 1
        ? '<strong class="cg-em">' + esc(seg) + "</strong>"
        : esc(seg);
    }).join("");
  }

  /* ---- routing ----------------------------------------------------------- */
  // Hash scheme: #/ · #/projects · #/project/<id> · #/research ·
  //              #/research/<id> · #/about · #/contact
  function parseHash() {
    var h = (location.hash || "").replace(/^#\/?/, "");
    var seg = h.split("/").filter(Boolean).map(decodeURIComponent);
    if (!seg.length) return { view: "home" };
    switch (seg[0]) {
      case "projects": return { view: "works" };
      case "project":  return seg[1] ? { view: "project", id: seg[1] } : { view: "works" };
      case "research": return seg[1] ? { view: "research-detail", id: seg[1] } : { view: "research" };
      case "about":    return { view: "profile" };
      case "contact":  return { view: "contact" };
      default:         return { view: "home" };
    }
  }
  function toHash(r) {
    switch (r.view) {
      case "home":            return "#/";
      case "works":           return "#/projects";
      case "project":         return "#/project/" + encodeURIComponent(r.id);
      case "research":        return "#/research";
      case "research-detail": return "#/research/" + encodeURIComponent(r.id);
      case "profile":         return "#/about";
      case "contact":         return "#/contact";
      default:                return "#/";
    }
  }
  function navigate(r) { location.hash = toHash(r); }

  /* ---- state ------------------------------------------------------------- */
  var route = parseHash();
  var menuOpen = false;
  var cleanups = [];          // timers / listeners torn down on each render
  function addCleanup(fn) { cleanups.push(fn); }
  function runCleanups() { cleanups.forEach(function (fn) { try { fn(); } catch (e) {} }); cleanups = []; }

  /* ====================================================================== */
  /*  CHROME — Nav · Mobile menu · Footer                                    */
  /* ====================================================================== */
  function navHTML(scrolled) {
    var items = [["works", "Projects"], ["research", "Research"], ["profile", "About"], ["contact", "Contact"]];
    var active = function (k) {
      return route.view === k ||
        (k === "works" && route.view === "project") ||
        (k === "research" && route.view === "research-detail");
    };
    var overlay = route.view === "home";
    var cls = "cg-nav" + (overlay && !scrolled ? " cg-nav--overlay" : "");
    var links = items.map(function (it) {
      return '<a href="#" class="cg-nav-link' + (active(it[0]) ? " active" : "") + '" ' +
        go({ view: it[0] }) + ">" + it[1] + "</a>";
    }).join("");
    return '<header class="' + cls + '">' +
      '<a class="cg-wm" href="#/" ' + go({ view: "home" }) + ">Camila Grimaldi</a>" +
      '<nav class="cg-nav-links">' + links + "</nav>" +
      '<button class="cg-burger" aria-label="Menu" data-menu="open"><span></span><span></span></button>' +
      "</header>";
  }

  function menuHTML() {
    var items = [["works", "Projects"], ["research", "Research"], ["profile", "About"], ["contact", "Contact"]];
    var links = items.map(function (it) {
      return '<a href="#" ' + go({ view: it[0] }) + ">" + it[1] + "</a>";
    }).join("");
    return '<div class="cg-mobile-menu">' +
      '<div class="cg-mobile-menu-head"><span class="cg-wm">Camila Grimaldi</span>' +
      '<button class="cg-close" aria-label="Close" data-menu="close">×</button></div>' +
      '<nav class="cg-mobile-links">' + links + "</nav></div>";
  }

  function footerHTML() {
    return '<footer class="cg-footer"><div class="cg-footer-inner">' +
      '<div class="cg-footer-col"><div class="cg-wm inverse">Camila Grimaldi</div>' +
      '<p class="cg-footer-note">Architecture · Adaptive reuse · Landscape</p></div>' +
      '<div class="cg-footer-col links">' +
      '<a href="#" ' + go({ view: "works" }) + ">Projects</a>" +
      '<a href="#" ' + go({ view: "research" }) + ">Research</a>" +
      '<a href="#" ' + go({ view: "profile" }) + ">About</a>" +
      '<a href="#" ' + go({ view: "contact" }) + ">Contact</a></div>" +
      '<div class="cg-footer-col links">' +
      '<a href="mailto:arq.cgrimaldi@gmail.com">arq.cgrimaldi@gmail.com</a>' +
      '<a href="tel:+393520244112">+39 352 024 4112</a>' +
      '<a href="https://www.linkedin.com/in/camila-grimaldi-56516621a" target="_blank" rel="noopener">LinkedIn</a></div>' +
      "</div>" +
      '<div class="cg-footer-base"><span>© 2025 Camila Grimaldi</span><span>Architectural portfolio</span></div>' +
      "</footer>";
  }

  /* ====================================================================== */
  /*  SHARED PARTS                                                           */
  /* ====================================================================== */
  function overlayCard(image, title, r) {
    return '<article class="cg-pcard" ' + go(r) + ">" +
      '<div class="cg-pcard-media">' +
      '<img src="' + asset(image) + '" alt="' + esc(title) + '" loading="lazy">' +
      '<span class="cg-pcard-veil"></span>' +
      '<h3 class="cg-pcard-title">' + esc(title) + "</h3>" +
      "</div></article>";
  }

  function projectNav(prev, next, view) {
    return '<nav class="cg-project-nav">' +
      '<a class="cg-pn" href="#" ' + go({ view: view, id: prev.id }) + ">" +
      '<span class="cg-pn-dir">← Previous</span>' +
      '<span class="cg-pn-title">' + esc(prev.title) + "</span></a>" +
      '<a class="cg-pn next" href="#" ' + go({ view: view, id: next.id }) + ">" +
      '<span class="cg-pn-dir">Next →</span>' +
      '<span class="cg-pn-title">' + esc(next.title) + "</span></a>" +
      "</nav>";
  }

  var FS_ICON = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" ' +
    'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3"/></svg>';

  function carouselHTML(images, title, id) {
    var n = images.length;
    var slides = images.map(function (src, k) {
      return '<div class="cg-carousel-slide">' +
        '<img src="' + asset(src) + '" alt="' + esc(title + " — " + (k + 1) + " of " + n) + '" ' +
        'loading="' + (k === 0 ? "eager" : "lazy") + '" data-zoom="' + k + '" style="cursor:zoom-in"></div>';
    }).join("");
    var dots = images.map(function (_, k) {
      return '<button class="cg-dot' + (k === 0 ? " on" : "") + '" data-dot="' + k + '" ' +
        'aria-label="Go to image ' + (k + 1) + '"></button>';
    }).join("");
    return '<section class="cg-carousel" tabindex="0" data-carousel="' + esc(id) + '" ' +
      'aria-label="' + esc(title + " — images") + '">' +
      '<div class="cg-carousel-stage" style="aspect-ratio:16 / 10">' +
      '<div class="cg-carousel-track" style="transform:translateX(0%)">' + slides + "</div>" +
      '<button class="cg-carousel-arrow prev" data-car="prev" aria-label="Previous image">‹</button>' +
      '<button class="cg-fullscreen-btn" data-car="full" aria-label="View fullscreen" title="View fullscreen">' + FS_ICON + "</button>" +
      '<button class="cg-carousel-arrow next" data-car="next" aria-label="Next image">›</button>' +
      "</div>" +
      '<div class="cg-carousel-foot">' +
      '<span class="cg-carousel-count">' + pad(1) + " / " + pad(n) + "</span>" +
      '<div class="cg-carousel-dots">' + dots + "</div>" +
      "</div></section>";
  }

  /* ====================================================================== */
  /*  VIEWS                                                                  */
  /* ====================================================================== */
  function homeHTML() {
    var research = (RESEARCH && RESEARCH.items) || [];
    var heroImgs = PROJECTS.map(function (p) { return p.images[0]; });
    var hero = heroImgs.map(function (src, k) {
      // First cover is the LCP image → prioritise it; the rest only matter once
      // the slow crossfade begins, so let them load lazily.
      var perf = k === 0 ? ' fetchpriority="high"' : ' loading="lazy" decoding="async"';
      return '<img class="cg-hero-img' + (k === 0 ? " on" : "") + '" src="' + asset(src) + '" ' +
        'alt="" aria-hidden="' + (k === 0 ? "false" : "true") + '"' + perf + ">";
    }).join("");
    var researchCards = research.map(function (it) {
      return overlayCard(it.cover || it.images[0], it.title, { view: "research-detail", id: it.id });
    }).join("");
    var projectCards = PROJECTS.map(function (p) {
      return overlayCard(p.images[0], p.title, { view: "project", id: p.id });
    }).join("");

    return '<main class="cg-home">' +
      '<section class="cg-hero">' + hero + "</section>" +
      '<section class="cg-home-body">' +

      '<div class="cg-home-section cg-about">' +
      '<div class="cg-sec-head"><h2 class="cg-home-title">About</h2>' +
      '<a class="cg-sec-link" href="#" ' + go({ view: "profile" }) + '>More <span class="ar">→</span></a></div>' +
      '<div class="cg-about-grid">' +
      '<div class="cg-about-media cg-hoverzoom"><img src="' + asset("img/About.jpg") + '" alt="Camila Grimaldi" loading="lazy"></div>' +
      '<div class="cg-about-panel">' +
      '<p class="cg-about-lead">Architect born in Buenos Aires, with academic and professional experience across Argentina and Italy.</p>' +
      '<p class="cg-about-text">My work explores the relationship between architecture, landscape and the experience of place, seeking to create meaningful spaces rooted in their environmental and cultural context.</p>' +
      '<a class="cg-arrow-link" href="#" ' + go({ view: "profile" }) + '><span>More about me</span><span class="ar ar-r">→</span></a>' +
      "</div></div></div>" +

      '<div class="cg-home-section">' +
      '<div class="cg-sec-head"><h2 class="cg-home-title">Research</h2>' +
      '<a class="cg-sec-link" href="#" ' + go({ view: "research" }) + '>All research <span class="ar">→</span></a></div>' +
      '<div class="cg-ogrid cols-3">' + researchCards + "</div></div>" +

      '<div class="cg-home-section">' +
      '<div class="cg-sec-head"><h2 class="cg-home-title">Projects</h2>' +
      '<a class="cg-sec-link" href="#" ' + go({ view: "works" }) + '>All projects <span class="ar">→</span></a></div>' +
      '<div class="cg-ogrid feature">' + projectCards + "</div></div>" +

      "</section></main>";
  }

  function worksHTML() {
    var cards = PROJECTS.map(function (p) {
      return overlayCard(p.images[0], p.title, { view: "project", id: p.id });
    }).join("");
    return '<main class="cg-page">' +
      '<section class="cg-works-head"><h1 class="cg-page-title">Selected Projects</h1>' +
      '<span class="cg-works-count">Five projects</span></section>' +
      '<section class="cg-ogrid feature" style="margin-top: var(--space-7)">' + cards + "</section></main>";
  }

  function researchHTML() {
    var cards = RESEARCH.items.map(function (it) {
      return '<article class="cg-rcard" ' + go({ view: "research-detail", id: it.id }) + ">" +
        '<div class="cg-rcard-media"><img src="' + asset(it.cover || it.images[0]) + '" alt="' + esc(it.title) + '" loading="lazy"></div>' +
        '<div class="cg-rcard-body">' +
        '<span class="cg-rcard-index">' + esc(it.index) + "</span>" +
        '<div class="cg-rcard-text">' +
        '<div class="cg-rcard-meta">' + esc(it.meta + (it.location ? " · " + it.location : "")) + "</div>" +
        '<h2 class="cg-rcard-title">' + esc(it.title) + "</h2></div>" +
        '<span class="cg-rcard-arrow">→</span>' +
        "</div></article>";
    }).join("");
    return '<main class="cg-page cg-research">' +
      '<section class="cg-research-head"><h1 class="cg-page-title">Research</h1></section>' +
      '<section class="cg-rcard-list">' + cards + "</section></main>";
  }

  function researchDetailHTML(id) {
    var items = RESEARCH.items;
    var i = items.findIndex(function (p) { return p.id === id; });
    if (i < 0) { return null; }
    var item = items[i];
    var prev = items[(i - 1 + items.length) % items.length];
    var next = items[(i + 1) % items.length];

    var desc = (item.description || []).map(function (p) { return "<p>" + renderRich(p) + "</p>"; }).join("");
    var sections = (item.sections || []).map(function (sec) {
      return '<div class="cg-research-section">' +
        (sec.heading ? '<h2 class="cg-research-section-title">' + esc(sec.heading) + "</h2>" : "") +
        (sec.question ? '<p class="cg-research-question">' + esc(sec.question) + "</p>" : "") +
        sec.paragraphs.map(function (p) { return "<p>" + renderRich(p) + "</p>"; }).join("") +
        "</div>";
    }).join("");

    return '<main class="cg-page cg-project cg-research-detail">' +
      '<div class="cg-project-back">' +
      '<a class="cg-arrow-link" href="#" ' + go({ view: "research" }) + '><span class="ar ar-l">←</span><span>Research</span></a>' +
      '<span class="cg-project-counter">' + esc(item.index) + " / " + pad(items.length) + "</span></div>" +
      '<h1 class="cg-project-title">' + esc(item.title) + "</h1>" +
      carouselHTML(item.images, item.title, "research-" + item.id) +
      '<div class="cg-project-lower">' +
      '<dl class="cg-meta" style="grid-template-columns:max-content 1fr">' +
      '<div class="cg-meta-row"><dt class="cg-meta-k">Type</dt><dd class="cg-meta-v">' + esc(item.meta) + "</dd></div>" +
      (item.location ? '<div class="cg-meta-row"><dt class="cg-meta-k">Context</dt><dd class="cg-meta-v">' + esc(item.location) + "</dd></div>" : "") +
      "</dl>" +
      '<div class="cg-project-text">' + desc + sections + "</div></div>" +
      projectNav(prev, next, "research-detail") +
      "</main>";
  }

  function projectHTML(id) {
    var i = PROJECTS.findIndex(function (p) { return p.id === id; });
    if (i < 0) { return null; }
    var project = PROJECTS[i];
    var prev = PROJECTS[(i - 1 + PROJECTS.length) % PROJECTS.length];
    var next = PROJECTS[(i + 1) % PROJECTS.length];

    var tags = project.program.map(function (t) { return '<span class="cg-tag">' + esc(t) + "</span>"; }).join("");
    var text = (project.description && project.description.length)
      ? '<section class="cg-project2-text">' +
        (project.location ? '<div class="cg-project2-location">' + esc(project.location) + "</div>" : "") +
        project.description.map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("") +
        "</section>"
      : "";

    return '<main class="cg-project2">' +
      '<div class="cg-page cg-crumb-wrap"><nav class="cg-crumb">' +
      '<a href="#" ' + go({ view: "works" }) + ">Projects</a>" +
      '<span class="cg-crumb-sep">/</span><span class="cg-crumb-here">' + esc(project.title) + "</span></nav></div>" +

      '<header class="cg-cover">' +
      '<img class="cg-cover-img" src="' + asset(project.images[0]) + '" alt="' + esc(project.title) + '">' +
      '<span class="cg-cover-veil"></span>' +
      '<div class="cg-cover-inner cg-page">' +
      '<h1 class="cg-cover-title">' + esc(project.title) + "</h1>" +
      '<div class="cg-cover-tags">' + tags + "</div></div></header>" +

      '<div class="cg-page cg-project2-body">' +
      '<div class="cg-gallery-jump"><button class="cg-tag-btn" data-jump="cg-gallery">Image Gallery</button></div>' +
      text +
      '<section class="cg-gallery" id="cg-gallery">' + carouselHTML(project.images, project.title, "project-" + project.id) + "</section>" +
      projectNav(prev, next, "project") +
      "</div></main>";
  }

  function profileHTML() {
    return '<main class="cg-page cg-profile">' +
      '<section class="cg-profile-top">' +
      '<div class="cg-profile-statement">' +
      '<h1 class="cg-profile-name">Camila Grimaldi</h1>' +
      '<div class="cg-profile-subtitle">Architect</div>' +
      '<div class="cg-profile-role">Profile</div>' +
      '<div class="cg-profile-body prose">' +
      "<p>Born in Buenos Aires and influenced by both Argentine and Italian cultures, I developed an early awareness of the relationship between place, identity and the built environment.</p>" +
      "<p>I am an architect with international academic and professional experience across Argentina and Italy. Working within these diverse contexts has deepened my interest in the interplay between architecture, landscape and the experience of place, while reinforcing the importance of understanding each site’s environmental, cultural and spatial qualities as a foundation for design.</p>" +
      "<p>I am particularly interested in projects that create meaningful relationships between people and place, approaching design through a balance of conceptual thinking, technical rigour and continuous refinement. I see architecture as an opportunity to respond thoughtfully to its surroundings while enriching the way people inhabit and experience space.</p>" +
      "</div>" +
      '<div class="cg-profile-cta"><a class="cg-btn-ink" href="' + asset("files/Camila Grimaldi CV.pdf") + '" download="Camila Grimaldi CV.pdf">Download CV</a></div>' +
      "</div>" +
      '<figure class="cg-plate-fig"><div class="cg-plate" style="aspect-ratio:1 / 1; background:var(--paper-2)">' +
      '<img class="cg-plate-img" src="' + asset("img/GRIMALDI CAMILA PROFILE - copia 03.jpg") + '" alt="Camila Grimaldi" loading="lazy" style="object-fit:cover"></div></figure>' +
      "</section>" +

      '<section class="cg-profile-cols">' +
      '<div class="cg-info-col"><div class="cg-eyebrow">Education</div><ul class="cg-info-list">' +
      '<li><span class="y">2025</span> High-Level Training Course in Architecture for Hospitality / YACademy, Bologna, Italy</li>' +
      '<li><span class="y">2017 — 2022</span> Degree in Architecture / University of Buenos Aires (UBA), Argentina</li>' +
      '<li><span class="y">2012 — 2016</span> International Baccalaureate (IB) / De La Salle College, Buenos Aires, Argentina</li>' +
      "</ul></div>" +
      '<div class="cg-info-col"><div class="cg-eyebrow">Professional Experience</div><ul class="cg-info-list">' +
      '<li><span class="y">2026 — Present</span> Architectural Intern / Open Project (Bologna, Italy)</li>' +
      '<li><span class="y">2023 — 2025</span> Architect / XFB Studio (Buenos Aires, Argentina)</li>' +
      '<li><span class="y">2022 — 2023</span> Architect / BMA Studio (Buenos Aires, Argentina)</li>' +
      '<li><span class="y">2021 — 2022</span> Junior Architect / Grupo Naistat (Buenos Aires, Argentina)</li>' +
      '<li><span class="y">2020 — Present</span> Freelance Architectural Visualiser</li>' +
      "</ul></div></section></main>";
  }

  function contactHTML() {
    return '<main class="cg-page cg-contact">' +
      '<section class="cg-contact-top"><h1 class="cg-page-title">Contact</h1>' +
      '<p class="cg-contact-loc">Available for projects across Italy and Europe</p></section>' +
      '<section class="cg-contact-grid">' +
      '<form class="cg-form" id="cg-contact-form" novalidate>' +
      '<div class="cg-field"><label>Name</label><input name="name" required placeholder="Your name"></div>' +
      '<div class="cg-field"><label>Email</label><input name="email" type="email" required placeholder="name@studio.com"></div>' +
      '<div class="cg-field"><label>Message</label><textarea name="message" rows="3" required placeholder="Tell me about the project"></textarea></div>' +
      // Honeypot — hidden from people, tempting to bots. A checked box = spam.
      '<input type="checkbox" name="botcheck" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0">' +
      '<button class="cg-btn-ink" type="submit">Send enquiry</button>' +
      "</form>" +
      '<aside class="cg-contact-aside">' +
      '<div class="cg-info-col"><div class="cg-eyebrow">Email</div><p class="cg-contact-detail"><a href="mailto:arq.cgrimaldi@gmail.com">arq.cgrimaldi@gmail.com</a></p></div>' +
      '<div class="cg-info-col"><div class="cg-eyebrow">Phone</div><p class="cg-contact-detail"><a href="tel:+393520244112">+39 352 024 4112</a></p></div>' +
      '<div class="cg-info-col"><div class="cg-eyebrow">LinkedIn</div><p class="cg-contact-detail"><a href="https://www.linkedin.com/in/camila-grimaldi-56516621a" target="_blank" rel="noopener">camila-grimaldi</a></p></div>' +
      "</aside></section></main>";
  }

  /* ====================================================================== */
  /*  RENDER                                                                 */
  /* ====================================================================== */
  function viewHTML() {
    switch (route.view) {
      case "home":            return homeHTML();
      case "works":           return worksHTML();
      case "research":        return researchHTML();
      case "research-detail": return researchDetailHTML(route.id);
      case "project":         return projectHTML(route.id);
      case "profile":         return profileHTML();
      case "contact":         return contactHTML();
      default:                return homeHTML();
    }
  }

  function render() {
    runCleanups();

    // Resolve detail routes; fall back to the index if the id is unknown.
    var body = viewHTML();
    if (body == null) {
      route = route.view === "project" ? { view: "works" } : { view: "research" };
      body = viewHTML();
    }

    root.innerHTML =
      '<div class="cg-app density-regular">' +
      navHTML(false) +
      (menuOpen ? menuHTML() : "") +
      '<div class="cg-reveal">' + body + "</div>" +
      footerHTML() +
      "</div>";

    wire();
  }

  /* ====================================================================== */
  /*  BEHAVIOURS (wired after every render)                                  */
  /* ====================================================================== */
  function wire() {
    wireNavOverlay();
    wireHero();
    wireCarousels();
    wireGalleryJump();
    wireContactForm();
  }

  // Homepage: nav floats translucent over the hero, then resolves to solid.
  function wireNavOverlay() {
    if (route.view !== "home") return;
    var header = root.querySelector(".cg-nav");
    if (!header) return;
    var onScroll = function () {
      var scrolled = window.scrollY > window.innerHeight * 0.62;
      header.classList.toggle("cg-nav--overlay", !scrolled);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    addCleanup(function () { window.removeEventListener("scroll", onScroll); });
  }

  // Auto-cycling hero — slow crossfade between the project covers.
  function wireHero() {
    var hero = root.querySelector(".cg-hero");
    if (!hero) return;
    var imgs = Array.prototype.slice.call(hero.querySelectorAll(".cg-hero-img"));
    if (imgs.length < 2) return;
    var i = 0;
    var id = setInterval(function () {
      imgs[i].classList.remove("on");
      i = (i + 1) % imgs.length;
      imgs[i].classList.add("on");
    }, 3600);
    addCleanup(function () { clearInterval(id); });
  }

  // Image gallery jump button — smooth scroll to the carousel.
  function wireGalleryJump() {
    var btn = root.querySelector("[data-jump]");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var el = document.getElementById(btn.getAttribute("data-jump"));
      if (!el) return;
      var y = el.getBoundingClientRect().top + window.scrollY - 90;
      window.scrollTo({ top: y, behavior: "smooth" });
    });
  }

  // Show/replace the status note under the form.
  function setNote(form, text) {
    var note = form.querySelector(".cg-form-note");
    if (!text) { if (note) note.remove(); return; }
    if (!note) {
      note = document.createElement("p");
      note.className = "cg-form-note";
      form.appendChild(note);
    }
    note.textContent = text;
  }

  // Fallback used only when no Web3Forms key is configured yet: open the
  // visitor's own mail client addressed to Camila.
  function mailtoFallback(form, name, email, message) {
    var subject = "Website enquiry" + (name ? " — " + name : "");
    var bodyText = "Name: " + name + "\n" + "Email: " + email + "\n\n" + message + "\n";
    window.location.href = "mailto:" + CONTACT_EMAIL +
      "?subject=" + encodeURIComponent(subject) +
      "&body=" + encodeURIComponent(bodyText);
    var btn = form.querySelector('button[type="submit"]');
    if (btn) btn.textContent = "Opening your email…";
    setNote(form, "Your email app should open with the message ready to send to " + CONTACT_EMAIL + ".");
  }

  // Contact form → posts to Web3Forms, which emails the enquiry to CONTACT_EMAIL.
  function wireContactForm() {
    var form = root.querySelector("#cg-contact-form");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }

      var name = (form.elements.name.value || "").trim();
      var email = (form.elements.email.value || "").trim();
      var message = (form.elements.message.value || "").trim();
      var btn = form.querySelector('button[type="submit"]');

      // No backend key yet → keep the form usable via the visitor's mail client.
      if (!hasFormKey()) { mailtoFallback(form, name, email, message); return; }

      setNote(form, "");
      btn.disabled = true;
      btn.textContent = "Sending…";

      var payload = {
        access_key: WEB3FORMS_ACCESS_KEY,
        subject: "New enquiry from your portfolio website" + (name ? " — " + name : ""),
        from_name: name || "Portfolio website",
        // Sets the email's Reply-To header to the visitor → hitting "Reply" in
        // Gmail addresses your response straight to them.
        replyto: email,
        name: name,
        email: email,
        message: message,
        botcheck: form.elements.botcheck ? form.elements.botcheck.checked : false
      };

      fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(payload)
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data && data.success) {
            form.reset();
            btn.textContent = "Message sent ✓";
            setNote(form, "Thank you — your message has been sent to " + CONTACT_EMAIL + ". I’ll get back to you shortly.");
          } else {
            btn.disabled = false;
            btn.textContent = "Send enquiry";
            setNote(form, "Sorry — your message couldn’t be sent. Please email " + CONTACT_EMAIL + " directly.");
          }
        })
        .catch(function () {
          btn.disabled = false;
          btn.textContent = "Send enquiry";
          setNote(form, "Sorry — your message couldn’t be sent (network issue). Please email " + CONTACT_EMAIL + " directly.");
        });
    });
  }

  /* ---- Carousel + lightbox ---------------------------------------------- */
  function wireCarousels() {
    var nodes = Array.prototype.slice.call(root.querySelectorAll("[data-carousel]"));
    nodes.forEach(initCarousel);
  }

  function initCarousel(section) {
    var track = section.querySelector(".cg-carousel-track");
    var stage = section.querySelector(".cg-carousel-stage");
    var slides = Array.prototype.slice.call(section.querySelectorAll(".cg-carousel-slide"));
    var imgs = slides.map(function (s) { return s.querySelector("img"); });
    var dots = Array.prototype.slice.call(section.querySelectorAll(".cg-dot"));
    var countEl = section.querySelector(".cg-carousel-count");
    var n = slides.length;
    var i = 0;
    var ratios = {};
    // Already-encoded URLs taken straight from the live <img> tags. These must
    // NOT be passed through asset()/encodeURI again — re-encoding turns "%20"
    // into "%2520", which 404s and shows a black lightbox in production.
    var encodedSrcs = imgs.map(function (im) { return im.getAttribute("src"); });

    function applyStageRatio() {
      stage.style.aspectRatio = ratios[i] ? String(ratios[i]) : "16 / 10";
    }
    function update() {
      track.style.transform = "translateX(-" + (i * 100) + "%)";
      dots.forEach(function (d, k) { d.classList.toggle("on", k === i); });
      if (countEl) countEl.textContent = pad(i + 1) + " / " + pad(n);
      applyStageRatio();
    }
    function move(d) { i = (i + d + n) % n; update(); }
    function set(k) { i = k; update(); }

    // Stage adapts to the active image's own proportions (no cropping).
    imgs.forEach(function (im, k) {
      var record = function () {
        if (im.naturalWidth && !ratios[k]) {
          ratios[k] = im.naturalWidth / im.naturalHeight;
          if (k === i) applyStageRatio();
        }
      };
      if (im.complete) record();
      im.addEventListener("load", record);
    });

    section.addEventListener("click", function (e) {
      var car = e.target.closest("[data-car]");
      if (car) {
        var a = car.getAttribute("data-car");
        if (a === "prev") move(-1);
        else if (a === "next") move(1);
        else if (a === "full") openLightbox();
        return;
      }
      var dot = e.target.closest("[data-dot]");
      if (dot) { set(parseInt(dot.getAttribute("data-dot"), 10)); return; }
      var zoom = e.target.closest("[data-zoom]");
      if (zoom) { openLightbox(); }
    });

    // Keyboard navigation when the carousel is focused.
    var onKey = function (e) {
      if (e.key === "ArrowRight") move(1);
      else if (e.key === "ArrowLeft") move(-1);
    };
    section.addEventListener("keydown", onKey);

    /* -- Fullscreen lightbox -- */
    var box = null;
    function renderLightbox() {
      box.innerHTML =
        '<button class="cg-lightbox-close" aria-label="Close fullscreen">×</button>' +
        (n > 1 ? '<button class="cg-lightbox-arrow prev" aria-label="Previous image">‹</button>' : "") +
        '<figure class="cg-lightbox-fig"><img src="' + encodedSrcs[i] + '" alt=""></figure>' +
        (n > 1 ? '<button class="cg-lightbox-arrow next" aria-label="Next image">›</button>' : "") +
        '<span class="cg-lightbox-count">' + pad(i + 1) + " / " + pad(n) + "</span>";
    }
    function openLightbox() {
      if (box) return;
      box = document.createElement("div");
      box.className = "cg-lightbox";
      renderLightbox();
      document.body.appendChild(box);
      document.body.style.overflow = "hidden";

      box.addEventListener("click", function (e) {
        if (e.target.closest(".cg-lightbox-close")) { closeLightbox(); return; }
        if (e.target.closest(".cg-lightbox-arrow.prev")) { e.stopPropagation(); move(-1); renderLightbox(); return; }
        if (e.target.closest(".cg-lightbox-arrow.next")) { e.stopPropagation(); move(1); renderLightbox(); return; }
        if (e.target.closest(".cg-lightbox-fig")) { e.stopPropagation(); return; }
        closeLightbox(); // click on the backdrop
      });

      window.addEventListener("keydown", onLightboxKey);
    }
    function onLightboxKey(e) {
      if (e.key === "Escape") closeLightbox();
      else if (e.key === "ArrowRight") { move(1); renderLightbox(); }
      else if (e.key === "ArrowLeft") { move(-1); renderLightbox(); }
    }
    function closeLightbox() {
      if (!box) return;
      window.removeEventListener("keydown", onLightboxKey);
      document.body.style.overflow = "";
      box.remove();
      box = null;
    }

    addCleanup(function () { section.removeEventListener("keydown", onKey); closeLightbox(); });
    update();
  }

  /* ====================================================================== */
  /*  GLOBAL EVENT DELEGATION (attached once)                                */
  /* ====================================================================== */
  root.addEventListener("click", function (e) {
    var goEl = e.target.closest("[data-go]");
    if (goEl) {
      e.preventDefault();
      var r;
      try { r = JSON.parse(goEl.getAttribute("data-go")); } catch (err) { return; }
      menuOpen = false;
      navigate(r);
      return;
    }
    var menuEl = e.target.closest("[data-menu]");
    if (menuEl) {
      e.preventDefault();
      menuOpen = menuEl.getAttribute("data-menu") === "open";
      render();
    }
  });

  window.addEventListener("hashchange", function () {
    var next = parseHash();
    var sameView = next.view === route.view && next.id === route.id;
    route = next;
    menuOpen = false;            // never let the mobile menu linger across a navigation
    render();
    if (!sameView) window.scrollTo(0, 0);
  });

  /* ---- boot -------------------------------------------------------------- */
  render();
})();
