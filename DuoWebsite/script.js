// ================= SONG LIST =================
// Put your .mp3 files in the "music" folder, then add one line per song here.
var SONGS = [
  { title: "Beauty and Beast", file: "music/beauty and beast.mp3" }
  // { title: "Song 2", file: "music/song2.mp3" },
  // { title: "Song 3", file: "music/song3.mp3" },
];
// =============================================

// ---------- Mouse glow on the aurora ----------
document.addEventListener("pointermove", function (e) {
  document.documentElement.style.setProperty("--mx", e.clientX + "px");
  document.documentElement.style.setProperty("--my", e.clientY + "px");
});

// ---------- Floating star particles ----------
(function () {
  var c = document.getElementById("stars");
  if (!c || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var ctx = c.getContext("2d"), w, h, dots = [];
  function size() { w = c.width = window.innerWidth; h = c.height = window.innerHeight; }
  size();
  window.addEventListener("resize", size);
  for (var i = 0; i < 70; i++) {
    dots.push({ x: Math.random() * w, y: Math.random() * h, r: Math.random() * 1.8 + 0.4, s: Math.random() * 0.35 + 0.1, t: Math.random() * 6.28 });
  }
  function draw() {
    ctx.clearRect(0, 0, w, h);
    dots.forEach(function (d) {
      d.y -= d.s; d.t += 0.03;
      if (d.y < -5) { d.y = h + 5; d.x = Math.random() * w; }
      ctx.globalAlpha = 0.25 + Math.abs(Math.sin(d.t)) * 0.6;
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, 6.28); ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  draw();
})();

// ---------- Page features (run again after every page change) ----------
var hasHover = window.matchMedia("(hover: hover)").matches;

function initPage() {
  // scroll reveal
  var els = document.querySelectorAll(".rv");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (items) {
      items.forEach(function (it) { if (it.isIntersecting) { it.target.classList.add("in"); io.unobserve(it.target); } });
    }, { threshold: 0.15 });
    els.forEach(function (e) { io.observe(e); });
  } else { els.forEach(function (e) { e.classList.add("in"); }); }

  // flip cards (hover on desktop, tap on phones)
  document.querySelectorAll(".flip").forEach(function (card) {
    if (!hasHover) card.addEventListener("click", function () { card.classList.toggle("flipped"); });
    card.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); card.classList.toggle("flipped"); }
    });
    card.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function (e) { e.stopPropagation(); });
    });
  });

  // 3D tilt on portal cards (desktop)
  if (hasHover) {
    document.querySelectorAll(".tilt").forEach(function (el) {
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5;
        var y = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = "perspective(900px) rotateY(" + x * 14 + "deg) rotateX(" + -y * 14 + "deg) translateY(-6px)";
      });
      el.addEventListener("pointerleave", function () { el.style.transform = ""; });
    });
  }
}
initPage();

// ---------- Page changes WITHOUT reloading, so the music never stops ----------
(function () {
  function go(url, push) {
    fetch(url).then(function (r) {
      if (!r.ok) throw new Error("bad");
      return r.text();
    }).then(function (html) {
      var doc = new DOMParser().parseFromString(html, "text/html");
      var newMain = doc.querySelector("main");
      var main = document.querySelector("main");
      if (!newMain || !main) throw new Error("no main");
      document.title = doc.title;
      document.body.dataset.page = doc.body.dataset.page;
      main.innerHTML = newMain.innerHTML;
      window.scrollTo(0, 0);
      if (push) history.pushState({}, "", url);
      initPage();
      if (main.animate) main.animate([{ opacity: 0, transform: "translateY(14px)" }, { opacity: 1, transform: "none" }], { duration: 500, easing: "ease" });
    }).catch(function () { location.href = url; });
  }
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a || a.target === "_blank" || e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
    if (a.origin !== location.origin || !/\.html$/.test(a.pathname)) return;
    e.preventDefault();
    if (a.href !== location.href) go(a.href, true);
  });
  window.addEventListener("popstate", function () { go(location.href, false); });
})();

// ---------- Music: starts on its own, keeps playing on every page, stops only when you pause ----------
(function () {
  var holder = document.getElementById("music");
  var audio = document.getElementById("bgm");
  if (!holder || !audio || !SONGS.length) return;
  audio.loop = SONGS.length === 1;
  audio.preload = "auto";

  var box = document.createElement("div");
  box.className = "player";
  box.innerHTML =
    '<button type="button" class="pb" id="pPrev" aria-label="Previous song">&#9198;</button>' +
    '<button type="button" class="pb main" id="pPlay" aria-label="Play or pause">&#9654;</button>' +
    '<button type="button" class="pb" id="pNext" aria-label="Next song">&#9197;</button>' +
    '<span class="ptitle" id="pTitle"></span>';
  holder.replaceWith(box);
  var playBtn = document.getElementById("pPlay");
  var title = document.getElementById("pTitle");

  function get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }

  var i = parseInt(get("nv-i") || "0", 10);
  if (!(i >= 0 && i < SONGS.length)) i = 0;
  var resume = parseFloat(get("nv-t") || "0");

  function showTitle() { title.textContent = (i + 1) + "/" + SONGS.length + " · " + SONGS[i].title; }
  function shownPlaying(on) { playBtn.innerHTML = on ? "&#10074;&#10074;" : "&#9654;"; }
  function load(n) {
    i = (n + SONGS.length) % SONGS.length;
    audio.src = SONGS[i].file;
    showTitle();
    set("nv-i", String(i));
  }
  function play(userClicked) {
    return audio.play().then(function () {
      shownPlaying(true); showTitle(); set("nv-on", "1");
    }).catch(function () {
      shownPlaying(false);
      if (userClicked) title.textContent = "Music unavailable";
    });
  }
  function next(n) { resume = 0; load(n); play(true); }

  // Browsers block sound until the visitor touches the page once.
  // If autoplay is blocked, the first tap / key press anywhere starts the music.
  function waitForFirstTap() {
    shownPlaying(false);
    title.textContent = "Tap anywhere to play ♪";
    var evs = ["pointerdown", "keydown", "touchstart"];
    function cleanup() { evs.forEach(function (ev) { document.removeEventListener(ev, start, true); }); }
    function start(e) {
      cleanup();
      if (e.target.closest && e.target.closest(".player")) return; // the player buttons handle themselves
      if (get("nv-on") !== "0") play(false);
    }
    evs.forEach(function (ev) { document.addEventListener(ev, start, true); });
  }

  load(i);
  audio.addEventListener("loadedmetadata", function () {
    if (resume) { audio.currentTime = resume; resume = 0; }
  });
  audio.addEventListener("error", function () {
    title.textContent = SONGS[i].title + " (file not found)";
    shownPlaying(false);
  });
  audio.addEventListener("ended", function () { next(i + 1); });
  var lastSave = 0;
  audio.addEventListener("timeupdate", function () {
    var now = Date.now();
    if (now - lastSave > 1000) { lastSave = now; set("nv-t", String(audio.currentTime || 0)); }
  });
  window.addEventListener("pagehide", function () { set("nv-t", String(audio.currentTime || 0)); });

  playBtn.addEventListener("click", function () {
    if (audio.paused) { play(true); }
    else { audio.pause(); shownPlaying(false); showTitle(); set("nv-on", "0"); }
  });
  document.getElementById("pNext").addEventListener("click", function () { next(i + 1); });
  document.getElementById("pPrev").addEventListener("click", function () { next(i - 1); });

  // Start automatically unless the visitor paused it earlier
  if (get("nv-on") !== "0") {
    audio.play().then(function () { shownPlaying(true); set("nv-on", "1"); }).catch(waitForFirstTap);
  } else {
    shownPlaying(false);
  }
})();
