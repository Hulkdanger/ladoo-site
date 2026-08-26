(function () {
  "use strict";

  var header = document.querySelector(".site-header");
  if (header) {
    var onScroll = function () {
      header.classList.toggle("scrolled", window.scrollY > 8);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // lesson demo
  var card = document.getElementById("lesson-demo");
  var mount = document.getElementById("demo-mount");
  if (card && mount) {
    var QUESTIONS = [
      {
        type: "choice",
        prompt: "Tap the word that means <strong>Hello</strong>",
        answer: "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ (sat sri akal)",
        options: [
          { pa: "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ", tr: "sat sri akal", ok: true },
          { pa: "ਧੰਨਵਾਦ", tr: "dhannvaad" },
          { pa: "ਪਾਣੀ", tr: "paani" }
        ]
      },
      {
        type: "choice",
        prompt: "Which one means <strong>Thank you</strong>?",
        answer: "ਧੰਨਵਾਦ (dhannvaad)",
        options: [
          { pa: "ਚਾਹ", tr: "chaa" },
          { pa: "ਧੰਨਵਾਦ", tr: "dhannvaad", ok: true },
          { pa: "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ", tr: "sat sri akal" }
        ]
      },
      {
        type: "choice",
        prompt: "<strong>ਪਾਣੀ</strong> (paani) means...",
        answer: "Water",
        options: [
          { en: "Tea" },
          { en: "Water", ok: true },
          { en: "Bread" }
        ]
      },
      {
        type: "choice",
        prompt: "<strong>ਕਿਵੇਂ</strong> (kiven) means...",
        answer: "How",
        options: [
          { en: "How", ok: true },
          { en: "Who" },
          { en: "Now" }
        ]
      },
      {
        type: "build",
        prompt: "Build the sentence: <strong>How are you?</strong>",
        teach: "ਤੁਸੀਂ tusi is you, ਹੋ ho is are",
        answer: "ਤੁਸੀਂ ਕਿਵੇਂ ਹੋ (tusi kiven ho)",
        chips: [
          { pa: "ਕਿਵੇਂ", tr: "kiven", idx: 1 },
          { pa: "ਹੋ", tr: "ho", idx: 2 },
          { pa: "ਤੁਸੀਂ", tr: "tusi", idx: 0 }
        ]
      }
    ];

    var PRAISE = ["ਸ਼ਾਬਾਸ਼! Correct.", "Right again.", "ਵਧੀਆ! You are on a roll.", "Correct.", "ਸ਼ਾਬਾਸ਼! Perfect finish."];

    var bar = card.querySelector(".demo-bar span");
    var score = 0;

    var setBar = function (done) {
      bar.style.width = (done / QUESTIONS.length) * 100 + "%";
    };

    var chipHtml = function (o) {
      if (o.en) { return '<span class="en-opt">' + o.en + "</span>"; }
      return '<span class="pa" lang="pa">' + o.pa + '</span><span class="tr">' + o.tr + "</span>";
    };

    var showFeedback = function (step, good, text, qi) {
      var fb = document.createElement("div");
      fb.className = "feedback " + (good ? "good" : "bad");
      fb.innerHTML =
        '<p class="fb-text">' + text + "</p>" +
        '<button class="btn btn-small fb-next" type="button">' +
        (qi + 1 < QUESTIONS.length ? "Continue" : "Finish") + "</button>";
      step.appendChild(fb);
      setBar(qi + 1);
      var next = fb.querySelector(".fb-next");
      var born = Date.now();
      next.addEventListener("click", function () {
        if (Date.now() - born < 300) { return; }
        if (qi + 1 < QUESTIONS.length) { render(qi + 1); } else { renderDone(); }
      });
      next.focus({ preventScroll: true });
    };

    var render = function (qi) {
      var q = QUESTIONS[qi];
      var html = '<div class="demo-step active"><p class="demo-count">Question ' + (qi + 1) + " of " + QUESTIONS.length + "</p>" +
        '<p class="demo-prompt">' + q.prompt + "</p>" +
        (q.teach ? '<p class="demo-teach">' + q.teach + "</p>" : "");

      if (q.type === "choice") {
        html += '<div class="choices">' + q.options.map(function (o, i) {
          return '<button class="choice" type="button" data-i="' + i + '">' + chipHtml(o) + "</button>";
        }).join("") + "</div>";
      } else {
        html += '<div class="answer-line"></div><div class="chips">' + q.chips.map(function (c, i) {
          return '<button class="chip" type="button" data-i="' + i + '">' + chipHtml(c) + "</button>";
        }).join("") + "</div>";
      }
      html += "</div>";
      mount.innerHTML = html;
      var step = mount.firstChild;
      var shownAt = Date.now();

      if (q.type === "choice") {
        var answered = false;
        step.querySelectorAll(".choice").forEach(function (btn) {
          btn.addEventListener("click", function () {
            if (answered || Date.now() - shownAt < 300) { return; }
            answered = true;
            var o = q.options[Number(btn.dataset.i)];
            step.querySelectorAll(".choice").forEach(function (b) { b.disabled = true; });
            if (o.ok) {
              btn.classList.add("right");
              score++;
              showFeedback(step, true, PRAISE[qi], qi);
            } else {
              btn.classList.add("wrong");
              step.querySelectorAll(".choice").forEach(function (b, i) {
                if (q.options[i].ok) { b.classList.add("show-answer"); }
              });
              showFeedback(step, false, "The answer is <strong>" + q.answer + "</strong>.", qi);
            }
          });
        });
      } else {
        var expected = 0;
        var misses = 0;
        var settled = false;
        var line = step.querySelector(".answer-line");
        var addWord = function (pa) {
          var w = document.createElement("span");
          w.className = "answer-word";
          w.textContent = pa;
          line.appendChild(w);
        };
        step.querySelectorAll(".chip").forEach(function (chip) {
          chip.addEventListener("click", function () {
            if (settled || Date.now() - shownAt < 300) { return; }
            var c = q.chips[Number(chip.dataset.i)];
            if (c.idx === expected) {
              chip.classList.add("used");
              addWord(c.pa);
              expected++;
              if (expected === q.chips.length) {
                settled = true;
                if (misses === 0) { score++; }
                showFeedback(step, true, PRAISE[qi], qi);
              }
            } else {
              misses++;
              chip.classList.add("wrong");
              setTimeout(function () { chip.classList.remove("wrong"); }, 450);
              if (misses >= 3 && !settled) {
                settled = true;
                line.innerHTML = "";
                q.chips.slice().sort(function (a, b) { return a.idx - b.idx; }).forEach(function (w) { addWord(w.pa); });
                step.querySelectorAll(".chip").forEach(function (b) { b.classList.add("used"); });
                showFeedback(step, false, "The answer is <strong>" + q.answer + "</strong>.", qi);
              }
            }
          });
        });
      }
    };

    var renderDone = function () {
      var perfect = score === QUESTIONS.length;
      var headline = perfect ? "ਸ਼ਾਬਾਸ਼" : "ਵਧੀਆ";
      var gloss = perfect ? "shabash. congratulations" : "vadhia. great work";
      var note = perfect
        ? "Five out of five. You just asked someone how they are, in Punjabi."
        : "You got " + score + " of " + QUESTIONS.length + ". Lesson one picks up right here, with audio and your own voice.";
      mount.innerHTML =
        '<div class="demo-step active demo-done">' +
        '<div class="done-marks" aria-hidden="true"><span></span><span></span><span></span></div>' +
        '<p class="demo-done-pa" lang="pa">' + headline + "</p>" +
        '<p class="done-gloss">' + gloss + "</p>" +
        '<p class="demo-prompt">' + note + "</p>" +
        '<div class="demo-done-ctas">' +
        '<a class="btn" href="#download">Keep going in the app</a>' +
        '<a class="demo-restart" href="#try">Start over</a>' +
        "</div></div>";
      mount.querySelector(".demo-restart").addEventListener("click", function (e) {
        e.preventDefault();
        score = 0;
        setBar(0);
        render(0);
      });
    };

    setBar(0);
    render(0);
  }

  // gentle parallax on the hero watermark + reading progress bar
  var wm = document.querySelector(".hero-watermark");
  var progress = document.querySelector(".scroll-progress span");
  if ((wm || progress) && !reduced) {
    var ticking = false;
    window.addEventListener("scroll", function () {
      if (ticking) { return; }
      ticking = true;
      requestAnimationFrame(function () {
        if (wm) { wm.style.transform = "translateY(" + window.scrollY * 0.22 + "px)"; }
        if (progress) {
          var max = document.documentElement.scrollHeight - window.innerHeight;
          progress.style.transform = "scaleX(" + (max > 0 ? window.scrollY / max : 0) + ")";
        }
        ticking = false;
      });
    }, { passive: true });
  }

  var targets = document.querySelectorAll(".reveal, .reveal-stagger");

  if (reduced || !("IntersectionObserver" in window)) {
    targets.forEach(function (el) { el.classList.add("in"); });
    return;
  }

  var io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.18, rootMargin: "0px 0px -40px 0px" }
  );

  targets.forEach(function (el) { io.observe(el); });
})();

/* In-app browsers (TikTok, Instagram) cannot hand off to the App Store or Google Play,
   so we route those visitors out to a real browser, which finishes the trip itself. */
(function () {
  "use strict";

  var STORES = {
    app: "https://apps.apple.com/us/app/ladoo-learn-punjabi/id6782532457",
    play: "https://play.google.com/store/apps/details?id=com.punjabify.punjabify&hl=en_US"
  };

  // ponytail: the UA is the only signal a webview gives us. These tokens can change with app updates.
  var PREVIEW = /[?&]inapp=1(&|$)/.test(location.search); // ladoo.net/?inapp=1 previews the sheet in any browser
  var IN_APP = PREVIEW ||
    /BytedanceWebview|musical_ly|trill_|aweme|Instagram|FBAN|FBAV|FB_IAB/i.test(navigator.userAgent);

  var WANTS = (/[?&]go=(app|play)(&|$)/.exec(location.search) || [])[1];

  // Landed in a real browser via the escape link: go straight to the store they tapped.
  if (!IN_APP) {
    if (WANTS) { location.replace(STORES[WANTS]); }
    return;
  }

  var ANDROID = /Android/i.test(navigator.userAgent);
  var sheet = null;

  function escapeUrl(store) {
    return location.protocol + "//" + location.host + "/?go=" + store;
  }

  /* Escape ladder, tried in order on the Download tap. Each rung is a URL scheme the
     webview does not own, so the OS may hand it off. A rung that no-ops leaves the page
     visible, and we fall through to the next one. The sheet is the last resort.
     ponytail: no way to know a rung is supported, so we probe and watch for the page
     going hidden. Timing is the only signal available. */
  function ladder(store) {
    var rungs = [];
    // Straight into the store app, skipping the browser entirely. Only on its own OS.
    if (store === "app" && !ANDROID) { rungs.push("itms-apps://apps.apple.com/us/app/ladoo-learn-punjabi/id6782532457"); }
    if (store === "play" && ANDROID) { rungs.push("market://details?id=com.punjabify.punjabify"); }
    rungs.push(ANDROID
      ? "intent://" + location.host + "/?go=" + store + "#Intent;scheme=https;end"
      // Undocumented but widely supported: force the URL open in Safari.
      : "x-safari-" + escapeUrl(store));
    return rungs;
  }

  /* "Open in browser" hands off the URL the app recorded when the page loaded, not the
     live one, so replaceState was invisible to it. Only a real navigation updates what
     gets handed over, hence the reload onto ?go=<store> before we do anything else. */
  function markUrl(store) {
    var q = location.search ? location.search + "&go=" + store : "?go=" + store;
    location.replace(location.pathname + q + location.hash);
  }

  var left = false;
  function markLeft() { left = true; }
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) { markLeft(); }
  });
  window.addEventListener("pagehide", markLeft);

  function tryRung(rungs, i) {
    if (left || i >= rungs.length) { return; }   // out, or out of rungs
    try { location.href = rungs[i]; } catch (e) { /* scheme rejected outright */ }
    setTimeout(function () { tryRung(rungs, i + 1); }, 700);
  }

  function open(store) {
    if (sheet) { return; }
    var url = escapeUrl(store);
    sheet = document.createElement("div");
    sheet.className = "escape";
    sheet.innerHTML =
      '<div class="escape-panel" role="dialog" aria-modal="true" aria-labelledby="escape-title">' +
        '<h2 id="escape-title">Open in your browser</h2>' +
        '<p>This in-app browser cannot open ' + (store === "play" ? "Google Play" : "the App Store") +
          '. Open Ladoo in your browser and the download page opens on its own.</p>' +
        '<p class="escape-steps">' + (ANDROID
          ? "Tap the menu at the top right, then Open in browser."
          : "Tap ••• at the top right, then Open in browser.") + '</p>' +
        '<div class="escape-actions">' +
          '<button type="button" class="btn btn-ghost" data-copy>Copy link</button>' +
          '<button type="button" class="btn btn-ghost" data-close>Not now</button>' +
        '</div>' +
        '<span class="escape-url">' + url + '</span>' +
      '</div>';

    sheet.addEventListener("click", function (e) {
      if (e.target === sheet || e.target.hasAttribute("data-close")) { close(); }
    });

    var copy = sheet.querySelector("[data-copy]");
    copy.addEventListener("click", function () {
      // Clipboard is often missing or blocked in a webview, hence the visible URL to long-press.
      var done = navigator.clipboard && navigator.clipboard.writeText(url);
      if (!done) { copy.textContent = "Long-press the link below"; return; }
      done.then(
        function () { copy.textContent = "Link copied"; },
        function () { copy.textContent = "Long-press the link below"; }
      );
    });

    document.body.appendChild(sheet);
    sheet.querySelector(".escape-panel").focus();
  }

  function close() {
    if (sheet) { sheet.remove(); sheet = null; }
  }

  document.addEventListener("click", function (e) {
    var link = e.target.closest && e.target.closest('a[href*="apps.apple.com"], a[href*="play.google.com"]');
    if (!link) { return; }
    var store = String(link.getAttribute("href")).indexOf("play.google.com") > -1 ? "play" : "app";
    e.preventDefault();
    if (PREVIEW) { open(store); return; }  // previewing the sheet, do not fire real schemes
    if (WANTS) { start(WANTS); return; }
    markUrl(store);                        // reload onto ?go=<store>, which resumes below
  });

  /* Reloaded onto ?go=<store> inside the webview: the user already tapped Download, so pick
     the flow back up. The sheet goes first because the escape schemes usually fail here
     and making it wait behind them left the user staring at nothing for over a second. */
  if (WANTS && !PREVIEW) { start(WANTS); }

  function start(store) {
    open(store);
    tryRung(ladder(store), 0);
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { close(); }
  });
})();

/* Letter audio on the alphabet page. One shared player; a tap swaps the source. */
(function () {
  "use strict";
  var buttons = document.querySelectorAll(".letter-play[data-audio]");
  if (!buttons.length) return;
  var player = new Audio();
  buttons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      player.src = btn.getAttribute("data-audio");
      player.play();
    });
  });
})();

/* PostHog pageviews, so AI-assistant referrers (chatgpt.com, perplexity.ai)
   become visible. GitHub Pages has no access logs. */
(function () {
  "use strict";
  var s = document.createElement("script");
  s.async = true;
  s.src = "https://us-assets.i.posthog.com/static/array.js";
  s.onload = function () {
    if (window.posthog && window.posthog.init) {
      window.posthog.init("phc_y8gjtgzFiT5segFLfxqPx73qeXxg8VnDSXSfWaJa9TqL", {
        api_host: "https://us.i.posthog.com",
        defaults: "2025-05-24",
        /* array.js loads async, after the window load event, and in that state
           the SDK never fires the initial pageview on its own (verified against
           prod Aug 7 2026). Auto-capture is off; the line below is the one
           pageview per page load. */
        capture_pageview: false
      });
      window.posthog.capture("$pageview");
    }
  };
  document.head.appendChild(s);
})();


/* Store-link click capture (retention plan D3): which placements actually
   send people to the stores. Fires everywhere site.js loads. */
(function () {
  "use strict";
  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
    if (!a || !window.posthog || !window.posthog.capture) return;
    var href = a.getAttribute("href") || "";
    var store = href.indexOf("apps.apple.com") !== -1 ? "app_store"
      : href.indexOf("play.google.com") !== -1 ? "play_store" : null;
    if (!store) return;
    var section = a.closest("section, footer, header");
    var placement = section
      ? (section.id || (section.className || "").split(" ")[0] || "page")
      : "page";
    window.posthog.capture("store_link_clicked", {
      store: store,
      placement: placement,
      path: location.pathname
    }, { transport: "sendBeacon" });
  }, true);
})();

/* Email starter form (retention plan D3) -> newsletter-signup Edge Function. */
(function () {
  "use strict";
  var form = document.getElementById("starter-form");
  if (!form) return;
  var msg = document.getElementById("starter-msg");
  var busy = false;
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (busy) return;
    var email = (document.getElementById("starter-email").value || "").trim();
    var honeypot = document.getElementById("starter-website").value || "";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      msg.textContent = "That email doesn\u2019t look right \u2014 check it and try again.";
      msg.className = "starter-msg err";
      return;
    }
    busy = true;
    msg.textContent = "Sending\u2026";
    msg.className = "starter-msg";
    fetch("https://ilcwcghgeialtwnnpapl.functions.supabase.co/newsletter-signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email, source: location.pathname, website: honeypot })
    }).then(function (res) {
      busy = false;
      if (res.ok) {
        msg.textContent = "Sat sr\u012b ak\u0101l \u2014 your starter is on its way. Check your inbox.";
        msg.className = "starter-msg";
        form.reset();
        if (window.posthog && window.posthog.capture) {
          window.posthog.capture("starter_email_submitted", { path: location.pathname });
        }
      } else if (res.status === 429) {
        msg.textContent = "Too many tries from this connection \u2014 please try later.";
        msg.className = "starter-msg err";
      } else {
        msg.textContent = "Something went wrong \u2014 please try again in a moment.";
        msg.className = "starter-msg err";
      }
    }).catch(function () {
      busy = false;
      msg.textContent = "Couldn\u2019t reach the server \u2014 check your connection.";
      msg.className = "starter-msg err";
    });
  });
})();
