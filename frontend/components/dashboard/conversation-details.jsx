"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  Loader2,
  ArrowLeft,
  Download,
  SearchX,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import toast from "react-hot-toast";
import conversationService from "@/services/conversationService";
import ImagePreview from "./image-preview";

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

const EMPTY_DETAILS = {
  title: "",
  conversation_id: "",
  is_deleted: false,
  results: [],
  pagination: { count: 0, next: null, previous: null },
};

export default function ConversationDetails({ id }) {
  const [details, setDetails] = useState(EMPTY_DETAILS);
  const [pageUrl, setPageUrl] = useState(null);
  const [status, setStatus] = useState("loading");
  const [errorKind, setErrorKind] = useState(null);
  const [retryToken, setRetryToken] = useState(0);
  const [preview, setPreview] = useState(null);
  const [exporting, setExporting] = useState(false);

  const baseUrl = process.env.NEXT_PUBLIC_API_URL;

  const [prevId, setPrevId] = useState(id);
  const idChanged = prevId !== id;
  if (idChanged) {
    setPrevId(id);
    setPageUrl(null);
  }
  const effectivePageUrl = idChanged ? null : pageUrl;

  const fetchKey = `${id}|${effectivePageUrl ?? ""}|${retryToken}`;
  const [trackedFetchKey, setTrackedFetchKey] = useState(fetchKey);
  if (trackedFetchKey !== fetchKey) {
    setTrackedFetchKey(fetchKey);
    setStatus("loading");
  }

  useEffect(() => {
    let cancelled = false;
    const fetchDetails = async () => {
      try {
        const response = await conversationService.getConversationDetails(id, pageUrl);
        if (cancelled) return;
        setDetails({
          title: response.data?.title || "",
          conversation_id: response.data?.conversation_id || "",
          is_deleted: response.data?.is_deleted || false,
          results: response.data?.results || [],
          pagination: {
            count: response.data?.count || 0,
            next: response.data?.next || null,
            previous: response.data?.previous || null,
          },
        });
        setStatus("success");
      } catch (err) {
        if (cancelled) return;
        const status = err?.response?.status;
        const data = err?.response?.data;
        const message =
          (typeof data === "string" && data) ||
          data?.detail ||
          data?.message ||
          data?.error ||
          err?.message ||
          "Failed to load conversation details. Please try again.";
        if (status !== 404) {
          console.error("Failed to load conversation details:", err);
        }
        toast.error(status === 404 ? `Conversation ${message}` : message);
        setDetails(EMPTY_DETAILS);
        setErrorKind(status === 404 ? "not-found" : "generic");
        setStatus("error");
      }
    };
    fetchDetails();
    return () => {
      cancelled = true;
    };
  }, [id, pageUrl, retryToken]);

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
    setPageUrl(path);
  };

  const retry = () => setRetryToken((t) => t + 1);

  if (status === "error") {
    return (
      <ErrorState kind={errorKind} onRetry={retry} />
    );
  }

  return (
    <>
      <div className="mx-5 mt-5 flex items-center justify-between">
        <Link href="/dashboard/conversations">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </Link>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={handleExport}
                disabled={exporting || status === "loading"}
                className="gap-2 h-9 bg-black text-white hover:bg-black/85"
              >
                {exporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Export
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-white text-black border">
              Export as CSV
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <Card className="m-5">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className={!details.title ? "font-mono text-base" : ""}>
              {details.title || details.conversation_id || "-"}
            </CardTitle>
            {details.is_deleted && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-600">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                Deleted
              </span>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {status === "loading" ? (
            <div className="h-64 flex items-center justify-center">
              <Loader2 className="animate-spin h-8 w-8" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 px-3 pb-2 border-b text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <div>Prompt</div>
                <div>Response</div>
              </div>

              {details.results.length === 0 ? (
                <div className="h-24 flex items-center justify-center text-muted-foreground">
                  No messages found.
                </div>
              ) : (
                <div className="flex flex-col gap-4 pt-3">
                  {details.results.map((item) => (
                    <MessageRow
                      key={item.id}
                      item={item}
                      onPreview={setPreview}
                    />
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
            </>
          )}
        </CardContent>
      </Card>

      {preview && (
        <ImagePreview attachment={preview} onClose={() => setPreview(null)} />
      )}
    </>
  );
}

function MessageRow({ item, onPreview }) {
  return (
    <div className="border rounded-md">
      <div className="grid grid-cols-2 gap-4 p-3">
        <div className="flex flex-col gap-3 rounded-md border p-3 bg-muted/20 max-h-96 overflow-y-auto">
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
                    onClick={() => onPreview(attachment)}
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
        <div className="rounded-md border p-3 bg-muted/20 max-h-96 overflow-y-auto">
          <p className="text-sm whitespace-pre-wrap">{item.response || ""}</p>
        </div>
      </div>
    </div>
  );
}

function ErrorState({ kind, onRetry }) {
  const isNotFound = kind === "not-found";
  const Icon = isNotFound ? SearchX : AlertTriangle;
  const title = isNotFound ? "No Conversation found" : "Something went wrong";
  const description = isNotFound
    ? "We couldn't find the conversation you're looking for. It may have been removed, or the link is invalid."
    : "We couldn't load this conversation. Check your connection and try again.";

  return (
    <Card className="m-5">
      <CardContent className="py-20">
        <div className="flex flex-col items-center justify-center text-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
            <Icon className="h-10 w-10 text-muted-foreground" />
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
          </div>
          <div className="flex gap-2">
            {!isNotFound && (
              <Button size="sm" onClick={onRetry}>
                <RotateCcw className="h-4 w-4 mr-1" />
                Try again
              </Button>
            )}
            <Link href="/dashboard/conversations">
              <Button size="sm" variant="outline">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to conversations
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
