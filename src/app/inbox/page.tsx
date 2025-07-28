"use client";

import { useQuery } from "@tanstack/react-query";

import { useTRPC } from "~/trpc/react";

import ProfileMenu, { MenuOpenDirection } from "../_components/ProfileMenu";

interface EmailCardProps {
  emailId: string;
}
function EmailCard(props: EmailCardProps) {
  const trpc = useTRPC();
  const { data, isLoading, isError, error } = useQuery(
    trpc.mail.get.queryOptions({ messageId: props.emailId })
  );

  if (isLoading || !data) {
    return <div>loading ...</div>;
  }

  return <div className="border-10 border-red-500 p-10">{`${data.text}`}</div>;
}

export default function Inbox() {
  const trpc = useTRPC();
  const { data, isLoading, isError, error } = useQuery(
    trpc.mail.list.queryOptions()
  );

  return (
    <div>
      <ProfileMenu menuOpenDirection={MenuOpenDirection.BOTTOM_RIGHT} />

      {isLoading && <div>Loading…</div>}

      {isError && (
        <div style={{ color: "red" }}>
          Error fetching emails: {error.message}
        </div>
      )}

      {!isLoading && !isError && (
        <ul>
          {data!.emails.map((id) => (
            <EmailCard key={id} emailId={id} />
          ))}
        </ul>
      )}
    </div>
  );
}
