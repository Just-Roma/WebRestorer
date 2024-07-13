'use strict';

const DISABLED_PATH = {
  32: '/icons/disabled_32.png',
  64: '/icons/disabled_64.png',
  128: '/icons/disabled_128.png',
  256: '/icons/disabled_256.png',
  512: '/icons/disabled_512.png'
};

const ENABLED_PATH = {
  32: '/icons/enabled_32.png',
  64: '/icons/enabled_64.png',
  128: '/icons/enabled_128.png',
  256: '/icons/enabled_256.png',
  512: '/icons/enabled_512.png'
};

/*----------------------------   Events   -----------------------------*/

chrome.runtime.onInstalled.addListener(() => {
  /* Always store the mode when installed. Default is enabled.
  */
  chrome.storage.local.set({ mode: 'enabled' }).catch(error => {
    console.error(`onInstalled: failed to initialize extension: ${error}`);
  });
});


chrome.runtime.onStartup.addListener(() => {
  /* Set icons and title, depending on the mode.
  */
  chrome.storage.local.get(['mode']).then(mode => {
    if (mode['mode'] == 'enabled'){
      chrome.action.setIcon({ path: ENABLED_PATH }).catch(error => {
        console.error(`onStartup: failed to set "enabled" icon: ${error}`);
      });
      chrome.action.setTitle({ title: 'Enabled' }).catch(error => {
        console.error(`onStartup: failed to set title for "enabled" mode: ${error}`);
      });
    }
    else if (mode['mode'] == 'disabled'){
      chrome.action.setIcon({ path: DISABLED_PATH }).catch(error => {
        console.error(`onStartup: failed to set "disabled" icon: ${error}`);
      });
      chrome.action.setTitle({ title: 'Disabled' }).catch(error => {
        console.error(`onStartup: failed to set title for "disabled" mode: ${error}`);
      });
    }
    // Shall never happen, but print just in case.
    else {
      console.error('onStartup: unrecognized mode.');
    }
  }, error => {
    console.error(`onStartup: failed to initialize mode: ${error}`);
  });
});


chrome.action.onClicked.addListener(tab => {
  /* Clicking on the extension button shall reset the mode.
  */
  chrome.storage.local.get(['mode']).then(result => {
    if (result['mode'] == 'enabled'){
      chrome.storage.local.set({ mode: 'disabled' }).then(() => {
        chrome.action.setIcon({ path: DISABLED_PATH }).catch(error => {
          console.error(`onClicked: failed to set "disabled" icon: ${error}`);
        });
        chrome.action.setTitle({ title: 'Disabled. Reload the page to undo modifications.' }).catch(error => {
          console.error(`onClicked: failed to set title for "disabled" mode: ${error}`);
        });
      }, error => {
        console.error(`onClicked: failed to set "disabled" mode: ${error}`);
      });
    }
    else if (result['mode'] == 'disabled'){
      chrome.storage.local.set({ mode: 'enabled' }).then(() => {
        chrome.action.setIcon({ path: ENABLED_PATH }).catch(error => {
          console.error(`onClicked: failed to set "enabled" icon: ${error}`);
        });
        chrome.action.setTitle({ title: 'Enabled' }).catch(error => {
          console.error(`onClicked: failed to set title for "enabled" mode: ${error}`);
        });
      }, error => {
        console.error(`onClicked: failed to set "enabled" mode: ${error}`);
      });
    }
    // Shall never happen, but print just in case.
    else {
      console.error('onClicked: unrecognized mode.');
    }
  }, error => {
    console.error(`onClicked: failed to get mode: ${error}`);
  });
});


chrome.runtime.onMessage.addListener((data, sender) => {
  /* React on a message coming from content script.
  */
  const tabId = sender.tab.id;
  if (data.message === 'check_mode'){
    chrome.storage.local.get(['mode']).then(mode => {
      /*
      Check if tab's url starts with 'http', because otherwise it can happen that the background script
      would try to send a message to smth else (eg 'chrome://'), which would through an error.
      */
      if (sender.tab.url.startsWith('http')){
        chrome.tabs.sendMessage(tabId, { message: mode }).
        catch(error => {
          console.error(`Failed to send mode: ${error}`);
        });
      }
    }, error => {
      console.error(`onMessage: failed to get mode: ${error}`);
    });
  }
  else {
    // Ignore others.
  }
});
