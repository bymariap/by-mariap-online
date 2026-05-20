export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: string;
  permissions: string[];
  specialistId?: string;
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
}
