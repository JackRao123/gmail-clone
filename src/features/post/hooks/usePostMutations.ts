"use client";

import type { Post } from "@prisma/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useTRPC } from "~/trpc/react";

type PostMutationsOptions = {
  create?: {
    onSuccess?: () => void;
    onError?: () => void;
  };
  update?: {
    onSuccess?: (id: Post["id"]) => void;
    onError?: () => void;
  };
  delete?: {
    onSuccess?: (id: Post["id"]) => void;
    onError?: () => void;
  };
};

export function usePostMutations(options: PostMutationsOptions = {}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const createMutation = useMutation(
    trpc.post.create.mutationOptions({
      onSuccess: async () => {
        // Invalidate related queries to refresh the data
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: trpc.post.all.queryKey(),
          }),
          queryClient.invalidateQueries({
            queryKey: trpc.post.latest.queryKey(),
          }),
        ]);

        toast.success("Post created successfully!");

        options.create?.onSuccess?.();
      },
      onError: (error) => {
        toast.error("Failed to create post", {
          description: error.message,
        });
        options.create?.onError?.();
      },
    })
  );

  // For mutations that don't exist yet, we'll provide a mock implementation
  const updateMutation = {
    mutate: () => {
      throw new Error("Update post mutation not implemented yet");
    },
    mutateAsync: () => {
      throw new Error("Update post mutation not implemented yet");
    },
    isPending: false,
    isError: false,
    isSuccess: false,
    error: null,
    data: undefined,
    reset: () => {
      // Mock reset implementation
    },
  };

  const deleteMutation = {
    mutate: () => {
      throw new Error("Delete post mutation not implemented yet");
    },
    mutateAsync: () => {
      throw new Error("Delete post mutation not implemented yet");
    },
    isPending: false,
    isError: false,
    isSuccess: false,
    error: null,
    data: undefined,
    reset: () => {
      // Mock reset implementation
    },
  };

  return {
    createMutation,
    updateMutation,
    deleteMutation,
  };
}
