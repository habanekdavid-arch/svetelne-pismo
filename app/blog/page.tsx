import Link from "next/link";
import { blogPosts } from "@/lib/blog-data";

function CategoryIcon({ category }: { category: string }) {
  switch (category) {
    case "O nás":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
        </svg>
      );
    case "Materiály":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 17 12 22 22 17" />
          <polyline points="2 12 12 17 22 12" />
        </svg>
      );
    case "Dizajn":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="13.5" cy="6.5" r="2.5" />
          <circle cx="17.5" cy="10.5" r="2.5" />
          <circle cx="8.5" cy="7.5" r="2.5" />
          <circle cx="6.5" cy="12.5" r="2.5" />
          <path d="M12 22a4 4 0 0 0 4-4c0-1.9-1.1-3.5-2.7-4.3" />
          <path d="M8.7 13.7A4 4 0 1 0 12 22" />
        </svg>
      );
    case "Návod":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      );
    case "Technológia":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      );
    default:
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
      );
  }
}

export default function BlogPage() {
  return (
    <main>
      {/* Hero */}
      <section className="pb-12 pt-20" style={{ background: "var(--color-background)" }}>
        <div className="mx-auto max-w-7xl px-5 text-center">
          <p
            className="reveal mb-4 text-[10px] font-black tracking-[0.35em]"
            style={{ color: "var(--color-muted)" }}
          >
            Blog
          </p>
          <h1
            className="reveal delay-1 main-heading text-4xl md:text-6xl"
            style={{ color: "var(--color-foreground)" }}
          >
            Všetko o svetelných
            <br />
            nápisoch
          </h1>
          <p
            className="reveal delay-2 mx-auto mt-5 max-w-md text-sm leading-6"
            style={{ color: "var(--color-muted)" }}
          >
            Návody, porovnania materiálov, tipy pre podnikateľov aj inšpirácia pre váš ďalší projekt.
          </p>
        </div>
      </section>

      {/* Posts grid */}
      <section className="py-16" style={{ background: "var(--color-background)" }}>
        <div className="mx-auto max-w-7xl px-5">
          <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {blogPosts.map((post, i) => (
              <li key={post.slug} className={`reveal delay-${Math.min(i + 1, 6)}`}>
                <Link
                  href={`/blog/${post.slug}`}
                  className="card-hover group flex h-full flex-col overflow-hidden rounded-2xl"
                  style={{
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  {/* Image placeholder */}
                  <div
                    className="flex h-48 w-full items-center justify-center"
                    style={{ background: "var(--color-surface-raised)" }}
                  >
                    <div
                      className="flex h-16 w-16 items-center justify-center rounded-2xl"
                      style={{
                        background: "var(--color-yellow)",
                        color: "#000",
                      }}
                    >
                      <CategoryIcon category={post.category} />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex flex-1 flex-col p-6">
                    {/* Category + read time */}
                    <div className="mb-3 flex items-center gap-3">
                      <span
                        className="rounded-full px-2.5 py-0.5 text-[10px] font-black tracking-wide"
                        style={{
                          background: "var(--color-yellow-dim)",
                          color: "var(--color-yellow)",
                        }}
                      >
                        {post.category}
                      </span>
                      <span
                        className="text-[11px]"
                        style={{ color: "var(--color-muted)" }}
                      >
                        {post.readMin} min čítania
                      </span>
                    </div>

                    <h2
                      className="text-[18px] font-black leading-tight"
                      style={{
                        fontFamily: "var(--font-century-gothic)",
                        color: "var(--color-foreground)",
                      }}
                    >
                      {post.title}
                    </h2>

                    <p
                      className="mt-2 flex-1 text-[13px] leading-5"
                      style={{ color: "var(--color-muted)" }}
                    >
                      {post.desc}
                    </p>

                    <div
                      className="mt-4 flex items-center gap-1 text-[12px] font-black tracking-wide transition-opacity group-hover:opacity-60"
                      style={{ color: "var(--color-yellow)" }}
                    >
                      Čítať viac
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
