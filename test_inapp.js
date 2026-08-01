/* node test_inapp.js
   Checks the shipped in-app-browser regex against real user agents.
   Reads the literal out of site.js so the test cannot drift from the code. */
var assert = require("assert");
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

// the escape link only auto-forwards on ?go=app
var GO = /[?&]go=app(&|$)/;
["?go=app", "?utm_source=tiktok&go=app", "?go=app&x=1"].forEach(function (q) { assert.ok(GO.test(q)); });
["", "?go=apple", "?ago=app"].forEach(function (q) { assert.ok(!GO.test(q)); });

console.log("ok: " + (webviews.length + realBrowsers.length) + " user agents, 6 query strings");
