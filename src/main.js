/*
 *---------------------------------------------------------------------*
  General description and notes regarding the restoration of a web page
 *---------------------------------------------------------------------*

The following components must be considered to restore a site:

- Scrolling restoration:
  Many sites disallow the scrolling before users consent. At least 2 properties are of interest: overflow, position.
  It seems that the html/body elements are the only ones used to restrict scrolling. It might happen that other elements can be also used.

- Blurring removal.
  Sometimes blur effect is used to hide content before user agrees to smth, enters some info, etc.

- Popups removal:
  Every popup is either a single element or, rather likely, a part of a DOM, which consists of several/many elements,
  either as a single popup-tree or several siblings, where each sibling can be a tree.
  So, more concise and formal: Each popup is a set of single elements and/or element-trees.

  There are at least 2 ways of how to detect such popups:
  1) Check for a well-known property (eg id, class):
     Simple and effective for single cases but not-generalized, hence does not cover many/most cases.
  2) Check for some common general hints, such as words indicators (eg cookie), properties (eg z-index).
     Rather complicated/untrivial to implement but, if done properly, could cover many/most cases.

  Each popup-tree can be either sent with the html in a response or built later dynamically.
  So, two approaches are necessary:
  1) Go through DOM once after the DOM was loaded.
  2) Use MutationObserver to catch new elements.
     Async addition of elements bears additional obstacles: it may be necessary to wait until all/enough
     elements of a tree were loaded before an appropriate investigation can be conducted.

NOT IMPLEMENTED!
- Paywalls:
  Sometimes websites put text in HTML behind the paywall, so it would be worth to unhide it.

- Clicking/Copying restoration.
  Some sites prohibit users to click on elements or copy text.

- Ads.
  Probably will never be implemented. Existing extensions already do their job.

Additional notes:
- Annoyances can be classified into groups:
  - Elements-based: consist of elements (eg popups, ads) and rather complicatedly constructed.
  - Attributes-based: implemented only with attributes.
  - Script-based: implemented through scripting (eventlisteners, which prevent actions).
  - Combinations of previous.

- Different approaches for removing popups can be taken:
  - Detect root(s) of each popup, based on specific attributes/values of elements, and remove it/them.
    Not that easy to write smth general, since detecting roots is not always trivial.
  - "Negate" some specific attributes to undo their effects.
    It might be more general and easy to implement, because only responsible for annoyance parts are targeted.
*/

'use strict';

/*
 *------------------------------------*
             Common consts
 *------------------------------------*
*/

const body = document.body;
const html = document.documentElement;

const body_style = getComputedStyle(body);
const html_style = getComputedStyle(html);

/*
 *------------------------------------*
          Properties handling
 *------------------------------------*
*/


const special_elements = {
  /*
  Holder for different groups of HTML elements.
  */
  excluded_for_transparency: [
    /*
    For some elements transparency can be a part of design, it would be nice to preserve it.
    It is highly unlikely/impossible that these elements would be used as containers for popups.
    */
    'A', 'ABBR', 'ACRONYM', 'ADDRESS', 'B', 'BDI', 'BDO', 'BLOCKQUOTE', 'BUTTON', 'CAPTION', 'CITE', 'CODE', 'COL', 'COLGROUP',
    'DATA', 'DD', 'DEL', 'DETAILS', 'DFN', 'DL', 'DT', 'EM', 'FIELDSET', 'FIGCAPTION', 'FIGURE', 'FORM', 'H1', 'H2', 'H3', 'H4',
    'HGROUP', 'HR', 'I', 'INPUT', 'INS', 'KBD', 'LABEL', 'LEGEND', 'LI', 'MARK', 'METER', 'OL', 'OPTGROUP', 'OPTION', 'OUTPUT',
    'P', 'PRE', 'PROGRESS', 'Q', 'RB', 'RP', 'RT', 'RTC', 'RUBY', 'S', 'SAMP', 'SEARCH', 'SELECT', 'SMALL', 'SPAN', 'STRONG',
    'SUB', 'SUMMARY', 'SUP', 'TABLE', 'TBODY', 'TD', 'TEXTAREA', 'TFOOT', 'TH', 'THEAD', 'TIME', 'TR', 'TT', 'U', 'UL', 'VAR',
  ],

  excluded_for_z_index: [
    /*
    For some elements transparency can be a part of design, it would be nice to preserve it.
    It is highly unlikely/impossible that these elements would be used as containers for popups.
    */
    'A', 'ARTICLE', 'ASIDE', 'BUTTON', 'CANVAS', 'FOOTER', 'FORM', 'FRAME', 'FRAMESET',
    'H1', 'H2', 'H3', 'H4', 'HEADER', 'IFRAME', 'MAIN', 'NAV', 'P', 'SPAN',
  ],

  ancestors_for_z_index: [
    /*
    These elements are special and are highly unlikely to be a container for an element with numeric z-index.
    */
    'A', 'ARTICLE', 'ASIDE', 'BUTTON', 'CANVAS', 'FOOTER', 'FORM', 'FRAME', 'FRAMESET',
    'H1', 'H2', 'H3', 'H4', 'HEADER', 'IFRAME', 'MAIN', 'NAV', 'P', 'SPAN',
  ],

  descendants_for_z_index: [
    /*
    These elements are special and are highly unlikely to be within an element with numeric z-index.
    */
    'HEADER', 'MAIN', 'ARTICLE', 'ASIDE', 'NAV', 'FOOTER',
  ],
};


const css_properties_handlers = {
  /*
  Wrapper for functions, which are used to handle annoyances-related CSS properties.
  */
  handle_overflow: function (element, element_style){
    /*
    Overflow is sometimes restricted in order to prevent users from scrolling content.
    */
    let overflow = element_style['overflow'];
    let position = element_style['position'];

    if (overflow.includes('hidden')){
      element.style.setProperty('overflow', overflow.replace('hidden', 'auto'), 'important');
      /*
      Check its 'position' property:
      - If it is 'fixed', then it will still be unmovable.
      */
      if (position.includes('fixed')) element.style.setProperty('position', position.replace('fixed', 'static'), 'important');
    }
  },

  handle_blur: function (element, element_style){
    /*
    Blur is sometimes used to hide content.
    Assumptions:
    - It is easier to unblur an element than find the root of such element and remove it.
    - There is a very small chance of this effect being used for design, so all blur can be removed.
    */
    let filter = element_style['filter'];

    if (filter.includes('blur')) element.style.setProperty('filter', 'none', 'important');
  },

  handle_transparency: function (element, element_style){
    /*
    Transparency is sometimes used to hide or diminish the visibility of content.
    Assumptions:
    - It is easier to make an element transparent than find the root of such element and remove it.
    */
    if (special_elements.excluded_for_transparency.includes(element.tagName)) return;

    let bgcolor = element_style['background-color'];

    const match = bgcolor.match(/rgba\((?<R>\d+),\s*(?<G>\d+),\s*(?<B>\d+),\s*(?<A>\d|\d\.\d+)\)/i);
    if (match && Number(match.groups['A']) !== 0){
      element.style.setProperty('background-color', 'rgba(' + match.groups['R'] + ',' + match.groups['G'] + ',' + match.groups['B'] + ',0)', 'important');
    }
  },

  handle_z_index: function (element, element_style){
    /*
    The "z-index" plays an enormous role in popups. Apparently most popups use it.
    Assumptions:
    - Some elements cant/extremely unlikely to be used as containers for popups.
    */
    if (special_elements.excluded_for_z_index.includes(element.tagName)) return;

    let z_index = element_style['z-index'];
    if (z_index !== 'auto' && z_index !== '0' &&
      support_for_css_properties_handlers.has_non_special_ancestors(element) &&
      support_for_css_properties_handlers.has_non_special_descendants(element)
    ){
      remove_element(element); return 'removed';
    }
  },
};


const support_for_css_properties_handlers = {
  /*
  Miscellaneous functions, which are used by the functions defined in the "css_properties_handlers".
  */
  has_non_special_ancestors: function (element){
    /*
    The ancestors_for_z_index shall preserve their descendants.
    Returns false if the given element has such special ancestor, otherwise true.
    */
    let current_ancestor = element.parentElement;

    while (current_ancestor != body && current_ancestor != html){
      // It can happen that the ancestor is null.
      if (!(current_ancestor instanceof HTMLElement)) return;
      if (special_elements.ancestors_for_z_index.includes(current_ancestor.tagName)) return false;
      current_ancestor = current_ancestor.parentElement;
    }
    return true;
  },

  has_non_special_descendants: function (root_element){
    /*
    The descendants_for_z_index shall preserve their ancestor.
    Returns false if the given element has such special descendant, otherwise true.
    */
    let output = true;

    function recurse_dom(element){
      for (const _element of element.children){
        if (!excluded_elements.includes(_element.tagName)){
          if (special_elements.descendants_for_z_index.includes(_element.tagName)) output = false;
          if (output) recurse_dom(_element);
        }
      }
      if (output){
      // It can happen that a part of a popup is a shadow DOM.
        const shadow = element.shadowRoot;
        if (shadow){
          for (const _element of shadow.children){
            if (!excluded_elements.includes(_element.tagName)){
              if (special_elements.descendants_for_z_index.includes(_element.tagName)) output = false;
              if (output) recurse_dom(_element);
            }
          }
        }
      }
      return;
    }
    recurse_dom(root_element);

    return output;
  }
};


function remove_element(element){
  // Safe removal of element.
  if (body.contains(element)) element.remove();
}

/*
 *------------------------------------*
            Popups removal
 *------------------------------------*
*/
function handle_special_sites(origin){
  /* Special sites can be handled here in some specific way.
  */
}

// Elements, which cant be or extremely unlikely to be a part of any element-based annoyance.
const excluded_elements = [
  'ABBR', 'ACRONYM', 'ADDRESS', 'AREA', 'AUDIO', 'B', 'BDI', 'BDO', 'BIG', 'BLOCKQUOTE', 'BR', 'CAPTION',
  'CENTER', 'CITE', 'CODE', 'COL', 'COLGROUP', 'DATA', 'DATALIST', 'DD', 'DEL', 'DETAILS', 'DFN', 'DL',
  'DT', 'EM', 'FIELDSET', 'FIGCAPTION', 'FIGURE', 'FONT', 'FORM', 'HEAD', 'HR', 'I', 'IMG', 'INPUT', 'INS',
  'KBD', 'LABEL', 'LEGEND', 'LI', 'LINK', 'MAP', 'MARK', 'MARQUEE', 'MENU', 'MENUITEM', 'META', 'METER',
  'NOBR', 'NOSCRIPT', 'OL', 'OPTGROUP', 'OPTION', 'OUTPUT', 'P', 'PARAM', 'PICTURE', 'PLAINTEXT', 'PRE',
  'PROGRESS', 'Q', 'RB', 'RP', 'RT', 'RTC', 'RUBY', 'S', 'SAMP', 'SCRIPT', 'SEARCH', 'SELECT', 'SMALL',
  'SOURCE', 'STRIKE', 'STRONG', 'STYLE', 'SUB', 'SUMMARY', 'SUP', 'TABLE', 'TBODY', 'TD', 'TEXTAREA',
  'TFOOT', 'TH', 'THEAD', 'TIME', 'TITLE', 'TR', 'TRACK', 'TT', 'U', 'UL', 'VAR', 'VIDEO', 'WBR', 'XMP',
];

function examine_and_handle_element(element){

  // Not an HTML element or excluded.
  if (!(element instanceof HTMLElement) || excluded_elements.includes(element.tagName)) return;

  const style = getComputedStyle(element);

  css_properties_handlers.handle_blur(element, style);
  //handle_transparency(element, style);
  css_properties_handlers.handle_z_index(element, style);
}

function examine_dom(root_element){
  /* Recursevely checks DOM in order to find popups.
  */
  function recurse_dom(element){
    for (const _element of element.children){
      if (!excluded_elements.includes(_element.tagName)){
        let result = examine_and_handle_element(_element);
        if (result != 'removed'){
          recurse_dom(_element);
        }
      }
    }
    // It can happen that a part of a popup is a shadow DOM.
    const shadow = element.shadowRoot;
    if (shadow){
      for (const _element of shadow.children){
        if (!excluded_elements.includes(_element.tagName)){
          let result = examine_and_handle_element(_element);
          if (result != 'removed'){
            recurse_dom(_element);
          }
        }
      }
    }
    return;
  }
  recurse_dom(root_element);
}

function is_site_ignored(host){
  /*
  Check if the given host must be ignored as defined in the consts/sites.js
  */
  if (STATIC_IGNORED_SITES.includes(host)) return true;
  for (const rgx of RGX_IGNORED_SITES) if (host.match(rgx)) return true;
  return false;
}

function is_site_special(host){
  /*
  Check if the given host must be handled in some special way as defined in the consts/sites.js
  */
  if (STATIC_SPECIAL_SITES.includes(host)) return true;
  return false;
}

/********************   Main   *********************/

chrome.runtime.onMessage.addListener((data, sender) => {
  /* Listen to the messages coming from the background script.
  */
  const mode = data.message.mode;
  if (mode === 'enabled'){
    if (is_site_ignored(origin)) return;

    if (is_site_special(origin)){ handle_special_sites(origin); return; }
    /*
    Otherwise handle general-type sites according to some common pattern. */
    const html_config = { attributes: true, childList: true, subtree: true };

    const html_callback = (mutationList, observer) => {
      for (const mutation of mutationList){
        if (mutation.type === "childList"){
          for (const element of mutation.addedNodes) examine_and_handle_element(element);
        }
        else if (mutation.type === "attributes"){
          if (mutation.target==html) css_properties_handlers.handle_overflow(html, html_style);
          else if (mutation.target==body) css_properties_handlers.handle_overflow(body, body_style);
          else examine_and_handle_element(mutation.target);
        }
      }
    };
    const html_observer = new MutationObserver(html_callback);
    html_observer.observe(html, html_config);

    // Make sure that popups, which were created before the MutationObserver was started, are taken care of.
    css_properties_handlers.handle_overflow(html, html_style);
    css_properties_handlers.handle_overflow(body, body_style);
    examine_dom(body);
  }
});

chrome.runtime.sendMessage({ message: 'check_mode' });
