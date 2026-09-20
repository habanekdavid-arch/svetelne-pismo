import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getBlogPost, blogPosts } from "@/lib/blog-data";

export function generateStaticParams() {
  return blogPosts.map((p) => ({ slug: p.slug }));
}

function renderMarkdown(text: string) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("## ")) {
      elements.push(
        <h2
          key={key++}
          className="main-heading mb-4 mt-10 text-2xl"
          style={{ color: "var(--color-foreground)" }}
        >
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith("### ")) {
      elements.push(
        <h3
          key={key++}
          className="mt-6 mb-2 text-[15px] font-black tracking-wide"
          style={{ color: "var(--color-foreground)" }}
        >
          {line.slice(4)}
        </h3>
      );
    } else if (line.startsWith("- ")) {
      const items: string[] = [];
      let j = i;
      while (j < lines.length && lines[j].startsWith("- ")) {
        items.push(lines[j].slice(2));
        j++;
      }
      i = j - 1;
      elements.push(
        <ul key={key++} className="my-4 space-y-2">
          {items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-3">
              <span
                className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: "var(--color-yellow)" }}
              />
              <span
                className="text-[14px] leading-6"
                style={{ color: "var(--color-muted)" }}
                dangerouslySetInnerHTML={{ __html: item.replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--color-foreground)">$1</strong>') }}
              />
            </li>
          ))}
        </ul>
      );
    } else if (line.startsWith("| ")) {
      const rows: string[][] = [];
      let j = i;
      while (j < lines.length && lines[j].startsWith("|")) {
        if (!lines[j].includes("---")) {
          rows.push(lines[j].split("|").slice(1, -1).map((c) => c.trim()));
        }
        j++;
      }
      i = j - 1;
      elements.push(
        <div key={key++} className="my-6 overflow-x-auto rounded-xl" style={{ border: "1px solid var(--color-border)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--color-surface-raised)" }}>
                {rows[0]?.map((cell, ci) => (
                  <th
                    key={ci}
                    className="px-4 py-3 text-left text-[11px] font-black tracking-wide"
                    style={{ color: "var(--color-muted)" }}
                  >
                    {cell}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(1).map((row, ri) => (
                <tr
                  key={ri}
                  style={{ borderTop: "1px solid var(--color-border)" }}
                >
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className="px-4 py-3 text-[13px]"
                      style={{ color: "var(--color-foreground)" }}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    } else if (line.trim() === "") {
      // skip blank lines between blocks
    } else {
      elements.push(
        <p
          key={key++}
          className="my-4 text-[14px] leading-7"
          style={{ color: "var(--color-muted)" }}
          dangerouslySetInnerHTML={{
            __html: line.replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--color-foreground)">$1</strong>'),
          }}
        />
      );
    }
  }

  return elements;
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  const related = blogPosts.filter((p) => p.slug !== slug).slice(0, 3);

  return (
    <main style={{ background: "var(--color-background)" }}>
      {/* Hero */}
      <section className="pb-10 pt-16">
        <div className="mx-auto max-w-2xl px-5">
          <Link
            href="/blog"
            className="mb-8 flex items-center gap-2 text-[11px] font-black tracking-wide transition-opacity hover:opacity-60"
            style={{ color: "var(--color-muted)" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            Späť na blog
          </Link>

          {/* Category badge */}
          <span
            className="inline-block rounded-full px-3 py-1 text-[10px] font-black tracking-wide"
            style={{
              background: "var(--color-yellow-dim)",
              color: "var(--color-yellow)",
            }}
          >
            {post.category}
          </span>

          <h1
            className="main-heading mt-4 text-3xl md:text-5xl"
            style={{ color: "var(--color-foreground)" }}
          >
            {post.title}
          </h1>

          <p
            className="mt-4 text-[13px]"
            style={{ color: "var(--color-muted)" }}
          >
            {post.date} · {post.readMin} min čítania
          </p>

          {/* Featured image, or a placeholder when the post has none */}
          <div
            className="relative mt-8 flex h-72 w-full items-center justify-center overflow-hidden rounded-2xl md:h-96"
            style={{
              background: "var(--color-surface-raised)",
              border: "1px solid var(--color-border)",
            }}
          >
            {post.image ? (
              <Image
                src={post.image}
                alt={post.title}
                fill
                sizes="(max-width: 768px) 100vw, 672px"
                className="object-cover"
                priority
                unoptimized
              />
            ) : (
              <div
                className="flex h-16 w-16 items-center justify-center rounded-2xl"
                style={{ background: "var(--color-yellow)", color: "#000" }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Article body */}
      <article className="pb-20">
        <div className="mx-auto max-w-2xl px-5">
          {renderMarkdown(post.content)}

          {/* Extra angles of the same realization, when the post has any */}
          {post.gallery && post.gallery.length > 0 && (
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {post.gallery.map((src) => (
                <div
                  key={src}
                  className="relative aspect-[4/3] overflow-hidden rounded-xl"
                  style={{ border: "1px solid var(--color-border)" }}
                >
                  <Image
                    src={src}
                    alt={post.title}
                    fill
                    sizes="(max-width: 640px) 100vw, 336px"
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </article>

      {/* CTA */}
      <section
        className="py-16"
        style={{
          background: "var(--color-surface)",
          borderTop: "1px solid var(--color-border)",
        }}
      >
        <div className="mx-auto max-w-2xl px-5 text-center">
          <div
            className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{ background: "var(--color-yellow)" }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <h2
            className="main-heading text-2xl"
            style={{ color: "var(--color-foreground)" }}
          >
            Pripravený konfigurovať?
          </h2>
          <p
            className="mt-3 text-sm"
            style={{ color: "var(--color-muted)" }}
          >
            Vyskúšajte náš konfigurátor a získajte cenovú ponuku okamžite.
          </p>
          <Link
            href="/#konfigurator"
            className="mt-6 inline-block rounded-full px-10 py-3.5 text-sm font-black tracking-wide transition hover:opacity-85"
            style={{ background: "var(--color-yellow)", color: "#000" }}
          >
            Otvoriť konfigurátor
          </Link>
        </div>
      </section>

      {/* Related posts */}
      {related.length > 0 && (
        <section className="py-16" style={{ background: "var(--color-background)" }}>
          <div className="mx-auto max-w-7xl px-5">
            <h2
              className="main-heading mb-8 text-xl"
              style={{ color: "var(--color-foreground)" }}
            >
              Ďalšie články
            </h2>
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {related.map((r) => (
                <li key={r.slug}>
                  <Link
                    href={`/blog/${r.slug}`}
                    className="group flex items-start gap-4 rounded-xl p-4 transition"
                    style={{
                      background: "var(--color-surface)",
                      border: "1px solid var(--color-border)",
                    }}
                  >
                    <span
                      className="mt-0.5 shrink-0 rounded-lg p-2"
                      style={{ background: "var(--color-yellow-dim)", color: "var(--color-yellow)" }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                    </span>
                    <div>
                      <p
                        className="text-[12px] font-black leading-tight group-hover:opacity-70 transition-opacity"
                        style={{ color: "var(--color-foreground)" }}
                      >
                        {r.title}
                      </p>
                      <p className="mt-0.5 text-[11px]" style={{ color: "var(--color-muted)" }}>
                        {r.readMin} min
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </main>
  );
}
