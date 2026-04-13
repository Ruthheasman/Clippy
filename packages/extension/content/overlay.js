/**
 * Blepper Content Script — Overlay Renderer
 *
 * Injected into every page. Listens for annotation commands from the
 * service worker and renders pointers, highlights, arrows, circles
 * as an overlay on top of the page content.
 */

(() => {
  'use strict';

  // Bail if already injected
  if (document.getElementById('clippy-overlay-root')) return;

  // Create overlay container
  const root = document.createElement('div');
  root.id = 'clippy-overlay-root';
  document.body.appendChild(root);

  // State
  let pointer = null;
  let highlights = [];
  let arrows = [];
  let circles = [];
  let hideTimer = null;

  // ── Parse commands from streamed text ──────────────────

  const POINT_RE = /\[POINT:(\d+),(\d+):([^\]]+)\]/g;
  const HIGHLIGHT_RE = /\[HIGHLIGHT:(\d+),(\d+),(\d+),(\d+):([^\]]+)\]/g;
  const ARROW_RE = /\[ARROW:(\d+),(\d+),(\d+),(\d+):([^\]]+)\]/g;
  const CIRCLE_RE = /\[CIRCLE:(\d+),(\d+),(\d+):([^\]]+)\]/g;

  function parseCommands(text) {
    const cmds = [];
    let m;
    for (const re of [POINT_RE, HIGHLIGHT_RE, ARROW_RE, CIRCLE_RE]) re.lastIndex = 0;

    while ((m = POINT_RE.exec(text))) cmds.push({ type: 'point', x: +m[1], y: +m[2], label: m[3] });
    while ((m = HIGHLIGHT_RE.exec(text))) cmds.push({ type: 'highlight', x: +m[1], y: +m[2], w: +m[3], h: +m[4], label: m[5] });
    while ((m = ARROW_RE.exec(text))) cmds.push({ type: 'arrow', x1: +m[1], y1: +m[2], x2: +m[3], y2: +m[4], label: m[5] });
    while ((m = CIRCLE_RE.exec(text))) cmds.push({ type: 'circle', x: +m[1], y: +m[2], r: +m[3], label: m[4] });
    return cmds;
  }

  // ── Render ─────────────────────────────────────────────

  function render() {
    let html = '';

    // Pointer
    if (pointer) {
      html += `
        <div class="clippy-pointer" style="left:${pointer.x}px;top:${pointer.y}px">
          <div class="clippy-pointer-dot"></div>
          <div class="clippy-pointer-ripple"></div>
          <div class="clippy-label" style="top:-36px;left:50%;transform:translateX(-50%)">${esc(pointer.label)}</div>
        </div>`;
    }

    // Highlights
    for (const h of highlights) {
      html += `
        <div class="clippy-highlight" style="left:${h.x}px;top:${h.y}px;width:${h.w}px;height:${h.h}px">
          ${h.label ? `<div class="clippy-label" style="top:-28px;left:0">${esc(h.label)}</div>` : ''}
        </div>`;
    }

    // Arrows (SVG)
    if (arrows.length) {
      let svgContent = `
        <defs>
          <marker id="clippy-arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#00d4ff"/>
          </marker>
        </defs>`;
      for (const a of arrows) {
        svgContent += `
          <line x1="${a.x1}" y1="${a.y1}" x2="${a.x2}" y2="${a.y2}"
                class="clippy-arrow-glow"/>
          <line x1="${a.x1}" y1="${a.y1}" x2="${a.x2}" y2="${a.y2}"
                class="clippy-arrow-line" marker-end="url(#clippy-arrowhead)"/>`;
      }
      html += `<svg class="clippy-svg-overlay">${svgContent}</svg>`;

      // Arrow labels (HTML at midpoints)
      for (const a of arrows) {
        const mx = (a.x1 + a.x2) / 2;
        const my = (a.y1 + a.y2) / 2;
        html += `<div class="clippy-label" style="position:absolute;left:${mx}px;top:${my - 24}px;transform:translateX(-50%)">${esc(a.label)}</div>`;
      }
    }

    // Circles (SVG)
    if (circles.length) {
      let svgContent = '';
      for (const c of circles) {
        const circ = 2 * Math.PI * c.r;
        svgContent += `
          <circle cx="${c.x}" cy="${c.y}" r="${c.r}" class="clippy-circle-glow"/>
          <circle cx="${c.x}" cy="${c.y}" r="${c.r}" class="clippy-circle-line"
                  stroke-dasharray="${circ}" stroke-dashoffset="${circ}"
                  style="animation:clippy-draw-circle 0.8s ease-out forwards"/>`;
      }
      html += `<svg class="clippy-svg-overlay">${svgContent}</svg>`;

      // Circle labels
      for (const c of circles) {
        html += `<div class="clippy-label" style="position:absolute;left:${c.x}px;top:${c.y - c.r - 28}px;transform:translateX(-50%)">${esc(c.label)}</div>`;
      }
    }

    root.innerHTML = html;
  }

  function clearAll() {
    pointer = null;
    highlights = [];
    arrows = [];
    circles = [];
    root.innerHTML = '';
  }

  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ── Message handling ───────────────────────────────────

  let processedCount = 0;

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'overlay-command') {
      const cmd = message.command;
      executeCommand(cmd);
      render();
    }

    if (message.type === 'chat-chunk') {
      if (message.fullText) {
        const cmds = parseCommands(message.fullText);
        const newCmds = cmds.slice(processedCount);
        processedCount = cmds.length;
        for (const cmd of newCmds) executeCommand(cmd);
        render();
      }
      if (message.done) {
        processedCount = 0;
        clearTimeout(hideTimer);
        hideTimer = setTimeout(clearAll, 6000);
      }
    }

    if (message.type === 'clear-overlay') {
      clearAll();
    }
  });

  function executeCommand(cmd) {
    clearTimeout(hideTimer);

    switch (cmd.type) {
      case 'point':
        pointer = { x: cmd.x, y: cmd.y, label: cmd.label };
        break;
      case 'highlight':
        highlights.push({ x: cmd.x, y: cmd.y, w: cmd.w || cmd.width, h: cmd.h || cmd.height, label: cmd.label });
        break;
      case 'arrow':
        arrows.push({ x1: cmd.x1, y1: cmd.y1, x2: cmd.x2, y2: cmd.y2, label: cmd.label });
        break;
      case 'circle':
        circles.push({ x: cmd.x, y: cmd.y, r: cmd.r || cmd.radius, label: cmd.label });
        break;
    }
  }
})();
