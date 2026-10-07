(function () {
  "use strict";

  function hasReactSite() {
    return !!document.querySelector("[data-react-site]");
  }

  function isHydrated() {
    return document.documentElement.getAttribute("data-machinowa-hydrated") === "1";
  }

  function compatAlreadyRequested() {
    try {
      return new URL(window.location.href).searchParams.get("compat") === "1";
    } catch (_) {
      return false;
    }
  }

  function switchToCompatMode() {
    if (!hasReactSite() || isHydrated() || compatAlreadyRequested()) return;

    try {
      var url = new URL(window.location.href);
      url.searchParams.set("compat", "1");
      window.location.replace(url.toString());
    } catch (_) {
      // If URL parsing is unavailable, leave the server-rendered links usable.
    }
  }

  if (!hasReactSite() || compatAlreadyRequested()) return;

  var timer = window.setTimeout(switchToCompatMode, 4500);
  window.addEventListener("machinowa:hydrated", function () {
    window.clearTimeout(timer);
  }, { once: true });
})();
