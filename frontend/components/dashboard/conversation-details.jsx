"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Download, X, RotateCcw } from "lucide-react";
import toast from "react-hot-toast";
import conversationService from "@/services/conversationService";

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.1;

export default function ConversationDetails({ id }) {
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({ count: 0, next: null, previous: null });
  const [currentUrl, setCurrentUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [zoom, setZoom] = useState(1);
  const overlayRef = useRef(null);

  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  const isAtDefaultZoom = Math.abs(zoom - 1) < 0.001;

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      try {
        const response = await conversationService.getConversationDetails(id, currentUrl);
        setData(response.data?.results || []);
        setPagination({
          count: response.data?.count || 0,
          next: response.data?.next || null,
          previous: response.data?.previous || null,
        });
      } catch {
        toast.error("Failed to load conversation details. Please try again.");
        setData([]);
        setPagination({ count: 0, next: null, previous: null });
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
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
      const res = await fetch(attachment.url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = attachment.filename || "download";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch {
      toast.error("Failed to download image.");
    }
  };

  const goToUrl = (rawUrl) => {
    if (!rawUrl) return;
    const path = baseUrl ? rawUrl.replace(baseUrl, "") : rawUrl;
    setCurrentUrl(path);
  };

  return (
    <>
      <div className="mx-5 mt-5">
        <Link href="/dashboard/conversations">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </Link>
      </div>

      <Card className="m-5">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <CardTitle>Conversation Details</CardTitle>
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
          ) : data.length === 0 ? (
            <div className="h-24 flex items-center justify-center text-muted-foreground">
              No messages found.
            </div>
          ) : (
            <div className="flex flex-col gap-4 pt-3">
              {data.map((item) => (
                <div key={item.id} className="border rounded-md">
                  <div className="px-3 py-2 border-b bg-muted/40 text-sm font-medium">
                    Chat object ({item.id})
                  </div>
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
              Showing {data.length} of {pagination.count} messages
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => goToUrl(pagination.previous)}
                disabled={!pagination.previous}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => goToUrl(pagination.next)}
                disabled={!pagination.next}
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
