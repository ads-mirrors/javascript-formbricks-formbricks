import { loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    environmentMatchGlobs: [
      ["**/*.test.tsx", "jsdom"],
    ],
    exclude: ["playwright/**", "node_modules/**"],
    setupFiles: ["../../packages/lib/vitestSetup.ts"],
    env: loadEnv("", process.cwd(), ""),
    coverage: {
      provider: "v8", // Use V8 as the coverage provider
      reporter: ["text", "html", "lcov"], // Generate text summary and HTML reports
      reportsDirectory: "./coverage", // Output coverage reports to the coverage/ directory
      include: [
        "modules/api/v2/**/*.ts",
        "modules/auth/lib/**/*.ts",
        "modules/auth/signup/components/signup-form.tsx",
        "modules/auth/signup/page.tsx",
        "modules/signup/lib/**/*.ts",
        "modules/ee/whitelabel/email-customization/components/*.tsx",
        "modules/ee/sso/lib/**/*.ts",
        "modules/email/components/email-template.tsx",
        "modules/email/emails/survey/follow-up.tsx",
        "modules/ui/components/post-hog-client/*.tsx",
        "app/(app)/environments/**/layout.tsx",
        "app/(app)/environments/**/settings/(organization)/general/page.tsx",
        "app/(app)/environments/**/components/PosthogIdentify.tsx",
        "app/(app)/(onboarding)/organizations/**/layout.tsx",
        "app/(app)/(survey-editor)/environments/**/layout.tsx",
        "app/(app)/components/FormbricksClient.tsx",
        "app/(auth)/layout.tsx",
        "app/(app)/layout.tsx",
        "app/layout.tsx",
        "app/intercom/*.tsx",
        "app/sentry/*.tsx",
      ],
      exclude: [
        "**/.next/**",
        "**/*.test.*",
        "**/*.spec.*",
        "**/constants.ts", // Exclude constants files
        "**/route.ts", // Exclude route files
        "**/openapi.ts", // Exclude openapi configuration files
        "**/openapi-document.ts", // Exclude openapi document files
        "modules/**/types/**", // Exclude types
      ],
    },
  },
  plugins: [tsconfigPaths(), react()],
});
