#!/usr/bin/env node
/**
 * Generates skeleton route files from scripts/route-manifest.json.
 * Never overwrites existing files — safe to re-run after adding manifest entries.
 *
 *   node scripts/generate-placeholders.mjs
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(readFileSync(resolve(root, "scripts/route-manifest.json"), "utf8"));

const q = (s) => JSON.stringify(s);

function render(route) {
  const lines = [];

  if (route.param) lines.push(`import { useLocalSearchParams } from "expo-router";`);
  if (route.notFound) lines.push(`import { Link, Stack } from "expo-router";`, `import { StyleSheet, Text, View } from "react-native";`, ``, `import { colors, theme } from "@/constants/colors";`);
  else lines.push(``, `import { PlaceholderScreen } from "@/components/ui/PlaceholderScreen";`);

  lines.push(``, `/**`, ` * Web equivalent:`);
  for (const w of route.web) lines.push(` *   - ${w}`);
  lines.push(` * Build phase: ${route.phase}`);
  if (route.notes) lines.push(` *`, ` * ${route.notes}`);
  lines.push(` */`);

  if (route.notFound) {
    lines.push(
      `export default function ${route.component}() {`,
      `  return (`,
      `    <>`,
      `      <Stack.Screen options={{ title: ${q(route.title)} }} />`,
      `      <View style={styles.container}>`,
      `        <Text style={styles.title}>This screen doesn&apos;t exist.</Text>`,
      `        <Link href="/" style={styles.link}>`,
      `          Go to home screen`,
      `        </Link>`,
      `      </View>`,
      `    </>`,
      `  );`,
      `}`,
      ``,
      `const styles = StyleSheet.create({`,
      `  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: theme.background },`,
      `  title: { fontSize: 20, fontWeight: "600", color: theme.text },`,
      `  link: { marginTop: 16, paddingVertical: 12, fontSize: 14, fontWeight: "700", color: colors.aubergine },`,
      `});`,
    );
    return lines.join("\n") + "\n";
  }

  lines.push(`export default function ${route.component}() {`);
  if (route.param) {
    lines.push(`  const { ${route.param} } = useLocalSearchParams<{ ${route.param}: string }>();`, ``);
  }
  lines.push(`  return (`, `    <PlaceholderScreen`);
  lines.push(route.param ? `      title={\`${route.title}: \${${route.param}}\`}` : `      title=${q(route.title)}`);
  lines.push(`      webEquivalent={${JSON.stringify(route.web)}}`);
  lines.push(`      phase={${route.phase}}`);
  if (route.notes) lines.push(`      notes=${q(route.notes)}`);
  lines.push(`    />`, `  );`, `}`);
  return lines.join("\n") + "\n";
}

let created = 0;
let skipped = 0;
for (const route of manifest.routes) {
  const target = resolve(root, route.file);
  if (existsSync(target)) {
    skipped++;
    continue;
  }
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, render(route));
  created++;
  console.log(`created  ${route.file}`);
}
console.log(`\n${created} created, ${skipped} skipped (already exist)`);
