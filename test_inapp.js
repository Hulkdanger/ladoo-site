/* node test_inapp.js
   Checks the shipped in-app-browser regex against real user agents.
   Reads the literal out of site.js so the test cannot drift from the code. */
var assert = require("assert");
var vm = require("vm");
var src = require("fs").readFileSync(__dirname + "/assets/site.js", "utf8");

var IN_APP = new RegExp(src.match(/\/(BytedanceWebview\|[^/]+)\/i/)[1], "i");

var webviews = [
  // TikTok iOS
  "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 musical_ly_2022803040 JsSdk/2.0 NetType/WIFI Channel/App Store ByteLocale/en Region/US",
  // TikTok Android
  "Mozilla/5.0 (Linux; Android 12; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Mobile Safari/537.36 trill_2022803030 JsSdk/1.0 NetType/WIFI AppName/musical_ly BytedanceWebview/d8a21c6",
  // TikTok Lite / aweme builds
  "Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36 Chrome/104.0.0.0 Mobile Safari/537.36 aweme_2003 BytedanceWebview/d8a21c6",
  // Instagram
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 302.0.0.23.113 (iPhone14,5; iOS 17_0)",
  // Facebook
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/440.0.0.35.113;FBBV/123]"
];

var realBrowsers = [
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.0.0 Mobile/15E148 Safari/604.1"
];

webviews.forEach(function (ua) { assert.ok(IN_APP.test(ua), "should flag: " + ua); });
realBrowsers.forEach(function (ua) { assert.ok(!IN_APP.test(ua), "should NOT flag: " + ua); });

// the escape link only auto-forwards on ?go=app or ?go=play
var GO = /[?&]go=(app|play)(&|$)/;
["?go=app", "?utm_source=tiktok&go=app", "?go=app&x=1", "?go=play", "?go=play&x=1"].forEach(function (q) { assert.ok(GO.test(q)); });
["", "?go=apple", "?ago=app", "?go=player"].forEach(function (q) { assert.ok(!GO.test(q)); });

/* ---- flow paths, run against the real site.js ---- */
var TIKTOK = "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 musical_ly_2022803040 JsSdk/2.0";
var SAFARI = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1";
var TIKTOK_ANDROID = "Mozilla/5.0 (Linux; Android 12; SM-G991B) AppleWebKit/537.36 Chrome/108.0.0.0 Mobile Safari/537.36 trill_2022803030 BytedanceWebview/d8a21c6";
var CHROME_ANDROID = "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36";
var APP_URL = "https://apps.apple.com/us/app/ladoo-learn-punjabi/id6782532457";
var PLAY_URL = "https://play.google.com/store/apps/details?id=com.punjabify.punjabify&hl=en_US";

function run(ua, search) {
  var log = [], clicks = [], appended = [];
  function el(tag) {
    return { tagName: tag, classList:{toggle(){},add(){}}, style:{}, addEventListener(){},
      appendChild(){}, querySelector(){return el();}, querySelectorAll(){return [];},
      focus(){}, remove(){}, hasAttribute(){return false;}, closest(){return null;},
      setAttribute(){}, textContent:"", innerHTML:"" };
  }
  var sandbox = {
    console: console, setTimeout: function(){}, requestAnimationFrame: function(){},
    navigator: { userAgent: ua },
    location: { search: search, protocol:"https:", host:"ladoo.net", pathname:"/", hash:"",
      replace: function(u){ log.push("REPLACE " + u); },
      set href(u){ log.push("HREF " + u); }, get href(){ return "https://ladoo.net/" + search; } },
    history: { replaceState: function(a,b,u){ log.push("PUSHSTATE " + u); } },
    document: { querySelector(){return null;}, getElementById(){return null;},
      querySelectorAll(){return [];}, hidden:false, createElement(t){return el(t);},
      documentElement:{scrollHeight:2000},
      body: { appendChild(n){ appended.push(n); } },
      addEventListener(t,f){ if (t === "click") clicks.push(f); } },
    window: { addEventListener(){}, matchMedia(){return {matches:false};}, scrollY:0,
      innerHeight:800, requestAnimationFrame(){} },
    IntersectionObserver: function(){ this.observe=function(){}; this.unobserve=function(){}; }
  };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(src, sandbox);
  return { log: log, sheets: appended.length,
    // href decides which store the click handler picks, exactly like the real anchors
    click: function (href) {
      var link = { getAttribute(){ return href; }, hasAttribute(){return false;},
        closest(){ return link; } };
      clicks.forEach(function (f) { f({ target: link, preventDefault(){} }); });
      return { log: log, sheets: appended.length };
    } };
}

// 1. Real browser with the marker goes straight to the store that was tapped.
assert.deepStrictEqual(run(SAFARI, "?go=app").log, ["REPLACE " + APP_URL]);
assert.deepStrictEqual(run(CHROME_ANDROID, "?go=play").log, ["REPLACE " + PLAY_URL]);
// 2. Real browser without it is left completely alone.
assert.deepStrictEqual(run(SAFARI, "").log, []);
// 3. TikTok, no marker yet: Download tap does a REAL navigation onto ?go=<store>, no sheet yet.
var a = run(TIKTOK, ""); assert.strictEqual(a.sheets, 0, "no sheet before the tap");
assert.deepStrictEqual(a.click(APP_URL).log, ["REPLACE /?go=app"], "tap must navigate, not replaceState");
var p = run(TIKTOK_ANDROID, "");
assert.deepStrictEqual(p.click(PLAY_URL).log, ["REPLACE /?go=play"], "Play tap must mark ?go=play");
// 4. TikTok, reloaded with the marker: sheet is up immediately AND the ladder fires.
var b = run(TIKTOK, "?go=app");
assert.strictEqual(b.sheets, 1, "sheet must render on load, not after the ladder times out");
assert.deepStrictEqual(b.log, ["HREF itms-apps://" + APP_URL.slice(8)]);
// 5. Same on Android for Play: straight into the Play app first, browser escape behind it.
var c = run(TIKTOK_ANDROID, "?go=play");
assert.strictEqual(c.sheets, 1, "sheet must render on load for Play too");
assert.deepStrictEqual(c.log, ["HREF market://details?id=com.punjabify.punjabify"]);
// 6. The store, not the device, picks the rung: an iOS webview tapping Play escapes to Safari.
assert.deepStrictEqual(run(TIKTOK, "?go=play").log, ["HREF x-safari-https://ladoo.net/?go=play"]);
console.log("ok: " + (webviews.length + realBrowsers.length) + " user agents, 9 query strings, 8 flows");
