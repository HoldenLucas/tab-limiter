const TEMPORARY_GROUP_TITLE = "Temporary\u200B"; // Invisible zero-width space at end

async function getTabLimit() {
  const result = await browser.storage.sync.get("tabLimit");
  const tabLimit = result.tabLimit ?? Number.POSITIVE_INFINITY;
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
    await browser.tabs.group({
      tabIds: [tabId],
      groupId: existingGroup.id,
    });
    return existingGroup.id;
  } else {
    const newGroupId = await browser.tabs.group({
      tabIds: [tabId],
    });

    await browser.tabGroups.update(newGroupId, {
      title: TEMPORARY_GROUP_TITLE,
      color: "red",
    });

    console.log(`Created temporary tab group ${newGroupId}`);
    return newGroupId;
  }
}

async function onTabCreated(tab) {
  const tabs = await browser.tabs.query({});
  const tabLimit = await getTabLimit();

  if (tabs.length > tabLimit) {
    await closeTemporaryTabs();

    await getOrCreateTemporaryGroup(tab.id);
  }
}

async function closeTemporaryTabs() {
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

async function onTabActivated(activeInfo) {
  await closeTemporaryTabs();
}

// Listen for events
browser.tabs.onCreated.addListener(onTabCreated);
browser.tabs.onActivated.addListener(onTabActivated);
