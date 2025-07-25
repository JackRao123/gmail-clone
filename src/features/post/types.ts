import type { Post, User } from "@prisma/client";

export type PostWithUser = Post & {
  user: User;
};

