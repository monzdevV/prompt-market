import Image from "next/image";
import type { Shot } from "@/content";
import { cn } from "@/lib/utils";

// Soft, offset shadow shared by every frame, so screenshots sit on the page instead of glowing on it.
const lift = "shadow-[0_28px_60px_-24px_rgba(0,0,0,0.85),0_8px_20px_-12px_rgba(0,0,0,0.6)]";

type FrameProps = { shot: Shot; sizes: string; className?: string; preload?: boolean };

function Picture({ shot, sizes, preload, className }: FrameProps) {
  return (
    <Image
      src={shot.src}
      alt={shot.alt}
      width={shot.width}
      height={shot.height}
      sizes={sizes}
      preload={preload}
      draggable={false}
      className={cn("block h-auto w-full select-none", className)}
    />
  );
}

export function BrowserFrame(props: FrameProps) {
  const { shot, className } = props;
  return (
    <div className={cn("overflow-hidden rounded-xl border border-mist/15 bg-[#0b1030]", lift, className)}>
      <div className="flex h-7 items-center gap-3 border-b border-mist/10 px-3">
        <span className="flex gap-1.5" aria-hidden>
          <span className="size-2 rounded-full bg-mist/20" />
          <span className="size-2 rounded-full bg-mist/20" />
          <span className="size-2 rounded-full bg-mist/20" />
        </span>
        {shot.url && (
          <span className="mx-auto max-w-[60%] truncate rounded-full bg-mist/[0.06] px-3 py-0.5 font-mono text-[10px] text-haze">
            {shot.url}
          </span>
        )}
        <span className="w-10" aria-hidden />
      </div>
      <Picture {...props} className={undefined} />
    </div>
  );
}

export function PhoneFrame(props: FrameProps) {
  const { className } = props;
  return (
    <div className={cn("rounded-[2rem] border border-mist/15 bg-[#07091a] p-[5px]", lift, className)}>
      <div className="relative overflow-hidden rounded-[1.65rem]">
        <span aria-hidden className="absolute left-1/2 top-2 z-10 h-[5%] max-h-5 w-[30%] -translate-x-1/2 rounded-full bg-black" />
        <Picture {...props} className={undefined} />
      </div>
    </div>
  );
}

export function PageFrame(props: FrameProps) {
  const { className } = props;
  return (
    <div className={cn("overflow-hidden rounded-[3px] bg-[#f4efe5]", lift, className)}>
      <Picture {...props} className={undefined} />
    </div>
  );
}

export function PhotoFrame(props: FrameProps) {
  const { className } = props;
  return (
    <div className={cn("overflow-hidden rounded-xl border border-mist/10", lift, className)}>
      <Picture {...props} className={undefined} />
    </div>
  );
}

export function Framed(props: FrameProps) {
  switch (props.shot.frame) {
    case "browser":
      return <BrowserFrame {...props} />;
    case "phone":
      return <PhoneFrame {...props} />;
    case "page":
      return <PageFrame {...props} />;
    default:
      return <PhotoFrame {...props} />;
  }
}
