import { clsx } from 'clsx';
import { Check } from 'lucide-react';

interface Step { id: number; label: string }

export function StepIndicator({ steps, currentStep }: { steps: Step[]; currentStep: number }) {
  return (
    <div className="flex items-center justify-between">
      {steps.map((step, i) => {
        const done = step.id < currentStep;
        const active = step.id === currentStep;
        return (
          <div key={step.id} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div
                className={clsx(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors',
                  done && 'bg-verana-600 border-verana-600 text-white',
                  active && 'bg-white border-verana-600 text-verana-600',
                  !done && !active && 'bg-white border-gray-300 text-gray-400',
                )}
              >
                {done ? <Check className="w-4 h-4" /> : step.id}
              </div>
              <span
                className={clsx(
                  'text-xs mt-1 font-medium',
                  active ? 'text-verana-600' : done ? 'text-gray-600' : 'text-gray-400',
                )}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={clsx(
                  'flex-1 h-0.5 mx-2 mb-4 transition-colors',
                  done ? 'bg-verana-600' : 'bg-gray-200',
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
