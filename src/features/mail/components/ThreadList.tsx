import type { ThreadMetaData } from "~/server/api/mail";
import type { ChangeEvent } from "react";
import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";

import ProfileMenu, { MenuOpenDirection } from "~/app/_components/ProfileMenu";
import { LoadingSpinner } from "~/features/shared/components/LoadingSpinner";
import { Input } from "~/features/shared/components/ui/input";
import { cn } from "~/lib/utils";
import { useTRPC } from "~/trpc/react";

import { formatDate, getSenderDisplay } from "./ThreadDetail";

interface SearchInputProps {
  setSearchTerm: (value: string) => void;
}

export const SearchInput = memo(function SearchInput({
  setSearchTerm,
}: SearchInputProps) {
  const [localSearchQuery, setLocalSearchQuery] = useState("");
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setLocalSearchQuery(e.target.value);
  };
  // debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(localSearchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearchQuery]); //

  return (
    <div className="relative mr-4 flex-1">
      <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <Input
        type="text"
        placeholder="Search threads..."
        value={localSearchQuery}
        onChange={handleChange}
        className="pl-10"
      />
    </div>
  );
});

interface ThreadItemProps {
  thread: ThreadMetaData;
  isSelected: boolean;
}
function ThreadItem({ thread, isSelected }: ThreadItemProps) {
  // navigation to specific thread
  const router = useRouter();
  const handleClick = () => {
    router.push(`/inbox/${thread.threadId}`);
  };

  return (
    <div
      className={cn(
        "flex cursor-pointer items-start space-x-4 border-b border-gray-100 p-4 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800",
        isSelected &&
          "border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-900/20"
      )}
      onClick={handleClick}
    >
      {/* profile picture of sender (just first letter of sender name for now) */}
      <div className="flex-shrink-0">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-300 text-sm font-medium text-gray-700 dark:bg-gray-600 dark:text-gray-300">
          {getSenderDisplay(thread.from)?.charAt(0)?.toUpperCase() ?? "?"}
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
            {/* Name of the sender */}
            {getSenderDisplay(thread.from) ?? "Unknown"}
          </p>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatDate(thread.date)}
          </span>
        </div>

        <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
          {thread.subject ?? "No subject"}
        </p>
        <p className="truncate text-sm text-gray-600 dark:text-gray-300">
          {thread.snippet ?? "No preview available"}
        </p>
      </div>
    </div>
  );
}

export function ThreadList({ searchTerm }: { searchTerm: string }) {
  const trpc = useTRPC();

  const { data } = useSuspenseQuery(
    trpc.mail.list_threads.queryOptions({
      search: searchTerm,
    })
  );

  const threads = data?.threads ?? [];

  return (
    <div className="flex h-full flex-col">
      {/* Thread List */}
      {threads.length !== 0 ? (
        <div className="flex-1 overflow-auto">
          {threads.map((thread) => (
            <ThreadItem
              thread={thread}
              key={thread.threadId}
              isSelected={false}
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
              No threads
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
