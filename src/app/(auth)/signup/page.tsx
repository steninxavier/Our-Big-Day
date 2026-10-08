import Link from "next/link";

export const metadata = { title: "Create an account" };

export default function SignupPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <h1 className="text-3xl font-semibold">Start planning your big day</h1>
      <p className="mt-3 text-[#75655b]">The account-creation flow is ready to be connected to the UI form.</p>
      <Link className="mt-8 text-[#a44932] underline" href="/login">Already have an account? Sign in</Link>
    </main>
  );
}
