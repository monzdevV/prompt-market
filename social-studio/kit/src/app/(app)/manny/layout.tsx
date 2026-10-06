import { MannyNav } from "@/components/manny/subnav";

export default function MannyLayout({ children }: LayoutProps<"/manny">) {
  return (
    <>
      <MannyNav />
      {children}
    </>
  );
}
