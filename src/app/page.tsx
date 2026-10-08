import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16 sm:px-10">
      <p className="text-sm font-semibold tracking-[0.22em] text-[#a44932] uppercase">
        Our Big Day
      </p>
      <h1 className="mt-5 max-w-3xl text-5xl font-semibold tracking-tight text-[#34251d] sm:text-7xl">
        Plan the celebration, together.
      </h1>
      <p className="mt-6 max-w-2xl text-lg leading-8 text-[#75655b]">
        A collaborative home for wedding planning, guests, invitations, and memories.
      </p>
      <div className="mt-10 flex flex-wrap gap-4">
        <Link className="rounded-full bg-[#a44932] px-5 py-3 font-medium text-white" href="/signup">
          Create your wedding
        </Link>
        <Link className="rounded-full border border-[#eadfd7] px-5 py-3 font-medium" href="/login">
          Sign in
        </Link>
      </div>
    </main>
  );
}
