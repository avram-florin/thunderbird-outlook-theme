browser.outlookCards.init(browser.runtime.getURL("home/home.html"));
// limba aleasa in setarile paginii de start (auto / ro / en), si pentru lista de mesaje
browser.storage.local.get("lang").then(r => browser.outlookCards.setLanguage(r.lang || "auto"));
