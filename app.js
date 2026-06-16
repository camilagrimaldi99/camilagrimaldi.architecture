/* app.js — Camila Grimaldi · Architecture
   Static, dependency-free implementation of the portfolio site.
   Recreated from the Claude Design handoff (React/Babel prototype) as a
   self-contained vanilla-JS SPA with hash routing.

   Views: Home · Projects · Project · Research · Research detail · About · Contact
   Defaults baked from the prototype Tweaks: editorial pairing, subtle accent,
   regular density. */

(function () {
  "use strict";

  /* --------------------------------------------------------------------- */
  /* helpers                                                               */
  /* --------------------------------------------------------------------- */

  // In a static deploy assets resolve to their (encoded) on-disk path.
  function resolveAsset(p) { return encodeURI(p); }

  // Tiny hyperscript: h(tag, attrs, ...children) -> DOM node.
  function h(tag, attrs) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const key in attrs) {
        const val = attrs[key];
        if (val == null || val === false) continue;
        if (key === "class") node.className = val;
        else if (key === "html") node.innerHTML = val;
        else if (key === "style" && typeof val === "object") Object.assign(node.style, val);
        else if (key.slice(0, 2) === "on" && typeof val === "function") {
          node.addEventListener(key.slice(2).toLowerCase(), val);
        } else node.setAttribute(key, val);
      }
    }
    for (let i = 2; i < arguments.length; i++) append(node, arguments[i]);
    return node;
  }
  function append(node, child) {
    if (child == null || child === false) return;
    if (Array.isArray(child)) { child.forEach((c) => append(node, c)); return; }
    node.appendChild(child.nodeType ? child : document.createTextNode(String(child)));
  }

  // Render a paragraph string, converting [[...]] markers into emphasis.
  function richParagraph(text) {
    const p = h("p");
    text.split(/\[\[(.*?)\]\]/g).forEach((seg, i) => {
      if (i % 2 === 1) p.appendChild(h("strong", { class: "cg-em" }, seg));
      else if (seg) p.appendChild(document.createTextNode(seg));
    });
    return p;
  }

  /* --------------------------------------------------------------------- */
  /* routing                                                               */
  /* --------------------------------------------------------------------- */

  function hashFor(r) {
    switch (r.view) {
      case "home": return "#/";
      case "works": return "#/projects";
      case "project": return "#/project/" + r.id;
      case "research": return "#/research";
      case "research-detail": return "#/research/" + r.id;
      case "profile": return "#/about";
      case "contact": return "#/contact";
      default: return "#/";
    }
  }

  function parseHash() {
    const raw = (location.hash || "").replace(/^#\/?/, "");
    const parts = raw.split("/").filter(Boolean).map(decodeURIComponent);
    if (parts.length === 0) return { view: "home" };
    switch (parts[0]) {
      case "projects": return { view: "works" };
      case "project": return parts[1] ? { view: "project", id: parts[1] } : { view: "works" };
      case "research": return parts[1] ? { view: "research-detail", id: parts[1] } : { view: "research" };
      case "about": return { view: "profile" };
      case "contact": return { view: "contact" };
      default: return { view: "home" };
    }
  }

  function go(r) {
    const next = hashFor(r);
    if (location.hash === next) render();   // same hash: re-render manually
    else location.hash = next;              // else hashchange triggers render
  }

  // link factory — an <a> that routes via go() and prevents default.
  function routeLink(route, attrs, ...kids) {
    const a = h("a", Object.assign({ href: hashFor(route) }, attrs || {}));
    a.addEventListener("click", (e) => { e.preventDefault(); go(route); });
    kids.forEach((k) => append(a, k));
    return a;
  }

  /* --------------------------------------------------------------------- */
  /* lifecycle — teardown registry for timers / listeners                  */
  /* --------------------------------------------------------------------- */

  let teardowns = [];
  function onTeardown(fn) { teardowns.push(fn); }
  function runTeardown() { teardowns.forEach((fn) => { try { fn(); } catch (e) {} }); teardowns = []; }

  /* --------------------------------------------------------------------- */
  /* primitives                                                            */
  /* --------------------------------------------------------------------- */

  // Image plate (real image variant of the prototype's <Plate>).
  function Plate(opts) {
    const fit = opts.fit || "cover";
    const ratio = (opts.ratio || "4/3").replace("/", " / ");
    return h("figure", { class: "cg-plate-fig", style: opts.style || null },
      h("div", { class: "cg-plate", style: { aspectRatio: ratio, background: "var(--paper-2)" } },
        h("img", {
          class: "cg-plate-img", src: resolveAsset(opts.src),
          alt: opts.caption || opts.label || "", loading: opts.eager ? "eager" : "lazy",
          style: { objectFit: fit }
        })
      ),
      opts.caption ? h("figcaption", { class: "cg-plate-cap" }, opts.caption) : null
    );
  }

  function Eyebrow(text) { return h("div", { class: "cg-eyebrow" }, text); }

  // Arrow link (uppercase, tracked, with animated arrow).
  function ArrowLink(label, onClick, dir) {
    dir = dir || "right";
    const arrow = dir === "left" ? "←" : "→";
    const a = h("a", { class: "cg-arrow-link", href: "#" });
    a.addEventListener("click", (e) => { e.preventDefault(); onClick(); });
    if (dir === "left") a.appendChild(h("span", { class: "ar ar-l" }, arrow));
    a.appendChild(h("span", {}, label));
    if (dir === "right") a.appendChild(h("span", { class: "ar ar-r" }, arrow));
    return a;
  }

  /* --------------------------------------------------------------------- */
  /* chrome — Nav, MobileMenu, Footer                                      */
  /* --------------------------------------------------------------------- */

  const NAV_ITEMS = [
    ["works", "Projects"],
    ["research", "Research"],
    ["profile", "About"],
    ["contact", "Contact"]
  ];

  function Nav(route) {
    const isActive = (k) =>
      route.view === k ||
      (k === "works" && route.view === "project") ||
      (k === "research" && route.view === "research-detail");

    const overlay = route.view === "home";

    const wm = routeLink({ view: "home" }, { class: "cg-wm" }, "Camila Grimaldi");

    const links = h("nav", { class: "cg-nav-links" });
    NAV_ITEMS.forEach(([k, label]) => {
      links.appendChild(routeLink({ view: k },
        { class: "cg-nav-link" + (isActive(k) ? " active" : "") }, label));
    });

    const burger = h("button", { class: "cg-burger", "aria-label": "Menu" },
      h("span"), h("span"));
    burger.addEventListener("click", openMobileMenu);

    const header = h("header", { class: "cg-nav" + (overlay ? " cg-nav--overlay" : "") },
      wm, links, burger);

    // On the homepage the bar sits over the hero until it scrolls away.
    if (overlay) {
      const onScroll = () => {
        const scrolled = window.scrollY > window.innerHeight * 0.62;
        header.classList.toggle("cg-nav--overlay", !scrolled);
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
      onTeardown(() => window.removeEventListener("scroll", onScroll));
    }
    return header;
  }

  function openMobileMenu() {
    closeMobileMenu();
    const menu = h("div", { class: "cg-mobile-menu", id: "cg-mobile-menu" });
    const head = h("div", { class: "cg-mobile-menu-head" },
      h("span", { class: "cg-wm" }, "Camila Grimaldi"));
    const close = h("button", { class: "cg-close", "aria-label": "Close" }, "×");
    close.addEventListener("click", closeMobileMenu);
    head.appendChild(close);
    const links = h("nav", { class: "cg-mobile-links" });
    NAV_ITEMS.forEach(([k, label]) => {
      links.appendChild(routeLink({ view: k }, {}, label));
    });
    links.addEventListener("click", closeMobileMenu);
    menu.appendChild(head);
    menu.appendChild(links);
    document.body.appendChild(menu);
  }
  function closeMobileMenu() {
    const m = document.getElementById("cg-mobile-menu");
    if (m) m.remove();
  }

  function Footer() {
    return h("footer", { class: "cg-footer" },
      h("div", { class: "cg-footer-inner" },
        h("div", { class: "cg-footer-col" },
          h("div", { class: "cg-wm inverse" }, "Camila Grimaldi"),
          h("p", { class: "cg-footer-note" }, "Architecture · Adaptive reuse · Landscape")
        ),
        h("div", { class: "cg-footer-col links" },
          routeLink({ view: "works" }, {}, "Projects"),
          routeLink({ view: "research" }, {}, "Research"),
          routeLink({ view: "profile" }, {}, "About"),
          routeLink({ view: "contact" }, {}, "Contact")
        ),
        h("div", { class: "cg-footer-col links" },
          h("a", { href: "mailto:arq.cgrimaldi@gmail.com" }, "arq.cgrimaldi@gmail.com"),
          h("a", { href: "tel:+393520244112" }, "+39 352 024 4112"),
          h("a", { href: "https://www.linkedin.com/in/camila-grimaldi-56516621a", target: "_blank", rel: "noopener" }, "LinkedIn")
        )
      ),
      h("div", { class: "cg-footer-base" },
        h("span", {}, "© 2025 Camila Grimaldi"),
        h("span", {}, "Architectural portfolio")
      )
    );
  }

  /* --------------------------------------------------------------------- */
  /* shared — overlay card + carousel                                      */
  /* --------------------------------------------------------------------- */

  function OverlayCard(image, title, onClick, className) {
    const card = h("article", { class: "cg-pcard" + (className ? " " + className : "") },
      h("div", { class: "cg-pcard-media" },
        h("img", { src: resolveAsset(image), alt: title, loading: "lazy" }),
        h("span", { class: "cg-pcard-veil" }),
        h("h3", { class: "cg-pcard-title" }, title)
      )
    );
    card.addEventListener("click", onClick);
    return card;
  }

  // Horizontal image carousel with adaptive stage ratio + fullscreen lightbox.
  function ProjectCarousel(images, title) {
    let i = 0;
    const n = images.length;
    const ratios = {};
    let lightbox = null;

    const track = h("div", { class: "cg-carousel-track" });
    const imgs = [];
    images.forEach((src, k) => {
      const img = h("img", {
        src: resolveAsset(src), alt: title + " — " + (k + 1) + " of " + n,
        loading: k === 0 ? "eager" : "lazy", style: { cursor: "zoom-in" }
      });
      img.addEventListener("load", () => {
        if (!ratios[k]) {
          ratios[k] = img.naturalWidth / img.naturalHeight;
          if (k === i) applyStage();
        }
      });
      img.addEventListener("click", openFull);
      imgs.push(img);
      track.appendChild(h("div", { class: "cg-carousel-slide" }, img));
    });

    const stage = h("div", { class: "cg-carousel-stage" }, track);

    const prev = h("button", { class: "cg-carousel-arrow prev", "aria-label": "Previous image" }, "‹");
    const next = h("button", { class: "cg-carousel-arrow next", "aria-label": "Next image" }, "›");
    const fsBtn = h("button", { class: "cg-fullscreen-btn", "aria-label": "View fullscreen", title: "View fullscreen" });
    fsBtn.innerHTML = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3"/></svg>';
    prev.addEventListener("click", () => move(-1));
    next.addEventListener("click", () => move(1));
    fsBtn.addEventListener("click", openFull);
    stage.appendChild(prev);
    stage.appendChild(fsBtn);
    stage.appendChild(next);

    const count = h("span", { class: "cg-carousel-count" });
    const dotsWrap = h("div", { class: "cg-carousel-dots" });
    const dots = images.map((_, k) => {
      const d = h("button", { class: "cg-dot", "aria-label": "Go to image " + (k + 1) });
      d.addEventListener("click", () => { i = k; update(); });
      dotsWrap.appendChild(d);
      return d;
    });
    const foot = h("div", { class: "cg-carousel-foot" }, count, dotsWrap);

    const section = h("section", { class: "cg-carousel", tabindex: "0", "aria-label": title + " — images" },
      stage, foot);
    section.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") move(1);
      else if (e.key === "ArrowLeft") move(-1);
      else if (e.key === "Escape") closeFull();
    });

    function applyStage() {
      const r = ratios[i];
      stage.style.aspectRatio = r ? String(r) : "16 / 10";
    }
    function move(d) { i = (i + d + n) % n; update(); }
    function update() {
      track.style.transform = "translateX(-" + (i * 100) + "%)";
      count.textContent = pad(i + 1) + " / " + pad(n);
      dots.forEach((d, k) => d.classList.toggle("on", k === i));
      applyStage();
      if (lightbox) lightbox.refresh();
    }
    function pad(x) { return String(x).padStart(2, "0"); }

    function openFull() {
      if (lightbox) return;
      const fig = h("figure", { class: "cg-lightbox-fig" });
      const lbImg = h("img", { alt: title });
      fig.appendChild(lbImg);
      fig.addEventListener("click", (e) => e.stopPropagation());

      const lbClose = h("button", { class: "cg-lightbox-close", "aria-label": "Close fullscreen" }, "×");
      const lbCount = h("span", { class: "cg-lightbox-count" });
      const box = h("div", { class: "cg-lightbox" }, lbClose, fig, lbCount);

      let lbPrev = null, lbNext = null;
      if (n > 1) {
        lbPrev = h("button", { class: "cg-lightbox-arrow prev", "aria-label": "Previous image" }, "‹");
        lbNext = h("button", { class: "cg-lightbox-arrow next", "aria-label": "Next image" }, "›");
        lbPrev.addEventListener("click", (e) => { e.stopPropagation(); move(-1); });
        lbNext.addEventListener("click", (e) => { e.stopPropagation(); move(1); });
        box.insertBefore(lbPrev, fig);
        box.insertBefore(lbNext, lbCount);
      }
      box.addEventListener("click", closeFull);
      lbClose.addEventListener("click", (e) => { e.stopPropagation(); closeFull(); });

      const onKey = (e) => {
        if (e.key === "Escape") closeFull();
        else if (e.key === "ArrowRight") move(1);
        else if (e.key === "ArrowLeft") move(-1);
      };
      window.addEventListener("keydown", onKey);
      document.body.style.overflow = "hidden";

      lightbox = {
        el: box, onKey,
        refresh: () => { lbImg.src = resolveAsset(images[i]); lbCount.textContent = pad(i + 1) + " / " + pad(n); }
      };
      lightbox.refresh();
      document.body.appendChild(box);
    }
    function closeFull() {
      if (!lightbox) return;
      window.removeEventListener("keydown", lightbox.onKey);
      document.body.style.overflow = "";
      lightbox.el.remove();
      lightbox = null;
    }
    onTeardown(closeFull);

    update();
    return section;
  }

  /* --------------------------------------------------------------------- */
  /* views                                                                 */
  /* --------------------------------------------------------------------- */

  function HeroCarousel(images) {
    const section = h("section", { class: "cg-hero" });
    const imgs = images.map((src, k) =>
      h("img", { class: "cg-hero-img" + (k === 0 ? " on" : ""), src: resolveAsset(src), alt: "", "aria-hidden": k === 0 ? "false" : "true" }));
    imgs.forEach((im) => section.appendChild(im));
    if (images.length > 1) {
      let i = 0;
      const id = setInterval(() => {
        imgs[i].classList.remove("on"); imgs[i].setAttribute("aria-hidden", "true");
        i = (i + 1) % images.length;
        imgs[i].classList.add("on"); imgs[i].setAttribute("aria-hidden", "false");
      }, 3600);
      onTeardown(() => clearInterval(id));
    }
    return section;
  }

  function sectionHead(title, linkLabel, route) {
    const link = routeLink(route, { class: "cg-sec-link" });
    link.appendChild(document.createTextNode(linkLabel + " "));
    link.appendChild(h("span", { class: "ar" }, "→"));
    return h("div", { class: "cg-sec-head" },
      h("h2", { class: "cg-home-title" }, title), link);
  }

  function Home() {
    const research = (window.CG_RESEARCH && CG_RESEARCH.items) || [];
    const heroImages = CG_PROJECTS.map((p) => p.images[0]);

    // About
    const aboutPanel = h("div", { class: "cg-about-panel" },
      h("p", { class: "cg-about-lead" }, "Architect born in Buenos Aires, with academic and professional experience across Argentina and Italy."),
      h("p", { class: "cg-about-text" }, "My work explores the relationship between architecture, landscape and the experience of place, seeking to create meaningful spaces rooted in their environmental and cultural context."),
      ArrowLink("More about me", () => go({ view: "profile" }))
    );
    const about = h("div", { class: "cg-home-section cg-about" },
      sectionHead("About", "More", { view: "profile" }),
      h("div", { class: "cg-about-grid" },
        h("div", { class: "cg-about-media cg-hoverzoom" },
          h("img", { src: resolveAsset("img/About.jpg"), alt: "Camila Grimaldi", loading: "lazy" })),
        aboutPanel
      )
    );

    // Research preview
    const rgrid = h("div", { class: "cg-ogrid cols-3" });
    research.forEach((item) => {
      rgrid.appendChild(OverlayCard(item.cover || item.images[0], item.title,
        () => go({ view: "research-detail", id: item.id })));
    });
    const researchPrev = h("div", { class: "cg-home-section" },
      sectionHead("Research", "All research", { view: "research" }), rgrid);

    // Projects preview
    const pgrid = h("div", { class: "cg-ogrid feature" });
    CG_PROJECTS.forEach((p) => {
      pgrid.appendChild(OverlayCard(p.images[0], p.title, () => go({ view: "project", id: p.id })));
    });
    const projectsPrev = h("div", { class: "cg-home-section" },
      sectionHead("Projects", "All projects", { view: "works" }), pgrid);

    return h("main", { class: "cg-home" },
      HeroCarousel(heroImages),
      h("section", { class: "cg-home-body" }, about, researchPrev, projectsPrev)
    );
  }

  function Works() {
    const grid = h("section", { class: "cg-ogrid feature", style: { marginTop: "var(--space-7)" } });
    CG_PROJECTS.forEach((p) => {
      grid.appendChild(OverlayCard(p.images[0], p.title, () => go({ view: "project", id: p.id })));
    });
    return h("main", { class: "cg-page" },
      h("section", { class: "cg-works-head" },
        h("h1", { class: "cg-page-title" }, "Selected Projects"),
        h("span", { class: "cg-works-count" }, "Five projects")
      ),
      grid
    );
  }

  function ProjectDetail(id) {
    const i = CG_PROJECTS.findIndex((p) => p.id === id);
    if (i < 0) return Works();
    const project = CG_PROJECTS[i];
    const prev = CG_PROJECTS[(i - 1 + CG_PROJECTS.length) % CG_PROJECTS.length];
    const next = CG_PROJECTS[(i + 1) % CG_PROJECTS.length];

    // Breadcrumb
    const crumb = h("div", { class: "cg-page cg-crumb-wrap" },
      h("nav", { class: "cg-crumb" },
        routeLink({ view: "works" }, {}, "Projects"),
        h("span", { class: "cg-crumb-sep" }, "/"),
        h("span", { class: "cg-crumb-here" }, project.title)
      )
    );

    // Cover
    const tags = h("div", { class: "cg-cover-tags" });
    project.program.forEach((t) => tags.appendChild(h("span", { class: "cg-tag" }, t)));
    const cover = h("header", { class: "cg-cover" },
      h("img", { class: "cg-cover-img", src: resolveAsset(project.images[0]), alt: project.title }),
      h("span", { class: "cg-cover-veil" }),
      h("div", { class: "cg-cover-inner cg-page" },
        h("h1", { class: "cg-cover-title" }, project.title), tags)
    );

    // Gallery (built first so the jump button can target it)
    const gallery = h("section", { class: "cg-gallery" }, ProjectCarousel(project.images, project.title));

    const jumpBtn = h("button", { class: "cg-tag-btn" }, "Image Gallery");
    jumpBtn.addEventListener("click", () => {
      const y = gallery.getBoundingClientRect().top + window.scrollY - 90;
      window.scrollTo(0, y);
    });

    const text = h("section", { class: "cg-project2-text" });
    (project.description || []).forEach((para) => text.appendChild(h("p", {}, para)));

    const nav = h("nav", { class: "cg-project-nav" },
      projNavLink(prev, "left", { view: "project", id: prev.id }),
      projNavLink(next, "right", { view: "project", id: next.id })
    );

    const body = h("div", { class: "cg-page cg-project2-body" },
      h("div", { class: "cg-gallery-jump" }, jumpBtn),
      project.description && project.description.length ? text : null,
      gallery, nav
    );

    return h("main", { class: "cg-project2" }, crumb, cover, body);
  }

  function projNavLink(item, dir, route) {
    const a = routeLink(route, { class: "cg-pn" + (dir === "right" ? " next" : "") },
      h("span", { class: "cg-pn-dir" }, dir === "left" ? "← Previous" : "Next →"),
      h("span", { class: "cg-pn-title" }, item.title));
    return a;
  }

  function Research() {
    const list = h("section", { class: "cg-rcard-list" });
    CG_RESEARCH.items.forEach((item) => {
      const card = h("article", { class: "cg-rcard" },
        h("div", { class: "cg-rcard-media" },
          h("img", { src: resolveAsset(item.cover || item.images[0]), alt: item.title, loading: "lazy" })),
        h("div", { class: "cg-rcard-body" },
          h("span", { class: "cg-rcard-index" }, item.index),
          h("div", { class: "cg-rcard-text" },
            h("div", { class: "cg-rcard-meta" }, item.meta + (item.location ? " · " + item.location : "")),
            h("h2", { class: "cg-rcard-title" }, item.title)
          ),
          h("span", { class: "cg-rcard-arrow" }, "→")
        )
      );
      card.addEventListener("click", () => go({ view: "research-detail", id: item.id }));
      list.appendChild(card);
    });
    return h("main", { class: "cg-page cg-research" },
      h("section", { class: "cg-research-head" }, h("h1", { class: "cg-page-title" }, "Research")),
      list
    );
  }

  function ResearchDetail(id) {
    const items = CG_RESEARCH.items;
    const i = items.findIndex((p) => p.id === id);
    if (i < 0) return Research();
    const item = items[i];
    const prev = items[(i - 1 + items.length) % items.length];
    const next = items[(i + 1) % items.length];

    const back = h("div", { class: "cg-project-back" },
      ArrowLink("Research", () => go({ view: "research" }), "left"),
      h("span", { class: "cg-project-counter" },
        item.index + " / " + String(items.length).padStart(2, "0"))
    );

    const meta = h("dl", { class: "cg-meta", style: { gridTemplateColumns: "max-content 1fr" } },
      h("div", { class: "cg-meta-row" },
        h("dt", { class: "cg-meta-k" }, "Type"), h("dd", { class: "cg-meta-v" }, item.meta)),
      item.location ? h("div", { class: "cg-meta-row" },
        h("dt", { class: "cg-meta-k" }, "Context"), h("dd", { class: "cg-meta-v" }, item.location)) : null
    );

    const textCol = h("div", { class: "cg-project-text" });
    (item.description || []).forEach((para) => textCol.appendChild(richParagraph(para)));
    (item.sections || []).forEach((sec) => {
      const block = h("div", { class: "cg-research-section" });
      if (sec.heading) block.appendChild(h("h2", { class: "cg-research-section-title" }, sec.heading));
      if (sec.question) block.appendChild(h("p", { class: "cg-research-question" }, sec.question));
      sec.paragraphs.forEach((para) => block.appendChild(richParagraph(para)));
      textCol.appendChild(block);
    });

    const nav = h("nav", { class: "cg-project-nav" },
      projNavLink(prev, "left", { view: "research-detail", id: prev.id }),
      projNavLink(next, "right", { view: "research-detail", id: next.id })
    );

    return h("main", { class: "cg-page cg-project cg-research-detail" },
      back,
      h("h1", { class: "cg-project-title" }, item.title),
      ProjectCarousel(item.images, item.title),
      h("div", { class: "cg-project-lower" }, meta, textCol),
      nav
    );
  }

  function Profile() {
    const statement = h("div", { class: "cg-profile-statement" },
      h("h1", { class: "cg-profile-name" }, "Camila Grimaldi"),
      h("div", { class: "cg-profile-subtitle" }, "Architect"),
      h("div", { class: "cg-profile-role" }, "Profile"),
      h("div", { class: "cg-profile-body prose" },
        h("p", {}, "Born in Buenos Aires and influenced by both Argentine and Italian cultures, I developed an early awareness of the relationship between place, identity and the built environment."),
        h("p", {}, "I am an architect with international academic and professional experience across Argentina and Italy. Working within these diverse contexts has deepened my interest in the interplay between architecture, landscape and the experience of place, while reinforcing the importance of understanding each site's environmental, cultural and spatial qualities as a foundation for design."),
        h("p", {}, "I am particularly interested in projects that create meaningful relationships between people and place, approaching design through a balance of conceptual thinking, technical rigour and continuous refinement. I see architecture as an opportunity to respond thoughtfully to its surroundings while enriching the way people inhabit and experience space.")
      ),
      h("div", { class: "cg-profile-cta" },
        h("a", { class: "cg-btn-ink", href: resolveAsset("files/Camila Grimaldi CV.pdf"), download: "Camila Grimaldi CV.pdf" }, "Download CV")
      )
    );

    const eduList = h("ul", { class: "cg-info-list" });
    [
      ["2025", "High-Level Training Course in Architecture for Hospitality / YACademy, Bologna, Italy"],
      ["2017 — 2022", "Degree in Architecture / University of Buenos Aires (UBA), Argentina"],
      ["2012 — 2016", "International Baccalaureate (IB) / De La Salle College, Buenos Aires, Argentina"]
    ].forEach(([y, t]) => eduList.appendChild(h("li", {}, h("span", { class: "y" }, y), t)));

    const expList = h("ul", { class: "cg-info-list" });
    [
      ["2026 — Present", "Architectural Intern / Open Project (Bologna, Italy)"],
      ["2023 — 2025", "Architect / XFB Studio (Buenos Aires, Argentina)"],
      ["2022 — 2023", "Architect / BMA Studio (Buenos Aires, Argentina)"],
      ["2021 — 2022", "Junior Architect / Grupo Naistat (Buenos Aires, Argentina)"],
      ["2020 — Present", "Freelance Architectural Visualiser"]
    ].forEach(([y, t]) => expList.appendChild(h("li", {}, h("span", { class: "y" }, y), t)));

    return h("main", { class: "cg-page cg-profile" },
      h("section", { class: "cg-profile-top" },
        statement,
        Plate({ src: "img/GRIMALDI CAMILA PROFILE - copia 03.jpg", ratio: "1/1", fit: "cover" })
      ),
      h("section", { class: "cg-profile-cols" },
        h("div", { class: "cg-info-col" }, Eyebrow("Education"), eduList),
        h("div", { class: "cg-info-col" }, Eyebrow("Professional Experience"), expList)
      )
    );
  }

  function Contact() {
    const note = h("p", { class: "cg-form-note" },
      "Your email app should open with the message ready to send to arq.cgrimaldi@gmail.com.");
    const submitBtn = h("button", { class: "cg-btn-ink", type: "submit" }, "Send enquiry");

    const form = h("form", { class: "cg-form" },
      h("div", { class: "cg-field" }, h("label", {}, "Name"),
        h("input", { name: "name", required: "", placeholder: "Your name" })),
      h("div", { class: "cg-field" }, h("label", {}, "Email"),
        h("input", { name: "email", type: "email", required: "", placeholder: "name@studio.com" })),
      h("div", { class: "cg-field" }, h("label", {}, "Message"),
        h("textarea", { name: "message", rows: "3", required: "", placeholder: "Tell me about the project" })),
      submitBtn
    );
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const f = e.target;
      const name = (f.elements.name.value || "").trim();
      const email = (f.elements.email.value || "").trim();
      const message = (f.elements.message.value || "").trim();
      const subject = "Website enquiry" + (name ? " — " + name : "");
      const body = "Name: " + name + "\n" + "Email: " + email + "\n\n" + message + "\n";
      window.location.href = "mailto:arq.cgrimaldi@gmail.com"
        + "?subject=" + encodeURIComponent(subject)
        + "&body=" + encodeURIComponent(body);
      submitBtn.textContent = "Opening your email…";
      if (!form.contains(note)) form.appendChild(note);
    });

    const aside = h("aside", { class: "cg-contact-aside" },
      h("div", { class: "cg-info-col" }, Eyebrow("Email"),
        h("p", { class: "cg-contact-detail" },
          h("a", { href: "mailto:arq.cgrimaldi@gmail.com" }, "arq.cgrimaldi@gmail.com"))),
      h("div", { class: "cg-info-col" }, Eyebrow("Phone"),
        h("p", { class: "cg-contact-detail" },
          h("a", { href: "tel:+393520244112" }, "+39 352 024 4112"))),
      h("div", { class: "cg-info-col" }, Eyebrow("LinkedIn"),
        h("p", { class: "cg-contact-detail" },
          h("a", { href: "https://www.linkedin.com/in/camila-grimaldi-56516621a", target: "_blank", rel: "noopener" }, "camila-grimaldi")))
    );

    return h("main", { class: "cg-page cg-contact" },
      h("section", { class: "cg-contact-top" },
        h("h1", { class: "cg-page-title" }, "Contact"),
        h("p", { class: "cg-contact-loc" }, "Available for projects across Italy and Europe")
      ),
      h("section", { class: "cg-contact-grid" }, form, aside)
    );
  }

  /* --------------------------------------------------------------------- */
  /* render                                                                */
  /* --------------------------------------------------------------------- */

  function viewFor(route) {
    switch (route.view) {
      case "home": return Home();
      case "works": return Works();
      case "project": return ProjectDetail(route.id);
      case "research": return Research();
      case "research-detail": return ResearchDetail(route.id);
      case "profile": return Profile();
      case "contact": return Contact();
      default: return Home();
    }
  }

  let lastView = null;

  function render() {
    runTeardown();
    closeMobileMenu();
    const route = parseHash();
    const root = document.getElementById("root");

    const app = h("div", { class: "cg-app density-regular" });
    app.appendChild(Nav(route));
    app.appendChild(h("div", { class: "cg-reveal" }, viewFor(route)));
    app.appendChild(Footer());

    root.replaceChildren(app);

    // Scroll to top on navigation (matches the prototype's go()).
    const key = route.view + (route.id || "");
    if (key !== lastView) { window.scrollTo(0, 0); lastView = key; }
  }

  window.addEventListener("hashchange", render);
  document.addEventListener("DOMContentLoaded", render);
  if (document.readyState !== "loading") render();
})();
