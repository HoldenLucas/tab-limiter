// # Holden's Tab Limiter
//
// This is a Firefox extension that limits the maximum number of open tabs.
//
// When the maximum number of tabs is reached, opening another tab will put it in the Temporary tab group.
//
// The Temporary tab group should only ever contain one tab.
//
// If there is already a tab in the Temporary group, opening another tab will close the existing temporary tab.

import { TAB_LIMIT_KEY } from "./constants.js";

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

    return newGroupId;
  }
}

async function onTabCreated(createdTab) {
  const tabs = await browser.tabs.query({});
  const tabLimit = await getTabLimit();

  if (tabs.length > tabLimit) {
    await getOrCreateTemporaryGroup(createdTab.id);

    await replaceTemporaryTab(createdTab.id);
  }
}

async function replaceTemporaryTab(preserveTabId) {
  const temporaryTabs = await getTemporaryTabs();

  const tabsToClose = temporaryTabs.filter((tab) => tab.id !== preserveTabId);

  for (const tab of tabsToClose) {
    await closeTab(tab);
  }
}

async function closeAllTemporaryTabs() {
  const temporaryTabs = await getTemporaryTabs();

  for (const tempTab of temporaryTabs) {
    await closeTab(tempTab);
  }
}

async function closeTab(tab) {
  const tabId = tab.id;
  try {
    await browser.tabs.remove(tabId);
    console.log(`Closed tab ${tabId}`);
  } catch (e) {
    console.log(`Tab ${tabId} was already closed`);
  }
}

async function onTabActivated(activeInfo) {
  await closeAllTemporaryTabs();
}

// Listen for events
browser.tabs.onCreated.addListener(onTabCreated);
browser.tabs.onActivated.addListener(onTabActivated);
