// Minimal Deno type definitions
declare const Deno: {
  env: {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
  };
  serve(handler: (req: Request) => Response | Promise<Response>, options?: { port: number }): { close(): void };
  exit(code?: number): never;
};
