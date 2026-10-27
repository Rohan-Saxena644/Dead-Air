import type { NextConfig } from "next";
const config: NextConfig = {
  devIndicators: false,
  output: "standalone",
  serverExternalPackages: ["better-sqlite3"],
};
export default config;
