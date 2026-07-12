type Props = {
  text: string;
};

export default function PreviewCard({
  text,
}: Props) {
  return (
    <div className="flex h-[500px] items-center justify-center rounded-3xl bg-gradient-to-b from-neutral-100 to-white shadow-xl">
      <div
        className="
          text-7xl
          font-black
          text-white
          drop-shadow-[0_0_25px_rgba(255,255,255,0.9)]
        "
      >
        {text}
      </div>
    </div>
  );
}