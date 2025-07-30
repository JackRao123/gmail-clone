import React from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, Forward, Reply } from "lucide-react";

import { Button } from "~/features/shared/components/ui/button";
import { useTRPC } from "~/trpc/react";

// formats the date into a string
export const formatDate = (date: Date | null) => {
  if (!date) return "";
  return new Date(date).toLocaleString();
};

// Gets a preview of who the message is from
export const getSenderDisplay = (from: string | null): string => {
  if (!from) return "Unknown";

  // Try to capture the display name before the angle‑bracketed address
  const nameMatch = /^([^<]+)<([^>]+)>$/.exec(from);
  if (nameMatch?.[1]) {
    return nameMatch[1].trim();
  }

  // If that fails, see if the entire string is just an email address
  const emailMatch = /^([^@]+@[^@]+)$/.exec(from);
  if (emailMatch?.[1]) {
    return emailMatch[1];
  }

  // Fallback to returning the raw `from` string
  return from;
};

// Auto-resizing iframe component to eliminate inner scrollbars
function EmailFrame({ html }: { html: string }) {
  const onLoad = (e: React.SyntheticEvent<HTMLIFrameElement>) => {
    const iframe = e.currentTarget;
    const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
    if (doc) {
      // hide internal scrollbars
      doc.documentElement.style.overflow = "hidden";
      doc.body.style.margin = "0";
      doc.body.style.overflow = "hidden";
      // adjust height to content
      const height = Math.max(
        doc.documentElement.scrollHeight,
        doc.body.scrollHeight
      );
      iframe.style.height = height + "px";
    }
  };

  return (
    <iframe
      title="email"
      srcDoc={html}
      sandbox={`allow-same-origin
         allow-popups
         allow-forms
         allow-scripts
         allow-popups-to-escape-sandbox
         allow-top-navigation-by-user-activation`}
      style={{
        width: "100%",
        border: "none",
        overflow: "hidden",
      }}
      // scrolling="no"
      onLoad={onLoad}
    />
  );
}

interface ThreadDetailProps {
  threadId: string;
  onBack: () => void;
}
export function ThreadDetail({ threadId, onBack }: ThreadDetailProps) {
  const trpc = useTRPC();
  const { data: threadEmails } = useSuspenseQuery(
    trpc.mail.get_thread_emails.queryOptions({ threadId })
  );

  return (
    <div className="flex h-full flex-col">
      {/* Header with Back button */}
      <div className="flex items-center border-b border-gray-200 p-4 dark:border-gray-700">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>

      {/* Thread messages rendered inline */}
      <div className="flex-1 space-y-6 overflow-auto p-4">
        {threadEmails.map((email) => (
          <div key={email.messageId} className="thread-message">
            <div className="border-b border-gray-200 pb-4 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {getSenderDisplay(email.from)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDate(email.date)}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm">
                    <Reply className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Forward className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {email.subject && (
                <h4 className="mt-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {email.subject}
                </h4>
              )}
            </div>

            <EmailFrame html={email.html} />
          </div>
        ))}
      </div>
    </div>
  );
}
