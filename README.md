# WebRestorer
Restores webpages to a readable state by removing different annoyances.
# Installation
1. Download ZIP.
2. Unzip the file in some folder.
3. Open Chrome/Opera/Edge/Firefox.
4. If you use Firefox, then rename the "manifest_firefox.json" into "manifest.json".  
   The already existing "manifest.json" must be removed or renamed.
5. Depending on the browser enter one of the following in the address bar:
   - Chrome/Opera/Edge:
      - chrome://extensions
      - opera://extensions
      - edge://extensions
   - Firefox:
      - about:debugging#/runtime/this-firefox
6. Depending on the browser do the following:
   1. Chrome/Opera/Edge:  
      Click on "Load unpacked" or on equivalent in your browser's language.  
      Choose the unzipped folder and click open or press enter.  
   2. Firefox:  
      Click on "Load Temporary Add-on" or on equivalent in your browser's language.  
      Choose the unzipped folder and the "manifest.json", click open or press enter.  
7. Only for Firefox:  
   If you dont want to activate the extension manually for each website, then  
   you would also have to modify permissions. If you use Firefox ~ 116.0.0, then:  
   Type about:addons, press enter, choose "Extensions" in the left menu,  
   then click on "..." button, choose "Manage" option, then "Permissions" tab.  
   Activate the "Access your data for all websites". Now it should work.  
   This sequence may be different depending on the browser version.  
   You should also have at least Firefox 109 to support Manifest V3.
# Licence
MIT :copyright:
