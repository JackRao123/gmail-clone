"use client";

import { useQuery } from "@tanstack/react-query";

import { useTRPC } from "~/trpc/react";

import ProfileMenu, { MenuOpenDirection } from "../_components/ProfileMenu";

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
            <li key={id}>{id}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
