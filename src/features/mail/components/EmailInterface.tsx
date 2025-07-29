import React, { Suspense, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { Skeleton } from "~/features/shared/components/ui/skeleton";

import { EmailDetail } from "./EmailDetail";
import { EmailList } from "./EmailList";
import { EmailToolbar } from "./EmailToolbar";

export function EmailInterface() {
  const [selectedEmailId, setSelectedEmailId] = useState<string | undefined>();
  const queryClient = useQueryClient();

  const handleEmailSelect = (emailId: string) => {
    setSelectedEmailId(emailId);
  };

  const handleBackToList = () => {
    setSelectedEmailId(undefined);
  };

  const handleRefresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["mail.list"] });
  };

  const handleCompose = () => {
    // TODO: Implement compose functionality
    console.log("Compose clicked");
  };

  const handleSearch = (query: string) => {
    // TODO: Implement search functionality
    console.log("Search:", query);
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <div className="w-64 border-r border-gray-200 dark:border-gray-700">
        <EmailToolbar
          onRefresh={handleRefresh}
          onCompose={handleCompose}
          onSearch={handleSearch}
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
