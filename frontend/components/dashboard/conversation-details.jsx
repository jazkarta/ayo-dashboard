"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Download, X, RotateCcw, FileDown } from "lucide-react";
import toast from "react-hot-toast";
import conversationService from "@/services/conversationService";

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.1;

function downloadBlob(blob, filename) {
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(blobUrl);
}

function parseFilename(disposition, fallback) {
  if (!disposition) return fallback;
  const utf8 = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8) return decodeURIComponent(utf8[1].trim());
  const quoted = disposition.match(/filename="((?:[^"\\]|\\.)+)"/i);
  if (quoted) return quoted[1].replace(/\\(.)/g, "$1");
  const plain = disposition.match(/filename=([^;]+)/i);
  if (plain) return plain[1].trim();
  return fallback;
}

async function readBlobMessage(blob) {
  if (!blob || typeof blob.text !== "function") return null;
  try {
    const text = await blob.text();
    if (!text) return null;
    try {
      const parsed = JSON.parse(text);
      return parsed?.detail || parsed?.message || parsed?.error || null;
    } catch {
      return text.length < 300 ? text : null;
    }
  } catch {
    return null;
  }
}

export default function ConversationDetails({ id }) {
  const [details, setDetails] = useState({
    title: "",
    results: [],
    pagination: { count: 0, next: null, previous: null },
  });
  const [currentUrl, setCurrentUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [exporting, setExporting] = useState(false);
  const overlayRef = useRef(null);

  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  const isAtDefaultZoom = Math.abs(zoom - 1) < 0.001;

  useEffect(() => {
    let cancelled = false;
    const fetchDetails = async () => {
      try {
        const response = await conversationService.getConversationDetails(id, currentUrl);
        if (cancelled) return;
        setDetails({
          title: response.data?.title || "",
          results: response.data?.results || [],
          pagination: {
            count: response.data?.count || 0,
            next: response.data?.next || null,
            previous: response.data?.previous || null,
          },
        });
      } catch {
        if (cancelled) return;
        toast.error("Failed to load conversation details. Please try again.");
        setDetails({
          title: "",
          results: [],
          pagination: { count: 0, next: null, previous: null },
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchDetails();
    return () => {
      cancelled = true;
    };
  }, [currentUrl, id]);

  const openPreview = useCallback((attachment) => {
    setZoom(1);
    setPreview(attachment);
  }, []);

  const closePreview = useCallback(() => {
    setPreview(null);
    setZoom(1);
  }, []);

  useEffect(() => {
    if (!preview) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [preview]);

  useEffect(() => {
    if (!preview) return;
    const handleKey = (e) => {
      if (e.key === "Escape") closePreview();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [preview, closePreview]);

  useEffect(() => {
    if (!preview) return;
    const el = overlayRef.current;
    if (!el) return;
    const handleWheel = (e) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
      setZoom((z) => Math.min(Math.max(z + delta, MIN_ZOOM), MAX_ZOOM));
    };
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [preview]);

  const handleDownload = async (attachment) => {
    try {
      const res = await fetch(attachment.url, { cache: "reload" });
      const blob = await res.blob();
      downloadBlob(blob, attachment.filename || "download");
    } catch {
      toast.error("Failed to download image.");
    }
  };

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const response = await conversationService.exportConversation(id);
      const blob = response.data;
      const contentType = (response.headers?.["content-type"] || "").toLowerCase();
      const isCsv = contentType.includes("csv") || contentType.includes("octet-stream");

      if (!blob || blob.size === 0 || !isCsv) {
        const message = await readBlobMessage(blob);
        toast.error(message || "No data to export.");
        return;
      }

      const filename = parseFilename(
        response.headers?.["content-disposition"],
        `conversation-${id}.csv`,
      );
      downloadBlob(blob, filename);
    } catch (err) {
      const message = await readBlobMessage(err?.response?.data);
      toast.error(message || "Failed to export conversation. Please try again.");
    } finally {
      setExporting(false);
    }
  }, [id]);

  const goToUrl = (rawUrl) => {
    if (!rawUrl) return;
    const path = baseUrl ? rawUrl.replace(baseUrl, "") : rawUrl;
    setLoading(true);
    setCurrentUrl(path);
  };

  return (
    <>
      <div className="mx-5 mt-5 flex items-center justify-between">
        <Link href="/dashboard/conversations">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </Link>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={exporting}
        >
          {exporting ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <FileDown className="h-4 w-4 mr-1" />
          )}
          Export
        </Button>
      </div>

      <Card className="m-5">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <CardTitle>{details.title}</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-2 gap-4 px-3 pb-2 border-b text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <div>Prompt</div>
            <div>Response</div>
          </div>

          {loading ? (
            <div className="h-24 flex items-center justify-center">
              <Loader2 className="animate-spin h-8 w-8" />
            </div>
          ) : details.results.length === 0 ? (
            <div className="h-24 flex items-center justify-center text-muted-foreground">
              No messages found.
            </div>
          ) : (
            <div className="flex flex-col gap-4 pt-3">
              {details.results.map((item) => (
                <div key={item.id} className="border rounded-md">
                  <div className="grid grid-cols-2 gap-4 p-3">
                    <div className="flex flex-col gap-3 rounded-md border p-3 bg-muted/20">
                      {item.prompt && (
                        <p className="text-sm whitespace-pre-wrap">{item.prompt}</p>
                      )}
                      {item.attachments?.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {item.attachments.map((attachment) => {
                            const isImage = attachment.type?.startsWith("image/");
                            return isImage ? (
                              <button
                                key={attachment.id}
                                type="button"
                                onClick={() => openPreview(attachment)}
                                className="block focus:outline-none focus:ring-2 focus:ring-ring rounded-md"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={attachment.url}
                                  alt={attachment.filename}
                                  className="h-48 w-48 rounded-md border object-cover cursor-pointer"
                                />
                              </button>
                            ) : (
                              <a
                                key={attachment.id}
                                href={attachment.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 underline"
                              >
                                {attachment.filename}
                              </a>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <div className="rounded-md border p-3 bg-muted/20">
                      <p className="text-sm whitespace-pre-wrap">{item.response || ""}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 ml-3 flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm text-muted-foreground">
              Showing {details.results.length} of {details.pagination.count} messages
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => goToUrl(details.pagination.previous)}
                disabled={!details.pagination.previous}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => goToUrl(details.pagination.next)}
                disabled={!details.pagination.next}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {preview && (
        <div
          ref={overlayRef}
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={closePreview}
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
            <Button size="sm" variant="secondary" onClick={() => handleDownload(preview)}>
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
            <Button size="sm" variant="secondary" onClick={closePreview} aria-label="Close preview">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div onClick={(e) => e.stopPropagation()} className="overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview.url}
              alt={preview.filename}
              draggable={false}
              style={{ transform: `scale(${zoom})`, transformOrigin: "center" }}
              className="max-h-[90vh] max-w-[90vw] rounded-md object-contain transition-transform duration-100 select-none"
            />
          </div>
        </div>
      )}
    </>
  );
}
