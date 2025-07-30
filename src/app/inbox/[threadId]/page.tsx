"use client";

import { use } from "react";

import { ThreadDetail } from "~/features/mail/components";

interface PageProps {
  params: Promise<{ threadId: string }>;
}

export default function ThreadPage({ params }: PageProps) {
  const { threadId } = use(params);

  return (
    <div className="h-screen">
      <ThreadDetail threadId={threadId} onBack={() => window.history.back()} />
    </div>
  );
}
