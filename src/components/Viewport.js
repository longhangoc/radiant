import React, { useEffect, useRef, useState, useCallback } from 'react';
import cornerstone from 'cornerstone-core';
import cornerstoneTools from 'cornerstone-tools';
import cornerstoneMath from 'cornerstone-math';
import Hammer from 'hammerjs';
import cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader';
import dicomParser from 'dicom-parser';

// ─── One-time Cornerstone Init ───────────────────────────────────────────────
let csInitialized = false;
function initCS() {
  if (csInitialized) return;
  csInitialized = true;
  cornerstoneTools.external.cornerstone     = cornerstone;
  cornerstoneTools.external.Hammer          = Hammer;
  cornerstoneTools.external.cornerstoneMath = cornerstoneMath;
  cornerstoneWADOImageLoader.external.cornerstone  = cornerstone;
  cornerstoneWADOImageLoader.external.dicomParser  = dicomParser;

  cornerstoneWADOImageLoader.webWorkerManager.initialize({
    maxWebWorkers: Math.max((navigator.hardwareConcurrency || 2) - 1, 1),
    startWebWorkersOnDemand: true,
    taskConfiguration: {
      decodeTask: { initializeCodecsOnStartup: false, strict: false },
    },
  });

  cornerstoneTools.init({ showSVGCursors: true });
}

// ─── Tool management ─────────────────────────────────────────────────────────
const addedToolNames = new Set();
function safeAddTool(ToolClass) {
  if (!addedToolNames.has(ToolClass.name)) {
    cornerstoneTools.addTool(ToolClass);
    addedToolNames.add(ToolClass.name);
  }
}

function setupTools() {
  // NOTE: Do NOT add ZoomMouseWheelTool — it conflicts with our manual wheel scroll
  safeAddTool(cornerstoneTools.WwwcTool);
  safeAddTool(cornerstoneTools.PanTool);
  safeAddTool(cornerstoneTools.ZoomTool);
  safeAddTool(cornerstoneTools.LengthTool);
  safeAddTool(cornerstoneTools.AngleTool);
  safeAddTool(cornerstoneTools.EraserTool);
}

function applyToolActive(activeTool) {
  const all = ['Wwwc', 'Pan', 'Zoom', 'Length', 'Angle'];
  all.forEach(t => { try { cornerstoneTools.setToolPassive(t); } catch (_) {} });

  const toolName = all.includes(activeTool) ? activeTool : 'Wwwc';
  cornerstoneTools.setToolActive(toolName, { mouseButtonMask: 1 });

  // Middle-click = Pan, Right-click = Zoom (always on)
  try { cornerstoneTools.setToolActive('Pan',  { mouseButtonMask: 4 }); } catch (_) {}
  try { cornerstoneTools.setToolActive('Zoom', { mouseButtonMask: 2 }); } catch (_) {}
}

// ─── Viewport Component ───────────────────────────────────────────────────────
const Viewport = ({ activeTool, series, objectUrlMap }) => {
  const elementRef  = useRef(null);
  const enabledRef  = useRef(false);
  const stackRef    = useRef({ currentImageIdIndex: 0, imageIds: [] });
  const loadingRef  = useRef(false);   // prevent concurrent slice loads

  const [overlay, setOverlay] = useState({
    ww: '—', wl: '—', zoom: '—', slice: 1, total: 0,
    patientName: '', modality: '', studyDate: '', seriesDesc: '',
  });

  // Build wadouri imageIds from parsed series
  const buildImageIds = useCallback((s) => {
    if (!s?.instances?.length) return [];
    return s.instances
      .map(inst => {
        const url = objectUrlMap[inst.sopUID];
        return url ? `wadouri:${url}` : null;
      })
      .filter(Boolean);
  }, [objectUrlMap]);

  // Display a specific slice by index
  const showSlice = useCallback((el, imageIds, idx) => {
    if (loadingRef.current) return;
    const clamped = Math.max(0, Math.min(imageIds.length - 1, idx));
    if (clamped === stackRef.current.currentImageIdIndex && enabledRef.current) {
      // Only skip if it's exactly the same index and already displayed
    }
    stackRef.current.currentImageIdIndex = clamped;
    loadingRef.current = true;
    cornerstone.loadAndCacheImage(imageIds[clamped])
      .then(image => {
        cornerstone.displayImage(el, image);
        setOverlay(prev => ({ ...prev, slice: clamped + 1 }));
      })
      .catch(e => console.error('[Viewport] slice load error', e))
      .finally(() => { loadingRef.current = false; });
  }, []);

  // ── Init element (once) ──────────────────────────────────────────────────
  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    initCS();
    setupTools();

    if (!enabledRef.current) {
      cornerstone.enable(el);
      enabledRef.current = true;
    }

    // Update WW/WL / zoom overlays on every render event
    const onRendered = () => {
      try {
        const vp = cornerstone.getViewport(el);
        if (!vp) return;
        setOverlay(prev => ({
          ...prev,
          ww:   Math.round(vp.voi.windowWidth),
          wl:   Math.round(vp.voi.windowCenter),
          zoom: Math.round(vp.scale * 100),
        }));
      } catch (_) {}
    };
    el.addEventListener('cornerstoneimagerendered', onRendered);

    // ── Manual wheel scroll: deltaY > 0 → next slice, < 0 → previous slice ──
    const onWheel = (e) => {
      e.preventDefault();
      const { imageIds, currentImageIdIndex } = stackRef.current;
      if (imageIds.length <= 1) return;
      const delta = e.deltaY > 0 ? 1 : -1;
      showSlice(el, imageIds, currentImageIdIndex + delta);
    };
    // passive:false so we can preventDefault
    el.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      el.removeEventListener('cornerstoneimagerendered', onRendered);
      el.removeEventListener('wheel', onWheel);
      if (enabledRef.current) {
        try { cornerstone.disable(el); } catch (_) {}
        enabledRef.current = false;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Load new series ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!series || !enabledRef.current) return;
    const el = elementRef.current;

    const imageIds = buildImageIds(series);
    if (!imageIds.length) {
      console.error('[Viewport] No imageIds for series', series.seriesUID);
      return;
    }

    // Reset stack
    stackRef.current = { currentImageIdIndex: 0, imageIds };
    loadingRef.current = false;

    setOverlay(prev => ({
      ...prev,
      patientName: series.patientName || '',
      modality:    series.modality    || '',
      studyDate:   series.studyDate   || '',
      seriesDesc:  series.seriesDesc  || '',
      slice: 1,
      total: imageIds.length,
    }));

    cornerstone.loadAndCacheImage(imageIds[0])
      .then(image => {
        cornerstone.displayImage(el, image);
        // Pre-cache next few slices in the background
        imageIds.slice(1, 5).forEach(id => cornerstone.loadAndCacheImage(id).catch(() => {}));
        applyToolActive(activeTool);
      })
      .catch(e => console.error('[Viewport] first image load error', e));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series]);

  // ── Switch active tool ────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabledRef.current || !addedToolNames.has('WwwcTool')) return;
    applyToolActive(activeTool);
  }, [activeTool]);

  // ── Keyboard navigation ───────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      const el = elementRef.current;
      if (!el || !enabledRef.current) return;
      const { imageIds, currentImageIdIndex } = stackRef.current;
      if (!imageIds.length) return;
      let delta = 0;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') delta = 1;
      if (e.key === 'ArrowUp'   || e.key === 'ArrowLeft')  delta = -1;
      if (delta !== 0) showSlice(el, imageIds, currentImageIdIndex + delta);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showSlice]);

  const jumpToSlice = (val) => {
    const el = elementRef.current;
    if (!el || !enabledRef.current) return;
    showSlice(el, stackRef.current.imageIds, val - 1);
  };

  const { slice, total } = overlay;

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#000' }}>
      {/* Cornerstone rendering element */}
      <div
        ref={elementRef}
        style={{ position: 'absolute', inset: 0, cursor: 'crosshair' }}
        onContextMenu={e => e.preventDefault()}
      />

      {/* ── Top-left overlay ─────────────────────────────────────── */}
      <div className="overlay-text" style={{ top: 10, left: 12, pointerEvents: 'none' }}>
        <div style={{ fontWeight: 700 }}>{overlay.patientName || 'RadiAnt Web'}</div>
        {overlay.modality   && <div>Modality: {overlay.modality}</div>}
        {overlay.seriesDesc && <div style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{overlay.seriesDesc}</div>}
      </div>

      {/* ── Top-right overlay ────────────────────────────────────── */}
      <div className="overlay-text" style={{ top: 10, right: 12, textAlign: 'right', pointerEvents: 'none' }}>
        {overlay.studyDate && <div>Date: {overlay.studyDate}</div>}
      </div>

      {/* ── Bottom-left overlay ──────────────────────────────────── */}
      <div className="overlay-text" style={{ bottom: 10, left: 12, pointerEvents: 'none' }}>
        <div>Zoom: {overlay.zoom}%</div>
        <div>Im: {slice}/{total}</div>
      </div>

      {/* ── Bottom-right overlay ─────────────────────────────────── */}
      <div className="overlay-text" style={{ bottom: 10, right: 56, textAlign: 'right', pointerEvents: 'none' }}>
        <div>WW: {overlay.ww}  WL: {overlay.wl}</div>
      </div>

      {/* ── Active tool badge ────────────────────────────────────── */}
      <div style={{
        position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)',
        background: 'rgba(0,120,212,0.85)', color: '#fff', padding: '2px 14px',
        borderRadius: 3, fontSize: 11, fontFamily: 'monospace', pointerEvents: 'none',
      }}>
        {activeTool}
      </div>

      {/* ── Vertical slice slider (right edge) ───────────────────── */}
      {total > 1 && (
        <div style={{
          position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        }}>
          <input
            type="range"
            min={1}
            max={total}
            value={slice}
            onChange={e => jumpToSlice(parseInt(e.target.value, 10))}
            style={{
              writingMode: 'vertical-lr',
              direction: 'rtl',
              height: '200px',
              cursor: 'ns-resize',
              accentColor: '#0078d4',
            }}
          />
          <span style={{ color: '#90ee90', fontSize: 10, fontFamily: 'monospace' }}>
            {slice}
          </span>
        </div>
      )}
    </div>
  );
};

export default Viewport;
