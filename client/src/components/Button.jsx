import { Loader2 } from 'lucide-react';

export default function Button({ children, variant = 'primary', size, loading, icon, ...props }) {
  const cls = ['btn', `btn-${variant}`, size ? `btn-${size}` : ''].filter(Boolean).join(' ');
  return (
    <button className={cls} disabled={props.disabled || loading} {...props}>
      {loading ? <Loader2 size={14} className="spin" style={{ animation: 'spin 0.8s linear infinite' }} /> : icon}
      {children}
    </button>
  );
}