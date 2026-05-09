import { index, type RouteConfig, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("auth/line", "routes/auth.line.ts"),
  route("auth/callback", "routes/auth.callback.ts"),
  route("budget", "routes/budget.tsx"),
  route("webhook", "routes/webhook.ts"),
] satisfies RouteConfig;
