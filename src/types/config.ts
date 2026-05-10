export type RateLimitConfig = {
  windowMs: number;
  max: number;
  standardHeaders: boolean;
  legacyHeaders: boolean;
};

export type HttpsConfig = {
  pubKey: string;
  pvtKey: string;
};

export type AppConfig = {
  app: {
    name: string;
    port: number;
  };
  server: {
    cache: boolean;
    secure: boolean;
    cors: string;
    rateLimit: RateLimitConfig;
    https: HttpsConfig;
  };
  storage: {
    projectsDirectory: string;
  };
};
