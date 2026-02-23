import React from 'react';
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
    return twMerge(clsx(inputs));
}

export const Button = React.forwardRef(({ className, variant = 'primary', size = 'default', ...props }, ref) => {
    const baseStyled = "inline-flex items-center justify-center rounded-xl font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50 btn-transition";

    const variants = {
        primary: "bg-primary text-white hover:bg-primary-hover shadow-sm",
        secondary: "bg-academic-200 text-academic-900 hover:bg-academic-300",
        outline: "border border-academic-300 bg-transparent hover:bg-academic-100 text-academic-800",
        ghost: "hover:bg-academic-100 hover:text-academic-900 text-academic-600",
        danger: "bg-feedback-error text-white hover:bg-red-700 shadow-sm",
        success: "bg-feedback-success text-white hover:bg-green-700 shadow-sm"
    };

    const sizes = {
        default: "h-11 px-4 py-2",
        sm: "h-9 rounded-lg px-3",
        lg: "h-14 rounded-xl px-8 text-lg",
        icon: "h-10 w-10",
    };

    return (
        <button
            className={cn(baseStyled, variants[variant], sizes[size], className)}
            ref={ref}
            {...props}
        />
    );
});
Button.displayName = "Button";
