const TEMPORARY_GROUP_TITLE = "Temporary\u200B"; // Invisible zero-width space at end

async function getTabLimit() {
  const result = await browser.storage.sync.get({ tabLimit: Infinity });
  return result.tabLimit;
}

async function findTemporaryGroup() {
  try {
    const allGroups = await browser.tabGroups.query({});
    return allGroups.find((group) => group.title === TEMPORARY_GROUP_TITLE);
  } catch (e) {
    console.log("Could not query tab groups");
    return null;
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

async function getOrCreateTemporaryGroup(tabId) {
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
  const tabLimit = await getTabLimit();

  // If we're at or over the limit, mark this tab as temporary
  if (tabs.length > tabLimit) {
    await closeTemporaryTabs();

    // Create group or add tab to temporary group
    await getOrCreateTemporaryGroup(tab.id);

    console.log(
      `Tab ${tab.id} marked as temporary and added to group (${tabs.length} total tabs)`,
    );
  }
}

async function closeTemporaryTabs() {
  // Close any existing temporary tabs first
  const temporaryTabs = await getTemporaryTabs();
  for (const tempTab of temporaryTabs) {
    try {
      await browser.tabs.remove(tempTab.id);
      console.log(`Closed temporary tab ${tempTab.id}`);
    } catch (e) {
      console.log(`Temporary tab ${tempTab.id} was already closed`);
    }
  }
}

// Handle tab activation changes
async function onTabActivated(activeInfo) {
  await closeTemporaryTabs();
}

// Listen for events
browser.tabs.onCreated.addListener(onTabCreated);
browser.tabs.onActivated.addListener(onTabActivated);
