function getDomain(tab) {
  var url = new URL(tab.url);
  return url.origin + "/*";
}

function tabsMatchingDomain(domain, tabs) {
  var matching = [];

  for (var i = 0; i < tabs.length; i++) {
    var tab = tabs[i];

    if (getDomain(tab) === domain) {
      matching.push(tab);
    }
  }

  return matching;
}

function separateActiveFromInactive(tabs) {
  var inactiveTabs = [];
  var activeTab;

  for (var i = 0; i < tabs.length; i++) {
    var tab = tabs[i];

    if (tab.active) {
      activeTab = tab;
    } else {
      inactiveTabs.push(tab);
    }
  }

  return {"activeTab": activeTab, "inactiveTabs": inactiveTabs};
}

function closeTabs(tabs) {
  for (var i = 0; i < tabs.length; i++) {
    chrome.tabs.remove(tabs[i].id);
  }
}

function gatherTabs(tabs, activeTabIndex) {
  // In order to maintain the original ordering of the tabs, tabs to the left 
  // need to be handled separately since we need to know upfront how many 
  // matching tabs are to the left of the active tab. Tabs to the right, 
  // on the other hand, can just be added to the right of the active tab 
  // as they are found.
  var leftTabs = [];
  var rightIdx = 1;
  
  for (var i = 0; i < tabs.length; i++) {
    var tab = tabs[i];
    
    if (tab.index < activeTabIndex) {
      leftTabs.push(tab.id);
    } else {
      var moveProperties = {index: activeTabIndex + rightIdx};
      chrome.tabs.move(tab.id, moveProperties);
      rightIdx++;
    }
  }

  for (var i = leftTabs.length - 1, decrement = 1; i >= 0; i--, decrement++) {
    var moveProperties = {index: activeTabIndex - decrement};
    chrome.tabs.move(leftTabs[i], moveProperties);
  }
}

function gatherTabsAll(tabs) {
  // For each unique domain, gather domains with the same domain around the left-most tab for that domain.
  var idx = tabs[0].index;
  var seenDomains = new Set();

  for (var i = 0; i < tabs.length; i++) {
    var tab = tabs[i];
    var domain = getDomain(tab);

    if (!seenDomains.has(domain)) {
      var matching = tabsMatchingDomain(domain, tabs);

      for (var j = 0; j < matching.length; j++) {
        var matchingTab = matching[j];
        var moveProperties = {index: idx};
        chrome.tabs.move(matchingTab.id, moveProperties);
        idx += 1;
      }

      seenDomains.add(domain);
    }
  }
}

function handleCommand(cmd) {
  chrome.tabs.query({currentWindow: true, pinned: false}, function(tabs) {
    if (cmd === "gather-tabs-all") {
      gatherTabsAll(tabs);
    } else {
      var tabPartition = separateActiveFromInactive(tabs);
      var activeTab = tabPartition["activeTab"];
      var inactiveTabs = tabPartition["inactiveTabs"];

      var sameDomainTabs = tabsMatchingDomain(getDomain(activeTab), inactiveTabs);

      if (cmd === "gather-tabs") {
        gatherTabs(sameDomainTabs, activeTab.index);
      } else if (cmd === "close-tabs") {
        closeTabs(sameDomainTabs);
      }
    }
  });
}

chrome.commands.onCommand.addListener(function(cmd) {
  handleCommand(cmd);
});

chrome.runtime.onMessage.addListener(function(request) {
  handleCommand(request.cmd);
});
