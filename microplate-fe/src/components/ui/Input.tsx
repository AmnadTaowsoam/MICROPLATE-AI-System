import { forwardRef, InputHTMLAttributes } from 'react'
import clsx from 'classnames'

type Props = InputHTMLAttributes<HTMLInputElement> & {
  error?: string
}

const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { className, error, ...props },
  ref,
) {
  return (
    <div>
      <input
        ref={ref}
        className={clsx(
          'w-full rounded-lg border px-3 py-2 text-sm outline-none transition bg-white dark:bg-gray-800 text-gray-900 dark:text-white',
          error ? 'border-red-500 focus:ring-2 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary-600',
          className,
        )}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
})

export default Input


