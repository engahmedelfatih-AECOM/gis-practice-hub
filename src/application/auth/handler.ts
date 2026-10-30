import "server-only";
import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/infrastructure/auth/auth";

/** HTTP handler for the authentication endpoints, mounted at /api/auth/*. */
export const authHandler = toNextJsHandler(auth);
