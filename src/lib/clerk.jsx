import React from "react"
import {
  ClerkProvider as ClerkProviderInternal,
  SignedIn as SignedInInternal,
  SignedOut as SignedOutInternal,
  ClerkLoading as ClerkLoadingInternal,
  ClerkLoaded as ClerkLoadedInternal,
  RedirectToSignIn as RedirectToSignInInternal,
  useUser as useUserInternal,
} from "@clerk/clerk-react"

export const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
export const isClerkConfigured = Boolean(clerkPublishableKey)

const MissingClerkMessage = () => (
  <div className="mx-auto max-w-md rounded-3xl border border-amber-200 bg-amber-50/80 p-6 text-sm text-amber-900 shadow-lg">
    <p className="font-semibold">Authentication is unavailable.</p>
    <p className="mt-2 leading-relaxed">
      Add a <code className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-mono">VITE_CLERK_PUBLISHABLE_KEY</code> environment variable to enable Clerk authentication and unlock protected pages.
    </p>
  </div>
)

let hasWarnedAboutMissingKey = false

export const CoremorphicClerkProvider = ({ children }) => {
  if (!isClerkConfigured) {
    if (import.meta.env.DEV && !hasWarnedAboutMissingKey) {
      console.warn(
        "Clerk is disabled because VITE_CLERK_PUBLISHABLE_KEY is not set. Add the key to enable authentication."
      )
      hasWarnedAboutMissingKey = true
    }

    return <>{children}</>
  }

  return (
    <ClerkProviderInternal publishableKey={clerkPublishableKey} afterSignOutUrl="/">
      {children}
    </ClerkProviderInternal>
  )
}

export const SignedIn = isClerkConfigured
  ? SignedInInternal
  : () => null

export const SignedOut = isClerkConfigured
  ? SignedOutInternal
  : ({ children }) => <>{children}</>

export const ClerkLoading = isClerkConfigured
  ? ClerkLoadingInternal
  : ({ children }) => null

export const ClerkLoaded = isClerkConfigured
  ? ClerkLoadedInternal
  : ({ children }) => <>{children}</>

export const RedirectToSignIn = isClerkConfigured
  ? RedirectToSignInInternal
  : () => <MissingClerkMessage />

export const useOptionalUser = isClerkConfigured
  ? useUserInternal
  : () => ({ isLoaded: true, isSignedIn: false, user: null })
