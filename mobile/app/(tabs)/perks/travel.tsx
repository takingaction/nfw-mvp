
import { PlaceholderScreen } from "@/components/ui/PlaceholderScreen";

/**
 * Web equivalent:
 *   - app/travel/page.tsx
 *   - app/travel/TravelClient.tsx
 *   - POST /api/travel/token
 * Build phase: 7
 *
 * react-native-webview hosting the Access Travel SDK.
 */
export default function TravelScreen() {
  return (
    <PlaceholderScreen
      title="Travel"
      webEquivalent={["app/travel/page.tsx","app/travel/TravelClient.tsx","POST /api/travel/token"]}
      phase={7}
      notes="react-native-webview hosting the Access Travel SDK."
    />
  );
}
