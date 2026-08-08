import GitHubLoginButton from "@/components/Common/GitHubLoginButton";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm flex flex-col items-center gap-8">

        {/* Logo + wordmark */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-foreground flex items-center justify-center">
            <svg
              viewBox="0 0 24 24"
              className="w-7 h-7 fill-background"
              aria-hidden="true"
            >
              <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.604-3.369-1.342-3.369-1.342-.454-1.154-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836a9.59 9.59 0 0 1 2.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
            </svg>
          </div>
          <div className="text-center">
            <h1 className="text-xl font-semibold tracking-tight">GitHub Extension</h1>
            <p className="text-sm text-foreground/60 mt-1">
              Code reviews and collaborative drawing boards
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="w-full rounded-2xl border border-foreground/10 bg-foreground/3 p-8 flex flex-col gap-6">
          <div>
            <h2 className="text-base font-semibold">Sign in to your account</h2>
            <p className="text-sm text-foreground/50 mt-1">
              Connect your GitHub account to get started
            </p>
          </div>

          <GitHubLoginButton />

          <p className="text-xs text-foreground/40 text-center leading-relaxed">
            By signing in you agree to our{" "}
            <a href="#" className="underline underline-offset-2 hover:text-foreground/70 transition-colors">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="#" className="underline underline-offset-2 hover:text-foreground/70 transition-colors">
              Privacy Policy
            </a>
            .
          </p>
        </div>

      </div>
    </main>
  );
}
