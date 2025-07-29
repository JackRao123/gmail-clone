import type { Attachment } from "mailparser";
import React, { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, Eye, FileText, Forward, Reply } from "lucide-react";

import { Button } from "~/features/shared/components/ui/button";
import { useTRPC } from "~/trpc/react";

interface EmailDetailProps {
  emailId: string;
  onBack: () => void;
}

export function EmailDetail({ emailId, onBack }: EmailDetailProps) {
  const trpc = useTRPC();
  const [viewMode, setViewMode] = useState<"html" | "text">("html");
  const { data } = useSuspenseQuery(
    trpc.mail.get.queryOptions({ messageId: emailId })
  );

  const subject = data.subject;
  const from = data.from;
  const to = data.to;
  const date = data.date;
  const html = data.html;
  // const attachments: Attachment[] = data.attachments;

  return (
    <div className="flex h-full flex-col">
      {/* Header with Back button */}
      <div className="flex items-center border-b border-gray-200 p-4 dark:border-gray-700">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>

      {/* Email Content */}
      <div className="min-w-0 flex-1 overflow-auto p-4">
        {/* Email Subject */}
        <h1 className="mb-6 text-4xl leading-tight font-extrabold text-gray-900 dark:text-gray-100">
          {subject ?? "No Subject"}
        </h1>

        {/* Email Header Bar */}
        <div className="mb-8 flex w-full items-center">
          {/* Left: Avatar, From, To */}
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-300 text-lg font-medium text-gray-700 dark:bg-gray-600 dark:text-gray-300">
              {from?.charAt(0).toUpperCase() ?? "?"}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                {from ?? "Unknown Sender"}
              </div>
              <div className="truncate text-sm text-gray-500 dark:text-gray-400">
                to {to ?? "Unknown Recipient"}
              </div>
            </div>
          </div>

          {/* Right: Datetime, Reply, Forward */}
          <div className="flex flex-shrink-0 items-center gap-2">
            <span className="mr-2 text-sm text-gray-500 dark:text-gray-400">
              {date ? new Date(date).toLocaleString() : ""}
            </span>
            <Button variant="ghost" size="sm">
              <Reply className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Forward className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Email Body */}
        <iframe // iframe is 'separate document' so no parent styles will leak in.
          title="Email Detail"
          srcDoc={html}
          sandbox="
          allow-same-origin          /* so relative URLs, images, stylesheets resolve correctly */
          allow-scripts              /* only if you really need JS in the email (Gmail normally strips scripts) */
          allow-popups               /* so window.open / target=_blank works */
          allow-popups-to-escape-sandbox /* so popups aren't forced back into the iframe context */
          allow-forms                /* if the email contains forms you want to submit */
          allow-modals               /* to allow alert/confirm/dialogs, if absolutely necessary */
          allow-top-navigation-by-user-activation /* so clicking links can navigate the top-level window */
         "
          style={{
            width: "100%",
            height: "100%", // or set a fixed height
            border: "none",
          }}
        />

        {/* Attachments */}
        {/* {attachments.length > 0 && (
          <div className="mt-8 border-t border-gray-200 pt-6 dark:border-gray-700">
            <h3 className="mb-3 text-sm font-medium text-gray-900 dark:text-gray-100">
              Attachments ({attachments.length})
            </h3>
            <div className="space-y-2">
              {attachments.map((attachment, index) => {
                const filename =
                  attachment?.filename ?? `Attachment ${index + 1}`;
                const contentType = attachment.contentType;
                const size = attachment.size;
                return (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-800"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded bg-gray-200 dark:bg-gray-700">
                        <svg
                          className="h-4 w-4 text-gray-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {filename}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {contentType} •{" "}
                          {typeof size === "number"
                            ? `${Math.round(size / 1024)} KB`
                            : "Unknown size"}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )} */}
      </div>
    </div>
  );
}
