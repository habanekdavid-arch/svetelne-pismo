import Hero from "@/components/sections/Hero";
import Configurator from "@/components/sections/Configurator";
import VideoPreview from "@/components/sections/VideoPreview";
import HowItWorks from "@/components/sections/HowItWorks";
import BlogPreview from "@/components/sections/BlogPreview";

export default function Home() {
  return (
    <main>
      <Hero />
      <Configurator />
      <VideoPreview />
      <HowItWorks />
      <BlogPreview />
    </main>
  );
}
