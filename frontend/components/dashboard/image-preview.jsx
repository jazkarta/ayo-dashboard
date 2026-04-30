"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Download, X, RotateCcw } from "lucide-react";

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.1;

function downloadAttachment(attachment) {
  const link = document.createElement("a");
  link.href = attachment.url;
  link.download = attachment.filename || "download";
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export default function ImagePreview({ attachment, onClose }) {
  const [zoom, setZoom] = useState(1);
  const overlayRef = useRef(null);
  const isAtDefaultZoom = Math.abs(zoom - 1) < 0.001;

  const close = useCallback(() => {
    setZoom(1);
    onClose();
  }, [onClose]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [close]);

  useEffect(() => {
    const el = overlayRef.current;
    if (!el) return;
    const handleWheel = (e) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
      setZoom((z) => Math.min(Math.max(z + delta, MIN_ZOOM), MAX_ZOOM));
    };
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label="Image preview"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={close}
    >
      <div
        className="fixed top-3 right-3 z-10 flex gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center px-2 text-xs text-white bg-black/40 rounded-md">
          {Math.round(zoom * 100)}%
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setZoom(1)}
          disabled={isAtDefaultZoom}
        >
          <RotateCcw className="h-4 w-4 mr-1" />
          Reset
        </Button>
        <Button size="sm" variant="secondary" onClick={() => downloadAttachment(attachment)}>
          <Download className="h-4 w-4 mr-1" />
          Download
        </Button>
        <Button size="sm" variant="secondary" onClick={close} aria-label="Close preview">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div onClick={(e) => e.stopPropagation()} className="overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={attachment.url}
          alt={attachment.filename}
          draggable={false}
          style={{ transform: `scale(${zoom})`, transformOrigin: "center" }}
          className="max-h-[90vh] max-w-[90vw] rounded-md object-contain transition-transform duration-100 select-none"
        />
      </div>
    </div>
  );
}
