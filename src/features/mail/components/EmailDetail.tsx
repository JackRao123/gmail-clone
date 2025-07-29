import React from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, Forward, Reply } from "lucide-react";

import { Button } from "~/features/shared/components/ui/button";
import { useTRPC } from "~/trpc/react";

interface EmailDetailProps {
  emailId: string;
  onBack: () => void;
}

export function EmailDetail({ emailId, onBack }: EmailDetailProps) {
  const trpc = useTRPC();
  const { data } = useSuspenseQuery(
    trpc.mail.get.queryOptions({ messageId: emailId })
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

      {/* Email Content */}
      <div className="min-w-0 flex-1 overflow-auto p-4">
        {/* Email Subject */}
        <h1 className="mb-6 text-4xl leading-tight font-extrabold text-gray-900 dark:text-gray-100">
          {data.subject || "No Subject"}
        </h1>

        {/* Email Header Bar */}
        <div className="mb-8 flex w-full items-center">
          {/* Left: Avatar, From, To */}
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-300 text-lg font-medium text-gray-700 dark:bg-gray-600 dark:text-gray-300">
              {data.from?.charAt(0).toUpperCase() || "?"}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                {data.from || "Unknown Sender"}
              </div>
              <div className="truncate text-sm text-gray-500 dark:text-gray-400">
                to {data.to || "Unknown Recipient"}
              </div>
            </div>
          </div>

          {/* Right: Datetime, Reply, Forward */}
          <div className="flex flex-shrink-0 items-center gap-2">
            <span className="mr-2 text-sm text-gray-500 dark:text-gray-400">
              {data.date ? new Date(data.date).toLocaleString() : ""}
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
        <div className="prose prose-gray dark:prose-invert max-w-none">
          <div className="leading-relaxed whitespace-pre-wrap text-gray-900 dark:text-gray-100">
            {data.text || "No content available"}
          </div>
        </div>

        {/* Attachments */}
        {data.attachments && data.attachments.length > 0 && (
          <div className="mt-8 border-t border-gray-200 pt-6 dark:border-gray-700">
            <h3 className="mb-3 text-sm font-medium text-gray-900 dark:text-gray-100">
              Attachments ({data.attachments.length})
            </h3>
            <div className="space-y-2">
              {data.attachments.map((attachment, index) => (
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
                        {attachment.filename || `Attachment ${index + 1}`}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {attachment.contentType} •{" "}
                        {attachment.size
                          ? `${Math.round(attachment.size / 1024)} KB`
                          : "Unknown size"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
