import React, { useCallback, useMemo, useState } from "react";
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
function EmailFrame({ html, forwarded }: { html: string; forwarded: boolean }) {
  // This is to resize the iframe so it takes up full size and there is no scrollbars
  const onLoad = useCallback((e: React.SyntheticEvent<HTMLIFrameElement>) => {
    const iframe = e.currentTarget;
    const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
    if (doc) {
      // hide internal scrollbars
      doc.documentElement.style.overflow = "hidden";
      doc.body.style.margin = "0";
      doc.body.style.padding = "0";
      doc.body.style.overflow = "hidden";

      // adjust height to content
      const height = Math.max(
        doc.documentElement.scrollHeight,
        doc.body.scrollHeight
      );
      iframe.style.height = height + "px";
    }
  }, []);

  // parse the provided html into the main message, and the quoted content
  const { mainContent, quoteBlock } = useMemo(() => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const quoteElement = doc.querySelector(".gmail_quote");
    const quoteBlock = quoteElement?.outerHTML ?? null;

    // Remove the quote from the main content
    if (quoteElement) {
      quoteElement.remove();
    }
    const mainContent = doc.documentElement.outerHTML;

    // // check for if email is forwarded
    // // if maincontent looks something like this for example `<html><head></head><body><div dir="ltr"><br><br></div></body></html>`
    // const stripped = mainContent
    //   .replace(/<br\s*\/?>/gi, "") // remove <br> or <br/>
    //   .replace(/<[^>]+>/g, "") // remove any other tags
    //   .trim();
    // if (stripped.length === 0) {
    //   return { mainContent: html, quoteBlock: null };
    // }

    if (forwarded) {
      return { mainContent: html, quoteBlock: null };
    }

    return { mainContent, quoteBlock };
  }, [html, forwarded]);

  const [showQuote, setShowQuote] = useState(false);

  return (
    <div>
      {/* Iframe necessary for parent styles to not interfere with email HTML */}
      <iframe
        title="email"
        srcDoc={mainContent}
        onLoad={onLoad}
        sandbox={`
        allow-same-origin
        allow-popups
        allow-forms
        allow-scripts
        allow-popups-to-escape-sandbox
        allow-top-navigation-by-user-activation
      `}
        className="w-full border-none"
      />
      {quoteBlock && (
        <div className="mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowQuote(!showQuote)}
            className="mb-2"
          >
            {showQuote ? "Hide" : "Show"} quoted content
          </Button>
          {showQuote && (
            <div
              className="border-l-4 border-gray-300 bg-gray-50 py-2 pl-4 dark:border-gray-600 dark:bg-gray-800"
              dangerouslySetInnerHTML={{ __html: quoteBlock }}
            />
          )}
        </div>
      )}
    </div>
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
            {email.subject && (
              <h4 className="mt-2 text-xl font-semibold text-gray-900 dark:text-gray-100">
                {email.subject}
              </h4>
            )}
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
            </div>

            <EmailFrame
              html={email.html}
              forwarded={email.subject?.startsWith("Fwd:") ?? false}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
