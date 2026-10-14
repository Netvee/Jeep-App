import NextLink from "next/link";
import type { ComponentProps } from "react";

/**
 * Link with viewport prefetching off by default. Every prefetch of a dynamic page
 * renders it on the server; on small hosts dozens of background renders per page
 * starve the request the user actually clicked. Pass `prefetch` to opt back in.
 */
export default function Link({ prefetch = false, ...props }: ComponentProps<typeof NextLink>) {
  return <NextLink prefetch={prefetch} {...props} />;
}
