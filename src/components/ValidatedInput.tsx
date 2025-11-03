import { Input } from "@/components/ui/input";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { InputHTMLAttributes } from "react";

interface ValidatedInputProps extends InputHTMLAttributes<HTMLInputElement> {
  showCheckmark?: boolean;
}

export function ValidatedInput({ className, showCheckmark, ...props }: ValidatedInputProps) {
  // Check if input has a value and should show checkmark
  const hasValue = Boolean(props.value);
  const showBorder = showCheckmark && hasValue;

  return (
    <div className="relative">
      <Input 
        className={cn(
          "pr-10 transition-colors duration-200",
          showBorder && "border-green-500 ring-0.5 ring-green-500",
          className
        )} 
        {...props} 
      />
      {showCheckmark && (
        <Check 
          className={cn(
            "absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors duration-200",
            hasValue ? "text-green-500" : "text-gray-300"
          )}
          aria-hidden="true"
          strokeWidth={3}
        />
      )}
    </div>
  );
}
