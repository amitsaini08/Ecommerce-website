import {cn} from "@/lib/cn";

export default function EmptyState({ icon: Icon, title, className, description, action }) {
    return (
        <div className=
            {cn("rounded-xl border border-warm-200 bg-white p-8 text-center", className)}
        >
            {Icon && <Icon className="mx-auto mb-3 h-10 w-10 text-warm-300" />}
            <h3 className="mb-1 text-base font-bold text-warm-900">{title}</h3>
            {description && <p className="mx-auto mb-4 max-w-md text-sm text-warm-500">{description}</p>}
            {action}
        </div>
    );
}