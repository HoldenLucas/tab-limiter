// Load settings from storage
async function loadSettings() {
  const result = await browser.storage.sync.get({ tabLimit: 10 });
  TAB_LIMIT = result.tabLimit;
  console.log(`Tab limit set to ${TAB_LIMIT}`);
}

// Initialize settings on startup
loadSettings();

// Listen for settings changes
browser.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && changes.tabLimit) {
    TAB_LIMIT = changes.tabLimit.newValue;
    console.log(`Tab limit updated to ${TAB_LIMIT}`);
  }
});

// Set to track temporary tabs
const temporaryTabs = new Set();

// Track the temporary tab group ID
let temporaryGroupId = null;

// Get or create the temporary tab group
async function getOrCreateTemporaryGroup(tabId) {
  // Check if group still exists
  if (temporaryGroupId) {
    try {
      const group = await browser.tabGroups.get(temporaryGroupId);
      if (group) {
        // Add tab to existing group
        await browser.tabs.group({
          tabIds: [tabId],
          groupId: temporaryGroupId,
        });
        return temporaryGroupId;
      }
    } catch (e) {
      // Group doesn't exist anymore
      temporaryGroupId = null;
    }
  }

  // Create new group by grouping the tab
  temporaryGroupId = await browser.tabs.group({
    tabIds: [tabId],
  });

  // Update the group properties
  await browser.tabGroups.update(temporaryGroupId, {
    title: "Temporary",
    color: "red",
  });

  console.log(`Created temporary tab group ${temporaryGroupId}`);
  return temporaryGroupId;
}

// Check if we should mark a new tab as temporary
async function onTabCreated(tab) {
  const tabs = await browser.tabs.query({});

  // If we're at or over the limit, mark this tab as temporary
  if (tabs.length > TAB_LIMIT) {
    // Close any existing temporary tabs first
    for (const tabId of temporaryTabs) {
      try {
        await browser.tabs.remove(tabId);
        console.log(`Closed existing temporary tab ${tabId}`);
      } catch (e) {
        // Tab might already be closed
      }
    }
    temporaryTabs.clear();

    // Now mark the new tab as temporary
    temporaryTabs.add(tab.id);

    // Create group or add tab to temporary group
    await getOrCreateTemporaryGroup(tab.id);

    console.log(
      `Tab ${tab.id} marked as temporary and added to group (${tabs.length} total tabs)`,
    );
  }
}

// Handle tab activation changes
async function onTabActivated(activeInfo) {
  // Get the previously active tab ID from all tabs
  const tabs = await browser.tabs.query({});

  // Check all temporary tabs and close any that are not active
  for (const tabId of temporaryTabs) {
    if (tabId !== activeInfo.tabId) {
      try {
        await browser.tabs.remove(tabId);
        temporaryTabs.delete(tabId);
        console.log(`Closed temporary tab ${tabId}`);
      } catch (e) {
        // Tab might already be closed
        temporaryTabs.delete(tabId);
      }
    }
  }
}

// Clean up when tabs are closed
function onTabRemoved(tabId) {
  temporaryTabs.delete(tabId);
}

// Listen for events
browser.tabs.onCreated.addListener(onTabCreated);
browser.tabs.onActivated.addListener(onTabActivated);
browser.tabs.onRemoved.addListener(onTabRemoved);
