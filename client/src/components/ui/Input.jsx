import React, { forwardRef, useState } from 'react';
import { IoEyeOutline, IoEyeOffOutline } from 'react-icons/io5';

const Input = forwardRef(({
  label,
  type = 'text',
  error,
  helperText,
  className = '',
  id,
  required = false,
  showPasswordToggle = true,
  ...props
}, ref) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  const isPassword = type === 'password';
  const [visible, setVisible] = useState(false);
  const inputType = isPassword && visible ? 'text' : type;

  return (
    <div className={`flex flex-col gap-1.5 w-full ${className}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-semibold text-slate-700 tracking-wide flex items-center justify-between"
        >
          <span>
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </span>
        </label>
      )}

      <div className="relative">
        <input
          id={inputId}
          type={inputType}
          ref={ref}
          className={`w-full px-4 py-2.5 text-sm bg-white border rounded-lg transition-all duration-200 outline-none
            ${isPassword && showPasswordToggle ? 'pr-11' : ''}
            ${error
              ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
              : 'border-slate-200 hover:border-slate-300 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10'
            }
            text-slate-800 placeholder-slate-400 font-sans`
          }
          {...props}
        />
        {isPassword && showPasswordToggle && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            aria-label={visible ? 'Hide password' : 'Show password'}
            tabIndex={-1}
          >
            {visible ? <IoEyeOffOutline size={18} /> : <IoEyeOutline size={18} />}
          </button>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1 font-medium mt-0.5">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}

      {!error && helperText && (
        <p className="text-xs text-slate-400 mt-0.5">{helperText}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
