import AuthErrorView from "./AuthErrorView";

// The error message and email may arrive via the proxy's URL vault rather than
// the visible address, so they are read here on the server and passed down.
export default async function ErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; email?: string }>;
}) {
  const { error, email } = await searchParams;
  return <AuthErrorView errorParam={error ?? ""} emailParam={email ?? ""} />;
}
