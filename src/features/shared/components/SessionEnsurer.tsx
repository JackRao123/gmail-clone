import { useSession } from "next-auth/react";

import { LoadingSpinner } from "./LoadingSpinner";

// Wrapper that ensures useSession() in its children components will be authenticated
export default function SessionEnsurer({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status } = useSession();
  console.log(`the status is ${JSON.stringify(status, null, 2)}`);
  if (status !== "authenticated") {
    return <LoadingSpinner />;
  }

  return <>{children}</>;
}
