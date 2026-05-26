import type { NextAuthOptions } from "next-auth";
import TwitterProvider, { type TwitterProfile } from "next-auth/providers/twitter";

export function hasXAuthConfig(): boolean {
  return Boolean(process.env.X_CLIENT_ID && process.env.X_CLIENT_SECRET && process.env.NEXTAUTH_SECRET);
}

export const authOptions: NextAuthOptions = {
  providers: hasXAuthConfig()
    ? [
        TwitterProvider<TwitterProfile>({
          clientId: process.env.X_CLIENT_ID ?? "",
          clientSecret: process.env.X_CLIENT_SECRET ?? "",
          version: "2.0",
          profile(profile) {
            return {
              id: profile.data.id,
              name: profile.data.name,
              email: null,
              image: profile.data.profile_image_url,
              username: profile.data.username,
            };
          },
        }),
      ]
    : [],
  callbacks: {
    jwt({ token, profile }) {
      const xProfile = profile as TwitterProfile | undefined;
      if (xProfile?.data.username) {
        token.username = xProfile.data.username;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.username = typeof token.username === "string" ? token.username : undefined;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
};
