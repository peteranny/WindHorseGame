declare const __DEPLOY_DATE__: string;

// Injected server-side by gas/Code.js's doGet (production builds only) -
// the deployed app runs inside an iframe on its own origin, so
// window.location there is unrelated to the visible /exec?key=... URL the
// player actually bookmarks/shares. See store/persistence.ts.
interface Window {
  __STATE_KEY__?: string;
  __WEBAPP_URL__?: string;
}

interface GASRun {
  withSuccessHandler<T>(fn: (result: T) => void): GASRun;
  withFailureHandler(fn: (error: Error) => void): GASRun;
  loadState(key: string): GASRun;
  saveState(key: string, json: string): GASRun;
  listStateKeys(): GASRun;
}

declare const google: {
  script: { run: GASRun };
};

declare module "*.css" {
  const styles: Readonly<Record<string, string>>;
  export default styles;
}

declare module "*.txt" {
  const content: string;
  export default content;
}

declare module "*.png" {
  const src: string;
  export default src;
}

declare module "*.svg" {
  const src: string;
  export default src;
}

declare module "*.jpg" {
  const src: string;
  export default src;
}

declare module "*.jpeg" {
  const src: string;
  export default src;
}
