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

async function findTemporaryGroup() {
  try {
    const allGroups = await browser.tabGroups.query({});
    return allGroups.find((group) => group.title === TEMPORARY_GROUP_TITLE);
  } catch (e) {
    console.log("Could not query tab groups");
    return null;
  }
}

// Initialize by finding existing temporary group
async function initializeTemporaryGroup() {
  const existingTempGroup = await findTemporaryGroup();
  if (existingTempGroup) {
    console.log(`Found existing temporary tab group ${existingTempGroup.id}`);
  }
}

// Get all tabs in the temporary group
async function getTemporaryTabs() {
  const tempGroup = await findTemporaryGroup();
  if (!tempGroup) {
    return [];
  }

  try {
    const tabs = await browser.tabs.query({ groupId: tempGroup.id });
    return tabs;
  } catch (e) {
    return [];
  }
}

// Get or create temporary group
async function getOrCreateTemporaryGroup(tabId) {
  // Check if group exists
  const existingGroup = await findTemporaryGroup();

  if (existingGroup) {
    // Add tab to existing group
    await browser.tabs.group({
      tabIds: [tabId],
      groupId: existingGroup.id,
    });
    return existingGroup.id;
  }

  // Create new group
  const newGroupId = await browser.tabs.group({
    tabIds: [tabId],
  });

  // Update the group properties
  await browser.tabGroups.update(newGroupId, {
    title: TEMPORARY_GROUP_TITLE,
    color: "red",
  });

  console.log(`Created temporary tab group ${newGroupId}`);
  return newGroupId;
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
