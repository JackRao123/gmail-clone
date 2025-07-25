/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ReactNode } from "react";
import { Suspense } from "react";
import { type TRPCQueryOptions } from "@trpc/tanstack-react-query";

import { HydrateClient, prefetch as prefetchTRPC } from "~/trpc/server";

type AwaitProps<T> =
  | {
      promise: Promise<T>;
      children: (data: T) => ReactNode;
      fallback: ReactNode;
      prefetch: ReturnType<TRPCQueryOptions<any>>[];
      ErrorBoundaryComponent: React.ComponentType<{
        children: React.ReactNode;
      }>;
    }
  | {
      promise?: undefined;
      children: ReactNode;
      fallback: ReactNode;
      prefetch: ReturnType<TRPCQueryOptions<any>>[];
      ErrorBoundaryComponent: React.ComponentType<{
        children: React.ReactNode;
      }>;
    };

export function Await<T>({
  promise,
  children,
  fallback,
  ErrorBoundaryComponent,
  prefetch,
}: AwaitProps<T>) {
  const innerChildren = promise ? (
    <AwaitResult promise={promise}>{(data) => children(data)}</AwaitResult>
  ) : (
    <>{children}</>
  );
  prefetch.map((p) => {
    prefetchTRPC(p);
  });

  return (
    <Suspense fallback={<>{fallback}</>}>
      <HydrateClient>
        <ErrorBoundaryComponent>{innerChildren}</ErrorBoundaryComponent>
      </HydrateClient>
    </Suspense>
  );
}

type AwaitResultProps<T> = {
  promise: Promise<T>;
  children: (data: T) => ReactNode;
};

async function AwaitResult<T>({ promise, children }: AwaitResultProps<T>) {
  const data = await promise;
  return <>{children(data)}</>;
}
