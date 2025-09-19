import { TAB_LIMIT_KEY } from "./constants.js";

function saveOptions() {
  const tabLimit = parseInt(document.getElementById("tabLimit").value);

  browser.storage.sync
    .set({
      TAB_LIMIT_KEY: tabLimit,
    })
    .then(() => {
      const status = document.getElementById("status");
      status.textContent = "Settings saved!";
      setTimeout(() => {
        status.textContent = "";
      }, 2000);
    });
}

function loadOptions() {
  browser.storage.sync
    .get({
      tabLimit: 8,
    })
    .then((result) => {
      document.getElementById("tabLimit").value = result.tabLimit;
    });
}

document.addEventListener("DOMContentLoaded", loadOptions);

document.getElementById("save").addEventListener("click", saveOptions);
