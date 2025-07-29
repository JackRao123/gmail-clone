import type { FormEvent } from "react";
import React, { useState } from "react";
import { FileText, Inbox, Plus, Send } from "lucide-react";

import { Button } from "~/features/shared/components/ui/button";

interface EmailToolbarProps {
  onRefresh?: () => void;
  onCompose?: () => void;
  onSearch?: (query: string) => void;
}

export function EmailToolbar({
  onRefresh,
  onCompose,
  onSearch,
}: EmailToolbarProps) {
  return (
    <div className="h-full bg-white p-4 dark:bg-gray-900">
      {/* Compose Button */}
      <div className="mb-8">
        <Button onClick={onCompose} className="w-full justify-start" size="lg">
          <Plus className="mr-2 h-4 w-4" />
          Compose
        </Button>
      </div>

      {/* Navigation */}
      <nav className="space-y-1">
        <Button variant="ghost" className="w-full justify-start" size="sm">
          <Inbox className="mr-3 h-4 w-4" />
          Inbox
        </Button>

        <Button variant="ghost" className="w-full justify-start" size="sm">
          <Send className="mr-3 h-4 w-4" />
          Sent
        </Button>

        <Button variant="ghost" className="w-full justify-start" size="sm">
          <FileText className="mr-3 h-4 w-4" />
          Drafts
        </Button>
      </nav>
    </div>
  );
}
