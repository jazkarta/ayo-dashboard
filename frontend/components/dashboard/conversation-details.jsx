"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import conversationService from "@/services/conversationService";

export default function ConversationDetails({ id }) {
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({ count: 0, next: null, previous: null });
  const [currentUrl, setCurrentUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  const baseUrl = process.env.NEXT_PUBLIC_API_URL;

  const fetchDetails = async (url = null) => {
    setLoading(true);
    try {
      const response = await conversationService.getConversationDetails(id, url);
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

  useEffect(() => {
    fetchDetails(currentUrl);
  }, [currentUrl, id]);

  return (
    <Card className="m-5">
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/conversations">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </Link>
          <CardTitle>Conversation Details</CardTitle>
        </div>
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
                  <Textarea
                    value={item.prompt || ""}
                    readOnly
                    className="min-h-32 resize-y"
                  />
                  <Textarea
                    value={item.response || ""}
                    readOnly
                    className="min-h-32 resize-y"
                  />
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
              onClick={() => {
                if (pagination.previous) {
                  const path = pagination.previous.replace(baseUrl, "");
                  setCurrentUrl(path);
                }
              }}
              disabled={!pagination.previous}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (pagination.next) {
                  const path = pagination.next.replace(baseUrl, "");
                  setCurrentUrl(path);
                }
              }}
              disabled={!pagination.next}
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
