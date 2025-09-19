import { TAB_LIMIT_KEY } from "./constants.js";

const TEMPORARY_GROUP_TITLE = "Temp\u200Borary"; // Invisible zero-width space

async function getTabLimit() {
  const result = await browser.storage.sync.get(TAB_LIMIT_KEY);
  const tabLimit = result[TAB_LIMIT_KEY] ?? Number.POSITIVE_INFINITY;
  return tabLimit;
}

async function getTemporaryTabs(tempGroupId) {
  let tabs = [];

  try {
    tabs = await browser.tabs.query({ groupId: tempGroupId });
  } catch (e) {
    tabs = [];
  }

  console.debug("Temporary tabs", tabs);
  return tabs;
}

async function getTemporaryTabGroupId() {
  let id = browser.tabGroups.TAB_GROUP_ID_NONE;

  try {
    const groups = await browser.tabGroups.query({
      title: TEMPORARY_GROUP_TITLE,
      color: "red",
    });
    id = groups[0].id;
  } catch (e) {
    // no tab group found
  }

  console.debug("Temporary tab group id", id);
  return id;
}

async function closeTabs(tabs) {
  for (const tab of tabs) {
    const id = tab.id;
    try {
      await browser.tabs.remove(id);
      console.debug("Closed tab", tab);
    } catch (e) {
      console.debug("Tab was already closed", tab);
    }
  }
}

browser.tabs.onCreated.addListener(async (createdTab) => {
  const tabs = await browser.tabs.query({});
  const tabLimit = await getTabLimit();

  if (tabs.length > tabLimit) {
    const newTabId = createdTab.id;

    let temporaryGroupId = await getTemporaryTabGroupId();

    if (temporaryGroupId != browser.tabGroups.TAB_GROUP_ID_NONE) {
      await browser.tabs.group({
        tabIds: [newTabId],
        groupId: temporaryGroupId,
      });
    } else {
      const newGroupId = await browser.tabs.group({
        tabIds: [newTabId],
      });

      await browser.tabGroups.update(newGroupId, {
        title: TEMPORARY_GROUP_TITLE,
        color: "red",
      });

      temporaryGroupId = newGroupId;
    }

    const temporaryTabs = await getTemporaryTabs(temporaryGroupId);
    const tabsToClose = temporaryTabs.filter((tab) => tab.id !== newTabId);

    await closeTabs(tabsToClose);
  }
});
