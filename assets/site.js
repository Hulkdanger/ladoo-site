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
