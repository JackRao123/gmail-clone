"use client";

import { EmailInterface } from "~/features/mail/components";
import SessionEnsurer from "~/features/shared/components/SessionEnsurer";

export default function Inbox() {
  return (
    <div className="h-screen">
      <SessionEnsurer>
        <EmailInterface />
      </SessionEnsurer>
    </div>
  );
}
