import React, { useEffect, useRef, useState } from 'react';

/**
 * In-page dialog (instead of window.prompt/alert, which block the page).
 * config: { title, help, confirmLabel, fields: [{ name, label, type, placeholder, optional, multiline, minLength, defaultValue, help }] }
 */
export default function PromptDialog({ config, onClose }) {
  const [values, setValues] = useState(() =>
    Object.fromEntries((config.fields || []).map((f) => [f.name, f.defaultValue ?? '']))
  );
  const firstRef = useRef(null);
  useEffect(() => firstRef.current?.focus(), []);

  const invalid = (config.fields || []).some((f) => {
    const v = String(values[f.name] ?? '').trim();
    if (!f.optional && !v) return true;
    return f.minLength && v.length < f.minLength;
  });

  const submit = (e) => {
    e.preventDefault();
    if (!invalid) onClose(values);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onMouseDown={() => onClose(null)}>
      <form
        onSubmit={submit}
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.key === 'Escape' && onClose(null)}
        className="bg-panelDark border border-borderDark rounded-xl p-5 w-full max-w-lg space-y-3 shadow-2xl"
      >
        <h3 className="text-base font-semibold text-white">{config.title}</h3>
        {config.help && <p className="text-xs text-slate-400">{config.help}</p>}
        {(config.fields || []).map((f, i) => {
          const common = {
            ref: i === 0 ? firstRef : undefined,
            value: values[f.name],
            placeholder: f.placeholder,
            onChange: (e) => setValues((v) => ({ ...v, [f.name]: e.target.value })),
            className: 'w-full bg-slateDark border border-borderDark rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500',
          };
          return (
            <label key={f.name} className="block space-y-1">
              <span className="text-xs text-slate-300">{f.label}</span>
              {f.multiline ? <textarea rows={4} {...common} /> : <input type={f.type || 'text'} {...common} />}
              {f.help && <span className="block text-[11px] text-slate-500">{f.help}</span>}
              {f.minLength && (
                <span className="block text-[11px] text-slate-500">{String(values[f.name] || '').trim().length}/{f.minLength} characters minimum</span>
              )}
            </label>
          );
        })}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={() => onClose(null)} className="text-xs px-3 py-2 rounded border border-borderDark text-slate-300 hover:bg-slate-800">
            Cancel
          </button>
          <button type="submit" disabled={invalid} className="text-xs px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 font-semibold">
            {config.confirmLabel || 'Confirm'}
          </button>
        </div>
      </form>
    </div>
  );
}
