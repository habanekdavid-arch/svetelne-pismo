import Link from "next/link";
import Image from "next/image";
import { blogPosts } from "@/lib/blog-data";

// Prvé tri články, tak ako sú v lib/blog-data.ts — nie ich kópia. Keď sa
// článok zmení alebo zmizne, náhľad ide s ním; predtým tu boli natvrdo
// prepísané tri slugy, ktoré prežili aj to, že články už neexistovali.
const posts = blogPosts.slice(0, 3);

export default function BlogPreview() {
  return (
    <section className="py-20 md:py-28">
      {/* max-w-6xl px-6 is vytlacto3d's content measure. This was max-w-360
          (1440px) with a fixed px-20 (80px) gutter, which made the section
          span far wider than every other one on the page. */}
      <div className="mx-auto max-w-6xl px-6">

        {/* Heading */}
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="reveal section-heading text-4xl sm:text-5xl">
            Prečítajte si viac
            <br />
            v našom blogu
          </h2>
          <p
            className="reveal delay-1 mx-auto mt-4 max-w-xl leading-7"
            style={{ color: "var(--color-muted)" }}
          >
            Pokiaľ si neviete rady, v pár krokoch jednoducho
            <br className="hidden sm:block" />
            a rýchlo vám pomôžeme s výberom svetelného textu.
          </p>
        </div>

        {/* Cards — 401 px wide each, 284 px image, 10 px radius per Figma */}
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post, i) => (
            <li key={post.slug} className={`reveal delay-${i + 1}`}>
              <Link
                href={`/blog/${post.slug}`}
                aria-label={post.title}
                className="field-card group block overflow-hidden rounded-field shadow-v3d-soft outline-none"
              >
                {/* Fotka realizácie — 284 px vysoká podľa Figmy. */}
                <div className="img-zoom relative h-71 w-full" style={{ background: "var(--color-surface-raised)" }}>
                  {post.image && (
                    <Image
                      src={post.image}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover"
                    />
                  )}
                </div>

                {/* Text */}
                <div className="p-5">
                  <h3
                    className="text-xl font-extrabold leading-snug"
                    style={{
                      fontFamily: "var(--font-century-gothic)",
                      color: "var(--color-foreground)",
                    }}
                  >
                    {post.title}
                  </h3>
                  <p
                    className="mt-2 text-sm leading-7"
                    style={{ color: "var(--color-muted)" }}
                  >
                    {post.desc}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>

      </div>
    </section>
  );
}
