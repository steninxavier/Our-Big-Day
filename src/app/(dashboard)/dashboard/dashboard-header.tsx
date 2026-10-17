import Link from "next/link";
import brandStyles from "@/app/home.module.css";
import buttonStyles from "@/shared/ui/action-button.module.css";
import LogoutButton from "./logout-button";

export default function DashboardHeader({ active, showMembers = true }: { active: "dashboard" | "members"; showMembers?: boolean }) {
  return (
    <header className="border-b border-[#e6dec8] bg-[#fdfbf7] [--ink:#15233f] [--serif:var(--font-playfair),Georgia,serif]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-4 px-5 py-5 sm:px-6">
        <Link href="/dashboard" aria-label="Our Big Day dashboard" className="focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#b58a42]">
          <span className={brandStyles.brandLogo}>
            <span className={brandStyles.brandMark} aria-hidden="true">
              <span className={brandStyles.brandMonogramO}>O</span>
              <span className={brandStyles.brandMonogramDivider} />
              <span className={brandStyles.brandMonogramB}>B</span>
            </span>
            <span className={brandStyles.brandName}>Our <em>Big Day</em></span>
          </span>
        </Link>
        <nav aria-label="Wedding navigation" className="order-3 flex w-full flex-wrap gap-x-6 gap-y-2 text-sm font-semibold sm:order-none sm:w-auto">
          <Link aria-current={active === "dashboard" ? "page" : undefined} href="/dashboard" className={active === "dashboard" ? "border-b-2 border-[#b58a42] pb-1 text-[#17233a]" : "border-b-2 border-transparent pb-1 text-[#75655b] hover:text-[#17233a]"}>Dashboard</Link>
          {showMembers && <Link aria-current={active === "members" ? "page" : undefined} href="/dashboard/members" className={active === "members" ? "border-b-2 border-[#b58a42] pb-1 text-[#17233a]" : "border-b-2 border-transparent pb-1 text-[#75655b] hover:text-[#17233a]"}>Wedding members</Link>}
        </nav>
        <LogoutButton buttonClassName={`${buttonStyles.button} ${buttonStyles.headerButton}`} />
      </div>
    </header>
  );
}
