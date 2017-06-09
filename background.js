function getDomain(tab) {
  var url = new URL(tab.url);
  return url.origin + "/*";
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

function handleCommand(activeTab, cmd) {
  var urlDomain = getDomain(activeTab);
  
  chrome.tabs.query({
    currentWindow: true, 
    active: false, 
    pinned: false,
    url: urlDomain
  }, function(tabs) {
    if (cmd === "close-tabs") {
      closeTabs(tabs);
    } else if (cmd === "gather-tabs") {
      gatherTabs(tabs, activeTab.index);
    }
  })
}

chrome.commands.onCommand.addListener(function(cmd) {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    handleCommand(tabs[0], cmd);
  });
});

chrome.runtime.onMessage.addListener(function(request) {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    handleCommand(tabs[0], request.cmd);
  });
});
