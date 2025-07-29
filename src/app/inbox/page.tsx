"use client";

import { Suspense } from "react";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";

import { Skeleton } from "~/features/shared/components/ui/skeleton";
import { useTRPC } from "~/trpc/react";

import ProfileMenu, { MenuOpenDirection } from "../_components/ProfileMenu";

interface EmailCardProps {
  emailId: string;
}
function EmailCard(props: EmailCardProps) {
  const trpc = useTRPC();
  const { data } = useSuspenseQuery(
    trpc.mail.get.queryOptions({ messageId: props.emailId })
  );

  return <div className="border-10 border-red-500 p-10">{`${data.text}`}</div>;
}

export default function Inbox() {
  const trpc = useTRPC();
  const { data } = useSuspenseQuery(trpc.mail.list.queryOptions());

  return (
    <Suspense fallback={<Skeleton />}>
      <div>
        <ProfileMenu menuOpenDirection={MenuOpenDirection.BOTTOM_RIGHT} />
        <ul>
          {data.emails.map((id) => (
            <EmailCard key={id} emailId={id} />
          ))}
        </ul>
      </div>
    </Suspense>
  );
}
