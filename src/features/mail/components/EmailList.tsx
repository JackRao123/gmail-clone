import type { EmailMetaData } from "~/server/api/routers/mail";
import React, { Suspense, useState } from "react";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";

import ProfileMenu, { MenuOpenDirection } from "~/app/_components/ProfileMenu";
import { LoadingSpinner } from "~/features/shared/components/LoadingSpinner";
import { Input } from "~/features/shared/components/ui/input";
import { cn } from "~/lib/utils";
import { useTRPC } from "~/trpc/react";

interface EmailListProps {
  selectedEmailId?: string;
  onEmailSelect: (emailId: string) => void;
}

interface EmailItemProps {
  email: EmailMetaData;
  isSelected: boolean;
  onSelect: () => void;
}

function EmailItem({ email, isSelected, onSelect }: EmailItemProps) {
  return (
    <div
    
      className={cn(
        "flex cursor-pointer items-center space-x-4 border-b border-gray-100 p-4 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800",
        isSelected &&
          "border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-900/20"
      )}
      onClick={onSelect}
    >

      <div className="flex-shrink-0">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-300 text-sm font-medium text-gray-700 dark:bg-gray-600 dark:text-gray-300">
          {email.from?.charAt(0).toUpperCase() ?? "?"}
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
            {email.from ?? "Unknown"}
          </p>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {email.date ? new Date(email.date).toLocaleDateString() : ""}
          </span>
        </div>
        <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
          {email.subject ?? "No subject"}
           
        </p>
        <p className="truncate text-sm text-gray-600 dark:text-gray-300">
          {/* Note: We don't have text preview in the list view anymore */}
          Click to view email content
         </p>
      </div>
    </div>
  );
}

export function EmailList({ selectedEmailId, onEmailSelect }: EmailListProps) {
  const trpc = useTRPC();
  const { data, isLoading } = useQuery(trpc.mail.list_inbox.queryOptions({}));
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement search functionality
    console.log("Search:", searchQuery);
  };

  const emails = data?.emails ?? [];

  return (
    <div className="flex h-full flex-col">
      {/* Header with Search and Profile */}
      <div className="border-b border-gray-200 p-4 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <form onSubmit={handleSearch} className="relative mr-4 flex-1">
            <Input
              type="text"
              placeholder="Search emails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-4 pl-10"
            />
          </form>
          <div className="flex-shrink-0 px-6">
            <ProfileMenu menuOpenDirection={MenuOpenDirection.BOTTOM_LEFT} />
          </div>
        </div>
      </div>
      {/* Email List */}
      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <LoadingSpinner />
        </div>
      ) : emails.length !== 0 ? (
        <div className="flex-1 overflow-auto">
          {emails.map((email) => (
            <EmailItem
              email={email}
              key={email.messageId}
              isSelected={selectedEmailId === email.messageId}
              onSelect={() => onEmailSelect(email.messageId)}
            />
          ))}
        </div>
      ) : (
        // Empty State
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
              <svg
                className="h-8 w-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-gray-100">
              No emails
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Your inbox is empty
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
