import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { Caption } from "@/components/ui/Typography";
import { decodeHtml } from "@/lib/format";
import { parseGrantDescription } from "@/lib/grant-description";

/**
 * Renders a plain-text grant cycle description with paragraphs, line breaks
 * and bullet lists (see lib/grant-description.ts).
 */
export function GrantDescription({ text, style }: { text: string | null | undefined; style?: StyleProp<ViewStyle> }) {
  const blocks = parseGrantDescription(decodeHtml(text));
  if (blocks.length === 0) return null;

  return (
    <View style={[styles.container, style]}>
      {blocks.map((block, i) =>
        block.type === "list" ? (
          <View key={i} style={styles.list}>
            {block.items.map((item, j) => (
              <View key={j} style={styles.item}>
                <Caption style={styles.bullet}>•</Caption>
                <Caption style={styles.itemText}>{item}</Caption>
              </View>
            ))}
          </View>
        ) : (
          <Caption key={i}>{block.lines.join("\n")}</Caption>
        ),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  list: { gap: 2 },
  item: { flexDirection: "row", paddingLeft: 4 },
  bullet: { width: 14 },
  itemText: { flex: 1 },
});
