'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const VOID_TAGS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr'
]);

class DOMText {
  constructor(text) {
    this.nodeType = 3;
    this.nodeValue = String(text ?? '');
    this.parentNode = null;
  }

  get textContent() {
    return this.nodeValue;
  }

  set textContent(val) {
    this.nodeValue = String(val ?? '');
  }
}

class ClassList {
  constructor(element) {
    this._el = element;
    this._set = new Set();
  }

  _syncFromString(str) {
    this._set.clear();
    String(str || '')
      .split(/\s+/)
      .filter(Boolean)
      .forEach((c) => this._set.add(c));
  }

  _toString() {
    return Array.from(this._set).join(' ');
  }

  add(...tokens) {
    tokens.forEach((t) => {
      if (t) this._set.add(String(t));
    });
  }

  remove(...tokens) {
    tokens.forEach((t) => this._set.delete(String(t)));
  }

  toggle(token, force) {
    const t = String(token);
    if (force === true) {
      this._set.add(t);
      return true;
    }
    if (force === false) {
      this._set.delete(t);
      return false;
    }
    if (this._set.has(t)) {
      this._set.delete(t);
      return false;
    }
    this._set.add(t);
    return true;
  }

  contains(token) {
    return this._set.has(String(token));
  }

  toArray() {
    return Array.from(this._set);
  }
}

class DOMElement {
  constructor(tagName, ownerDocument = null) {
    this.nodeType = 1;
    this.tagName = String(tagName || 'div').toUpperCase();
    this.ownerDocument = ownerDocument;
    this.parentNode = null;
    this.childNodes = [];
    this.attributes = new Map();
    this.classList = new ClassList(this);
    this.style = {};
    this.listeners = new Map();
    this.offsetWidth = 360;
    this.offsetHeight = 640;
    this._innerHTMLRaw = '';
  }

  get children() {
    return this.childNodes.filter((n) => n.nodeType === 1);
  }

  get id() {
    return this.attributes.get('id') || '';
  }

  set id(val) {
    if (val === null || val === undefined || val === '') {
      this.attributes.delete('id');
    } else {
      this.attributes.set('id', String(val));
    }
  }

  get className() {
    return this.classList._toString();
  }

  set className(val) {
    this.classList._syncFromString(val);
    this.attributes.set('class', this.classList._toString());
  }

  get disabled() {
    return this.attributes.has('disabled');
  }

  set disabled(val) {
    if (val) this.attributes.set('disabled', '');
    else this.attributes.delete('disabled');
  }

  get checked() {
    return this.attributes.has('checked');
  }

  set checked(val) {
    if (val) this.attributes.set('checked', '');
    else this.attributes.delete('checked');
  }

  get type() {
    return this.attributes.get('type') || '';
  }

  set type(val) {
    this.attributes.set('type', String(val));
  }

  get open() {
    return this.attributes.has('open');
  }

  set open(val) {
    if (val) this.attributes.set('open', '');
    else this.attributes.delete('open');
  }

  getAttribute(name) {
    const key = String(name).toLowerCase();
    if (key === 'class') return this.className;
    return this.attributes.has(key) ? this.attributes.get(key) : null;
  }

  setAttribute(name, val) {
    const key = String(name).toLowerCase();
    const strVal = String(val ?? '');
    if (key === 'class') {
      this.className = strVal;
      return;
    }
    if (key === 'style') {
      strVal.split(';').forEach((decl) => {
        const idx = decl.indexOf(':');
        if (idx !== -1) {
          const prop = decl
            .slice(0, idx)
            .trim()
            .replace(/-([a-z])/g, (_, c) => c.toUpperCase());
          const v = decl.slice(idx + 1).trim();
          if (prop) this.style[prop] = v;
        }
      });
    }
    this.attributes.set(key, strVal);
  }

  hasAttribute(name) {
    return this.attributes.has(String(name).toLowerCase());
  }

  removeAttribute(name) {
    const key = String(name).toLowerCase();
    if (key === 'class') this.classList._syncFromString('');
    this.attributes.delete(key);
  }

  appendChild(child) {
    if (!child) return child;
    if (child.parentNode) {
      const idx = child.parentNode.childNodes.indexOf(child);
      if (idx !== -1) child.parentNode.childNodes.splice(idx, 1);
    }
    child.parentNode = this;
    if (child.nodeType === 1) {
      child.ownerDocument = this.ownerDocument;
    }
    this.childNodes.push(child);
    return child;
  }

  remove() {
    if (this.parentNode) {
      const idx = this.parentNode.childNodes.indexOf(this);
      if (idx !== -1) this.parentNode.childNodes.splice(idx, 1);
      this.parentNode = null;
    }
  }

  get textContent() {
    return this.childNodes.map((n) => n.textContent).join('');
  }

  set textContent(val) {
    this.childNodes = [];
    this._innerHTMLRaw = '';
    const str = String(val ?? '');
    if (str.length > 0) {
      this.appendChild(new DOMText(str));
    }
  }

  get innerHTML() {
    return this.childNodes
      .map((n) => {
        if (n.nodeType === 3) return n.nodeValue;
        const tag = n.tagName.toLowerCase();
        const cls = n.className ? ` class="${n.className}"` : '';
        const idAttr = n.id ? ` id="${n.id}"` : '';
        if (VOID_TAGS.has(tag)) return `<${tag}${idAttr}${cls}>`;
        return `<${tag}${idAttr}${cls}>${n.innerHTML}</${tag}>`;
      })
      .join('');
  }

  set innerHTML(htmlStr) {
    this.childNodes = [];
    const raw = String(htmlStr ?? '');
    this._innerHTMLRaw = raw;
    if (!raw.trim()) return;
    const nodes = parseHTMLFragment(raw, this.ownerDocument);
    nodes.forEach((n) => this.appendChild(n));
  }

  addEventListener(type, fn) {
    if (typeof fn !== 'function') return;
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(fn);
  }

  removeEventListener(type, fn) {
    if (!this.listeners.has(type)) return;
    const arr = this.listeners.get(type);
    const idx = arr.indexOf(fn);
    if (idx !== -1) arr.splice(idx, 1);
  }

  dispatchEvent(event) {
    const evt = event || { type: 'unknown' };
    if (!evt.target) evt.target = this;
    evt.currentTarget = this;
    let stopped = false;
    evt.stopPropagation = () => {
      stopped = true;
    };
    if (!evt.preventDefault) {
      evt.preventDefault = () => {
        evt.defaultPrevented = true;
      };
    }

    const list = (this.listeners.get(evt.type) || []).slice();
    for (const fn of list) {
      fn.call(this, evt);
    }
    if (!stopped && evt.bubbles !== false && this.parentNode && this.parentNode.dispatchEvent) {
      this.parentNode.dispatchEvent(evt);
    }
    return !evt.defaultPrevented;
  }

  click() {
    if (this.disabled) return;
    this.dispatchEvent({
      type: 'click',
      bubbles: true,
      clientX: 100,
      clientY: 100
    });
  }

  showModal() {
    this.open = true;
  }

  close() {
    this.open = false;
    this.dispatchEvent({ type: 'close', bubbles: false });
  }

  scrollIntoView() {}

  getBoundingClientRect() {
    return { top: 0, left: 0, width: 320, height: 480, right: 320, bottom: 480 };
  }

  querySelector(selector) {
    const results = this.querySelectorAll(selector);
    return results.length > 0 ? results[0] : null;
  }

  querySelectorAll(selector) {
    const parts = String(selector)
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (parts.length === 0) return [];

    let candidates = [this];
    for (const part of parts) {
      const nextMatches = [];
      const seen = new Set();
      for (const root of candidates) {
        collectMatchingDescendants(root, part, nextMatches, seen);
      }
      candidates = nextMatches;
    }
    return candidates;
  }
}

function matchesSimpleSelector(el, sel) {
  if (!el || el.nodeType !== 1) return false;
  let remaining = sel;

  // Attribute selectors: [attr="val"] or [attr]
  const attrRegex = /\[([a-zA-Z0-9_-]+)(?:=["']?([^"'\]]*)["']?)?\]/g;
  let attrMatch;
  while ((attrMatch = attrRegex.exec(sel)) !== null) {
    const attrName = attrMatch[1].toLowerCase();
    const expectedVal = attrMatch[2];
    if (!el.hasAttribute(attrName)) return false;
    if (expectedVal !== undefined && el.getAttribute(attrName) !== expectedVal) {
      return false;
    }
  }
  remaining = remaining.replace(attrRegex, '');

  // ID selector: #id
  const idMatch = remaining.match(/#([a-zA-Z0-9_-]+)/);
  if (idMatch) {
    if (el.id !== idMatch[1]) return false;
    remaining = remaining.replace(idMatch[0], '');
  }

  // Class selectors: .cls1.cls2
  const classMatches = remaining.match(/\.[a-zA-Z0-9_-]+/g);
  if (classMatches) {
    for (const cm of classMatches) {
      const clsName = cm.slice(1);
      if (!el.classList.contains(clsName)) return false;
    }
    remaining = remaining.replace(/\.[a-zA-Z0-9_-]+/g, '');
  }

  // Tag name if remaining
  const tagPart = remaining.trim();
  if (tagPart && tagPart !== '*') {
    if (el.tagName !== tagPart.toUpperCase()) return false;
  }

  return true;
}

function collectMatchingDescendants(root, simpleSel, out, seen) {
  for (const child of root.children) {
    if (matchesSimpleSelector(child, simpleSel) && !seen.has(child)) {
      seen.add(child);
      out.push(child);
    }
    collectMatchingDescendants(child, simpleSel, out, seen);
  }
}

function decodeEntities(str) {
  return String(str)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function parseAttributes(attrString, el) {
  const regex = /([a-zA-Z0-9_:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let m;
  while ((m = regex.exec(attrString)) !== null) {
    const name = m[1];
    const val = m[2] ?? m[3] ?? m[4] ?? '';
    el.setAttribute(name, decodeEntities(val));
  }
}

function parseHTMLFragment(html, ownerDocument) {
  const cleaned = String(html).replace(/<!--[\s\S]*?-->/g, '');
  const root = new DOMElement('fragment', ownerDocument);
  const stack = [root];

  const tokenRegex = /<\/?([a-zA-Z0-9-]+)([^>]*)>|([^<]+)/g;
  let match;
  while ((match = tokenRegex.exec(cleaned)) !== null) {
    const full = match[0];
    const tagName = match[1];
    const attrPart = match[2] || '';
    const textPart = match[3];

    if (textPart !== undefined) {
      if (textPart.length > 0) {
        stack[stack.length - 1].appendChild(new DOMText(decodeEntities(textPart)));
      }
      continue;
    }

    const lowerTag = tagName.toLowerCase();
    const isClosing = full.startsWith('</');
    const isSelfClosing = VOID_TAGS.has(lowerTag) || /\/\s*$/.test(attrPart);

    if (isClosing) {
      for (let i = stack.length - 1; i > 0; i--) {
        if (stack[i].tagName.toLowerCase() === lowerTag) {
          stack.length = i;
          break;
        }
      }
    } else {
      const el = new DOMElement(lowerTag, ownerDocument);
      parseAttributes(attrPart.replace(/\/\s*$/, ''), el);
      stack[stack.length - 1].appendChild(el);
      if (!isSelfClosing) {
        stack.push(el);
      }
    }
  }

  return root.childNodes.slice();
}

class DOMDocument {
  constructor() {
    this.documentElement = new DOMElement('html', this);
    this.head = new DOMElement('head', this);
    this.body = new DOMElement('body', this);
    this.documentElement.appendChild(this.head);
    this.documentElement.appendChild(this.body);
    this.listeners = new Map();
  }

  createElement(tag) {
    return new DOMElement(tag, this);
  }

  getElementById(id) {
    return this.documentElement.querySelector(`#${id}`);
  }

  querySelector(sel) {
    return this.documentElement.querySelector(sel);
  }

  querySelectorAll(sel) {
    return this.documentElement.querySelectorAll(sel);
  }

  addEventListener(type, fn) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(fn);
  }

  removeEventListener(type, fn) {
    if (!this.listeners.has(type)) return;
    const arr = this.listeners.get(type);
    const idx = arr.indexOf(fn);
    if (idx !== -1) arr.splice(idx, 1);
  }
}

function createMemoryStorage(initial = {}) {
  const store = new Map(Object.entries(initial).map(([k, v]) => [k, String(v)]));
  return {
    getItem(key) {
      return store.has(String(key)) ? store.get(String(key)) : null;
    },
    setItem(key, val) {
      store.set(String(key), String(val));
    },
    removeItem(key) {
      store.delete(String(key));
    },
    clear() {
      store.clear();
    },
    _dump() {
      return Object.fromEntries(store.entries());
    }
  };
}

class MockAudioParam {
  setValueAtTime() {}
  exponentialRampToValueAtTime() {}
}

class MockAudioNode {
  constructor() {
    this.gain = new MockAudioParam();
    this.frequency = new MockAudioParam();
    this.type = 'sine';
  }
  connect() {}
  start() {}
  stop() {}
}

class MockAudioContext {
  constructor() {
    this.currentTime = 0;
    this.state = 'running';
    this.destination = {};
  }
  createGain() {
    return new MockAudioNode();
  }
  createOscillator() {
    return new MockAudioNode();
  }
  resume() {
    this.state = 'running';
  }
}

/**
 * Creates a complete isolated Gauntlet DOM + VM environment.
 */
function createGauntletEnv(options = {}) {
  const {
    useCompiledBundle = false,
    initialLocalStorage = {},
    hostname = 'localhost',
    sharedStorage = null
  } = options;

  const gauntletDir = path.resolve(__dirname, '../..');
  const srcHtmlPath = path.join(gauntletDir, 'src', 'index.html');
  const srcGamePath = path.join(gauntletDir, 'src', 'game.js');
  const compiledHtmlPath = path.join(gauntletDir, 'index.html');

  const htmlSource = fs.readFileSync(
    useCompiledBundle ? compiledHtmlPath : srcHtmlPath,
    'utf8'
  );

  let gameScriptSource = '';
  if (useCompiledBundle) {
    // Extract the main game script (last <script>...</script> block) from gauntlet/index.html
    const scriptMatches = [...htmlSource.matchAll(/<script>([\s\S]*?)<\/script>/g)];
    gameScriptSource = scriptMatches[scriptMatches.length - 1][1];
  } else {
    gameScriptSource = fs.readFileSync(srcGamePath, 'utf8');
  }

  // Extract <body> innerHTML
  const bodyMatch = htmlSource.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyHtml = bodyMatch ? bodyMatch[1].replace(/<script[\s\S]*?<\/script>/gi, '') : '';

  const localStorage = sharedStorage || createMemoryStorage(initialLocalStorage);
  const document = new DOMDocument();
  document.body.innerHTML = bodyHtml;

  let nextTimerId = 1;
  const pendingTimeouts = new Map();
  const windowListeners = new Map();
  let clipboardText = '';

  function HTMLDialogElement() {}
  HTMLDialogElement.prototype = {};

  const windowObj = {
    location: {
      hostname,
      href: `http://${hostname}/gauntlet/`
    },
    localStorage,
    document,
    HTMLDialogElement,
    AudioContext: MockAudioContext,
    webkitAudioContext: MockAudioContext,
    navigator: {
      clipboard: {
        async writeText(txt) {
          clipboardText = String(txt);
        },
        async readText() {
          return clipboardText;
        }
      }
    },
    requestAnimationFrame(cb) {
      if (typeof cb === 'function') cb(Date.now());
      return 1;
    },
    cancelAnimationFrame() {},
    setTimeout(fn, delay = 0) {
      const id = nextTimerId++;
      pendingTimeouts.set(id, { fn, delay });
      return id;
    },
    clearTimeout(id) {
      pendingTimeouts.delete(id);
    },
    setInterval() {
      return nextTimerId++;
    },
    clearInterval() {},
    addEventListener(type, fn) {
      if (!windowListeners.has(type)) windowListeners.set(type, []);
      windowListeners.get(type).push(fn);
    },
    removeEventListener(type, fn) {
      if (!windowListeners.has(type)) return;
      const arr = windowListeners.get(type);
      const idx = arr.indexOf(fn);
      if (idx !== -1) arr.splice(idx, 1);
    },
    dispatchEvent(evt) {
      const list = (windowListeners.get(evt.type) || []).slice();
      for (const fn of list) {
        fn.call(windowObj, evt);
      }
    },
    Math,
    Date,
    Set,
    Map,
    Array,
    Object,
    String,
    Number,
    Boolean,
    RegExp,
    JSON,
    Promise,
    Error,
    console
  };
  windowObj.window = windowObj;
  windowObj.globalThis = windowObj;

  const runner = new Function(
    'window',
    'document',
    'localStorage',
    'navigator',
    'HTMLDialogElement',
    'AudioContext',
    'webkitAudioContext',
    'requestAnimationFrame',
    'cancelAnimationFrame',
    'setTimeout',
    'clearTimeout',
    'setInterval',
    'clearInterval',
    gameScriptSource
  );
  runner(
    windowObj,
    document,
    localStorage,
    windowObj.navigator,
    HTMLDialogElement,
    MockAudioContext,
    MockAudioContext,
    windowObj.requestAnimationFrame,
    windowObj.cancelAnimationFrame,
    windowObj.setTimeout,
    windowObj.clearTimeout,
    windowObj.setInterval,
    windowObj.clearInterval
  );

  function flushTimers(maxDelay = Infinity) {
    let executed = 0;
    const entries = Array.from(pendingTimeouts.entries());
    for (const [id, item] of entries) {
      if (item.delay <= maxDelay) {
        pendingTimeouts.delete(id);
        item.fn();
        executed++;
      }
    }
    return executed;
  }

  function dispatchKey(key, extra = {}) {
    const evt = {
      type: 'keydown',
      key,
      ctrlKey: false,
      metaKey: false,
      altKey: false,
      defaultPrevented: false,
      preventDefault() {
        this.defaultPrevented = true;
      },
      ...extra
    };
    windowObj.dispatchEvent(evt);
    return evt;
  }

  function reloadPage() {
    return createGauntletEnv({
      useCompiledBundle,
      hostname,
      sharedStorage: localStorage
    });
  }

  return {
    window: windowObj,
    document,
    localStorage,
    api: windowObj.__GAUNTLET_TEST_API__,
    flushTimers,
    dispatchKey,
    reloadPage,
    getClipboardText: () => clipboardText
  };
}

module.exports = {
  createGauntletEnv,
  createMemoryStorage
};
