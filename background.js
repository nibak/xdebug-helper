// Listen for tab updates
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    // We only react on a complete load of a http(s) page,
    // only then we're sure the content.js is loaded.
    if (changeInfo.status !== "complete" || tab.url.indexOf("http") !== 0) {
      return;
    }
  
    // Prep some variables
    let ideKey = "XDEBUG_ECLIPSE";
    let traceTrigger = ideKey;
    let profileTrigger = ideKey;
  
    // Get settings from storage
    chrome.storage.local.get(
      ["xdebugIdeKey", "xdebugTraceTrigger", "xdebugProfileTrigger", "xdebugDisablePopup"],
      function(data) {
        if (data.xdebugIdeKey) {
          ideKey = data.xdebugIdeKey;
        }
  
        if (data.xdebugTraceTrigger) {
          traceTrigger = data.xdebugTraceTrigger;
        }
  
        if (data.xdebugProfileTrigger) {
          profileTrigger = data.xdebugProfileTrigger;
        }
  
        // Request the current status and update the icon accordingly
        chrome.tabs.sendMessage(
          tabId,
          {
            cmd: "getStatus",
            idekey: ideKey,
            traceTrigger: traceTrigger,
            profileTrigger: profileTrigger
          },
          function(response) {
            if (chrome.runtime.lastError) {
              console.log("Error: ", chrome.runtime.lastError);
              return;
            }
  
            // Update the icon
            updateIcon(response.status, tabId, data.xdebugDisablePopup === '1');
          }
        );
      }
    );
  });
  
  // Handle keyboard commands
  chrome.commands.onCommand.addListener(function(command) {
    if ('toggle_debug_action' == command) {
      let ideKey = "XDEBUG_ECLIPSE";
      let traceTrigger = ideKey;
      let profileTrigger = ideKey;
      let disablePopup = false;
  
      // Get settings from storage
      chrome.storage.local.get(
        ["xdebugIdeKey", "xdebugTraceTrigger", "xdebugProfileTrigger", "xdebugDisablePopup"],
        function(data) {
          if (data.xdebugIdeKey) {
            ideKey = data.xdebugIdeKey;
          }
  
          if (data.xdebugTraceTrigger) {
            traceTrigger = data.xdebugTraceTrigger;
          }
  
          if (data.xdebugProfileTrigger) {
            profileTrigger = data.xdebugProfileTrigger;
          }
  
          disablePopup = data.xdebugDisablePopup === '1';
  
          // Fetch the active tab
          chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            // Do nothing when there is no active tab
            if (tabs.length == 0) {
              return;
            }
  
            // Get the current state
            chrome.tabs.sendMessage(
              tabs[0].id,
              {
                cmd: "getStatus",
                idekey: ideKey,
                traceTrigger: traceTrigger,
                profileTrigger: profileTrigger
              },
              function(response) {
                if (chrome.runtime.lastError) {
                  console.log("Error: ", chrome.runtime.lastError);
                  return;
                }
  
                // Get new status by current status
                const newStatus = getNewStatus(response.status, disablePopup);
  
                chrome.tabs.sendMessage(
                  tabs[0].id,
                  {
                    cmd: "setStatus",
                    status: newStatus,
                    idekey: ideKey,
                    traceTrigger: traceTrigger,
                    profileTrigger: profileTrigger
                  },
                  function(response) {
                    if (chrome.runtime.lastError) {
                      console.log("Error: ", chrome.runtime.lastError);
                      return;
                    }
                    
                    // Update the icon
                    updateIcon(response.status, tabs[0].id, disablePopup);
                  }
                );
              }
            );
          });
        }
      );
    }
  });
  
  // Handle action button clicks
  chrome.action.onClicked.addListener((tab) => {
    chrome.storage.local.get(
      ["xdebugIdeKey", "xdebugTraceTrigger", "xdebugProfileTrigger", "xdebugDisablePopup"],
      function(data) {
        let ideKey = data.xdebugIdeKey || "XDEBUG_ECLIPSE";
        let traceTrigger = data.xdebugTraceTrigger || ideKey;
        let profileTrigger = data.xdebugProfileTrigger || ideKey;
        let disablePopup = data.xdebugDisablePopup === '1';
  
        // Get the current state
        chrome.tabs.sendMessage(
          tab.id,
          {
            cmd: "getStatus",
            idekey: ideKey,
            traceTrigger: traceTrigger,
            profileTrigger: profileTrigger
          },
          function(response) {
            if (chrome.runtime.lastError) {
              console.log("Error: ", chrome.runtime.lastError);
              return;
            }
  
            // Get new status by current status
            const newStatus = getNewStatus(response.status, disablePopup);
  
            chrome.tabs.sendMessage(
              tab.id,
              {
                cmd: "setStatus",
                status: newStatus,
                idekey: ideKey,
                traceTrigger: traceTrigger,
                profileTrigger: profileTrigger
              },
              function(response) {
                if (chrome.runtime.lastError) {
                  console.log("Error: ", chrome.runtime.lastError);
                  return;
                }
                
                // Update the icon
                updateIcon(response.status, tab.id, disablePopup);
              }
            );
          }
        );
      }
    );
  });
  
  /**
   * Get new status by current status.
   *
   * @param {number} status - Current status from sendMessage() cmd: 'getStatus'.
   * @param {boolean} disablePopup - Whether popup is disabled
   *
   * @returns {number}
   */
  function getNewStatus(status, disablePopup) {
    // Reset status, when trace or profile is selected and popup is disabled
    if (disablePopup && ((status === 2) || (status === 3))) {
      return 0;
    }
  
    // If state is debugging (1) toggle to disabled (0), else toggle to debugging
    return (status === 1) ? 0 : 1;
  }
  
  /**
   * Update the extension icon based on status
   * 
   * @param {number} status - The status code
   * @param {number} tabId - The ID of the tab
   * @param {boolean} disablePopup - Whether popup is disabled
   */
  function updateIcon(status, tabId, disablePopup) {
    // Reset status, when trace or profile is selected and popup is disabled
    if (disablePopup && ((status === 2) || (status === 3))) {
      status = 0;
    }
  
    // Figure the correct title / image by the given state
    let image = "images/bug-gray.png";
    let title = disablePopup ? 'Debugging disabled' : 'Debugging, profiling & tracing disabled';
  
    if (status == 1) {
      title = "Debugging enabled";
      image = "images/bug.png";
    } else if (status == 2) {
      title = "Profiling enabled";
      image = "images/clock.png";
    } else if (status == 3) {
      title = "Tracing enabled";
      image = "images/script.png";
    }
  
    // Update title
    chrome.action.setTitle({
      tabId: tabId,
      title: title
    });
  
    // Update image
    chrome.action.setIcon({
      tabId: tabId,
      path: image
    });
  }
  
  // Set up the popup based on preferences
  chrome.storage.local.get(["xdebugDisablePopup"], function(data) {
    if (data.xdebugDisablePopup === '1') {
      chrome.action.setPopup({
        popup: '',
      });
    } else {
      chrome.action.setPopup({
        popup: 'popup.html',
      });
    }
  });
  
  // Migration from localStorage to chrome.storage.local (one-time)
  if (typeof localStorage !== 'undefined') {
    const keysToMigrate = ["xdebugIdeKey", "xdebugTraceTrigger", "xdebugProfileTrigger", "xdebugDisablePopup"];
    let dataToMigrate = {};
    
    keysToMigrate.forEach(key => {
      if (localStorage[key]) {
        dataToMigrate[key] = localStorage[key];
      }
    });
    
    if (Object.keys(dataToMigrate).length > 0) {
      chrome.storage.local.set(dataToMigrate);
    }
  }