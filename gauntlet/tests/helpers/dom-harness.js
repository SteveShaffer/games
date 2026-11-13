'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

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
 * Supports both modular source scripts (`useCompiledBundle: false`) and the
 * standalone compiled bundle (`useCompiledBundle: true`).
 */
function createGauntletEnv(options = {}) {
  const {
    useCompiledBundle = false,
    initialLocalStorage = {},
    hostname = 'localhost',
    sharedStorage = null
  } = options;

  const gauntletDir = path.resolve(__dirname, '../..');
  const srcDir = path.join(gauntletDir, 'src');
  const srcHtmlPath = path.join(srcDir, 'index.html');
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
    // Read all local <script src="..."> modules referenced in gauntlet/src/index.html in order
    const scriptTagRegex = /<script\s+src="([^"]+)"\s*><\/script>/gi;
    const chunks = [];
    let match;
    while ((match = scriptTagRegex.exec(htmlSource)) !== null) {
      const srcAttr = match[1];
      if (/^https?:\/\//i.test(srcAttr)) continue;
      const scriptFilePath = path.join(srcDir, srcAttr);
      chunks.push(fs.readFileSync(scriptFilePath, 'utf8'));
    }
    gameScriptSource = `(() => {\n'use strict';\n${chunks.join('\n\n')}\n})();`;
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

/**
 * Helper to find a 1-3 step solution for Digits given live tile objects [{ val, hasBonus }].
 */
function findDigitsSolutionSteps(tiles, target) {
  const ops = [
    { sym: '+', fn: (a, b) => a + b },
    { sym: '−', fn: (a, b) => (a - b > 0 ? a - b : null) },
    { sym: '×', fn: (a, b) => a * b },
    { sym: '÷', fn: (a, b) => (b > 0 && a % b === 0 ? a / b : null) }
  ];

  let bestSolution = null;

  function dfs(current, steps) {
    if (steps.length > 3) return;
    for (let i = 0; i < current.length; i++) {
      for (let j = 0; j < current.length; j++) {
        if (i === j) continue;
        const tA = current[i];
        const tB = current[j];
        for (const op of ops) {
          const resVal = op.fn(tA.val, tB.val);
          if (resVal === null) continue;
          const usedBonus = Boolean(tA.hasBonus || tB.hasBonus);
          const nextSteps = [...steps, { indexA: i, op: op.sym, indexB: j, resVal, usedBonus }];
          if (resVal === target) {
            if (
              !bestSolution ||
              (usedBonus && !bestSolution.usedBonus) ||
              (usedBonus === bestSolution.usedBonus && nextSteps.length < bestSolution.steps.length)
            ) {
              bestSolution = { steps: nextSteps, usedBonus };
            }
            continue;
          }
          if (nextSteps.length < 3) {
            const rest = current.filter((_, idx) => idx !== i && idx !== j);
            rest.push({ val: resVal, hasBonus: usedBonus });
            dfs(rest, nextSteps);
          }
        }
      }
    }
  }

  dfs(tiles, []);
  return bestSolution ? bestSolution.steps : [];
}

/**
 * Helper to find shortest BFS slide sequence (indices of clicked tiles) for Slide (3x3 8-puzzle).
 */
function solveSliderClickPath(startTiles, getNeighbors) {
  const goalKey = '1,2,3,4,5,6,7,8,0';
  const startKey = startTiles.join(',');
  if (startKey === goalKey) return [];
  const visited = new Set([startKey]);
  const queue = [{ tiles: startTiles.slice(), clicks: [] }];

  while (queue.length > 0) {
    const { tiles, clicks } = queue.shift();
    const z = tiles.indexOf(0);
    for (const nb of getNeighbors(z)) {
      const nxt = tiles.slice();
      nxt[z] = nxt[nb];
      nxt[nb] = 0;
      const key = nxt.join(',');
      const nextClicks = [...clicks, nb];
      if (key === goalKey) return nextClicks;
      if (!visited.has(key)) {
        visited.add(key);
        queue.push({ tiles: nxt, clicks: nextClicks });
      }
    }
  }
  return [];
}

/**
 * Plays and wins whichever stage is currently mounted on `env` via DOM interactions.
 */
function playCurrentStageViaDOM(env) {
  const { document, api } = env;
  const state = api.getState();
  const stage = state.stages[state.currentStageIndex];
  const puzzle = api.getActivePuzzle();

  if (stage.id === 'wordle') {
    const keys = document.querySelectorAll('.wordle-keyboard .kb-key');
    const clickKey = (label) => {
      const btn = keys.find((k) => k.textContent === label);
      assert.ok(btn, `Wordle key "${label}" not found`);
      btn.click();
    };
    for (const ch of puzzle.targetWord) {
      clickKey(ch);
    }
    clickKey('ENTER');
    env.flushTimers(500);
    return;
  }

  if (stage.id === 'digits') {
    const liveTiles = (
      stage.savedState && stage.savedState.currentTiles
        ? stage.savedState.currentTiles
        : puzzle.baseNumbers.map((val, idx) => ({
            val,
            hasBonus: Boolean(stage.hasBoost && idx === puzzle.bonusSourceIndex)
          }))
    ).map((t) => ({ ...t }));

    const steps = findDigitsSolutionSteps(liveTiles, puzzle.targetNumber);
    assert.ok(steps.length > 0, 'Digits solver must find winning steps');

    for (const step of steps) {
      const bubbles = document.querySelectorAll('#digitsBubblesGrid .digit-bubble');
      if (!bubbles[step.indexA].classList.contains('selected')) {
        bubbles[step.indexA].click();
      }
      const opBtns = document.querySelectorAll('#digitsOpsRow .op-btn');
      const opBtn = opBtns.find((b) => b.textContent === step.op);
      assert.ok(opBtn, `Operator button ${step.op} not found`);
      opBtn.click();
      const bubblesAfterOp = document.querySelectorAll('#digitsBubblesGrid .digit-bubble');
      bubblesAfterOp[step.indexB].click();
    }
    env.flushTimers(500);
    return;
  }

  if (stage.id === 'reactor') {
    const currentCells =
      stage.savedState && stage.savedState.cells
        ? stage.savedState.cells.slice()
        : puzzle.cells.slice();

    let bestTaps = null;
    for (let mask = 0; mask < 512; mask++) {
      const taps = [];
      for (let b = 0; b < 9; b++) {
        if (mask & (1 << b)) taps.push(b);
      }
      if (bestTaps && taps.length >= bestTaps.length) continue;
      const copy = currentCells.slice();
      for (const idx of taps) api.applyReactorToggle(copy, idx);
      if (copy.every(Boolean)) {
        bestTaps = taps;
      }
    }
    assert.ok(bestTaps, 'Reactor F_2 solver must find solution taps');
    for (const cellIdx of bestTaps) {
      const cells = document.querySelectorAll('.reactor-grid .reactor-cell');
      cells[cellIdx].click();
    }
    env.flushTimers(500);
    return;
  }

  if (stage.id === 'memory') {
    env.flushTimers(1600);
    const bySymbol = new Map();
    puzzle.shuffledSymbols.forEach((sym, idx) => {
      if (!bySymbol.has(sym)) bySymbol.set(sym, []);
      bySymbol.get(sym).push(idx);
    });
    for (const [, [i1, i2]] of bySymbol.entries()) {
      let cards = document.querySelectorAll('.memory-grid .memory-card');
      if (cards[i1].classList.contains('matched')) continue;
      cards[i1].click();
      cards = document.querySelectorAll('.memory-grid .memory-card');
      cards[i2].click();
    }
    env.flushTimers(500);
    return;
  }

  if (stage.id === 'slider') {
    const currentTiles =
      stage.savedState && stage.savedState.tiles ? stage.savedState.tiles : puzzle.tiles;
    const clicks = solveSliderClickPath(currentTiles, api.getSliderNeighbors);
    assert.ok(clicks.length > 0, 'Slider BFS must find click path');
    for (const idx of clicks) {
      const tiles = document.querySelectorAll('#sliderGridBox .slider-tile');
      tiles[idx].click();
    }
    env.flushTimers(500);
    return;
  }

  if (stage.id === 'waffle') {
    const holes = new Set(puzzle.holes);
    const solution = puzzle.solution;
    const board =
      stage.savedState && stage.savedState.board
        ? stage.savedState.board.slice()
        : puzzle.board.slice();

    let guard = 0;
    while (guard++ < 20) {
      let firstMismatch = -1;
      if (puzzle.bonusPos !== -1 && board[puzzle.bonusPos] !== solution[puzzle.bonusPos]) {
        firstMismatch = puzzle.bonusPos;
      } else {
        for (let i = 0; i < 25; i++) {
          if (!holes.has(i) && board[i] !== solution[i]) {
            firstMismatch = i;
            break;
          }
        }
      }
      if (firstMismatch === -1) break;

      const neededChar = solution[firstMismatch];
      let partnerIdx = -1;
      for (let j = 0; j < 25; j++) {
        if (
          j !== firstMismatch &&
          !holes.has(j) &&
          board[j] !== solution[j] &&
          board[j] === neededChar
        ) {
          partnerIdx = j;
          if (board[firstMismatch] === solution[j]) break;
        }
      }
      assert.ok(partnerIdx !== -1, 'Waffle swap partner must exist');

      let gridChildren = document.getElementById('waffleBoardGrid').children;
      gridChildren[firstMismatch].click();
      gridChildren = document.getElementById('waffleBoardGrid').children;
      gridChildren[partnerIdx].click();

      const tmp = board[firstMismatch];
      board[firstMismatch] = board[partnerIdx];
      board[partnerIdx] = tmp;
    }
    env.flushTimers(500);
    return;
  }

  if (stage.id === 'traffic') {
    const currentCars =
      stage.savedState && stage.savedState.cars ? stage.savedState.cars : puzzle.template;
    const bfs = api.solveTrafficBFS(currentCars);
    assert.ok(bfs.solvable && bfs.moves.length > 0, 'Traffic BFS must provide winning moves');

    for (const move of bfs.moves) {
      const carIdx = currentCars.findIndex((c) => c.id === move.id);
      assert.ok(carIdx !== -1, `Car ${move.id} not found`);
      const carBtns = document.querySelectorAll('#trafficGrid .traffic-car');
      carBtns[carIdx].click();

      const stepSign = move.steps > 0 ? 1 : -1;
      for (let s = 0; s < Math.abs(move.steps); s++) {
        const dirBtn = document.getElementById(
          stepSign > 0 ? 'trafficPosBtn' : 'trafficNegBtn'
        );
        dirBtn.click();
      }
    }
    env.flushTimers(500);
    return;
  }

  if (stage.id === 'morph') {
    const chain =
      stage.savedState && stage.savedState.chain
        ? stage.savedState.chain.slice()
        : [puzzle.startWord];
    const startStepIdx = Math.max(1, chain.length);

    for (let s = startStepIdx; s < puzzle.shortestPath.length; s++) {
      const prevWord = puzzle.shortestPath[s - 1];
      const nextWord = puzzle.shortestPath[s];
      let diffPos = 0;
      for (let i = 0; i < 4; i++) {
        if (prevWord[i] !== nextWord[i]) {
          diffPos = i;
          break;
        }
      }
      const editableTiles = document.querySelectorAll('#morphActiveWord .morph-tile');
      editableTiles[diffPos].click();

      const kbKeys = document.querySelectorAll('#morphKeyboard .kb-key');
      const targetKey = kbKeys.find((k) => k.textContent === nextWord[diffPos]);
      assert.ok(targetKey, `Morph keyboard key ${nextWord[diffPos]} not found`);
      targetKey.click();
    }
    env.flushTimers(500);
    return;
  }

  if (stage.id === 'mastermind') {
    const swatches = document.querySelectorAll('#mmPaletteRow .mm-swatch');
    for (let i = 0; i < 4; i++) {
      const colorId = puzzle.secret[i];
      swatches[colorId].click();
    }
    document.getElementById('mmSubmitBtn').click();
    env.flushTimers(500);
    return;
  }

  if (stage.id === 'iceslide') {
    const curIdx =
      stage.savedState && typeof stage.savedState.playerIdx === 'number'
        ? stage.savedState.playerIdx
        : puzzle.startIdx;
    const curMask =
      stage.savedState && typeof stage.savedState.frozenMask === 'number'
        ? stage.savedState.frozenMask
        : 0;
    const bfs =
      curIdx === puzzle.startIdx && curMask === 0
        ? { moves: puzzle.winningMoves }
        : api.solveIceRinkBFS(
            puzzle.rockWalls,
            puzzle.crackedList,
            curIdx,
            puzzle.goalIdx,
            curMask
          );

    for (const move of bfs.moves) {
      const dpadBtn = document.querySelector(`.ice-dpad .dpad-btn[data-dir="${move.dir}"]`);
      assert.ok(dpadBtn, `Ice d-pad button ${move.dir} not found`);
      dpadBtn.click();
    }
    env.flushTimers(500);
    return;
  }

  if (stage.id === 'chess') {
    const currentWhite =
      stage.savedState && Array.isArray(stage.savedState.whitePieces)
        ? stage.savedState.whitePieces.map((w) => ({ ...w }))
        : puzzle.initialWhite.map((w) => ({ ...w }));
    const currentBlack =
      stage.savedState && Array.isArray(stage.savedState.blackPieces)
        ? stage.savedState.blackPieces.map((b) => ({ ...b }))
        : puzzle.initialBlack.map((b) => ({ ...b }));

    const bfs = api.solveChessBFS(currentWhite, currentBlack);
    assert.ok(bfs.solvable && bfs.moves.length > 0, 'Chess solver must find winning moves');

    for (const move of bfs.moves) {
      let squares = document.querySelectorAll('#chessBoardGrid .chess-sq');
      const whitePiece = currentWhite[move.whiteIdx];
      squares[whitePiece.pos].click();

      squares = document.querySelectorAll('#chessBoardGrid .chess-sq');
      squares[move.dest].click();

      currentWhite[move.whiteIdx].pos = move.dest;
      currentBlack.forEach((b) => {
        if (b.alive && b.pos === move.dest) b.alive = false;
      });
    }
    env.flushTimers(500);
    return;
  }

  if (stage.id === 'sudoku') {
    for (const emptyIdx of puzzle.emptyList) {
      const cells = document.querySelectorAll('#sudokuGridBox .sudoku-cell');
      if (
        cells[emptyIdx].classList.contains('solved') ||
        cells[emptyIdx].classList.contains('given')
      ) {
        continue;
      }
      cells[emptyIdx].click();
      const numpadBtns = document.querySelectorAll('#sudokuNumpad .numpad-btn');
      const numBtn = numpadBtns.find((b) => b.textContent === String(puzzle.solution[emptyIdx]));
      assert.ok(numBtn, `Sudoku numpad button ${puzzle.solution[emptyIdx]} not found`);
      numBtn.click();
    }
    env.flushTimers(500);
    return;
  }

  if (stage.id === 'mines') {
    for (const mineIdx of puzzle.mineIndices) {
      const cells = document.querySelectorAll('#minesGridBox .mine-cell');
      if (!cells[mineIdx].classList.contains('flagged')) {
        cells[mineIdx].click();
      }
    }
    env.flushTimers(500);
    return;
  }

  if (stage.id === 'knight') {
    const curPos =
      stage.savedState && typeof stage.savedState.knightPos === 'number'
        ? stage.savedState.knightPos
        : puzzle.startPos;
    const curMask =
      stage.savedState && typeof stage.savedState.starsMask === 'number'
        ? stage.savedState.starsMask
        : 0;

    let path = [];
    if (
      curPos === puzzle.startPos &&
      curMask === 0 &&
      puzzle.winningPath &&
      puzzle.winningPath.length > 1
    ) {
      path = puzzle.winningPath.slice(1);
    } else {
      const bfs = api.solveKnightBFS(curPos, puzzle.starIndices, puzzle.rockMask);
      assert.ok(bfs.solvable && bfs.winningPath.length > 1, 'Knight solver must find path');
      path = bfs.winningPath.slice(1);
    }

    for (const nextSq of path) {
      const squares = document.querySelectorAll('#knightGridBox .chess-sq');
      squares[nextSq].click();
    }
    env.flushTimers(500);
    return;
  }

  if (stage.id === 'islands') {
    const currentEdgeVals =
      stage.savedState && stage.savedState.edgeVals
        ? { ...stage.savedState.edgeVals }
        : {};

    for (const edge of puzzle.edges) {
      const cur = currentEdgeVals[edge.id] || 0;
      const neededClicks = (edge.target - cur + 3) % 3;
      for (let c = 0; c < neededClicks; c++) {
        const slot = document.querySelector(`.bridge-slot[data-edge-id="${edge.id}"]`);
        assert.ok(slot, `Bridge slot ${edge.id} not found`);
        slot.click();
      }
    }
    env.flushTimers(500);
    return;
  }

  if (stage.id === 'gems') {
    const curBoard =
      stage.savedState && stage.savedState.board
        ? stage.savedState.board.slice()
        : puzzle.board.slice();
    const solution = api.solveGemsBFS(curBoard, 5);
    assert.ok(solution && solution.length > 0, 'Gems solver must find solution');
    for (const step of solution) {
      const cells = document.querySelectorAll('#gemsBoardGrid .gems-cell');
      cells[step.from].click();
      cells[step.to].click();
    }
    env.flushTimers(500);
    return;
  }
}

/**
 * Verifies mid-stage localStorage persistence (`stage.savedState`), page reload
 * restoration, and completion after reload for a given `gameId`.
 */
function verifyMidStagePersistenceAndReload(gameId) {
  let env = createGauntletEnv();
  const spec = env.api.MINI_GAME_SPECS.find((s) => s.id === gameId);
  assert.ok(spec, `Mini-game spec for ${gameId} not found`);

  const freshState = env.api.createFreshRunState(env.api.getState().dateStr);
  freshState.stages[0] = {
    index: 0,
    id: spec.id,
    name: spec.name,
    shortName: spec.shortName,
    emoji: spec.emoji,
    hasBoost: true,
    turnsSpent: 0,
    bonusEarned: 0,
    turnsRemainingAfter: null,
    status: 'active'
  };
  env.api.setState(freshState);
  env.api.saveStateForActiveDate();
  env.api.mountCurrentStage();

  const puzzle = env.api.getActivePuzzle();

  if (spec.id === 'wordle') {
    const wrongWord = env.api.WORDLE_TARGETS.find((w) => w !== puzzle.targetWord);
    for (const ch of wrongWord) env.dispatchKey(ch);
    env.dispatchKey('Enter');
  } else if (spec.id === 'digits') {
    const liveTiles = puzzle.baseNumbers.map((val, idx) => ({
      val,
      hasBonus: Boolean(idx === puzzle.bonusSourceIndex)
    }));
    const steps = findDigitsSolutionSteps(liveTiles, puzzle.targetNumber);
    const firstStep = steps[0];
    const bubbles = env.document.querySelectorAll('#digitsBubblesGrid .digit-bubble');
    bubbles[firstStep.indexA].click();
    const opBtn = env.document
      .querySelectorAll('#digitsOpsRow .op-btn')
      .find((b) => b.textContent === firstStep.op);
    opBtn.click();
    env.document.querySelectorAll('#digitsBubblesGrid .digit-bubble')[firstStep.indexB].click();
  } else if (spec.id === 'reactor') {
    const cells = env.document.querySelectorAll('.reactor-grid .reactor-cell');
    cells[puzzle.scrambleMoves[0]].click();
  } else if (spec.id === 'memory') {
    env.flushTimers(1600);
    const firstSym = puzzle.shuffledSymbols[0];
    const secondIdx = puzzle.shuffledSymbols.indexOf(firstSym, 1);
    const cards = env.document.querySelectorAll('.memory-grid .memory-card');
    cards[0].click();
    env.document.querySelectorAll('.memory-grid .memory-card')[secondIdx].click();
  } else if (spec.id === 'slider') {
    const clicks = solveSliderClickPath(puzzle.tiles, env.api.getSliderNeighbors);
    env.document.querySelectorAll('#sliderGridBox .slider-tile')[clicks[0]].click();
    env.document.querySelectorAll('#sliderGridBox .slider-tile')[clicks[1]].click();
  } else if (spec.id === 'waffle') {
    const holes = new Set(puzzle.holes);
    const firstIdx = puzzle.swapGroup[0];
    const needed = puzzle.solution[firstIdx];
    let secondIdx = -1;
    for (let j = 0; j < 25; j++) {
      if (
        j !== firstIdx &&
        !holes.has(j) &&
        puzzle.board[j] !== puzzle.solution[j] &&
        puzzle.board[j] === needed
      ) {
        secondIdx = j;
        break;
      }
    }
    env.document.getElementById('waffleBoardGrid').children[firstIdx].click();
    env.document.getElementById('waffleBoardGrid').children[secondIdx].click();
  } else if (spec.id === 'traffic') {
    const bfs = env.api.solveTrafficBFS(puzzle.template);
    const move = bfs.moves[0];
    const carIdx = puzzle.template.findIndex((c) => c.id === move.id);
    env.document.querySelectorAll('#trafficGrid .traffic-car')[carIdx].click();
    const stepSign = move.steps > 0 ? 1 : -1;
    for (let s = 0; s < Math.abs(move.steps); s++) {
      env.document.getElementById(stepSign > 0 ? 'trafficPosBtn' : 'trafficNegBtn').click();
    }
  } else if (spec.id === 'morph') {
    const prevWord = puzzle.shortestPath[0];
    const nextWord = puzzle.shortestPath[1];
    const diffPos = [0, 1, 2, 3].find((i) => prevWord[i] !== nextWord[i]);
    env.document.querySelectorAll('#morphActiveWord .morph-tile')[diffPos].click();
    env.document
      .querySelectorAll('#morphKeyboard .kb-key')
      .find((k) => k.textContent === nextWord[diffPos])
      .click();
  } else if (spec.id === 'mastermind') {
    const swatches = env.document.querySelectorAll('#mmPaletteRow .mm-swatch');
    const wrongGuess = [
      puzzle.secret[0],
      puzzle.secret[1],
      puzzle.secret[3],
      puzzle.secret[2]
    ];
    for (const cid of wrongGuess) swatches[cid].click();
    env.document.getElementById('mmSubmitBtn').click();
  } else if (spec.id === 'iceslide') {
    const firstDir = puzzle.winningMoves[0].dir;
    const secondDir = puzzle.winningMoves[1].dir;
    env.document.querySelector(`.ice-dpad .dpad-btn[data-dir="${firstDir}"]`).click();
    env.document.querySelector(`.ice-dpad .dpad-btn[data-dir="${secondDir}"]`).click();
  } else if (spec.id === 'chess') {
    const bfs = env.api.solveChessBFS(puzzle.initialWhite, puzzle.initialBlack);
    const move = bfs.moves[0];
    let squares = env.document.querySelectorAll('#chessBoardGrid .chess-sq');
    squares[puzzle.initialWhite[move.whiteIdx].pos].click();
    squares = env.document.querySelectorAll('#chessBoardGrid .chess-sq');
    squares[move.dest].click();
  } else if (spec.id === 'sudoku') {
    const cellIdx = puzzle.emptyList[0];
    const val = puzzle.solution[cellIdx];
    env.document.querySelectorAll('#sudokuGridBox .sudoku-cell')[cellIdx].click();
    const btn = env.document
      .querySelectorAll('#sudokuNumpad .numpad-btn')
      .find((b) => b.textContent === String(val));
    btn.click();
  } else if (spec.id === 'mines') {
    const mineIdx = puzzle.mineIndices[0];
    env.document.querySelectorAll('#minesGridBox .mine-cell')[mineIdx].click();
  } else if (spec.id === 'knight') {
    const bfs = env.api.solveKnightBFS(puzzle.startPos, puzzle.starIndices, puzzle.rockMask);
    const nextSq = bfs.winningPath[1];
    env.document.querySelectorAll('#knightGridBox .chess-sq')[nextSq].click();
  } else if (spec.id === 'islands') {
    const activeEdge = puzzle.edges.find((e) => e.target > 0) || puzzle.edges[0];
    env.document
      .querySelector(`.bridge-slot[data-edge-id="${activeEdge.id}"]`)
      .click();
  } else if (spec.id === 'gems') {
    const firstStep = puzzle.solution[0];
    const cells = env.document.querySelectorAll('#gemsBoardGrid .gems-cell');
    cells[firstStep.from].click();
    cells[firstStep.to].click();
  }

  const savedBeforeReload = JSON.parse(
    JSON.stringify(env.api.getState().stages[0].savedState)
  );
  const turnsTextBeforeReload = env.document.getElementById('turnsRemainingValue').textContent;
  assert.ok(savedBeforeReload, `Expected ${spec.id} to persist stage.savedState`);

  // Simulate browser page reload
  env = env.reloadPage();

  assert.equal(
    env.document.getElementById('turnsRemainingValue').textContent,
    turnsTextBeforeReload,
    `Expected turnsRemainingValue to be restored after reload on ${spec.id}`
  );
  assert.deepEqual(
    env.api.getState().stages[0].savedState,
    savedBeforeReload,
    `Expected stage.savedState to be restored after reload on ${spec.id}`
  );

  // Finish solving the stage from the reloaded state
  playCurrentStageViaDOM(env);
  assert.equal(
    env.api.getState().stages[0].status,
    'cleared',
    `Expected ${spec.id} to be solvable to completion after mid-stage reload`
  );
}

module.exports = {
  createGauntletEnv,
  createMemoryStorage,
  findDigitsSolutionSteps,
  solveSliderClickPath,
  playCurrentStageViaDOM,
  verifyMidStagePersistenceAndReload
};
