// Save settings
function saveOptions() {
  const tabLimit = parseInt(document.getElementById("tabLimit").value);

  browser.storage.sync
    .set({
      tabLimit: tabLimit,
    })
    .then(() => {
      // Show status
      const status = document.getElementById("status");
      status.textContent = "Settings saved!";
      setTimeout(() => {
        status.textContent = "";
      }, 2000);
    });
}

// Load settings
function loadOptions() {
  browser.storage.sync
    .get({
      tabLimit: 8, // Default value
    })
    .then((result) => {
      document.getElementById("tabLimit").value = result.tabLimit;
    });
}

// Load settings when page loads
document.addEventListener("DOMContentLoaded", loadOptions);

// Save when button is clicked
document.getElementById("save").addEventListener("click", saveOptions);
