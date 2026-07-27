(function () {
  "use strict";

  var shellSelector = "[data-mobile-shell]";
  var requestSerial = 0;

  function getShell() {
    return document.querySelector(shellSelector);
  }

  function setBusy(busy) {
    var shell = getShell();
    if (!shell) return;
    if (busy) {
      shell.setAttribute("aria-busy", "true");
      shell.classList.add("mobile-ajax-busy");
    } else {
      shell.removeAttribute("aria-busy");
      shell.classList.remove("mobile-ajax-busy");
    }
  }

  function sameOriginUrl(value) {
    try {
      var url = new URL(value, window.location.href);
      return url.origin === window.location.origin ? url : null;
    } catch (_) {
      return null;
    }
  }

  function tabOf(url) {
    try {
      return new URL(url, window.location.href).searchParams.get("tab") || "home";
    } catch (_) {
      return "home";
    }
  }

  function replaceShellFromHtml(html, finalUrl, historyMode, preserveScroll) {
    var parser = new DOMParser();
    var doc = parser.parseFromString(html, "text/html");
    var nextShell = doc.querySelector(shellSelector);
    var currentShell = getShell();

    if (!nextShell || !currentShell) {
      window.location.assign(finalUrl);
      return;
    }

    var oldScrollY = window.scrollY || window.pageYOffset || 0;
    currentShell.replaceWith(nextShell);
    if (doc.title) document.title = doc.title;

    if (historyMode === "push") window.history.pushState({ mobileAjax: true }, "", finalUrl);
    if (historyMode === "replace") window.history.replaceState({ mobileAjax: true }, "", finalUrl);

    if (preserveScroll) {
      window.scrollTo(0, oldScrollY);
    } else {
      window.scrollTo(0, 0);
    }

    document.dispatchEvent(new CustomEvent("machinowa:mobile-updated"));
  }

  function loadPage(url, historyMode, preserveScroll) {
    var serial = ++requestSerial;
    setBusy(true);

    return fetch(url, {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
      headers: {
        "X-Machinowa-Mobile-Ajax": "1"
      }
    }).then(function (response) {
      if (!response.ok) throw new Error("page fetch failed: " + response.status);
      return response.text().then(function (html) {
        if (serial !== requestSerial) return;
        replaceShellFromHtml(html, response.url || url, historyMode, preserveScroll);
      });
    }).catch(function () {
      // Progressive enhancement fallback: the original server-rendered route
      // is always usable even if fetch/Ajax is unavailable on this browser.
      window.location.assign(url);
    }).finally(function () {
      if (serial === requestSerial) setBusy(false);
    });
  }

  function formDataToGetUrl(form, formData) {
    var url = new URL(form.action || window.location.href, window.location.href);
    url.search = "";
    formData.forEach(function (value, key) {
      if (typeof value === "string") url.searchParams.append(key, value);
    });
    return url.toString();
  }

  function submitForm(form, submitter) {
    var method = (form.method || "get").toUpperCase();
    var action = sameOriginUrl(form.action || window.location.href);
    if (!action) {
      form.submit();
      return;
    }

    var formData = new FormData(form);
    if (submitter && submitter.name && !formData.has(submitter.name)) {
      formData.append(submitter.name, submitter.value || "");
    }

    if (method === "GET") {
      var getUrl = formDataToGetUrl(form, formData);
      var keepScroll = tabOf(getUrl) === tabOf(window.location.href);
      loadPage(getUrl, "push", keepScroll);
      return;
    }

    var serial = ++requestSerial;
    setBusy(true);
    fetch(action.toString(), {
      method: method,
      body: formData,
      credentials: "same-origin",
      cache: "no-store",
      redirect: "follow",
      headers: {
        "Accept": "application/json",
        "X-Machinowa-Mobile-Ajax": "1"
      }
    }).then(function (response) {
      var contentType = response.headers.get("content-type") || "";
      if (contentType.indexOf("application/json") === -1) {
        // Older cached server route: follow the final page without exposing
        // the /api/mobile/* URL to the user.
        var fallbackUrl = response.url && response.url.indexOf("/api/mobile/") === -1
          ? response.url
          : (formData.get("returnTo") || window.location.href);
        return { ok: response.ok, redirect: String(fallbackUrl) };
      }
      return response.json();
    }).then(function (result) {
      if (serial !== requestSerial) return;
      var target = result && result.redirect
        ? sameOriginUrl(result.redirect)
        : sameOriginUrl(String(formData.get("returnTo") || window.location.href));
      var targetUrl = target ? target.toString() : window.location.href;
      var keepScroll = tabOf(targetUrl) === tabOf(window.location.href);
      return loadPage(targetUrl, "replace", keepScroll);
    }).catch(function () {
      // If Ajax itself is unsupported, submit through the original HTML form.
      form.submit();
    }).finally(function () {
      if (serial === requestSerial) setBusy(false);
    });
  }

  document.addEventListener("click", function (event) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    var target = event.target;
    if (!(target instanceof Element)) return;
    var anchor = target.closest("a[href]");
    var shell = getShell();
    if (!anchor || !shell || !shell.contains(anchor)) return;
    if (anchor.target && anchor.target !== "_self") return;
    if (anchor.hasAttribute("download") || anchor.getAttribute("rel") === "external" || anchor.hasAttribute("data-no-ajax")) return;

    var href = anchor.getAttribute("href") || "";
    if (!href || href.charAt(0) === "#") return;
    var url = sameOriginUrl(anchor.href);
    if (!url) return;

    event.preventDefault();
    var keepScroll = tabOf(url.toString()) === tabOf(window.location.href);
    loadPage(url.toString(), "push", keepScroll);
  }, false);

  document.addEventListener("submit", function (event) {
    var form = event.target;
    var shell = getShell();
    if (!(form instanceof HTMLFormElement) || !shell || !shell.contains(form) || form.hasAttribute("data-no-ajax")) return;
    var action = sameOriginUrl(form.action || window.location.href);
    if (!action) return;

    event.preventDefault();
    submitForm(form, event.submitter || null);
  }, false);

  window.addEventListener("popstate", function () {
    loadPage(window.location.href, "none", false);
  });

  window.history.replaceState({ mobileAjax: true }, "", window.location.href);
  document.documentElement.classList.add("mobile-ajax-ready");
})();
