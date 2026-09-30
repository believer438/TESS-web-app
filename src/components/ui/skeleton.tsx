// Copie Zentrix Academy : src/components/ui/skeleton.tsx
import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  rounded?: boolean;
}

function Skeleton({ className, rounded = false, ...props }: SkeletonProps) {
  return (
    <div
      className={cn("sk", rounded ? "rounded-full" : "rounded-none", className)}
      {...props}
    />
  );
}

export { Skeleton };
