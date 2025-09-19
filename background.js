let TAB_LIMIT = 10;

const TEMPORARY_GROUP_TITLE = "Temporary\u200B"; // Invisible zero-width space at end

// Load settings from storage
async function loadSettings() {
  const result = await browser.storage.sync.get({ tabLimit: 10 });
  TAB_LIMIT = result.tabLimit;
  console.log(`Tab limit set to ${TAB_LIMIT}`);
}

// Initialize settings on startup
loadSettings();
initializeTemporaryGroup();

// Listen for settings changes
browser.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && changes.tabLimit) {
    TAB_LIMIT = changes.tabLimit.newValue;
    console.log(`Tab limit updated to ${TAB_LIMIT}`);
  }
});

// Track the temporary tab group ID
let temporaryGroupId = null;

// Initialize by finding existing temporary group
async function initializeTemporaryGroup() {
  try {
    const allGroups = await browser.tabGroups.query({});
    const existingTempGroup = allGroups.find(
      (group) => group.title === TEMPORARY_GROUP_TITLE,
    );
    if (existingTempGroup) {
      temporaryGroupId = existingTempGroup.id;
      console.log(`Found existing temporary tab group ${temporaryGroupId}`);
    }
  } catch (e) {
    // tabGroups API might not be available
    console.log("Could not query tab groups during initialization");
  }
}

// Get all tabs in the temporary group
async function getTemporaryTabs() {
  if (!temporaryGroupId) {
    return [];
  }

  try {
    const tabs = await browser.tabs.query({ groupId: temporaryGroupId });
    return tabs;
  } catch (e) {
    // Group might not exist anymore
    temporaryGroupId = null;
    return [];
  }
}

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
    title: TEMPORARY_GROUP_TITLE,
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
    const existingTemporaryTabs = await getTemporaryTabs();
    for (const tempTab of existingTemporaryTabs) {
      try {
        await browser.tabs.remove(tempTab.id);
        console.log(`Closed existing temporary tab ${tempTab.id}`);
      } catch (e) {
        // Tab might already be closed
      }
    }

    // Create group or add tab to temporary group
    await getOrCreateTemporaryGroup(tab.id);

    console.log(
      `Tab ${tab.id} marked as temporary and added to group (${tabs.length} total tabs)`,
    );
  }
}

// Handle tab activation changes
async function onTabActivated(activeInfo) {
  // Check all temporary tabs and close any that are not active
  const temporaryTabs = await getTemporaryTabs();
  for (const tempTab of temporaryTabs) {
    if (tempTab.id !== activeInfo.tabId) {
      try {
        await browser.tabs.remove(tempTab.id);
        console.log(`Closed temporary tab ${tempTab.id}`);
      } catch (e) {
        // Tab might already be closed
      }
    }
  }
}

// Listen for events
browser.tabs.onCreated.addListener(onTabCreated);
browser.tabs.onActivated.addListener(onTabActivated);
