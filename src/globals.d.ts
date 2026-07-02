declare const __DEPLOY_DATE__: string;

interface GASRun {
  withSuccessHandler<T>(fn: (result: T) => void): GASRun;
  withFailureHandler(fn: (error: Error) => void): GASRun;
  getPosition(deviceId: string): GASRun;
  savePosition(
    deviceId: string,
    x: number,
    y: number,
    timestamp: number
  ): GASRun;
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
