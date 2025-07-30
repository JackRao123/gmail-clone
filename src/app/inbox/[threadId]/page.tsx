"use client";

import { use } from "react";

import { ThreadDetail } from "~/features/mail/components";
import SessionEnsurer from "~/features/shared/components/SessionEnsurer";

interface PageProps {
  params: Promise<{ threadId: string }>;
}

export default function ThreadPage({ params }: PageProps) {
  const { threadId } = use(params);

  return (
    <div className="h-screen">
      <SessionEnsurer>
        <ThreadDetail
          threadId={threadId}
          onBack={() => window.history.back()}
        />
      </SessionEnsurer>
    </div>
  );
}
