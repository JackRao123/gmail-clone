import React, { Suspense, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Skeleton } from "~/features/shared/components/ui/skeleton";
import { useTRPC } from "~/trpc/react";

import { ComposeEmail } from "./ComposeEmail";
import { EmailToolbar } from "./EmailToolbar";
import { ThreadDetail } from "./ThreadDetail";
import { ThreadList } from "./ThreadList";

export function EmailInterface() {
  const [selectedThreadId, setSelectedThreadId] = useState<
    string | undefined
  >();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isComposeMinimized, setIsComposeMinimized] = useState(false);
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  const handleThreadSelect = (threadId: string) => {
    setSelectedThreadId(threadId);
  };

  const handleBackToList = () => {
    setSelectedThreadId(undefined);
  };

  const handleRefresh = () => {
    void queryClient.invalidateQueries({
      queryKey: trpc.mail.list_threads.queryKey(),
    });
  };

  const handleCompose = () => {
    setIsComposeOpen(true);
    setIsComposeMinimized(false);
  };

  const handleSearch = (query: string) => {
    // TODO: Implement search functionality
    console.log("Search:", query);
  };

  const syncMutation = useMutation(
    trpc.mail.sync_threads.mutationOptions({
      onSuccess: (result) => {
        console.log("Sync result:", result);
        // Refresh the thread list after sync
        void queryClient.invalidateQueries({
          queryKey: trpc.mail.list_threads.queryKey(),
        });
      },
      onError: (error) => {
        console.error("Sync failed:", error);
      },
      onSettled: () => {
        setIsSyncing(false);
      },
    })
  );

  const handleSync = () => {
    setIsSyncing(true);
    syncMutation.mutate({
      maxResults: 50, // Sync up to 50 threads
    });
  };

  const clearMutation = useMutation(
    trpc.mail.clear.mutationOptions({
      onSuccess: () => {
        console.log("All emails cleared");
        // Refresh the thread list after clear
        void queryClient.invalidateQueries({
          queryKey: trpc.mail.list_threads.queryKey(),
        });
      },
      onError: (error) => {
        console.error("Clear failed:", error);
      },
      onSettled: () => {
        setIsDeleting(false);
      },
    })
  );

  const handleClear = () => {
    if (
      confirm(
        "Are you sure you want to delete all emails? This cannot be undone."
      )
    ) {
      setIsDeleting(true);
      clearMutation.mutate();
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <div className="w-64 border-r border-gray-200 dark:border-gray-700">
        <EmailToolbar
          onRefresh={handleRefresh}
          onCompose={handleCompose}
          onSearch={handleSearch}
          onSync={handleSync}
          onClear={handleClear}
          isSyncing={isSyncing}
          isDeleting={isDeleting}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-white dark:bg-gray-900">
        {selectedThreadId ? (
          <Suspense fallback={<Skeleton className="h-full" />}>
            <ThreadDetail
              threadId={selectedThreadId}
              onBack={handleBackToList}
            />
          </Suspense>
        ) : (
          <Suspense fallback={<Skeleton className="h-full" />}>
            <ThreadList
              selectedThreadId={selectedThreadId}
              onThreadSelect={handleThreadSelect}
            />
          </Suspense>
        )}
      </div>

      {/* Compose Email */}
      <ComposeEmail
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onToggleMinimize={() => setIsComposeMinimized(!isComposeMinimized)}
        isMinimized={isComposeMinimized}
      />
    </div>
  );
}
