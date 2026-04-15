import { cn } from "@/lib/utils";

interface Props extends React.HTMLAttributes<HTMLElement> {
  className?: string;
  children: React.ReactNode;
}

export default function MaxWidthWrapper({ className, children, ...props }: Props) {
  return (
    <section
      {...props}
      className={cn(
        "h-full mx-auto w-full max-w-full md:max-w-screen-xl px-4 md:px-12 lg:px-20",
        className
      )}
    >
      {children}
    </section>
  );
}
