import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main
      className="flex min-h-[70vh] items-center justify-center px-5 py-16"
      style={{ background: "var(--color-background)" }}
    >
      <SignUp />
    </main>
  );
}
