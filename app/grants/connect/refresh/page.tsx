import RefreshView from "./RefreshView";

// grantId may arrive via the proxy's URL vault rather than the visible address,
// so it is read here on the server and passed down.
export default async function RefreshPage({
  searchParams,
}: {
  searchParams: Promise<{ grantId?: string }>;
}) {
  const { grantId } = await searchParams;
  return <RefreshView grantId={grantId ?? null} />;
}
