import React, { Suspense, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Skeleton } from "~/features/shared/components/ui/skeleton";
import { useTRPC } from "~/trpc/react";

import { EmailDetail } from "./EmailDetail";
import { EmailList } from "./EmailList";
import { EmailToolbar } from "./EmailToolbar";

export function EmailInterface() {
  const [selectedEmailId, setSelectedEmailId] = useState<string | undefined>();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  const handleEmailSelect = (emailId: string) => {
    setSelectedEmailId(emailId);
  };

  const handleBackToList = () => {
    setSelectedEmailId(undefined);
  };

  const handleRefresh = () => {
    void queryClient.invalidateQueries({
      queryKey: trpc.mail.list_inbox.queryKey(),
    });
  };

  const handleCompose = () => {
    // TODO: Implement compose functionality
    console.log("Compose clicked");
  };

  const handleSearch = (query: string) => {
    // TODO: Implement search functionality
    console.log("Search:", query);
  };

  const syncMutation = useMutation(
    trpc.mail.sync.mutationOptions({
      onSuccess: (result) => {
        console.log("Sync result:", result);
        // Refresh the email list after sync
        void queryClient.invalidateQueries({
          queryKey: trpc.mail.list_inbox.queryKey(),
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
      maxResults: 50, // Sync up to 50 emails
    });
  };

  const clearMutation = useMutation(
    trpc.mail.clear.mutationOptions({
      onSuccess: (result) => {
        console.log(`Deleted ${result.count} emails`);
        // Refresh the email list after sync
        void queryClient.invalidateQueries({
          queryKey: trpc.mail.list_inbox.queryKey(),
        });
      },
      onError: (error) => {
        console.error("Deletion failed:", error);
      },
      onSettled: () => {
        setIsDeleting(false);
      },
    })
  );

  const handleDeleteAll = () => {
    setIsDeleting(true);
    clearMutation.mutate();
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
          onDeleteAll={handleDeleteAll}
          isSyncing={isSyncing}
          isDeleting={isDeleting}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-white dark:bg-gray-900">
        {selectedEmailId ? (
          <Suspense fallback={<Skeleton className="h-full" />}>
            <EmailDetail emailId={selectedEmailId} onBack={handleBackToList} />
          </Suspense>
        ) : (
          <Suspense fallback={<Skeleton className="h-full" />}>
            <EmailList
              selectedEmailId={selectedEmailId}
              onEmailSelect={handleEmailSelect}
            />
          </Suspense>
        )}
      </div>
    </div>
  );
}
