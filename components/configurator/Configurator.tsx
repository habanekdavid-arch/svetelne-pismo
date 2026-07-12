"use client";

import { useMemo, useState } from "react";
import type { Config } from "@/lib/types";
import PreviewCard from "./PreviewCard";
import { calculatePrice } from "@/lib/pricing";

export default function Configurator() {
  const [config, setConfig] = useState<Config>({
    text:      "VÁŠ TEXT",
    font:      "helvetiker-bold",
    height:    40,
    material:  "alubond",
    signType:  "illuminated",
    lightMode: "front",
    lightColor: "#00c8ff",
    bodyColor:  "#f0f0f0",
    thickness: 8,
    rotation:  0,
  });

  const price = useMemo(
    () => calculatePrice(config),
    [config]
  );

  return (
    <section className="mx-auto max-w-7xl px-6 py-20">
      <div className="grid gap-10 lg:grid-cols-[350px_1fr]">

        <div className="rounded-3xl border p-6">

          <input
            value={config.text}
            onChange={(e) =>
              setConfig({
                ...config,
                text: e.target.value,
              })
            }
            className="w-full border p-3 rounded-xl"
          />

          <div className="mt-8">
            <div className="text-sm text-neutral-500">
              Cena od
            </div>

            <div className="text-4xl font-black">
              {price} €
            </div>
          </div>
        </div>

        <PreviewCard text={config.text} />
      </div>
    </section>
  );
}