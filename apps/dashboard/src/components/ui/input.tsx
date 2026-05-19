interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-xs font-medium text-dark-200 uppercase tracking-wide">{label}</label>
      )}
      <input
        className={`w-full px-3.5 py-2.5 bg-dark-900 border rounded-lg text-sm text-dark-50 placeholder:text-dark-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/50 transition-all ${
          error ? 'border-red-500/50' : 'border-dark-600'
        } ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className = '', ...props }: TextareaProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-xs font-medium text-dark-200 uppercase tracking-wide">{label}</label>
      )}
      <textarea
        className={`w-full px-3.5 py-2.5 bg-dark-900 border rounded-lg text-sm text-dark-50 placeholder:text-dark-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/50 transition-all resize-none ${
          error ? 'border-red-500/50' : 'border-dark-600'
        } ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
