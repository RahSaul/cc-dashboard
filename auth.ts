import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    signIn({ user }) {
      if (!user.email) return false
      const allowed = (process.env.ALLOWED_EMAILS ?? '')
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean)
      if (allowed.length === 0) return false
      return allowed.includes(user.email.toLowerCase()) ? true : '/unauthorized'
    },
  },
})
