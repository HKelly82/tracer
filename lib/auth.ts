import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const hash = Buffer.from(process.env.ADMIN_PASSWORD_HASH ?? "", "base64").toString("utf8")
        if (
          credentials.username === process.env.ADMIN_USERNAME &&
          (await bcrypt.compare(credentials.password as string, hash))
        ) {
          return { id: "1", name: "Helen Kelly", email: "hkelly@hansonwealth.co.uk" }
        }
        return null
      },
    }),
  ],
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: 30 * 60 },
})
